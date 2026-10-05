import { describe, expect, it } from 'vitest';
import { generateSlug, sanitizeSlug, generateSodaId } from './slug';

describe('generateSlug', () => {
	it('converts Swedish characters to ascii', () => {
		expect(generateSlug('Öl på Ångbåten')).toBe('ol-pa-angbaten');
	});

	it('removes special characters and collapses separators', () => {
		expect(generateSlug('  Hello,   world___bar!!  ')).toBe('hello-world-bar');
	});

	it('returns an empty string for input with only separators', () => {
		expect(generateSlug('___   ---')).toBe('');
	});
});

describe('slug sanitization', () => {
	it('sanitizeSlug keeps letters, digits, accents, and hyphens', () => {
		expect(sanitizeSlug('  Café åäö ! test---slug  ')).toBe('Café-åäö-test-slug');
	});
});

describe('soda IDs entered in the generator', () => {
	it.each([
		['rockstar-guava-zero', 'rockstar-guava-zero'],
		[' Rockstar Guava Zero ', 'rockstar-guava-zero'],
		['Rockstar__Guava--Zero', 'rockstar-guava-zero'],
		['ÅÄÖ Café Zero', 'aao-cafe-zero'],
		['zero-2', 'zero-2'],
		['-- !! __ ', '']
	])('formats %s as %s', (input, expected) => {
		expect(generateSodaId(input)).toBe(expected);
	});
});
