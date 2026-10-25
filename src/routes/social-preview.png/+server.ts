import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { RequestHandler } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

/** Rasterized once at build time; social crawlers need no JavaScript or remote image service. */
export const GET: RequestHandler = async () => {
	const backdrop =
		Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
		<rect width="1200" height="630" fill="#1d1b1c"/>
		<rect x="36" y="36" width="1128" height="558" rx="32" fill="#292526" stroke="#423a3c" stroke-width="2"/>
		<path d="M80 510H1120" stroke="#b91c1c" stroke-width="6"/>
		<g font-family="sans-serif">
			<text x="92" y="200" font-size="68" font-weight="700" fill="#f4f1ee">En Stor Läsk</text>
			<text x="92" y="285" font-size="68" font-weight="700" fill="#fca5a5">Review</text>
			<text x="96" y="365" font-size="27" fill="#c6c1bd">Smak, bubblor och betyg.</text>
			<text x="96" y="462" font-size="23" fill="#a9a29e">enstorlaskreview.se</text>
		</g>
	</svg>`);
	const logo = await sharp(
		await readFile(resolve(process.env.REVIEW_STATIC_DIR ?? 'static', 'logo.png'))
	)
		.resize(390, 390, { fit: 'inside' })
		.png()
		.toBuffer();
	const image = await sharp(backdrop)
		.composite([{ input: logo, left: 724, top: 106 }])
		.png()
		.toBuffer();
	return new Response(new Uint8Array(image), {
		headers: { 'content-type': 'image/png' }
	});
};
