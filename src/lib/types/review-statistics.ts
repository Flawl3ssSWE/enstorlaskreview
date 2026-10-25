import type { SodaRatingValues } from './bar-review';

export interface ReviewStatisticProduct {
	title: string;
	slug: string;
	value: number;
}

export interface NutrientStatisticProduct extends ReviewStatisticProduct {
	author: string;
	volumeMl?: number;
}

export interface NutrientStatistic {
	key: 'caffeine' | 'protein' | 'carbohydrate';
	label: string;
	unit: 'mg' | 'g';
	per100MlCount: number;
	perContainerCount: number;
	highestPer100Ml: NutrientStatisticProduct[];
	highestPerContainer: NutrientStatisticProduct[];
}

export interface BrandStatistic {
	brand: string;
	reviewCount: number;
	priceReviewCount: number;
	unitPriceReviewCount: number;
	averagePrice: number | null;
	averagePricePerLiter: number | null;
	averageClPerKrona: number | null;
}

export interface PublicReviewStatistics {
	totalReviews: number;
	productCount: number;
	brandCount: number;
	sodaReviewCount: number;
	averageSodaScore: number | null;
	priceReviewCount: number;
	averagePrice: number | null;
	totalRecordedSpend: number;
	unitPriceReviewCount: number;
	averagePricePerLiter: number | null;
	averageClPerKrona: number | null;
	brands: BrandStatistic[];
	repurchaseReviewCount: number;
	averageRepurchasePotential: number | null;
	favoriteReviewCount: number;
	favoriteCount: number;
	favoritePercentage: number | null;
	ratingAverages: Array<{ key: keyof SodaRatingValues; average: number | null; count: number }>;
	topRatedProducts: ReviewStatisticProduct[];
	bestValueProducts: ReviewStatisticProduct[];
	mostExpensiveProducts: ReviewStatisticProduct[];
	nutrients: NutrientStatistic[];
}
