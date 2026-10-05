import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { validateReview } from '../content/validation.ts';
import type { PublicReview } from '../types/bar-review.ts';

export function imageSignatureMatches(bytes: Uint8Array, filename: string): boolean {
	const extension = extname(filename);
	if (extension === '.png')
		return Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
	if (extension === '.jpg' || extension === '.jpeg')
		return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
	return (
		extension === '.webp' &&
		Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' &&
		Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP'
	);
}

export function reviewImageDirectory(
	contentDirectory = resolve(process.env.REVIEW_CONTENT_DIR ?? 'content/reviews')
): string {
	return resolve(process.env.REVIEW_CONTENT_IMAGE_DIR ?? join(contentDirectory, 'images'));
}

/** Reads files only during development/build; the deployed site needs no filesystem API. */
export async function loadReviews(
	contentDirectory = resolve(process.env.REVIEW_CONTENT_DIR ?? 'content/reviews'),
	imageDirectory = reviewImageDirectory(contentDirectory)
): Promise<PublicReview[]> {
	const reviews: PublicReview[] = [];
	const slugs = new Set<string>();
	const entries = await readdir(contentDirectory, { withFileTypes: true });
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		if (entry.name === 'README.md' && entry.isFile()) continue;
		if (entry.name === 'images' && entry.isDirectory()) continue;
		if (!entry.isFile() || !entry.name.endsWith('.json'))
			throw new Error(`Otillåten innehållsfil: ${entry.name}`);
		const review = validateReview(
			JSON.parse(await readFile(join(contentDirectory, entry.name), 'utf8')),
			entry.name
		);
		const slugKey = review.slug.toLowerCase();
		if (slugs.has(slugKey)) throw new Error(`Duplicerad slug: ${review.slug}`);
		slugs.add(slugKey);
		const imagePath = join(imageDirectory, review.image);
		const stat = await lstat(imagePath);
		if (
			!stat.isFile() ||
			stat.isSymbolicLink() ||
			stat.size > 10 * 1024 * 1024 ||
			stat.size === 0 ||
			(await realpath(imagePath)) !== join(await realpath(imageDirectory), review.image)
		)
			throw new Error(`Ogiltig bild: ${review.image}`);
		if (!imageSignatureMatches(await readFile(imagePath), review.image))
			throw new Error(`Bildens innehåll motsvarar inte filtypen: ${review.image}`);
		reviews.push(review);
	}
	// Every image shipped by Pages is public, even if no review references it.
	const referenced = new Set(reviews.map((review) => review.image));
	let images;
	try {
		images = await readdir(imageDirectory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || reviews.length > 0) throw error;
		return reviews;
	}
	for (const image of images) {
		if (!image.isFile() || !referenced.has(image.name))
			throw new Error(`Orefererad eller otillåten offentlig bild: ${image.name}`);
	}
	return reviews;
}
