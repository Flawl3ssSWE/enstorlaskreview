import { loadReviews } from '$lib/server/content';
import type { ReviewEditorData } from '$lib/types/review-editor';

export async function loadReviewEditor(): Promise<ReviewEditorData> {
	const reviews = await loadReviews();
	return {
		sodas: [
			...new Map(
				reviews
					.filter((review) => review.sodaId && review.sodaRatings)
					.map((review) => [
						review.sodaId!,
						{ id: review.sodaId!, title: review.title, brand: review.beerBrand ?? '' }
					])
			).values()
		].sort((a, b) => a.title.localeCompare(b.title, 'sv') || a.id.localeCompare(b.id)),
		existingSlugs: reviews.map((review) => review.slug.toLowerCase()),
		reviews: reviews
			.filter((review) => review.sodaRatings)
			.map(({ rating: _rating, ...review }) => review)
	};
}
