import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/content/testsoda.json';
import { contentKey, prepareReviewSubmission, submissionKey } from './submission';
import { validateReview } from './validation';

const { rating: _rating, ...review } = validateReview(fixture, 'testsoda.json');

describe('review submission preparation', () => {
	it('accepts reactive proxy values used by imported reviews', async () => {
		const proxied = new Proxy(review, {});
		const input = await prepareReviewSubmission(proxied, { editing: true });
		expect(JSON.parse(input.json)).toEqual(review);
	});

	it('validates and snapshots the same Unicode content for downloads and publishing', async () => {
		const source = structuredClone(review);
		const input = await prepareReviewSubmission(source, { editing: false });
		source.description = 'Ändrat efter förberedelsen';
		expect(JSON.parse(input.json)).toEqual(review);
		expect(input.review.description).toBe(review.description);
		expect(input.json).toContain('Frisk och balanserad');
		expect(() => validateReview(JSON.parse(input.json), 'testsoda.json')).not.toThrow();
	});

	it('rejects invalid public content before formatting', async () => {
		await expect(
			prepareReviewSubmission({ ...review, slug: '../secret' }, { editing: false })
		).rejects.toThrow('säker slug');
	});

	it('compares nested values independently of property order and ignores generated dates for retries', async () => {
		expect(contentKey({ b: { y: 2, x: 1 }, a: undefined })).toBe(contentKey({ b: { x: 1, y: 2 } }));
		const input = await prepareReviewSubmission(review, { editing: false });
		expect(submissionKey(input)).toBe(
			submissionKey({ ...input, review: { ...review, updatedAt: '2026-10-13T12:00:00.000Z' } })
		);
		expect(submissionKey(input)).not.toBe(
			submissionKey({ ...input, review: { ...review, description: 'Annat innehåll' } })
		);
	});
});
