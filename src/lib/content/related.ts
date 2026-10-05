import type { PublicReview } from '../types/bar-review.ts';

/** Only explicitly linked soda reviews belong together; titles are not identifiers. */
export function relatedSodaReviews(review: PublicReview, reviews: PublicReview[]): PublicReview[] {
	if (!review.sodaId || !review.sodaRatings) return [];
	return reviews
		.filter(
			(candidate) =>
				candidate.slug !== review.slug &&
				candidate.sodaRatings &&
				candidate.sodaId === review.sodaId
		)
		.sort(
			(a, b) =>
				a.author.localeCompare(b.author, 'sv') ||
				b.createdAt.localeCompare(a.createdAt) ||
				a.slug.localeCompare(b.slug)
		);
}
