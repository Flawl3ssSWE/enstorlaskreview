import { base } from '$app/paths';
import { serializeLlmsGuide } from '$lib/content/seo';
import type { RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

export const GET: RequestHandler = () =>
	new Response(serializeLlmsGuide(base), {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
