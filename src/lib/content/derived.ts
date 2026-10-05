import type { PublicReview } from '../types/bar-review';
import type { PublicReviewMapData } from '../types/review-map';
import type { PublicReviewStatistics, ReviewStatisticProduct } from '../types/review-statistics';
import { isValidBeerPriceKr } from '../utils/price';
import { drinkVolumeMl } from '../utils/drink-facts';
import { SODA_RATING_METRICS } from '../review-metadata';
import { sodaScore, reviewerKey } from './soda';

export function buildReviewMap(reviews: PublicReview[]): PublicReviewMapData {
	return {
		totalReviews: reviews.length,
		markers: reviews
			.filter((review) => review.latitude !== undefined && review.longitude !== undefined)
			.map((review) => ({
				title: review.title,
				slug: review.slug,
				location: review.location,
				rating: review.rating,
				latitude: review.latitude!,
				longitude: review.longitude!,
				...(isValidBeerPriceKr(review.beerPriceKr)
					? { beerPriceKr: review.beerPriceKr, isHappyHourPrice: review.isHappyHourPrice === true }
					: {})
			}))
	};
}

export function buildReviewStatistics(reviews: PublicReview[]): PublicReviewStatistics {
	const average = (values: number[]): number | null =>
		values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
	const priced = reviews.filter((review) => isValidBeerPriceKr(review.beerPriceKr));
	const sodaReviews = reviews.filter((review) => review.sodaRatings !== undefined);
	const repurchases = reviews.flatMap((review) =>
		review.repurchasePotential === undefined ? [] : [review.repurchasePotential]
	);
	const favorites = reviews.filter((review) => review.favorite !== undefined);
	const favoriteCount = favorites.filter((review) => review.favorite).length;
	const scored = sodaReviews.map((review) => ({
		title: review.title,
		slug: review.slug,
		value: sodaScore(review.sodaRatings!)
	}));
	const unitPrices = priced.flatMap((review) => {
		const volume = drinkVolumeMl(review);
		return volume === undefined
			? []
			: [
					{
						title: review.title,
						slug: review.slug,
						value: (review.beerPriceKr! * 1000) / volume
					}
				];
	});
	const extremes = (products: ReviewStatisticProduct[], direction: 'min' | 'max') => {
		if (!products.length) return [];
		const value = Math[direction](...products.map((product) => product.value));
		return products
			.filter((product) => product.value === value)
			.sort((a, b) => a.title.localeCompare(b.title, 'sv') || a.slug.localeCompare(b.slug));
	};
	return {
		totalReviews: reviews.length,
		productCount: new Set(reviews.map((review) => review.sodaId ?? review.slug)).size,
		brandCount: new Set(
			reviews.flatMap((review) => {
				const brand = review.beerBrand?.trim();
				return brand ? [reviewerKey(brand)] : [];
			})
		).size,
		sodaReviewCount: sodaReviews.length,
		averageSodaScore: average(scored.map((product) => product.value)),
		priceReviewCount: priced.length,
		averagePrice: average(priced.map((review) => review.beerPriceKr!)),
		unitPriceReviewCount: unitPrices.length,
		averagePricePerLiter: average(unitPrices.map((product) => product.value)),
		repurchaseReviewCount: repurchases.length,
		averageRepurchasePotential: average(repurchases),
		favoriteReviewCount: favorites.length,
		favoriteCount,
		favoritePercentage: favorites.length ? (favoriteCount / favorites.length) * 100 : null,
		ratingAverages: SODA_RATING_METRICS.map(({ key }) => {
			const values = sodaReviews.flatMap((review) => {
				const value = review.sodaRatings![key];
				return value === undefined ? [] : [value];
			});
			return { key, average: average(values), count: values.length };
		}),
		topRatedProducts: extremes(scored, 'max'),
		bestValueProducts: extremes(unitPrices, 'min')
	};
}
