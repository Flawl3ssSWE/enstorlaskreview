import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/content/testbaren.json';
import sodaFixture from '../../../tests/fixtures/content/testsoda.json';
import otherSodaFixture from '../../../tests/fixtures/content/testsoda-robin.json';
import { validateReview } from './validation';
import { buildReviewMap, buildReviewStatistics } from './derived';
const review = validateReview(fixture, 'testbaren.json');
const soda = validateReview(sodaFixture, 'testsoda.json');
const otherSoda = validateReview(otherSodaFixture, 'testsoda-robin.json');
describe('public derived content', () => {
	it('handles empty statistics and a map without markers', () => {
		expect(buildReviewStatistics([])).toMatchObject({
			totalReviews: 0,
			productCount: 0,
			brandCount: 0,
			averageSodaScore: null,
			averagePrice: null,
			averagePricePerLiter: null,
			favoritePercentage: null,
			averageRepurchasePotential: null,
			repurchaseReviewCount: 0,
			topRatedProducts: [],
			bestValueProducts: []
		});
		expect(
			buildReviewStatistics([]).ratingAverages.every(
				(metric) => metric.average === null && metric.count === 0
			)
		).toBe(true);
		expect(buildReviewMap([])).toEqual({ totalReviews: 0, markers: [] });
	});
	it('counts products once and uses soda scores without mixing in venue scores', () => {
		const statistics = buildReviewStatistics([
			{ ...soda, beerBrand: ' Pepsi ' },
			{ ...otherSoda, beerBrand: 'pepsi' },
			review
		]);
		expect(statistics).toMatchObject({
			totalReviews: 3,
			productCount: 2,
			brandCount: 2,
			sodaReviewCount: 2,
			averageSodaScore: 2.5,
			favoriteReviewCount: 2,
			favoriteCount: 1,
			favoritePercentage: 50,
			averageRepurchasePotential: 2.5,
			repurchaseReviewCount: 2,
			priceReviewCount: 3,
			unitPriceReviewCount: 2
		});
		expect(statistics.averagePricePerLiter).toBeCloseTo(((20 * 1000) / 330 + 20) / 2);
		expect(statistics.topRatedProducts).toEqual([
			{ title: 'Testläsk', slug: 'testsoda', value: 5 }
		]);
		expect(statistics.bestValueProducts).toEqual([
			{ title: 'Testläsk', slug: 'testsoda-robin', value: 20 }
		]);
		expect(statistics.ratingAverages.find(({ key }) => key === 'sweetness')).toEqual({
			key: 'sweetness',
			average: 4,
			count: 2
		});
	});
	it('excludes missing prices, volumes, favorites and optional subscores from averages', () => {
		const statistics = buildReviewStatistics([
			{
				...soda,
				beerPriceKr: undefined,
				favorite: undefined,
				sodaRatings: { ...soda.sodaRatings!, mouthfeelMatch: undefined }
			},
			{ ...otherSoda, volumeMl: undefined },
			{ ...review, volumeMl: 0 }
		]);
		expect(statistics.priceReviewCount).toBe(2);
		expect(statistics.averagePrice).toBe(47.5);
		expect(statistics.averagePricePerLiter).toBeNull();
		expect(statistics.bestValueProducts).toEqual([]);
		expect(statistics.favoritePercentage).toBe(0);
		expect(statistics.ratingAverages.find(({ key }) => key === 'mouthfeelMatch')).toEqual({
			key: 'mouthfeelMatch',
			average: 0,
			count: 1
		});
	});
	it('excludes missing assessments but includes zero repurchase potential', () => {
		const statistics = buildReviewStatistics([
			{ ...soda, favorite: undefined, repurchasePotential: undefined, recommended: true },
			otherSoda
		]);
		expect(statistics.favoriteReviewCount).toBe(1);
		expect(statistics.favoriteCount).toBe(0);
		expect(statistics.averageRepurchasePotential).toBe(0);
		expect(statistics.repurchaseReviewCount).toBe(1);
	});
	it('preserves ranking ties in a stable order without changing the input', () => {
		const reviews = [soda, { ...soda, slug: 'andra', title: 'Andra' }];
		const statistics = buildReviewStatistics(reviews);
		expect(statistics.topRatedProducts.map(({ slug }) => slug)).toEqual(['andra', 'testsoda']);
		expect(statistics.bestValueProducts.map(({ slug }) => slug)).toEqual(['andra', 'testsoda']);
		expect(reviews[0].slug).toBe('testsoda');
	});
	it('keeps reviews without coordinates out of the map only', () => {
		const map = buildReviewMap([
			review,
			{ ...review, slug: 'unmapped', latitude: undefined, longitude: undefined }
		]);
		expect(map.totalReviews).toBe(2);
		expect(map.markers).toHaveLength(1);
		expect(map.markers[0]).toMatchObject({
			slug: 'testbaren',
			beerPriceKr: 65,
			isHappyHourPrice: true
		});
	});
});
