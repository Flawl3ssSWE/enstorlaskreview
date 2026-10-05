import { error } from '@sveltejs/kit';
import { loadReviews } from '$lib/server/content';
import { reviewHistoryUrl } from '$lib/site';
import type { EntryGenerator, PageServerLoad } from './$types';
export const entries: EntryGenerator = async () =>
	(await loadReviews()).map(({ slug }) => ({ slug }));
export const load: PageServerLoad = async ({ params }) => {
	if (!(await loadReviews()).some((review) => review.slug === params.slug))
		error(404, 'Recensionen hittades inte.');
	return { historyUrl: reviewHistoryUrl(params.slug) };
};
