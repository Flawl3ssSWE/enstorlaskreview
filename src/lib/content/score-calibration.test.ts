import { expect, it } from 'vitest';
import sodaFixture from '../../../tests/fixtures/content/testsoda.json';
import legacyFixture from '../../../tests/fixtures/content/hallonsoda.json';
import venueFixture from '../../../tests/fixtures/content/testbaren.json';
import tastingFixture from '../../../docs/soda-review-example.json';
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
	expect(calibrateOverview(review, 'weighted', defaultCalibrationWeights('weighted'))).toBe(review);
	expect(
		calibrateOverview(
			review,
			'weighted',
			Object.fromEntries(Object.keys(defaultCalibrationWeights('weighted')).map((key) => [key, 0]))
		)
	).toBe(review);
});

it('normalizes custom weights and recalculates ratings and distances before rounding', () => {
	const weights = { ...defaultCalibrationWeights('weighted'), taste: 100 };
	const result = calibrateOverview(review, 'weighted', weights);
	expect(result.score).toBeCloseTo(475 / 170);
	expect(result.rating).toBe(1);
	expect(result.nextRating).toBe(2);
	expect(result.remaining).toBeCloseTo(3.5 - 475 / 170);
	expect(result.model).toBe('Kalibrerad läskmodell');
	expect(review.model).toBe('Viktad läskmodell');
});

it('uses sweetness balance and excludes raw consistency and separate assessments', () => {
	const weights = Object.fromEntries(
		Object.keys(defaultCalibrationWeights('weighted')).map((key) => [
			key,
			key === 'sweetnessBalance' ? 100 : 0
		])
	);
	expect(calibrateOverview(review, 'weighted', weights).score).toBe(0);
	weights.sweetnessBalance = 0;
	weights.value = 100;
	expect(calibrateOverview(review, 'weighted', weights)).toMatchObject({
		score: 5,
		rating: 3,
		remaining: null,
		nextRating: undefined
	});
});

it('preserves legacy soda and venue models', () => {
	for (const fixture of [legacyFixture, venueFixture]) {
		const row = reviewOverview(validateReview(fixture, `${fixture.slug}.json`));
		expect(
			calibrateOverview(row, 'weighted', { ...defaultCalibrationWeights('weighted'), taste: 100 })
		).toBe(row);
	}
});

it('uses the four V2 quality ratings and shared mug thresholds for calibration', () => {
	const row = reviewOverview(validateReview(tastingFixture, 'exempellask.json'));
	const defaults = defaultCalibrationWeights('v2');
	expect(defaults).toEqual({
		'v2-rating-taste': 40,
		'v2-rating-balance': 25,
		'v2-rating-aftertaste': 20,
		'v2-rating-mouthfeel': 15
	});
	expect(calibrateOverview(row, 'v2', defaults)).toBe(row);
	const weights = Object.fromEntries(Object.keys(defaults).map((key) => [key, 0]));
	expect(calibrateOverview(row, 'v2', weights)).toBe(row);
	weights['v2-rating-taste'] = 60;
	weights['v2-rating-balance'] = 40;
	expect(calibrateOverview(row, 'v2', weights)).toMatchObject({
		model: 'Kalibrerad läskmodell V2',
		score: 4.4,
		rating: 2,
		nextRating: 3
	});
	expect(calibrateOverview(row, 'v2', weights).remaining).toBeCloseTo(0.1);
	weights['v2-rating-balance'] = 60;
	expect(calibrateOverview(row, 'v2', weights)).toMatchObject({
		score: 4.5,
		rating: 3,
		remaining: null
	});
	expect(calibrateOverview(review, 'v2', weights)).toBe(review);
});
