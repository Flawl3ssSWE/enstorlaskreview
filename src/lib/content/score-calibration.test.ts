import { expect, it } from 'vitest';
import sodaFixture from '../../../tests/fixtures/content/testsoda.json';
import legacyFixture from '../../../tests/fixtures/content/hallonsoda.json';
import venueFixture from '../../../tests/fixtures/content/testbaren.json';
import { validateReview } from './validation';
import { reviewOverview } from './review-overview';
import { calibrateOverview, defaultCalibrationWeights } from './score-calibration';

const review = reviewOverview(
	validateReview(
		{ ...sodaFixture, sodaRatings: { ...sodaFixture.sodaRatings, sweetness: 5, taste: 2 } },
		'testsoda.json'
	)
);

it('preserves exact original results with default weights or all zero weights', () => {
	expect(calibrateOverview(review, defaultCalibrationWeights())).toBe(review);
	expect(
		calibrateOverview(
			review,
			Object.fromEntries(Object.keys(defaultCalibrationWeights()).map((key) => [key, 0]))
		)
	).toBe(review);
});

it('normalizes custom weights and recalculates ratings and distances before rounding', () => {
	const weights = { ...defaultCalibrationWeights(), taste: 100 };
	const result = calibrateOverview(review, weights);
	expect(result.score).toBeCloseTo(475 / 170);
	expect(result.rating).toBe(1);
	expect(result.nextRating).toBe(2);
	expect(result.remaining).toBeCloseTo(3.5 - 475 / 170);
	expect(result.model).toBe('Kalibrerad läskmodell');
	expect(review.model).toBe('Viktad läskmodell');
});

it('uses sweetness balance and excludes raw consistency and separate assessments', () => {
	const weights = Object.fromEntries(
		Object.keys(defaultCalibrationWeights()).map((key) => [key, key === 'sweetness' ? 100 : 0])
	);
	expect(calibrateOverview(review, weights).score).toBe(0);
	weights.sweetness = 0;
	weights.value = 100;
	expect(calibrateOverview(review, weights)).toMatchObject({
		score: 5,
		rating: 3,
		remaining: null,
		nextRating: undefined
	});
});

it('preserves legacy soda and venue models', () => {
	for (const fixture of [legacyFixture, venueFixture]) {
		const row = reviewOverview(validateReview(fixture, `${fixture.slug}.json`));
		expect(calibrateOverview(row, { ...defaultCalibrationWeights(), taste: 100 })).toBe(row);
	}
});
