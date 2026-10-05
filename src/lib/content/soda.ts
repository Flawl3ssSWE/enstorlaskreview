import { SODA_RATING_METRICS } from '../review-metadata.ts';
import type { PublicReview, SodaRatingValues } from '../types/bar-review.ts';

export const reviewerKey = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('sv');

export function sweetnessBalance(value: number): number {
	return value <= 3 ? (value / 3) * 5 : ((5 - value) / 2) * 5;
}

export function sodaScore(ratings: SodaRatingValues): number {
	// Preserve published scores until the author supplies the new suitability rating.
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

export function reviewScore(review: PublicReview): number {
	return review.sodaRatings ? sodaScore(review.sodaRatings) : review.rating;
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
