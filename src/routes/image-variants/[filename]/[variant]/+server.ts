import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadReviews, reviewImageDirectory } from '$lib/server/content';
import { createImageVariant, REVIEW_IMAGE_VARIANTS } from '$lib/server/image-variants';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';
export const entries: EntryGenerator = async () => [
	{ filename: 'logo', variant: '80.webp' },
	...[...new Set((await loadReviews()).map(({ image }) => image))].flatMap((filename) =>
		REVIEW_IMAGE_VARIANTS.map((variant) => ({ filename, variant }))
	)
];

export const GET: RequestHandler = async ({ params }) => {
	const logo = params.filename === 'logo' && params.variant === '80.webp';
	if (
		!logo &&
		(!REVIEW_IMAGE_VARIANTS.some((variant) => variant === params.variant) ||
			!(await loadReviews()).some(({ image }) => image === params.filename))
	)
		error(404, 'Bilden hittades inte.');
	const path = logo
		? resolve(process.env.REVIEW_STATIC_DIR ?? 'static', 'logo.png')
		: join(reviewImageDirectory(), params.filename);
	const width = params.variant === 'preview.webp' ? 32 : Number.parseInt(params.variant, 10);
	return new Response(new Uint8Array(await createImageVariant(await readFile(path), width)), {
		headers: { 'content-type': 'image/webp' }
	});
};
