import { describe, expect, it } from 'vitest';
import {
	suggestDrinkTypes,
	nutrientAmounts,
	nutritionFacts,
	drinkVolumeMl,
	laskPerKrona,
	formatDrinkNumber,
	formatDrinkVolume,
	formatDrinkContainer
} from './drink-facts';

describe('drink quantities', () => {
	it('calculates LPK from independent volume and price in cl/kr', () => {
		expect(laskPerKrona({ container: 'Burk', volumeMl: 330, beerPriceKr: 8 })).toBe(4.125);
		expect(formatDrinkNumber(4.125)).toBe('4,13');
	});
	it('uses the price belonging to the review', () => {
		expect(laskPerKrona({ container: 'Sprutmaskin', volumeMl: 400, beerPriceKr: 20 })).toBe(2);
		expect(laskPerKrona({ container: 'Burk', volumeMl: 330, beerPriceKr: 10 })).toBe(3.3);
	});
	it('keeps volume independent of the container type', () => {
		for (const container of ['Burk', 'Flaska', 'Glasflaska'] as const) {
			expect(drinkVolumeMl({ container, volumeMl: 250 })).toBe(250);
			expect(drinkVolumeMl({ container })).toBeUndefined();
		}
		expect(laskPerKrona({ beerPriceKr: 25 })).toBeUndefined();
		expect(laskPerKrona({ volumeMl: 330 })).toBeUndefined();
	});
	it.each([
		[330, '33 cl'],
		[500, '50 cl'],
		[1000, '1 l'],
		[1500, '1,5 l'],
		[355, '35,5 cl']
	])('formats volume %s as %s', (volume, label) => {
		expect(formatDrinkVolume(volume as number)).toBe(label);
	});
	it.each([0, -1, NaN, Infinity])('does not calculate with invalid quantities: %s', (value) => {
		expect(laskPerKrona({ volumeMl: value, beerPriceKr: 10 })).toBeUndefined();
		expect(laskPerKrona({ volumeMl: 330, beerPriceKr: value })).toBeUndefined();
	});
});

it('displays custom packaging as plain text without changing standard packaging', () => {
	expect(formatDrinkContainer({ container: 'Annan', customContainer: 'Pappmugg' })).toBe(
		'Pappmugg'
	);
	expect(formatDrinkContainer({ container: 'Burk' })).toBe('Burk');
});

it('converts both nutrient bases using the reviewed volume and preserves unknowns and zero', () => {
	expect(nutrientAmounts(32, undefined, 500)).toEqual({ per100Ml: 32, perContainer: 160 });
	expect(nutrientAmounts(undefined, 20, 500)).toEqual({ per100Ml: 4, perContainer: 20 });
	expect(nutrientAmounts(undefined, 0)).toEqual({ per100Ml: undefined, perContainer: 0 });
	expect(nutrientAmounts(0, undefined, 0)).toEqual({ per100Ml: 0, perContainer: undefined });
	expect(
		nutritionFacts({ volumeMl: 330, carbohydrateGPer100Ml: 10, proteinGPerContainer: 20 })
	).toMatchObject([
		{ short: 'KPL', per100Ml: 10, perContainer: 33 },
		{ short: 'PPL', perContainer: 20 }
	]);
});

describe('editor drink type suggestions', () => {
	it('recognizes positive nutrient values in either basis without requiring volume', () => {
		for (const facts of [
			{ caffeineMgPer100Ml: 32, proteinGPer100Ml: 5, carbohydrateGPer100Ml: 10 },
			{ caffeineMgPerContainer: 160, proteinGPerContainer: 20, carbohydrateGPerContainer: 50 }
		])
			expect(suggestDrinkTypes(facts)).toEqual({
				isEnergyDrink: true,
				isProteinDrink: true,
				sugarType: 'sugared'
			});
	});
	it('distinguishes known zero from unknown and invalid values', () => {
		expect(
			suggestDrinkTypes({
				caffeineMgPerContainer: 0,
				proteinGPer100Ml: 0,
				carbohydrateGPerContainer: 0
			})
		).toEqual({ isEnergyDrink: false, isProteinDrink: false, sugarType: 'sugar-free' });
		for (const value of [undefined, -1, NaN, Infinity])
			expect(
				suggestDrinkTypes({
					caffeineMgPer100Ml: value,
					proteinGPerContainer: value,
					carbohydrateGPer100Ml: value
				})
			).toEqual({ isEnergyDrink: false, isProteinDrink: false, sugarType: undefined });
	});
});
