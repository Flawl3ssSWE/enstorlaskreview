import type { DrinkFacts } from '../types/bar-review.ts';
import { isValidBeerPriceKr } from './price.ts';

export function drinkVolumeMl(drink: DrinkFacts): number | undefined {
	const volume = drink.volumeMl;
	return typeof volume === 'number' && Number.isFinite(volume) && volume > 0 ? volume : undefined;
}

export function laskPerKrona(drink: DrinkFacts): number | undefined {
	const volume = drinkVolumeMl(drink);
	const price = drink.beerPriceKr;
	return volume !== undefined && isValidBeerPriceKr(price) ? volume / 10 / price : undefined;
}

export function formatDrinkNumber(value: number): string {
	return value.toLocaleString('sv-SE', { maximumFractionDigits: 2 });
}

export function formatDrinkVolume(volumeMl: number): string {
	return volumeMl >= 1000
		? `${formatDrinkNumber(volumeMl / 1000)} l`
		: `${formatDrinkNumber(volumeMl / 10)} cl`;
}

export function formatDrinkContainer(drink: DrinkFacts): string | undefined {
	return drink.container === 'Annan' ? drink.customContainer : drink.container;
}

/** Preserve the entered basis; derive the other amount only with an explicit volume. */
export function nutrientAmounts(
	per100Ml: number | undefined,
	perContainer: number | undefined,
	volumeMl?: number
) {
	const volume = drinkVolumeMl({ volumeMl });
	return {
		per100Ml:
			per100Ml ??
			(perContainer !== undefined && volume !== undefined
				? (perContainer * 100) / volume
				: undefined),
		perContainer:
			perContainer ??
			(per100Ml !== undefined && volume !== undefined ? (per100Ml * volume) / 100 : undefined)
	};
}

export function drinkTypeLabels(drink: DrinkFacts): string[] {
	return [
		...(drink.isEnergyDrink ? ['Energidryck'] : []),
		...(drink.isProteinDrink ? ['Proteindryck'] : []),
		...(drink.isElectrolyteDrink ? ['Elektrolytdryck'] : []),
		...(drink.sugarType === 'sugar-free'
			? ['Sockerfri']
			: drink.sugarType === 'sugared'
				? ['Sockrad']
				: [])
	];
}

export function nutritionFacts(drink: DrinkFacts) {
	return [
		{
			label: 'Koffein',
			short: 'Koffein',
			unit: 'mg',
			...nutrientAmounts(drink.caffeineMgPer100Ml, drink.caffeineMgPerContainer, drink.volumeMl)
		},
		{
			label: 'KPL (kolhydrat per läsk)',
			short: 'KPL',
			unit: 'g',
			...nutrientAmounts(
				drink.carbohydrateGPer100Ml,
				drink.carbohydrateGPerContainer,
				drink.volumeMl
			)
		},
		{
			label: 'PPL (protein per läsk)',
			short: 'PPL',
			unit: 'g',
			...nutrientAmounts(drink.proteinGPer100Ml, drink.proteinGPerContainer, drink.volumeMl)
		}
	].filter((fact) => fact.per100Ml !== undefined || fact.perContainer !== undefined);
}

/** Suggestions for the editor; explicit classifications remain authoritative. */
export function suggestDrinkTypes(drink: DrinkFacts) {
	const amount = (per100Ml?: number, perContainer?: number) => {
		const value = per100Ml ?? perContainer;
		return value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
	};
	const caffeine = amount(drink.caffeineMgPer100Ml, drink.caffeineMgPerContainer);
	const protein = amount(drink.proteinGPer100Ml, drink.proteinGPerContainer);
	const carbohydrate = amount(drink.carbohydrateGPer100Ml, drink.carbohydrateGPerContainer);
	return {
		isEnergyDrink: caffeine !== undefined && caffeine > 0,
		isProteinDrink: protein !== undefined && protein > 0,
		sugarType:
			carbohydrate === undefined
				? undefined
				: carbohydrate === 0
					? ('sugar-free' as const)
					: ('sugared' as const)
	};
}
