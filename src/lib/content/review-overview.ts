import type { PublicReview } from '../types/bar-review';
import {
	OVERALL_RATING_LEVELS,
	REVIEW_RATING_METRICS,
	SODA_RATING_METRICS,
	TASTING_EXTRA_METRICS,
	TASTING_PROFILE_METRICS,
	TASTING_RATING_METRICS,
	VENUE_RATING_METRICS
} from '../review-metadata';
import { calculateWeightedRating } from '../utils/ratings';
import { sodaReviewScore, sweetnessBalance } from './soda';

const MODEL_LABELS = {
	v2: 'Läskmodell V2',
	weighted: 'Viktad läskmodell',
	legacy: 'Äldre läskmodell',
	venue: 'Platsmodell'
};

/** Use each review's own calculation, preserving legacy scoring and unknown assessments. */
export function reviewOverview(review: PublicReview) {
	const soda = review.sodaRatings;
	const tasting = review.sodaTasting;
	const legacy = soda !== undefined && soda.mouthfeelMatch === undefined;
	const scoreModel = tasting ? 'v2' : soda ? (legacy ? 'legacy' : 'weighted') : 'venue';
	const score =
		sodaReviewScore(review) ??
		calculateWeightedRating(REVIEW_RATING_METRICS.map(({ key }) => review[key]!));
	const sodaMetrics = tasting
		? [
				...TASTING_RATING_METRICS.map(({ key, label }) => ({
					key: `v2-rating-${key}`,
					label,
					value: tasting.ratings[key]
				})),
				...TASTING_PROFILE_METRICS.map(({ key, label }) => ({
					key: `v2-profile-${key}`,
					label,
					value: tasting.profile[key]
				})),
				...TASTING_EXTRA_METRICS.map(({ key, label }) => ({
					key: `v2-extra-${key}`,
					label,
					value: tasting.extras[key]
				}))
			]
		: soda && SODA_RATING_METRICS.map(({ key, label }) => ({ key, label, value: soda[key] }));
	const next = OVERALL_RATING_LEVELS.find(({ minimum }) => minimum > score);
	return {
		slug: review.slug,
		title: review.title,
		author: review.author,
		coAuthors: review.coAuthors,
		score,
		rating: review.rating,
		isSoda: sodaMetrics !== undefined,
		scoreModel,
		model: MODEL_LABELS[scoreModel],
		nextRating: next?.rating,
		remaining: next ? next.minimum - score : null,
		favorite: review.favorite,
		repurchasePotential: review.repurchasePotential,
		metrics: sodaMetrics
			? [
					...sodaMetrics,
					...VENUE_RATING_METRICS.map(({ key, label }) => ({
						key,
						label,
						value: review.venueRatings?.[key]
					}))
				]
			: REVIEW_RATING_METRICS.map(({ key, label }) => ({ key, label, value: review[key] })),
		sweetnessBalance: soda && !legacy ? sweetnessBalance(soda.sweetness) : undefined
	};
}
