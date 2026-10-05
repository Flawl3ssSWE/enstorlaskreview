import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { loadReviews, reviewImageDirectory } from '$lib/server/content';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';
export const entries: EntryGenerator = async () =>
	[...new Set((await loadReviews()).map(({ image }) => image))].map((filename) => ({ filename }));

export const GET: RequestHandler = async ({ params }) => {
	const reviews = await loadReviews();
	if (!reviews.some(({ image }) => image === params.filename)) error(404, 'Bilden hittades inte.');
	const bytes = await readFile(join(reviewImageDirectory(), params.filename));
	const extension = extname(params.filename);
	const type =
		extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
	return new Response(new Uint8Array(bytes), { headers: { 'content-type': type } });
};
