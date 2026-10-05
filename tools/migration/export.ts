import { MongoClient } from 'mongodb';
import { copyFile, mkdir, readFile, lstat, realpath, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { constants } from 'node:fs';
import { validateReview, isSafeImageName } from '../../src/lib/content/validation.ts';
import { imageSignatureMatches } from '../../src/lib/server/content.ts';
import { projectPublishedReview, publicReviewFilter } from './projection.ts';

const uri = process.env.MONGO_URI;
const sourceImages = process.env.REVIEW_IMAGE_DIR;
const outputArgument = process.argv[2];
if (!uri || !sourceImages || !outputArgument) {
	throw new Error(
		'Ange MONGO_URI och REVIEW_IMAGE_DIR, och skicka en ny exportkatalog som argument.'
	);
}
const output = resolve(outputArgument);
// Refuse to overwrite an existing export, including the repository content directory.
await mkdir(output);
await mkdir(join(output, 'reviews'));
await mkdir(join(output, 'images'));
const client = new MongoClient(uri);
try {
	await client.connect();
	const db = client.db('enstorstark');
	const geocodes = await db.collection('map_geocodes').find({ status: 'resolved' }).toArray();
	const reviews = await db.collection('bars').find(publicReviewFilter).toArray();
	const copied = new Set<string>();
	const slugs = new Set<string>();
	let mismatches = 0;
	let omittedPrices = 0;
	for (const original of reviews) {
		const projected = projectPublishedReview(original, geocodes);
		const review = validateReview(projected, `${projected.slug}.json`);
		if (slugs.has(review.slug.toLowerCase())) throw new Error('Duplicerade slugs i exporten.');
		slugs.add(review.slug.toLowerCase());
		if (original.rating !== review.rating) {
			mismatches++;
			console.warn(
				`Kontrollera helhetsbetyget för ${review.slug}: ${original.rating} → ${review.rating}.`
			);
		}
		if (original.beerPriceKr !== undefined && projected.beerPriceKr === undefined) omittedPrices++;
		if (!isSafeImageName(review.image)) throw new Error('Osäkert bildnamn.');
		const imagePath = join(resolve(sourceImages), review.image);
		const stat = await lstat(imagePath);
		if (
			!stat.isFile() ||
			stat.isSymbolicLink() ||
			stat.size > 10 * 1024 * 1024 ||
			(await realpath(imagePath)) !== join(await realpath(sourceImages), review.image)
		)
			throw new Error(`Ogiltig bild för ${review.slug}.`);
		if (!imageSignatureMatches(await readFile(imagePath), review.image))
			throw new Error(`Ogiltig bildtyp för ${review.slug}.`);
		if (!copied.has(review.image)) {
			await copyFile(imagePath, join(output, 'images', review.image), constants.COPYFILE_EXCL);
			copied.add(review.image);
		}
		await writeFile(
			join(output, 'reviews', `${review.slug}.json`),
			JSON.stringify(projected, null, '\t') + '\n',
			{ flag: 'wx' }
		);
	}
	await writeFile(
		join(output, 'report.json'),
		JSON.stringify(
			{
				reviews: reviews.length,
				images: copied.size,
				ratingMismatches: mismatches,
				omittedInvalidPrices: omittedPrices
			},
			null,
			'\t'
		) + '\n',
		{ flag: 'wx' }
	);
	console.log(
		`Exporterade ${reviews.length} recensioner. Granska report.json innan filerna publiceras.`
	);
} finally {
	await client.close();
}
