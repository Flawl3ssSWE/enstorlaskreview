import { validateReview } from './validation';
import { formatReviewJson } from './export';
import type { ReviewContent } from '../types/bar-review';

export interface ReviewSubmission {
	review: ReviewContent;
	json: string;
	image?: Blob;
	baseline?: ReviewContent;
	editing: boolean;
}

/** Stable comparison independent of JSON property ordering. */
export function contentKey(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(contentKey).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => `${JSON.stringify(key)}:${contentKey(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value) ?? 'null';
}

export function submissionKey(input: ReviewSubmission): string {
	const { updatedAt: _updatedAt, createdAt: _createdAt, ...review } = input.review;
	return contentKey(review);
}

export async function prepareReviewSubmission(
	review: ReviewContent,
	options: Pick<ReviewSubmission, 'image' | 'baseline' | 'editing'>
): Promise<ReviewSubmission> {
	validateReview(review, `${review.slug}.json`);
	// Public content is JSON; serialization also unwraps Svelte's reactive proxies.
	const snapshot: ReviewContent = JSON.parse(JSON.stringify(review));
	return { ...options, review: snapshot, json: await formatReviewJson(snapshot) };
}
