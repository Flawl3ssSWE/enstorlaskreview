import { loadReviews } from '$lib/server/content';
import { buildReviewStatistics } from '$lib/content/derived';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async () => ({
	statistics: buildReviewStatistics(await loadReviews())
});
