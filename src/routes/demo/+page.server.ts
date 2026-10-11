import demo from '$lib/server/demo-lask.json';
import { validateReview } from '$lib/content/validation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	bar: validateReview(demo, 'demo-lask.json'),
	relatedReviews: [],
	historyUrl: null
});
