import type { DrinkContainer, ReviewContent } from '$lib/types/bar-review';

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
	sodas: { title: string; brand: string }[] = []
): string {
	const name = normalize(title);
	const exact = sodas.filter((soda) => normalize(soda.title) === name && soda.brand);
	const exactBrands = [...new Set(exact.map((soda) => soda.brand))];
	if (exactBrands.length === 1) return exactBrands[0];
	return (
		brands
			.filter((brand) => name === normalize(brand) || name.startsWith(`${normalize(brand)} `))
			.sort((a, b) => normalize(b).length - normalize(a).length)[0] ?? ''
	);
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
