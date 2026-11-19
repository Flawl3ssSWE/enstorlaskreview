import { describe, expect, it } from 'vitest';
import {
	fullSodaName,
	suggestBrand,
	suggestContainer,
	suggestIce,
	suggestSodaId,
	suggestionValue
} from './review-suggestions';

it('combines brand and name without repeating a brand already in the name', () => {
	expect(fullSodaName('Zero', 'Coca Cola')).toBe('Coca Cola Zero');
	expect(fullSodaName('Coca-Cola Zero', 'Coca Cola')).toBe('Coca-Cola Zero');
	expect(fullSodaName('Hallonsoda', '')).toBe('Hallonsoda');
});

describe('editor suggestions', () => {
	it('matches normalized brand prefixes, preferring the longest', () => {
		expect(suggestBrand('  CÓCA-COLA Zero', ['Cola', 'Coca Cola'])).toBe('Coca Cola');
		expect(suggestBrand('Spirit of Sweden Fish', ['Spirit', 'Spirit of Sweden'])).toBe(
			'Spirit of Sweden'
		);
		expect(suggestBrand('Fantastisk', ['Fanta'])).toBe('');
		expect(suggestBrand('Unknown', ['Fanta'])).toBe('');
		expect(suggestBrand('Special', [], [{ title: 'Special', beerBrand: 'Fanta' }])).toBe('Fanta');
	});
	it('reuses a saved soda ID for the same brand and name', () => {
		const reviews = [{ title: 'Rockstar Guava Zero', beerBrand: 'Rockstar', sodaId: 'rockstar' }];
		expect(suggestSodaId('Guava Zero', 'Rockstar', reviews)).toBe('rockstar');
		expect(suggestSodaId('  Róckstar Guava–Zero ', 'ROCKSTAR', reviews)).toBe('rockstar');
		expect(suggestSodaId('Guava Zero', 'Monster', reviews)).toBe('monster-guava-zero');
		expect(suggestSodaId('Rockstar', 'Rockstar', reviews)).toBe('rockstar-2');
	});
	it('links a legacy soda with a missing brand and the same full name', () => {
		expect(
			suggestSodaId('Guava Zero', 'Rockstar', [
				{ title: 'Rockstar Guava Zero', sodaId: 'rockstar' }
			])
		).toBe('rockstar');
	});
	it('leaves conflicting matches unlinked', () => {
		expect(
			suggestSodaId('Guava Zero', 'Rockstar', [
				{ title: 'Rockstar Guava Zero', beerBrand: 'Rockstar', sodaId: 'first' },
				{ title: 'Rockstar Guava Zero', beerBrand: 'Rockstar', sodaId: 'second' }
			])
		).toBeUndefined();
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
