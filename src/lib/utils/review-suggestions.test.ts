import { describe, expect, it } from 'vitest';
import { suggestBrand, suggestContainer, suggestIce, suggestionValue } from './review-suggestions';

describe('editor suggestions', () => {
	it('matches normalized brand prefixes, preferring the longest', () => {
		expect(suggestBrand('  CÓCA-COLA Zero', ['Cola', 'Coca Cola'])).toBe('Coca Cola');
		expect(suggestBrand('Spirit of Sweden Fish', ['Spirit', 'Spirit of Sweden'])).toBe(
			'Spirit of Sweden'
		);
		expect(suggestBrand('Fantastisk', ['Fanta'])).toBe('');
		expect(suggestBrand('Unknown', ['Fanta'])).toBe('');
		expect(suggestBrand('Special', [], [{ title: 'Special', brand: 'Fanta' }])).toBe('Fanta');
	});
	it.each([250, 330, 355, 500])('suggests a can for %i ml', (volume) => {
		expect(suggestContainer(volume)).toBe('Burk');
	});
	it('recognizes SodaStream and other bottle sizes', () => {
		expect(suggestContainer(800)).toBe('SodaStream smak');
		for (const volume of [200, 400, 750, 1000, 473.5])
			expect(suggestContainer(volume)).toBe('Flaska');
		for (const volume of [undefined, 0, -1, NaN, Infinity])
			expect(suggestContainer(volume)).toBeUndefined();
	});
	it('suggests no ice only when drinking from the original container', () => {
		expect(suggestIce(['Originalförpackning'])).toBe(false);
		expect(suggestIce(['Originalförpackning', 'Sugrör'])).toBe(false);
		for (const methods of [
			[],
			['Glas'],
			['Originalförpackning', 'Glas'],
			['Originalförpackning', 'Mugg']
		] as const)
			expect(suggestIce([...methods])).toBeUndefined();
	});
	it('preserves loaded values until source changes and locks manual overrides', () => {
		expect(suggestionValue('Burk', null, '330', '330')).toBeNull();
		expect(suggestionValue('Burk', null, '330', '500')).toBe('Burk');
		expect(suggestionValue('Burk', 'Glasflaska', undefined, '500')).toBe('Glasflaska');
		expect(suggestionValue('Burk', undefined, undefined, '500')).toBe('Burk');
		expect(suggestionValue(false, true, undefined, 'changed')).toBe(true);
	});
});
