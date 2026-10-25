import type { PublicReview } from '../types/bar-review';
import {
	OVERALL_RATING_LEVELS,
	REVIEW_RATING_METRICS,
	SODA_RATING_METRICS,
	VENUE_RATING_METRICS
} from '../review-metadata';
import { calculateWeightedRating } from '../utils/ratings';
import { sodaScore, sweetnessBalance } from './soda';

/** Use each review's own calculation, preserving legacy scoring and unknown assessments. */
export function reviewOverview(review: PublicReview) {
	const soda = review.sodaRatings;
	const legacy = soda !== undefined && soda.mouthfeelMatch === undefined;
	const score = soda
		? sodaScore(soda)
		: calculateWeightedRating(REVIEW_RATING_METRICS.map(({ key }) => review[key]!));
	const next = OVERALL_RATING_LEVELS.find(({ minimum }) => minimum > score);
	return {
		slug: review.slug,
		title: review.title,
		author: review.author,
		coAuthors: review.coAuthors,
		score,
		rating: review.rating,
		isSoda: soda !== undefined,
		model: soda ? (legacy ? 'Äldre läskmodell' : 'Viktad läskmodell') : 'Platsmodell',
		nextRating: next?.rating,
		remaining: next ? next.minimum - score : null,
		favorite: review.favorite,
		repurchasePotential: review.repurchasePotential,
		metrics: soda
			? [
					...SODA_RATING_METRICS.map(({ key, label }) => ({ key, label, value: soda[key] })),
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
