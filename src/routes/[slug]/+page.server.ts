import { error } from '@sveltejs/kit';
import { loadReviews } from '$lib/server/content';
import { relatedSodaReviews } from '$lib/content/related';
import { reviewHistoryUrl } from '$lib/site';
import type { EntryGenerator, PageServerLoad } from './$types';
export const entries: EntryGenerator = async () =>
	(await loadReviews()).map(({ slug }) => ({ slug }));
export const load: PageServerLoad = async ({ params }) => {
	const reviews = await loadReviews();
	const bar = reviews.find((review) => review.slug === params.slug);
	if (!bar) error(404, 'Recensionen hittades inte.');
	return {
		bar,
		relatedReviews: relatedSodaReviews(bar, reviews).map(
			({ slug, title, author, rating, createdAt }) => ({ slug, title, author, rating, createdAt })
		),
		historyUrl: reviewHistoryUrl(bar.slug)
	};
};
