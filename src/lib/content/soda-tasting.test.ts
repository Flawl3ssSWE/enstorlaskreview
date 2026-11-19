import { expect, it } from 'vitest';
import tastingFixture from '../../../docs/soda-review-example.json';
import sodaFixture from '../../../tests/fixtures/content/testsoda.json';
import { buildReviewStatistics } from './derived';
import { relatedSodaReviews } from './related';
import { reviewOverview } from './review-overview';
import { calibrateOverview, defaultCalibrationWeights } from './score-calibration';
import { reviewScore } from './soda';
import { validateReview } from './validation';
import { reviewStructuredData } from './seo';

const tasting = tastingFixture.sodaTasting;
const validateTasting = (sodaTasting: unknown) =>
	validateReview({ ...tastingFixture, sodaTasting }, 'exempellask.json');

it.each([2, 3, 4])('assigns a mug at the exact %i.5 threshold', (base) => {
	const ratings = { taste: base, balance: base, aftertaste: base, mouthfeel: base };
	const exact = validateTasting({
		...tasting,
		ratings: {
			...ratings,
			taste: base + 1,
			balance: base - 1,
			aftertaste: base + 1,
			mouthfeel: base + 1
		}
	});
	const below = validateTasting({
		...tasting,
		ratings: { ...ratings, balance: base + 1, aftertaste: base + 1 }
	});
	expect(reviewScore(exact)).toBe(base + 0.5);
	expect(exact.rating).toBe(base - 1);
	expect(reviewScore(below)).toBe(base + 0.45);
	expect(below.rating).toBe(base - 2);
});

it('uses only quality ratings to score V2 and accepts one as the lowest score', () => {
	const review = validateTasting({ ...tasting, extras: { name: 1, packaging: 2, value: 5 } });
	const variedProfile = validateTasting({
		...tasting,
		profile: { sweetness: 5, acidity: 1, carbonation: 1, body: 5, bitterness: 5 },
		extras: { name: 5, packaging: 5, value: 1 }
	});
	expect(reviewScore(review)).toBe(4.25);
	expect(reviewScore(variedProfile)).toBe(4.25);
	expect(review.rating).toBe(2);
	expect(variedProfile.rating).toBe(2);
	expect(review.sodaTasting?.extras).toEqual({ name: 1, packaging: 2, value: 5 });
	const minimum = validateTasting({
		...tasting,
		ratings: { taste: 1, balance: 1, aftertaste: 1, mouthfeel: 1 }
	});
	expect(reviewScore(minimum)).toBe(1);
	expect(minimum.rating).toBe(0);
});

it.each([
	{ profile: { ...tasting.profile, acidity: undefined } },
	{ profile: { ...tasting.profile, acidity: 2.5 } },
	{ profile: { ...tasting.profile, acidity: 0 } },
	{ profile: { ...tasting.profile, secret: 0 } },
	{ ratings: { ...tasting.ratings, aftertaste: 0 } },
	{ ratings: { ...tasting.ratings, mouthfeel: 6 } },
	{ ratings: { ...tasting.ratings, balance: '4' } },
	{ extras: undefined },
	{ extras: { ...tasting.extras, name: undefined } },
	{ extras: { ...tasting.extras, packaging: undefined } },
	{ extras: { ...tasting.extras, value: undefined } },
	{ extras: { ...tasting.extras, packaging: null } },
	{ extras: { ...tasting.extras, packaging: 0 } },
	{ extras: { secret: 'hidden' } },
	{ notes: 'Tidigare smakord' },
	{ unknown: {} }
])('rejects invalid V2 values %#', (change) => {
	expect(() => validateTasting({ ...tasting, ...change })).toThrow();
});

it.each([0, undefined])('rejects invalid V2 repurchase potential %s', (repurchasePotential) => {
	expect(() =>
		validateReview({ ...tastingFixture, repurchasePotential }, 'exempellask.json')
	).toThrow(/Återköpspotential/i);
});

it('requires V2 venue ratings to start at one', () => {
	expect(() =>
		validateReview(
			{
				...tastingFixture,
				venueRatings: { atmosphere: 3, service: 0, selection: 3, cleanliness: 3, soundLevel: 3 }
			},
			'exempellask.json'
		)
	).toThrow('Service måste vara ett heltal mellan 1 och 5.');
});

it('keeps existing venue scores and requires all three additional scores when assessed', () => {
	const original = { atmosphere: 3, service: 3, selection: 3, cleanliness: 3, soundLevel: 3 };
	const extended = { ...original, quality: 1, price: 2, barhopPotential: 5 };
	const validateVenue = (venueRatings: unknown) =>
		validateReview({ ...tastingFixture, venueRatings }, 'exempellask.json');
	expect(validateVenue(original).venueRatings).toEqual(original);
	const review = validateVenue(extended);
	expect(review.venueRatings).toEqual(extended);
	expect(reviewScore(review)).toBe(reviewScore(validateVenue(original)));
	expect(reviewOverview(review).metrics).toEqual(
		expect.arrayContaining([
			{ key: 'quality', label: 'Kvalitet', value: 1 },
			{ key: 'price', label: 'Prisvärdhet', value: 2 },
			{ key: 'barhopPotential', label: 'Barhoppotential', value: 5 }
		])
	);
	expect(() => validateVenue({ ...original, quality: 4 })).toThrow('Prisvärdhet');
	expect(() => validateVenue({ ...extended, quality: 0 })).toThrow(
		'Kvalitet måste vara ett heltal mellan 1 och 5.'
	);
});

it('rejects mixed scoring models', () => {
	expect(() =>
		validateReview({ ...tastingFixture, sodaRatings: sodaFixture.sodaRatings }, 'exempellask.json')
	).toThrow('Använd en läskbetygsmodell per recension.');
});

it('supports mixed-model collections without combining their attribute ratings', () => {
	const legacy = validateReview(sodaFixture, 'testsoda.json');
	const review = validateReview({ ...tastingFixture, sodaId: legacy.sodaId }, 'exempellask.json');
	const statistics = buildReviewStatistics([legacy, review]);
	expect(statistics.sodaReviewCount).toBe(2);
	expect(statistics.averageSodaScore).toBe(4.625);
	expect(statistics.ratingAverages.find(({ key }) => key === 'sweetness')).toMatchObject({
		average: 3,
		count: 1
	});
	expect(
		statistics.tastingAverages[0].metrics.find(({ key }) => key === 'sweetness')
	).toMatchObject({
		average: 2,
		count: 1
	});
	expect(relatedSodaReviews(legacy, [review])).toEqual([review]);
	expect(relatedSodaReviews(review, [legacy])).toEqual([legacy]);
	expect(reviewStructuredData(review, '').itemReviewed['@type']).toBe('Product');
	const overview = reviewOverview(review);
	expect(overview).toMatchObject({
		isSoda: true,
		model: 'Läskmodell V2',
		score: 4.25,
		remaining: 0.25
	});
	expect(overview.metrics).toContainEqual({ key: 'v2-profile-acidity', label: 'Surhet', value: 5 });
	expect(
		calibrateOverview(overview, 'weighted', {
			...defaultCalibrationWeights('weighted'),
			taste: 100
		})
	).toBe(overview);
});
