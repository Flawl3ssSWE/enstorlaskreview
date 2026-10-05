import { describe, expect, it } from 'vitest';
import robin from '../../../tests/fixtures/content/testsoda-robin.json';
import fixture from '../../../tests/fixtures/content/testsoda.json';
import { matchesAdvancedFilters, readAdvancedFilters, type AdvancedFilters } from './filters';
import { selectReviewer } from './soda';
import { validateReview } from './validation';

const review = validateReview(fixture, 'testsoda.json');
const defaults: AdvancedFilters = {
	drinkTypes: [],
	brand: '',
	container: '',
	minRating: 0,
	maxPrice: undefined,
	favorite: false
};

describe('advanced review filters', () => {
	it('filters independent posts by their own packaging, favorite and reviewer', () => {
		expect(matchesAdvancedFilters(review, { ...defaults, container: 'Burk', favorite: true })).toBe(
			true
		);
		expect(
			matchesAdvancedFilters(review, { ...defaults, container: 'Flaska', favorite: true })
		).toBe(false);
		expect(
			matchesAdvancedFilters(validateReview(robin, 'testsoda-robin.json'), {
				...defaults,
				favorite: true
			})
		).toBe(false);
		expect(
			matchesAdvancedFilters(selectReviewer(review, 'alex')!, { ...defaults, minRating: 3 })
		).toBe(true);
		expect(matchesAdvancedFilters(review, { ...defaults, minRating: 3 })).toBe(true);
	});
	it('excludes legacy recommendations from the favorites filter', () => {
		expect(
			matchesAdvancedFilters(
				{ ...review, favorite: undefined, recommended: true },
				{ ...defaults, favorite: true }
			)
		).toBe(false);
	});
	it('combines brand, rating and inclusive price limits, excluding missing prices', () => {
		const filters = { ...defaults, brand: 'Testläsk', minRating: 1, maxPrice: 25 };
		const priced = { ...review, beerBrand: 'Testläsk', beerPriceKr: 25 };
		expect(matchesAdvancedFilters(priced, filters)).toBe(true);
		expect(matchesAdvancedFilters({ ...priced, beerPriceKr: 26 }, filters)).toBe(false);
		expect(matchesAdvancedFilters({ ...priced, beerPriceKr: undefined }, filters)).toBe(false);
		expect(matchesAdvancedFilters({ ...priced, beerBrand: 'Annat' }, filters)).toBe(false);
		expect(matchesAdvancedFilters({ ...priced, beerPriceKr: 0 }, { ...filters, maxPrice: 0 })).toBe(
			true
		);
	});
	it('ignores malformed and unknown URL values while preserving zero price', () => {
		expect(
			readAdvancedFilters(
				new URLSearchParams(
					'brand=unknown&container=unknown&minRating=99&maxPrice=-1&favorite=false'
				),
				['Testläsk']
			)
		).toEqual(defaults);
		expect(readAdvancedFilters(new URLSearchParams('container=Burk+33cl'), []).container).toBe('');
		for (const value of ['', 'NaN', 'Infinity']) {
			expect(
				readAdvancedFilters(new URLSearchParams({ maxPrice: value }), []).maxPrice
			).toBeUndefined();
		}
		expect(
			readAdvancedFilters(
				new URLSearchParams('brand=Testläsk&container=Burk&minRating=2&maxPrice=0&favorite=1'),
				['Testläsk']
			)
		).toEqual({
			drinkTypes: [],
			brand: 'Testläsk',
			container: 'Burk',
			minRating: 2,
			maxPrice: 0,
			favorite: true
		});
	});
});

it('combines drink types without guessing sugar content from carbohydrates', () => {
	const energy = {
		...review,
		isEnergyDrink: true,
		isProteinDrink: true,
		sugarType: 'sugared' as const
	};
	expect(
		matchesAdvancedFilters(energy, { ...defaults, drinkTypes: ['energy', 'sugared', 'protein'] })
	).toBe(true);
	expect(matchesAdvancedFilters(energy, { ...defaults, drinkTypes: ['sugar-free'] })).toBe(false);
	expect(
		matchesAdvancedFilters(
			{ ...energy, sugarType: undefined, carbohydrateGPer100Ml: 0 },
			{ ...defaults, drinkTypes: ['sugar-free'] }
		)
	).toBe(false);
	expect(
		readAdvancedFilters(
			new URLSearchParams('drinkType=energy&drinkType=sugared&drinkType=unknown'),
			[]
		).drinkTypes
	).toEqual(['energy', 'sugared']);
});

it('combines electrolyte filtering with other types and preserves it in the URL', () => {
	const drink = {
		...review,
		isElectrolyteDrink: true,
		isEnergyDrink: true,
		sugarType: 'sugar-free' as const
	};
	const filters = { ...defaults, drinkTypes: ['electrolyte', 'energy', 'sugar-free'] };
	expect(matchesAdvancedFilters(drink, filters)).toBe(true);
	expect(matchesAdvancedFilters({ ...drink, isElectrolyteDrink: false }, filters)).toBe(false);
	expect(matchesAdvancedFilters({ ...drink, isElectrolyteDrink: undefined }, filters)).toBe(false);
	expect(
		readAdvancedFilters(new URLSearchParams('drinkType=electrolyte&drinkType=energy'), [])
			.drinkTypes
	).toEqual(['electrolyte', 'energy']);
});
