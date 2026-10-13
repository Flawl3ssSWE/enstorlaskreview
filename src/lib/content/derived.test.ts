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
	it('compares nutrient concentration separately from whole-package contents', () => {
		const statistics = buildReviewStatistics([
			{
				...soda,
				slug: 'liten',
				volumeMl: 250,
				caffeineMgPer100Ml: 40,
				proteinGPerContainer: 15,
				carbohydrateGPer100Ml: 12
			},
			{
				...soda,
				slug: 'stor',
				volumeMl: 1000,
				caffeineMgPer100Ml: undefined,
				caffeineMgPerContainer: 200,
				proteinGPerContainer: 30,
				carbohydrateGPer100Ml: undefined,
				carbohydrateGPerContainer: 80
			}
		]);
		const caffeine = statistics.nutrients.find(({ key }) => key === 'caffeine')!;
		expect(caffeine.highestPer100Ml).toMatchObject([{ slug: 'liten', value: 40 }]);
		expect(caffeine.highestPerContainer).toMatchObject([
			{ slug: 'stor', value: 200, volumeMl: 1000 }
		]);
		const protein = statistics.nutrients.find(({ key }) => key === 'protein')!;
		expect(protein.highestPer100Ml).toMatchObject([{ slug: 'liten', value: 6 }]);
		expect(protein.highestPerContainer).toMatchObject([{ slug: 'stor', value: 30 }]);
		const carbohydrate = statistics.nutrients.find(({ key }) => key === 'carbohydrate')!;
		expect(carbohydrate.highestPer100Ml).toMatchObject([{ slug: 'liten', value: 12 }]);
		expect(carbohydrate.highestPerContainer).toMatchObject([{ slug: 'stor', value: 80 }]);
		for (const nutrient of statistics.nutrients) {
			expect(nutrient.per100MlCount).toBe(2);
			expect(nutrient.perContainerCount).toBe(2);
		}
	});
	it('keeps unknown nutrient amounts and unknown volumes out of the corresponding comparisons', () => {
		const statistics = buildReviewStatistics([
			{ ...review, slug: 'endast-total', caffeineMgPerContainer: 150 },
			{ ...review, slug: 'endast-koncentration', proteinGPer100Ml: 2 },
			{ ...review, slug: 'noll', carbohydrateGPer100Ml: 0, volumeMl: 330 },
			review
		]);
		expect(statistics.nutrients).toMatchObject([
			{
				key: 'caffeine',
				per100MlCount: 0,
				perContainerCount: 1,
				highestPer100Ml: [],
				highestPerContainer: [{ slug: 'endast-total', value: 150 }]
			},
			{
				key: 'protein',
				per100MlCount: 1,
				perContainerCount: 0,
				highestPer100Ml: [{ slug: 'endast-koncentration', value: 2 }],
				highestPerContainer: []
			},
			{
				key: 'carbohydrate',
				per100MlCount: 1,
				perContainerCount: 1,
				highestPer100Ml: [{ slug: 'noll', value: 0 }],
				highestPerContainer: [{ slug: 'noll', value: 0 }]
			}
		]);
	});
	it('preserves nutrient ties across entered bases without rounding comparisons or mutating reviews', () => {
		const reviews = [
			{ ...review, title: 'B', slug: 'b', caffeineMgPerContainer: 160, volumeMl: 500 },
			{ ...review, title: 'A', slug: 'a', caffeineMgPer100Ml: 32, volumeMl: 500 },
			{ ...review, title: 'C', slug: 'c', caffeineMgPer100Ml: 31.999, volumeMl: 500 }
		];
		const before = structuredClone(reviews);
		const caffeine = buildReviewStatistics(reviews).nutrients[0];
		expect(caffeine.highestPer100Ml.map(({ slug }) => slug)).toEqual(['a', 'b']);
		expect(caffeine.highestPerContainer.map(({ slug }) => slug)).toEqual(['a', 'b']);
		expect(caffeine.highestPerContainer[0].value).toBe(160);
		expect(reviews).toEqual(before);
		expect(
			buildReviewStatistics([]).nutrients.every(
				(nutrient) =>
					nutrient.highestPer100Ml.length === 0 &&
					nutrient.highestPerContainer.length === 0 &&
					nutrient.per100MlCount === 0 &&
					nutrient.perContainerCount === 0
			)
		).toBe(true);
	});
	it('shows both extremes of liter prices and ignores reviews without a usable volume', () => {
		const statistics = buildReviewStatistics([
			{ ...soda, slug: 'billig', beerPriceKr: 10, volumeMl: 1000 },
			{ ...soda, slug: 'dyr', beerPriceKr: 25, volumeMl: 250 },
			{ ...soda, slug: 'utan-volym', beerPriceKr: 999, volumeMl: undefined }
		]);
		expect(statistics.bestValueProducts).toMatchObject([{ slug: 'billig', value: 10 }]);
		expect(statistics.mostExpensiveProducts).toMatchObject([{ slug: 'dyr', value: 100 }]);
		expect(buildReviewStatistics([]).mostExpensiveProducts).toEqual([]);
	});
});
