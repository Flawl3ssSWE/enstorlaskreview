import { isSodaReview } from '$lib/content/soda';
import { loadReviews } from '$lib/server/content';
import type { ReviewEditorData } from '$lib/types/review-editor';

export async function loadReviewEditor(): Promise<ReviewEditorData> {
	const reviews = await loadReviews();
	return {
		existingSlugs: reviews.map((review) => review.slug.toLowerCase()),
		reviews: reviews.filter(isSodaReview).map(({ rating: _rating, ...review }) => review)
	};
}
