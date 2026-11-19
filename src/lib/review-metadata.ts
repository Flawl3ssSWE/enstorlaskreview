import type { ReviewRatingKey } from './types/bar-review.ts';

export interface ReviewRatingMetric {
	key: ReviewRatingKey;
	label: string;
	description: string;
	weight: number;
}

export const REVIEW_RATING_METRICS = [
	{
		key: 'atmosphere',
		label: 'Atmosfär',
		description: 'Stämning och känsla på platsen',
		weight: 0.18
	},
	{
		key: 'service',
		label: 'Service',
		description: 'Personalens bemötande och snabbhet',
		weight: 0.14
	},
	{
		key: 'selection',
		label: 'Utbud',
		description: 'Variation av drycker',
		weight: 0.1
	},
	{
		key: 'quality',
		label: 'Kvalitet',
		description: 'Kvalitet på dryck',
		weight: 0.18
	},
	{
		key: 'price',
		label: 'Prisvärdhet',
		description: 'Värde för pengarna',
		weight: 0.07
	},
	{
		key: 'cleanliness',
		label: 'Renlighet',
		description: 'Hygien och ordning',
		weight: 0.12
	},
	{
		key: 'soundLevel',
		label: 'Ljudnivå',
		description: 'Ljudnivå (0=högljutt, 5=tyst)',
		weight: 0.03
	},
	{
		key: 'barhopPotential',
		label: 'Barhoppotential',
		description: 'Hur bra är baren för att hoppa vidare från?',
		weight: 0.18
	}
] as const satisfies readonly ReviewRatingMetric[];

/** Published legacy scores use these exact weights. */
export const SODA_RATING_METRICS = [
	{ key: 'taste', label: 'Smak', description: 'Hur god och tydlig är smaken?', weight: 0.3 },
	{
		key: 'sweetness',
		label: 'Sötma',
		description: 'Hur söt är läsken? 0 = inte söt, 3 = perfekt, 5 = för söt.',
		weight: 0.15
	},
	{
		key: 'carbonation',
		label: 'Kolsyra',
		description: 'Hur kolsyrad är drycken? 0 = avslagen, 5 = väldigt kolsyrad.',
		weight: 0.15
	},
	{
		key: 'mouthfeel',
		label: 'Konsistens',
		description: 'Hur rinnig är läsken? 0 = tjock/trögflytande, 5 = mycket rinnig.',
		weight: 0
	},
	{
		key: 'mouthfeelMatch',
		label: 'Passande konsistens',
		description: 'Är konsistensen som förväntad och passar den läsken? 5 = passar perfekt.',
		weight: 0.1
	},
	{
		key: 'drinkability',
		label: 'Drickbarhet',
		description: 'Hur gärna dricker du hela glaset?',
		weight: 0.15
	},
	{
		key: 'matchesName',
		label: 'Matchar namnet',
		description: 'Hur väl motsvarar smaken namnet?',
		weight: 0.1
	},
	{ key: 'value', label: 'Pris', description: 'Hur prisvärd är läsken?', weight: 0.05 }
] as const;

export const TASTING_MIN_RATING = 1;

export const TASTING_PROFILE_METRICS = [
	{
		key: 'sweetness',
		label: 'Sötma',
		description: '1 = ingen märkbar sötma, 3 = tydligt söt, 5 = mycket söt.'
	},
	{
		key: 'acidity',
		label: 'Surhet',
		description: '1 = ingen märkbar surhet, 3 = tydligt syrlig, 5 = ordentligt sur.'
	},
	{
		key: 'carbonation',
		label: 'Kolsyra',
		description: '1 = stilla eller avslagen, 3 = tydligt bubblig, 5 = väldigt kraftigt bubblig.'
	},
	{
		key: 'body',
		label: 'Fyllighet',
		description: '1 = vattnig, 3 = medelfyllig, 5 = tjock eller sirapslik.'
	},
	{
		key: 'bitterness',
		label: 'Beska',
		description: '1 = ingen märkbar beska, 3 = tydligt besk, 5 = dominerande beska.'
	}
] as const;

