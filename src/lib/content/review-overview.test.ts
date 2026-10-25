import { expect, it } from 'vitest';
import sodaFixture from '../../../tests/fixtures/content/testsoda.json';
import venueFixture from '../../../tests/fixtures/content/testbaren.json';
import { validateReview } from './validation';
import { reviewOverview } from './review-overview';

it('shows the real weighted score and transformed sweetness without changing authored ratings', () => {
	const review = validateReview(
		{
			...sodaFixture,
			sodaRatings: { ...sodaFixture.sodaRatings, sweetness: 5 },
			venueRatings: { atmosphere: 2, service: 3, selection: 4, cleanliness: 5, soundLevel: 1 }
		},
		'testsoda.json'
	);
	const row = reviewOverview(review);
	expect(row.score).toBeCloseTo(4.25);
	expect(row.isSoda).toBe(true);
	expect(row.metrics.find(({ key }) => key === 'atmosphere')?.value).toBe(2);
	expect(row.metrics.find(({ key }) => key === 'sweetness')?.value).toBe(5);
	expect(row.rating).toBe(2);
	expect(row.sweetnessBalance).toBe(0);
	expect(row.metrics.find(({ label }) => label === 'Sötma')?.value).toBe(5);
	expect(row.remaining).toBeCloseTo(0.25);
	expect(row.nextRating).toBe(3);
});

it('reports the next threshold without rounding and handles the highest rating', () => {
	const review = validateReview(sodaFixture, 'testsoda.json');
	expect(reviewOverview(review)).toMatchObject({ score: 5, rating: 3, remaining: null });
	const row = reviewOverview(
		validateReview(
			{
				...sodaFixture,
				sodaRatings: {
					taste: 1,
					sweetness: 1,
					carbonation: 1,
					mouthfeel: 1,
					mouthfeelMatch: 1,
					drinkability: 1,
					matchesName: 1,
					value: 1
				}
			},
			'testsoda.json'
		)
	);
	expect(row.score).toBeCloseTo(1.1);
	expect(row.rating).toBe(0);
	expect(row.remaining).toBeCloseTo(1.4);
	expect(row.nextRating).toBe(1);
});

it('keeps legacy soda and venue calculations distinct and unknown fields unassessed', () => {
	const { mouthfeelMatch: _unused, ...ratings } = sodaFixture.sodaRatings;
	const legacy = reviewOverview(
		validateReview({ ...sodaFixture, sodaRatings: { ...ratings, sweetness: 5 } }, 'testsoda.json')
	);
	expect(legacy.model).toBe('Äldre läskmodell');
	expect(legacy.isSoda).toBe(true);
	expect(legacy.score).toBe(5);
	expect(legacy.sweetnessBalance).toBeUndefined();
	const venue = reviewOverview(validateReview(venueFixture, 'testbaren.json'));
	expect(venue.model).toBe('Platsmodell');
	expect(venue.isSoda).toBe(false);
	expect(venue.score).toBeCloseTo(4);
	expect(venue.remaining).toBeCloseTo(0.5);
	expect(venue.favorite).toBeUndefined();
	expect(venue.repurchasePotential).toBeUndefined();
	expect(venue.metrics.find(({ label }) => label === 'Atmosfär')?.value).toBe(4);
});

it('keeps a 3.3 score at 1/3 with 0.2 points remaining to 2/3', () => {
	const review = validateReview(
		{
			...sodaFixture,
			sodaRatings: {
				taste: 3,
				sweetness: 3,
				carbonation: 3,
				mouthfeel: 3,
				mouthfeelMatch: 3,
				drinkability: 3,
				matchesName: 3,
				value: 3
			}
		},
		'testsoda.json'
	);
	const row = reviewOverview(review);
	expect(row.score).toBeCloseTo(3.3);
	expect(row.rating).toBe(1);
	expect(row.nextRating).toBe(2);
	expect(row.remaining).toBeCloseTo(0.2);
});
