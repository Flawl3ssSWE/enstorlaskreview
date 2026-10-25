import { base } from '$app/paths';
import { serializeSitemap } from '$lib/content/seo';
import { loadReviews } from '$lib/server/content';
import type { RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

export const GET: RequestHandler = async () =>
	new Response(serializeSitemap(await loadReviews(), base), {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
