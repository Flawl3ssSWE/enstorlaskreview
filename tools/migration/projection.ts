import { sanitizePlainText } from '../../src/lib/utils/review-text.ts';
import { REVIEW_RATING_METRICS } from '../../src/lib/review-metadata.ts';
import { isValidBeerPriceKr } from '../../src/lib/utils/price.ts';
import type { ReviewContent } from '../../src/lib/types/bar-review.ts';

// Match only explicitly published or missing status. Null/unknown statuses are private.
export const publicReviewFilter = {
	$or: [{ publicationStatus: 'published' }, { publicationStatus: { $exists: false } }]
};
interface LegacyGeocode {
	status?: unknown;
	addressKey?: unknown;
	latitude?: unknown;
	longitude?: unknown;
}
const normalizeAddress = (address: string) => sanitizePlainText(address).toLocaleLowerCase('sv-SE');

export function projectPublishedReview(
	original: Record<string, unknown>,
	geocodes: LegacyGeocode[]
): ReviewContent {
	if ('publicationStatus' in original && original.publicationStatus !== 'published')
		throw new Error('Endast publicerade recensioner får exporteras.');
	const output: Record<string, unknown> = {};
	for (const key of [
		'title',
		'description',
		'slug',
		'image',
		'imageFocusX',
		'imageFocusY',
		'imageZoom',
		'location',
		'beerBrand',
		'author',
		...REVIEW_RATING_METRICS.map(({ key }) => key)
	]) {
		if (original[key] !== undefined) output[key] = original[key];
	}
	for (const key of ['createdAt', 'updatedAt']) {
		const value = original[key];
		output[key] = value instanceof Date ? value.toISOString() : value;
	}
	const coAuthors =
		typeof original.coAuthors === 'string'
			? [original.coAuthors]
			: Array.isArray(original.coAuthors)
				? original.coAuthors
				: [];
	if (coAuthors.length)
		output.coAuthors = [...new Set(coAuthors.filter((name) => name !== original.author))];
	if (isValidBeerPriceKr(original.beerPriceKr as number)) {
		output.beerPriceKr = original.beerPriceKr;
		output.isHappyHourPrice = original.isHappyHourPrice === true;
	}
	const location = typeof original.location === 'string' ? original.location : '';
	const geocode = geocodes.find(
		(entry) => entry.status === 'resolved' && entry.addressKey === normalizeAddress(location)
	);
	if (
		geocode &&
		typeof geocode.latitude === 'number' &&
		Number.isFinite(geocode.latitude) &&
		Math.abs(geocode.latitude) <= 90 &&
		typeof geocode.longitude === 'number' &&
		Number.isFinite(geocode.longitude) &&
		Math.abs(geocode.longitude) <= 180
	) {
		output.latitude = geocode.latitude;
		output.longitude = geocode.longitude;
	}
	return output as unknown as ReviewContent;
}
