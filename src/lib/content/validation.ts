import { stripControlCharacters } from '../utils/review-text.ts';
import {
	DRINK_CONTAINERS,
	SERVING_METHODS,
	SERVING_TEMPERATURES,
	REVIEW_RATING_METRICS,
	SODA_RATING_METRICS,
	VENUE_RATING_METRICS
} from '../review-metadata.ts';
import { sodaScore } from './soda.ts';
import { calculateOverallRating, ratingFromAverage } from '../utils/ratings.ts';
import { isValidBeerPriceKr } from '../utils/price.ts';
import type { PublicReview, ReviewContent } from '../types/bar-review.ts';

const RESERVED_SLUGS = new Set([
	'about',
	'skapa',
	'karta',
	'statistik',
	'admin',
	'login',
	'images',
	'404',
	'_app',
	'content',
	'robots',
	'favicon'
]);
const fields = new Set([
	'sodaId',
	'container',
	'customContainer',
	'volumeMl',
	'isEnergyDrink',
	'caffeineMgPer100Ml',
	'caffeineMgPerContainer',
	'carbohydrateGPer100Ml',
	'carbohydrateGPerContainer',
	'proteinGPer100Ml',
	'proteinGPerContainer',
	'isProteinDrink',
	'isElectrolyteDrink',
	'sugarType',
	'servingMethods',
	'servingTemperature',
	'servedWithIce',
	'recommended',
	'favorite',
	'repurchasePotential',
	'sodaRatings',
	'venueRatings',
	'title',
	'description',
	'slug',
	'image',
	'imageFocusX',
	'imageFocusY',
	'imageZoom',
	'location',
	'beerBrand',
	'beerPriceKr',
	'isHappyHourPrice',
	'author',
	'coAuthors',
	'createdAt',
	'updatedAt',
	'latitude',
	'longitude',
	...REVIEW_RATING_METRICS.map(({ key }) => key)
]);

export function isSafeSlug(slug: string): boolean {
	return (
		slug.length <= 160 &&
		/^[0-9A-Za-z\u00C0-\u017F]+(?:-[0-9A-Za-z\u00C0-\u017F]+)*$/.test(slug) &&
		!RESERVED_SLUGS.has(slug.toLowerCase())
	);
}

export function isSafeImageName(name: string): boolean {
	return /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:jpg|jpeg|png|webp)$/.test(name);
}

