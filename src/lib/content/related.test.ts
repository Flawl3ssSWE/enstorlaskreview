import { describe, expect, it } from 'vitest';
import alexFixture from '../../../tests/fixtures/content/testsoda.json';
import robinFixture from '../../../tests/fixtures/content/testsoda-robin.json';
import { validateReview } from './validation';
import { relatedSodaReviews } from './related';

const alex = validateReview(alexFixture, 'testsoda.json');
const robin = validateReview(robinFixture, 'testsoda-robin.json');

describe('explicitly linked soda reviews', () => {
	it('links matching IDs even when titles differ, excluding the current post', () => {
		const other = { ...robin, title: 'Robins upplevelse av testläsken' };
		expect(relatedSodaReviews(alex, [alex, other])).toEqual([other]);
		expect(alex.rating).toBe(3);
		expect(other.rating).toBe(0);
	});
	it('never infers a link from a title, brand or author', () => {
		const unlinked = { ...robin, sodaId: undefined };
		const different = { ...robin, sodaId: 'annan-lask' };
		expect(relatedSodaReviews(alex, [alex, unlinked, different])).toEqual([]);
		expect(relatedSodaReviews({ ...alex, sodaId: undefined }, [alex, robin])).toEqual([]);
	});
	it('orders links by author and then newest review without mutating input', () => {
		const older = { ...robin, slug: 'older', author: 'Alex', createdAt: '2024-01-01T00:00:00Z' };
		const newer = { ...older, slug: 'newer', createdAt: '2025-01-01T00:00:00Z' };
		const reviews = [robin, older, newer, alex];
		expect(relatedSodaReviews(alex, reviews).map((review) => review.slug)).toEqual([
			'newer',
			'older',
			robin.slug
		]);
		expect(reviews).toEqual([robin, older, newer, alex]);
	});
	it('does not link bar records or invent links when only one review exists', () => {
		expect(relatedSodaReviews(alex, [alex])).toEqual([]);
		expect(relatedSodaReviews(alex, [{ ...robin, sodaRatings: undefined }])).toEqual([]);
		expect(relatedSodaReviews({ ...alex, sodaRatings: undefined }, [robin])).toEqual([]);
	});
});
