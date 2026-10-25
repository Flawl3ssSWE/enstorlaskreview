import { loadReviews } from '$lib/server/content';
import { reviewOverview } from '$lib/content/review-overview';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	reviews: (await loadReviews()).map(reviewOverview)
});
