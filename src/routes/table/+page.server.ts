import { loadReviews } from '$lib/server/content';
import { reviewOverview } from '$lib/content/review-overview';
import { validateReview } from '$lib/content/validation';
import demo from '$lib/server/demo-lask.json';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const reviews = (await loadReviews()).map(reviewOverview);
	return {
		reviews,
		calibrationExample: reviews.some(({ scoreModel }) => scoreModel === 'v2')
			? null
			: reviewOverview(validateReview(demo, 'demo-lask.json'))
	};
};
