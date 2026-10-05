import { describe, expect, it } from 'vitest';
import alex from '../../../tests/fixtures/content/testsoda.json';
import robin from '../../../tests/fixtures/content/testsoda-robin.json';
import { SODA_RATING_METRICS } from '../review-metadata';
import { validateReview } from './validation';
import { favoriteLabel, reviewerKey, selectReviewer, sodaScore, sweetnessBalance } from './soda';

describe('independent soda scores and reviewers', () => {
	it.each([
		[0, 0],
		[1.5, 2.5],
		[3, 5],
		[4, 2.5],
		[5, 0]
	])('maps sweetness %s to balance %s', (value, expected) => {
		expect(sweetnessBalance(value)).toBe(expected);
	});
	it('uses the agreed weights and ignores runniness intensity', () => {
		expect(SODA_RATING_METRICS.reduce((sum, metric) => sum + metric.weight, 0)).toBeCloseTo(1);
		const ratings = alex.sodaRatings;
		expect(sodaScore(ratings)).toBeCloseTo(5);
		expect(sodaScore({ ...ratings, mouthfeel: 0 })).toBeCloseTo(5);
		expect(sodaScore({ ...ratings, sweetness: 5 })).toBeCloseTo(4.25);
		expect(sodaScore({ ...ratings, mouthfeelMatch: 0 })).toBeCloseTo(4.5);
	});
	it('keeps separate posts by different reviewers independent', () => {
		const first = validateReview(alex, 'testsoda.json');
		const second = validateReview(robin, 'testsoda-robin.json');
		expect(first.title).toBe(second.title);
		expect(first.rating).toBe(3);
		expect(second.rating).toBe(0);
		expect(selectReviewer(first, 'alex')).toBe(first);
		expect(selectReviewer(second, 'alex')).toBeUndefined();
		expect(selectReviewer(first, 'robin')).toBeUndefined();
		expect(selectReviewer(second, 'robin')).toBe(second);
		expect(favoriteLabel(first)).toBe('Läskfavorit');
		expect(favoriteLabel(second)).toBeUndefined();
	});
	it('does not promote legacy recommendations to favorites', () => {
		const legacy = {
			...validateReview(alex, 'testsoda.json'),
			favorite: undefined,
			recommended: true
		};
		expect(favoriteLabel(legacy)).toBeUndefined();
	});
	it('normalizes reviewer names for filtering', () => {
		expect(reviewerKey(' ALEX ')).toBe('alex');
		expect(reviewerKey('A\u030aSA')).toBe(reviewerKey('Åsa'));
	});
});