export const TASTING_RATING_METRICS = [
	{ key: 'taste', label: 'Smak', description: 'Hur god är smaken i själva klunken?', weight: 40 },
	{
		key: 'balance',
		label: 'Balans',
		description: 'Hur väl fungerar sötma, surhet och beska ihop för den här typen av läsk?',
		weight: 25
	},
	{
		key: 'aftertaste',
		label: 'Eftersmak',
		description: 'Hur behagligt smakar det efter klunken? Även en kort, ren avslutning kan få 5.',
		weight: 20
	},
	{
		key: 'mouthfeel',
		label: 'Munkänsla',
		description: 'Hur väl passar bubblorna och fylligheten till drycken?',
		weight: 15
	}
] as const;

export const TASTING_EXTRA_METRICS = [
	{
		key: 'name',
		label: 'Namnet',
		description: 'Passar namnet läsken, väcker det nyfikenhet och är det lätt att komma ihåg?'
	},
	{
		key: 'packaging',
		label: 'Förpackningen',
		description:
			'Bedöm utseende och känsla. För läsk från tapp kan du bedöma glaset eller muggen den serverades i.'
	},
	{
		key: 'value',
		label: 'Prisvärdhet',
		description: 'Hur prisvärd är läsken till det pris du betalade?'
	}
] as const;

export const ADDITIONAL_VENUE_RATING_KEYS = ['quality', 'price', 'barhopPotential'] as const;

const venueDescriptions: Partial<Record<ReviewRatingKey, string>> = {
	quality: 'Hur väl serveras läsken? Bedöm till exempel temperatur och bevarad kolsyra.',
	price:
		'Hur rimliga är ställets läskpriser jämfört med andra barers, för liknande läsk och mängd?',
	barhopPotential: 'Hur lätt är det att gå vidare härifrån till andra barer?'
};

export const VENUE_RATING_METRICS = REVIEW_RATING_METRICS.map((metric) => ({
	...metric,
	description: venueDescriptions[metric.key] ?? metric.description
}));

export const LEGACY_VENUE_RATING_METRICS = VENUE_RATING_METRICS.filter(
	({ key }) => !ADDITIONAL_VENUE_RATING_KEYS.some((additional) => additional === key)
);

export const TASTING_VENUE_RATING_METRICS = VENUE_RATING_METRICS.map((metric) =>
	metric.key === 'soundLevel'
		? { ...metric, description: 'Ljudnivå (1 = högljutt, 5 = tyst)' }
		: metric
);

export const DRINK_CONTAINERS = [
	'Burk',
	'Flaska',
	'Glasflaska',
	'SodaStream smak',
	'Sprutmaskin',
	'Annan'
] as const;

export const DRINK_VOLUMES_ML = [
	200, 250, 300, 330, 355, 400, 500, 600, 750, 800, 1000, 1250, 1500, 2000
] as const;

/** Separate personal assessment; never included in the overall soda score. */
export const REPURCHASE_POTENTIAL_LABELS = [
	'Aldrig igen',
	'Bara om inget annat finns',
	'Kanske någon gång',
	'Köper gärna ibland',
	'Köper gärna igen',
	'Given i kylen'
] as const;

export const TASTING_REPURCHASE_POTENTIAL_LABELS = [
	REPURCHASE_POTENTIAL_LABELS[0],
	...REPURCHASE_POTENTIAL_LABELS.slice(2)
];

export const DRINK_TYPE_FILTERS = [
	{ value: 'energy', label: 'Energidryck' },
	{ value: 'protein', label: 'Proteindryck' },
	{ value: 'electrolyte', label: 'Elektrolytdryck' },
	{ value: 'sugar-free', label: 'Sockerfri' },
	{ value: 'sugared', label: 'Sockrad' }
] as const;

export const SERVING_METHODS = ['Originalförpackning', 'Glas', 'Sugrör', 'Mugg'] as const;
export const SERVING_TEMPERATURES = ['Kylskåpskall', 'Rumstempererad', 'Varm'] as const;

/** Lower bounds for the published 0–3 rating, shared with the review overview. */
export const OVERALL_RATING_LEVELS = [
	{ rating: 0, minimum: 0, label: 'Meh, det här var inget vidare.' },
	{ rating: 1, minimum: 2.5, label: 'Jodå, det här går ju att dricka.' },
	{ rating: 2, minimum: 3.5, label: 'Smaskens! Nu börjar det likna nåt.' },
	{ rating: 3, minimum: 4.5, label: 'Wow, ge mig en till!' }
] as const;
