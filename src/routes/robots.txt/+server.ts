import { base } from '$app/paths';
import { serializeRobots } from '$lib/content/seo';
import type { RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

export const GET: RequestHandler = () =>
	new Response(serializeRobots(base), {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
