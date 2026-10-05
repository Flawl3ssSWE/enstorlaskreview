import type { SodaRatingValues } from './bar-review';

export interface ReviewStatisticProduct {
	title: string;
	slug: string;
	value: number;
}

export interface PublicReviewStatistics {
	totalReviews: number;
	productCount: number;
	brandCount: number;
	sodaReviewCount: number;
	averageSodaScore: number | null;
	priceReviewCount: number;
	averagePrice: number | null;
	unitPriceReviewCount: number;
	averagePricePerLiter: number | null;
	repurchaseReviewCount: number;
	averageRepurchasePotential: number | null;
	favoriteReviewCount: number;
	favoriteCount: number;
	favoritePercentage: number | null;
	ratingAverages: Array<{ key: keyof SodaRatingValues; average: number | null; count: number }>;
	topRatedProducts: ReviewStatisticProduct[];
	bestValueProducts: ReviewStatisticProduct[];
}
