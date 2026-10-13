import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistanceKm, isValidCoordinates } from './review-distance';

const origin = { latitude: 57.7089, longitude: 11.9746 };

describe('local straight-line distance', () => {
	it('calculates kilometres symmetrically and handles coincident and antipodal points', () => {
		const stockholm = { latitude: 59.3293, longitude: 18.0686 };
		expect(distanceKm(origin, stockholm)).toBeCloseTo(397.3, 0);
		expect(distanceKm(stockholm, origin)).toBe(distanceKm(origin, stockholm));
		expect(distanceKm(origin, origin)).toBe(0);
		expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })).toBeCloseTo(
			20_015.1,
			0
		);
	});
	it.each([
		null,
		undefined,
		{},
		{ latitude: '0', longitude: 0 },
		{ latitude: NaN, longitude: 0 },
		{ latitude: 0, longitude: Infinity },
		{ latitude: 90.01, longitude: 0 },
		{ latitude: -90.01, longitude: 0 },
		{ latitude: 0, longitude: 180.01 },
		{ latitude: 0, longitude: -180.01 }
	])('omits missing or invalid coordinates: %j', (value) => {
		expect(isValidCoordinates(value)).toBe(false);
		expect(distanceKm(value, origin)).toBeNull();
		expect(distanceKm(origin, value)).toBeNull();
	});
	it('accepts the coordinate boundaries', () => {
		expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
		expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
	});
	it('formats one decimal in Swedish, including zero, and omits invalid distances', () => {
		expect(formatDistanceKm(1.234)).toBe('1,2 km');
		expect(formatDistanceKm(0)).toBe('0,0 km');
		for (const value of [null, undefined, -1, NaN, Infinity]) {
			expect(formatDistanceKm(value)).toBeNull();
		}
	});
});
