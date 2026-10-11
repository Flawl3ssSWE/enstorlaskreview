import { base } from '$app/paths';
import { serializeReviewsRss } from '$lib/content/rss';
import { loadReviews } from '$lib/server/content';
import type { RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

export const GET: RequestHandler = async () =>
	new Response(serializeReviewsRss(await loadReviews(), base), {
		headers: { 'content-type': 'application/rss+xml; charset=utf-8' }
	});
