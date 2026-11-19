import { SODA_RATING_METRICS, TASTING_RATING_METRICS } from '../review-metadata.ts';
import type {
	PublicReview,
	ReviewContent,
	SodaRatingValues,
	SodaTasting
} from '../types/bar-review.ts';

export const reviewerKey = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('sv');

export function sweetnessBalance(value: number): number {
	return value <= 3 ? (value / 3) * 5 : ((5 - value) / 2) * 5;
}

export function sodaScore(ratings: SodaRatingValues): number {
	// The first published soda model predates the suitability rating.
	if (ratings.mouthfeelMatch === undefined) {
		return (
			(ratings.taste +
				ratings.carbonation +
				ratings.drinkability +
				ratings.matchesName +
				ratings.value) /
			5
		);
	}
	return SODA_RATING_METRICS.reduce((sum, { key, weight }) => {
		const value = key === 'sweetness' ? sweetnessBalance(ratings.sweetness) : (ratings[key] ?? 0);
		return sum + value * weight;
	}, 0);
}

export function tastingScore(ratings: SodaTasting['ratings']): number {
	return (
		TASTING_RATING_METRICS.reduce((sum, { key, weight }) => sum + ratings[key] * weight, 0) / 100
	);
}

export function isSodaReview(review: Pick<ReviewContent, 'sodaRatings' | 'sodaTasting'>): boolean {
	return review.sodaTasting !== undefined || review.sodaRatings !== undefined;
}

export function sodaReviewScore(
	review: Pick<ReviewContent, 'sodaRatings' | 'sodaTasting'>
): number | undefined {
	if (review.sodaTasting) return tastingScore(review.sodaTasting.ratings);
	if (review.sodaRatings) return sodaScore(review.sodaRatings);
}

export function reviewScore(review: PublicReview): number {
	return sodaReviewScore(review) ?? review.rating;
}

export function selectReviewer(review: PublicReview, author: string): PublicReview | undefined {
	if (!author) return review;
	return [review.author, ...(review.coAuthors ?? [])].some((name) => reviewerKey(name) === author)
		? review
		: undefined;
}

export function favoriteLabel(review: PublicReview): string | undefined {
	return review.favorite ? 'Läskfavorit' : undefined;
}
