import type { DrinkContainer, ReviewContent } from '$lib/types/bar-review';
import { generateSodaId } from './slug';

const normalize = (value: string) =>
	value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLocaleLowerCase('sv')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();

export function suggestBrand(
	title: string,
	brands: string[],
	reviews: Pick<ReviewContent, 'title' | 'beerBrand'>[] = []
): string {
	const name = normalize(title);
	const exactBrands = new Set(
		reviews.flatMap(({ title, beerBrand }) =>
			beerBrand && normalize(title) === name ? [beerBrand] : []
		)
	);
	if (exactBrands.size === 1) return [...exactBrands][0];
	return (
		brands
			.filter((brand) => name === normalize(brand) || name.startsWith(`${normalize(brand)} `))
			.sort((a, b) => normalize(b).length - normalize(a).length)[0] ?? ''
	);
}

export function fullSodaName(title: string, brand: string): string {
	const name = normalize(title);
	const prefix = normalize(brand);
	return !prefix || name === prefix || name.startsWith(`${prefix} `) ? title : `${brand} ${title}`;
}

export function suggestSodaId(
	title: string,
	brand: string,
	reviews: Pick<ReviewContent, 'title' | 'beerBrand' | 'sodaId'>[]
): string | undefined {
	if (!normalize(title)) return;
	const fullName = fullSodaName(title, brand);
	const name = normalize(fullName);
	const brandKey = normalize(brand);
	const matches = new Set<string>();
	const occupied = new Set<string>();
	for (const review of reviews) {
		if (!review.sodaId) continue;
		occupied.add(review.sodaId);
		const reviewedBrand = review.beerBrand ?? '';
		const reviewedBrandKey = normalize(reviewedBrand);
		if (
			(!brandKey || !reviewedBrandKey || reviewedBrandKey === brandKey) &&
			normalize(fullSodaName(review.title, reviewedBrand)) === name
		)
			matches.add(review.sodaId);
	}
	if (matches.size === 1) return [...matches][0];
	if (matches.size > 1) return;

	const baseId = generateSodaId(fullName);
	if (!baseId) return;
	const fit = (suffix = '') => baseId.slice(0, 100 - suffix.length).replace(/-$/, '') + suffix;
	let id = fit();
	for (let index = 2; occupied.has(id); index++) id = fit(`-${index}`);
	return id;
}

export function suggestContainer(volume?: number): DrinkContainer | undefined {
	if (volume === undefined || !Number.isFinite(volume) || volume <= 0) return undefined;
	if ([250, 330, 355, 500].includes(volume)) return 'Burk';
	return volume === 800 ? 'SodaStream smak' : 'Flaska';
}

export function suggestIce(
	methods: NonNullable<ReviewContent['servingMethods']>
): boolean | undefined {
	return methods.includes('Originalförpackning') &&
		!methods.includes('Glas') &&
		!methods.includes('Mugg')
		? false
		: undefined;
}

/** Keep a loaded omission until its input changes; manual choices have no source. */
export function suggestionValue<T>(
	suggestion: T,
	override: T | undefined,
	loadedSource: string | undefined,
	source: string
): T {
	return loadedSource !== undefined && loadedSource !== source
		? suggestion
		: override === undefined
			? suggestion
			: override;
}
