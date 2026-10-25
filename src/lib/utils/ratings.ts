import { REVIEW_RATING_METRICS, OVERALL_RATING_LEVELS } from '../review-metadata.ts';

export function calculateWeightedRating(values: number[]): number {
	return REVIEW_RATING_METRICS.reduce(
		(sum, metric, index) => sum + (values[index] ?? 0) * metric.weight,
		0
	);
}

export function calculateOverallRating(values: number[]): number {
	return ratingFromAverage(calculateWeightedRating(values));
}

export function ratingFromAverage(weighted: number): number {
	return OVERALL_RATING_LEVELS.findLast(({ minimum }) => weighted >= minimum)?.rating ?? 0;
}
