import { DRINK_CONTAINERS, DRINK_TYPE_FILTERS } from '../review-metadata';
import type { PublicReview } from '../types/bar-review';

export interface AdvancedFilters {
	drinkTypes?: string[];
	brand: string;
	container: string;
	minRating: number;
	maxPrice: number | undefined;
	favorite: boolean;
}

export function parseMaxPrice(value: string | null): number | undefined {
	if (!value?.trim()) return undefined;
	const price = Number(value);
	return Number.isFinite(price) && price >= 0 ? price : undefined;
}

export function readAdvancedFilters(params: URLSearchParams, brands: string[]): AdvancedFilters {
	const brand = params.get('brand') ?? '';
	const container = params.get('container') ?? '';
	const rating = Number(params.get('minRating'));
	return {
		drinkTypes: params
			.getAll('drinkType')
			.filter((value) => DRINK_TYPE_FILTERS.some((type) => type.value === value)),
		brand: brands.includes(brand) ? brand : '',
		container: DRINK_CONTAINERS.some((value) => value === container) ? container : '',
		minRating: [1, 2, 3].includes(rating) ? rating : 0,
		maxPrice: parseMaxPrice(params.get('maxPrice')),
		favorite: params.get('favorite') === '1'
	};
}

export function matchesAdvancedFilters(review: PublicReview, filters: AdvancedFilters): boolean {
	if (
		filters.drinkTypes?.some((type) =>
			type === 'energy'
				? !review.isEnergyDrink
				: type === 'protein'
					? !review.isProteinDrink
					: type === 'electrolyte'
						? !review.isElectrolyteDrink
						: review.sugarType !== type
		)
	)
		return false;
	if (filters.brand && review.beerBrand?.trim() !== filters.brand) return false;
	if (review.rating < filters.minRating) return false;
	if (
		filters.maxPrice !== undefined &&
		(review.beerPriceKr === undefined || review.beerPriceKr > filters.maxPrice)
	)
		return false;
	return (
		(!filters.container || review.container === filters.container) &&
		(!filters.favorite || review.favorite === true)
	);
}
