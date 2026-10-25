import { describe, expect, it } from 'vitest';
import { REVIEW_RATING_METRICS } from '$lib/review-metadata';
import { calculateOverallRating, ratingFromAverage } from './ratings';

describe('calculateOverallRating', () => {
	it('returns 0 when all category scores are 0', () => {
		expect(calculateOverallRating([0, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
	});

	it('returns 1 when the weighted average reaches 2.5', () => {
		expect(calculateOverallRating([2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5])).toBe(1);
	});

	it('returns 2 for strong scores below the 3 threshold', () => {
		expect(calculateOverallRating([4, 4, 4, 4, 4, 4, 4, 4])).toBe(2);
	});

	it('returns 3 only for excellent scores', () => {
		expect(calculateOverallRating([5, 5, 5, 5, 5, 5, 5, 5])).toBe(3);
	});

	it('does not return 3 for a high but not excellent weighted score', () => {
		expect(calculateOverallRating([4, 5, 4, 4, 4, 4, 4, 4])).toBe(2);
	});

	it('uses the review metadata weights in field order', () => {
		expect(REVIEW_RATING_METRICS.map((metric) => metric.key)).toEqual([
			'atmosphere',
			'service',
			'selection',
			'quality',
			'price',
			'cleanliness',
			'soundLevel',
			'barhopPotential'
		]);
		expect(REVIEW_RATING_METRICS.map((metric) => metric.weight)).toEqual([
			0.18, 0.14, 0.1, 0.18, 0.07, 0.12, 0.03, 0.18
		]);
	});
});

it.each([
	[0, 0],
	[2, 0],
	[2.499999, 0],
	[2.5, 1],
	[3.25, 1],
	[3.499999, 1],
	[3.5, 2],
	[4.499999, 2],
	[4.5, 3],
	[5, 3]
])('maps exact weighted score %s to rating %s', (score, rating) => {
	expect(ratingFromAverage(score)).toBe(rating);
});
