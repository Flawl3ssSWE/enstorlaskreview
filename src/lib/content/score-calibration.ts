import { OVERALL_RATING_LEVELS, SODA_RATING_METRICS } from '../review-metadata';
import { ratingFromAverage } from '../utils/ratings';
import type { reviewOverview } from './review-overview';

export const CALIBRATION_METRICS = SODA_RATING_METRICS.filter(({ weight }) => weight > 0);
export type CalibrationWeights = Record<string, number>;

export function defaultCalibrationWeights(): CalibrationWeights {
	return Object.fromEntries(CALIBRATION_METRICS.map(({ key, weight }) => [key, weight * 100]));
}

export function calibrateOverview(
	review: ReturnType<typeof reviewOverview>,
	weights: CalibrationWeights
): ReturnType<typeof reviewOverview> {
	const total = CALIBRATION_METRICS.reduce((sum, { key }) => sum + weights[key], 0);
	if (
		review.sweetnessBalance === undefined ||
		total === 0 ||
		CALIBRATION_METRICS.every(({ key, weight }) => weights[key] === weight * 100)
	)
		return review;
	const score =
		CALIBRATION_METRICS.reduce((sum, { key }) => {
			const value =
				key === 'sweetness'
					? review.sweetnessBalance!
					: review.metrics.find((metric) => metric.key === key)!.value!;
			return sum + value * weights[key];
		}, 0) / total;
	const next = OVERALL_RATING_LEVELS.find(({ minimum }) => minimum > score);
	return {
		...review,
		model: 'Kalibrerad läskmodell',
		score,
		rating: ratingFromAverage(score),
		nextRating: next?.rating,
		remaining: next ? next.minimum - score : null
	};
}
