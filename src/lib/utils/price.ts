export const MAX_BEER_PRICE_KR = 999;
export const HAPPY_HOUR_PRICE_NOTE = '* happy hour';

export interface BeerPriceDisplay {
	text: string;
	note: string | null;
}

export const isValidBeerPriceKr = (value: number | null | undefined): value is number => {
	return (
		typeof value === 'number' &&
		/^\d+(?:\.\d)?$/.test(String(value)) &&
		value >= 1 &&
		value <= MAX_BEER_PRICE_KR
	);
};

/** Parses the generator's price field without accepting extra decimal places. */
export function parsePriceInput(value: string): number | undefined {
	const text = value.trim();
	if (!text) return undefined;
	return /^\d+(?:[.,]\d)?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
}

export const formatBeerPrice = (
	beerPriceKr: number | null | undefined,
	isHappyHourPrice = false
): string | null => {
	if (!isValidBeerPriceKr(beerPriceKr)) return null;
	return `${String(beerPriceKr).replace('.', ',')} kr${isHappyHourPrice ? '*' : ''}`;
};

export const getBeerPriceDisplay = (
	beerPriceKr: number | null | undefined,
	isHappyHourPrice = false
): BeerPriceDisplay | null => {
	const text = formatBeerPrice(beerPriceKr, isHappyHourPrice);
	if (!text) return null;

	return {
		text,
		note: isHappyHourPrice ? HAPPY_HOUR_PRICE_NOTE : null
	};
};
