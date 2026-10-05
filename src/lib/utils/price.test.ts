import { describe, expect, it } from 'vitest';
import {
	HAPPY_HOUR_PRICE_NOTE,
	formatBeerPrice,
	getBeerPriceDisplay,
	parsePriceInput
} from './price';

describe('beer price formatting', () => {
	it('formats regular and happy hour beer prices', () => {
		expect(formatBeerPrice(79, false)).toBe('79 kr');
		expect(formatBeerPrice(79, true)).toBe('79 kr*');
		expect(formatBeerPrice(79.5)).toBe('79,5 kr');
		expect(formatBeerPrice(8.1, true)).toBe('8,1 kr*');
	});

	it('returns null for legacy or invalid beer prices', () => {
		expect(formatBeerPrice(undefined, false)).toBeNull();
		expect(formatBeerPrice(null, false)).toBeNull();
		expect(formatBeerPrice(Number.NaN, false)).toBeNull();
		expect(formatBeerPrice(0, false)).toBeNull();
		expect(formatBeerPrice(-1, false)).toBeNull();
		expect(formatBeerPrice(79.55, false)).toBeNull();
		expect(formatBeerPrice(1000, false)).toBeNull();
	});

	it('returns display metadata for happy hour notes', () => {
		expect(getBeerPriceDisplay(79, true)).toEqual({
			text: '79 kr*',
			note: HAPPY_HOUR_PRICE_NOTE
		});
		expect(getBeerPriceDisplay(undefined, true)).toBeNull();
	});
});

it('parses either decimal separator and rejects extra precision or invalid text', () => {
	for (const value of ['12.5', '12,5', ' 12,5 ']) expect(parsePriceInput(value)).toBe(12.5);
	expect(parsePriceInput('12')).toBe(12);
	expect(parsePriceInput('')).toBeUndefined();
	for (const value of ['12.55', '12,55', '12,5.0', 'abc', '1e2'])
		expect(parsePriceInput(value)).toBeNaN();
});
