import {
	OVERALL_RATING_LEVELS,
	SODA_RATING_METRICS,
	TASTING_RATING_METRICS
} from '../review-metadata';
import { ratingFromAverage } from '../utils/ratings';
import type { reviewOverview } from './review-overview';

export const CALIBRATION_METRICS = {
	v2: TASTING_RATING_METRICS.map(({ key, label, weight }) => ({
		key: `v2-rating-${key}`,
		label,
		weight
	})),
	weighted: SODA_RATING_METRICS.filter(({ weight }) => weight > 0).map(
		({ key, label, weight }) => ({
			key: key === 'sweetness' ? 'sweetnessBalance' : key,
			label: key === 'sweetness' ? 'Sötmabalans' : label,
			weight: weight * 100
		})
	)
};

export type CalibrationModel = keyof typeof CALIBRATION_METRICS;
export type CalibrationWeights = Record<string, number>;

export function defaultCalibrationWeights(model: CalibrationModel): CalibrationWeights {
	return Object.fromEntries(CALIBRATION_METRICS[model].map(({ key, weight }) => [key, weight]));
}

export function calibratedScore(
	model: CalibrationModel,
	weights: CalibrationWeights,
	valueFor: (key: string) => number
): number | undefined {
	const metrics = CALIBRATION_METRICS[model];
	const total = metrics.reduce((sum, { key }) => sum + weights[key], 0);
	if (total === 0 || metrics.every(({ key, weight }) => weights[key] === weight)) return;
	return metrics.reduce((sum, { key }) => sum + valueFor(key) * weights[key], 0) / total;
}

export function calibrateOverview(
	review: ReturnType<typeof reviewOverview>,
	model: CalibrationModel,
	weights: CalibrationWeights
): ReturnType<typeof reviewOverview> {
	if (review.scoreModel !== model) return review;
	const score = calibratedScore(model, weights, (key) =>
		key === 'sweetnessBalance'
			? review.sweetnessBalance!
			: review.metrics.find((metric) => metric.key === key)!.value!
	);
	if (score === undefined) return review;
	const next = OVERALL_RATING_LEVELS.find(({ minimum }) => minimum > score);
	return {
		...review,
		model: model === 'v2' ? 'Kalibrerad läskmodell V2' : 'Kalibrerad läskmodell',
		score,
		rating: ratingFromAverage(score),
		nextRating: next?.rating,
		remaining: next ? next.minimum - score : null
	};
}