export function validateReview(value: unknown, filename: string): PublicReview {
	const fail = (message: string): never => {
		throw new Error(`${filename}: ${message}`);
	};
	if (!value || typeof value !== 'object' || Array.isArray(value))
		fail('Recensionen måste vara ett JSON-objekt.');
	const data = value as Record<string, unknown>;
	for (const key of Object.keys(data)) {
		if (!fields.has(key))
			fail(`Okänt fält: ${key}. Utkast och privata uppgifter får inte publiceras.`);
	}
	const text = (key: string, max: number, min = 1) => {
		const v = data[key];
		if (
			typeof v !== 'string' ||
			v.trim().length < min ||
			v.length > max ||
			stripControlCharacters(v) !== v
		)
			fail(`Ogiltigt värde för ${key}.`);
	};
	if (data.sodaId !== undefined) {
		text('sodaId', 100);
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.sodaId as string))
			fail('Läsk-ID måste bestå av små bokstäver a–z, siffror och bindestreck.');
		if (data.sodaRatings === undefined) fail('Läsk-ID kräver läskbetyg.');
	}
	text('title', 200);
	text('description', 50000);
	text('author', 100);
	text('location', 300, data.sodaRatings === undefined ? 1 : 0);
	text('slug', 160);
	text('image', 200);
	if (!isSafeSlug(data.slug as string) || filename !== `${data.slug}.json`)
		fail('Filnamnet måste motsvara en unik, säker slug.');
	if (!isSafeImageName(data.image as string))
		fail('Bilden måste vara en lokal JPEG-, PNG- eller WebP-fil.');
	if (
		data.container !== undefined &&
		!DRINK_CONTAINERS.some((container) => container === data.container)
	)
		fail('Välj en giltig förpackning.');
	if (data.container === 'Annan') {
		text('customContainer', 80);
		if ((data.customContainer as string).trim() !== data.customContainer)
			fail('Förpackningens namn får inte börja eller sluta med blanksteg.');
	} else if (data.customContainer !== undefined) {
		fail('Egen förpackning kräver förpackningstypen Annan.');
	}
	if (
		data.volumeMl !== undefined &&
		(typeof data.volumeMl !== 'number' || !Number.isFinite(data.volumeMl) || data.volumeMl <= 0)
	)
		fail('Volymen måste vara ett positivt tal i ml.');
	if (data.isEnergyDrink !== undefined && typeof data.isEnergyDrink !== 'boolean')
		fail('Energidryck måste vara true eller false.');
	if (
		data.servingMethods !== undefined &&
		(!Array.isArray(data.servingMethods) ||
			data.servingMethods.some((method) => !SERVING_METHODS.includes(method)) ||
			new Set(data.servingMethods).size !== data.servingMethods.length)
	)
		fail('Serveringsmetoder måste vara unika val från listan.');
	if (
		data.servingTemperature !== undefined &&
		!SERVING_TEMPERATURES.some((temperature) => temperature === data.servingTemperature)
	)
		fail('Välj en giltig serveringstemperatur.');
	if (data.servedWithIce !== undefined && typeof data.servedWithIce !== 'boolean')
		fail('Servering med is måste vara true eller false.');
	if (data.isElectrolyteDrink !== undefined && typeof data.isElectrolyteDrink !== 'boolean')
		fail('Elektrolytdryck måste vara true eller false.');
	if (data.isProteinDrink !== undefined && typeof data.isProteinDrink !== 'boolean')
		fail('Proteindryck måste vara true eller false.');
	if (data.sugarType !== undefined && !['sugar-free', 'sugared'].includes(data.sugarType as string))
		fail('Välj Sockerfri eller Sockrad.');
	for (const [prefix, label] of [
		['caffeineMg', 'Koffein'],
		['carbohydrateG', 'Kolhydrater'],
		['proteinG', 'Protein']
	]) {
		const concentration = data[`${prefix}Per100Ml`];
		const total = data[`${prefix}PerContainer`];
		if (concentration !== undefined && total !== undefined)
			fail(`${label}: ange antingen per 100 ml eller per förpackning.`);
		for (const value of [concentration, total])
			if (
				value !== undefined &&
				(typeof value !== 'number' || !Number.isFinite(value) || value < 0)
			)
				fail(`${label} måste vara ett ändligt tal från 0.`);
	}
	if (
		data.isEnergyDrink === true &&
		data.caffeineMgPer100Ml === undefined &&
		data.caffeineMgPerContainer === undefined
	)
		fail('Ange koffeinhalten för energidrycken.');
	if (data.beerBrand !== undefined) text('beerBrand', 100);
	const validateRatings = (value: unknown, metrics: readonly { key: string }[], label: string) => {
		if (!value || typeof value !== 'object' || Array.isArray(value))
			fail(`${label} måste vara ett objekt.`);
		const ratings = value as Record<string, unknown>;
		if (Object.keys(ratings).some((key) => !metrics.some((metric) => metric.key === key)))
			fail(`Okänt betyg i ${label}.`);
		for (const { key } of metrics) {
			if (key === 'mouthfeelMatch' && ratings[key] === undefined) continue;
			if (
				typeof ratings[key] !== 'number' ||
				!Number.isFinite(ratings[key]) ||
				(ratings[key] as number) < 0 ||
				(ratings[key] as number) > 5
			)
				fail(`${label}: ${key} måste vara mellan 0 och 5.`);
		}
	};
	if (data.recommended !== undefined && typeof data.recommended !== 'boolean')
		fail('Rekommendationen måste vara true eller false.');
	if (data.favorite !== undefined && typeof data.favorite !== 'boolean')
		fail('Läskfavorit måste vara true eller false.');
	if (
		data.repurchasePotential !== undefined &&
		(typeof data.repurchasePotential !== 'number' ||
			!Number.isInteger(data.repurchasePotential) ||
			data.repurchasePotential < 0 ||
			data.repurchasePotential > 5)
	)
		fail('Återköpspotential måste vara ett heltal mellan 0 och 5.');
	if (
		data.sodaRatings === undefined &&
		(data.favorite !== undefined || data.repurchasePotential !== undefined)
	)
		fail('Läskfavorit och återköpspotential kräver läskbetyg.');
	if (data.sodaRatings !== undefined) {
		validateRatings(data.sodaRatings, SODA_RATING_METRICS, 'Läskbetyg');
		if (REVIEW_RATING_METRICS.some(({ key }) => data[key] !== undefined))
			fail('Blanda inte läskbetyg med äldre barbetyg.');
		if (data.venueRatings !== undefined)
			validateRatings(data.venueRatings, VENUE_RATING_METRICS, 'Platsbetyg');
	} else {
		if (data.venueRatings !== undefined) fail('Platsbetyg kräver läskbetyg.');
		for (const { key } of REVIEW_RATING_METRICS) {
			if (
				typeof data[key] !== 'number' ||
				!Number.isFinite(data[key]) ||
				(data[key] as number) < 0 ||
				(data[key] as number) > 5
			)
				fail(`${key} måste vara mellan 0 och 5.`);
		}
	}
	if (data.beerPriceKr !== undefined && !isValidBeerPriceKr(data.beerPriceKr as number))
		fail('Priset måste vara mellan 1 och 999 kr med högst en decimal.');
	if (data.isHappyHourPrice !== undefined && typeof data.isHappyHourPrice !== 'boolean')
		fail('isHappyHourPrice måste vara true eller false.');
	if (data.isHappyHourPrice && data.beerPriceKr === undefined) fail('Happy hour kräver ett pris.');
	if (data.coAuthors !== undefined) {
		if (
			!Array.isArray(data.coAuthors) ||
			data.coAuthors.some((v) => typeof v !== 'string' || !v.trim() || v.length > 100) ||
			new Set([data.author, ...data.coAuthors]).size !== data.coAuthors.length + 1
		)
			fail('Medförfattarna måste vara unika namn.');
	}
	for (const key of ['imageFocusX', 'imageFocusY']) {
		if (
			data[key] !== undefined &&
			(typeof data[key] !== 'number' ||
				!Number.isFinite(data[key]) ||
				(data[key] as number) < 0 ||
				(data[key] as number) > 100)
		)
			fail(`${key} måste vara mellan 0 och 100.`);
	}
	if (
		data.imageZoom !== undefined &&
		(typeof data.imageZoom !== 'number' ||
			!Number.isFinite(data.imageZoom) ||
			data.imageZoom < 1 ||
			data.imageZoom > 3)
	)
		fail('Bildens zoom måste vara ett tal mellan 1 och 3.');
	for (const key of ['createdAt', 'updatedAt']) {
		const v = data[key];
		if (
			typeof v !== 'string' ||
			!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) ||
			!Number.isFinite(Date.parse(v)) ||
			new Date(v).toISOString().replace('.000Z', 'Z') !== v.replace('.000Z', 'Z')
		)
			fail(`${key} måste vara ett giltigt ISO-datum i UTC.`);
	}
	if (Date.parse(data.updatedAt as string) < Date.parse(data.createdAt as string))
		fail('updatedAt får inte vara före createdAt.');
	if ((data.latitude === undefined) !== (data.longitude === undefined))
		fail('Ange både latitud och longitud.');
	for (const [key, limit] of [
		['latitude', 90],
		['longitude', 180]
	] as const) {
		if (
			data[key] !== undefined &&
			(typeof data[key] !== 'number' ||
				!Number.isFinite(data[key]) ||
				Math.abs(data[key] as number) > limit)
		)
			fail(`Ogiltig ${key}.`);
	}
	const review = data as unknown as ReviewContent;
	return {
		...review,
		author: review.author!,
		description: review.description!,
		rating: review.sodaRatings
			? ratingFromAverage(sodaScore(review.sodaRatings))
			: calculateOverallRating(REVIEW_RATING_METRICS.map(({ key }) => review[key]!))
	};
}
