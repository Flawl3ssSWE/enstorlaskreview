import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/content/testbaren.json';
import sodaFixture from '../../../tests/fixtures/content/testsoda.json';
import type { PublicReview } from '../types/bar-review';
import { validateReview } from './validation';
import { serializeReviewsRss } from './rss';

const review = validateReview(fixture, 'testbaren.json');
const soda = validateReview(sodaFixture, 'testsoda.json');
const itemValues = (xml: string, element: string) =>
	[...xml.matchAll(new RegExp(`<${element}(?: [^>]*)?>(.*?)</${element}>`, 'gs'))].map(
		(match) => match[1]
	);

describe('review RSS', () => {
	it('includes soda and legacy reviews, orders by creation then slug, and leaves input intact', () => {
		const reviews = [
			{ ...review, slug: 'z', updatedAt: '2026-01-01T12:00:00.000Z' },
			{ ...soda, slug: 'a' },
			{
				...review,
				slug: 'new',
				createdAt: '2025-02-01T12:00:00.000Z',
				updatedAt: '2025-02-01T12:00:00.000Z'
			}
		];
		const xml = serializeReviewsRss(reviews, '');
		expect(itemValues(xml, 'guid')).toEqual([
			'https://enstorlaskreview.se/new/',
			'https://enstorlaskreview.se/a/',
			'https://enstorlaskreview.se/z/'
		]);
		expect(reviews.map(({ slug }) => slug)).toEqual(['z', 'a', 'new']);
		expect(xml).toContain('<lastBuildDate>Thu, 01 Jan 2026 12:00:00 GMT</lastBuildDate>');
		expect(itemValues(xml, 'pubDate')).toEqual([
			'Sat, 01 Feb 2025 12:00:00 GMT',
			'Wed, 01 Jan 2025 12:00:00 GMT',
			'Wed, 01 Jan 2025 12:00:00 GMT'
		]);
	});

	it.each(['', '/enstorlaskreview'])('uses absolute encoded URLs with base %j', (base) => {
		const xml = serializeReviewsRss([{ ...review, slug: 'läsk-öl' }], base);
		const url = `https://enstorlaskreview.se${base}/l%C3%A4sk-%C3%B6l/`;
		expect(xml).toContain(`<link>${url}</link>`);
		expect(xml).toContain(`<guid isPermaLink="true">${url}</guid>`);
		expect(xml).toContain(`<link>https://enstorlaskreview.se${base}/</link>`);
		expect(xml).toContain(
			`<atom:link href="https://enstorlaskreview.se${base}/rss.xml" rel="self" type="application/rss+xml" />`
		);
	});

	it('keeps GUID and publication date stable after edits', () => {
		const before = serializeReviewsRss([review], '');
		const after = serializeReviewsRss(
			[{ ...review, title: 'Ändrad', description: 'Ny text', updatedAt: '2026-01-01T00:00:00Z' }],
			''
		);
		expect(itemValues(after, 'guid')).toEqual(itemValues(before, 'guid'));
		expect(itemValues(after, 'pubDate')).toEqual(itemValues(before, 'pubDate'));
		expect(itemValues(after, 'lastBuildDate')).not.toEqual(itemValues(before, 'lastBuildDate'));
	});

	it('XML-escapes titles, formatted full text and safe author credits', () => {
		const special: PublicReview = {
			...review,
			title: `Läsk & <smak> "citat" 'test'`,
			description: '## Smak\n\n**God** & *frisk*\nNästa rad\n\n- Ett\n- Två',
			author: 'alex & <test>',
			coAuthors: ['sara', 'robin']
		};
		const xml = serializeReviewsRss([special], '');
		expect(xml).toContain('Läsk &amp; &lt;smak&gt; &quot;citat&quot; &apos;test&apos;');
		expect(xml).toContain('&lt;h2&gt;Smak&lt;/h2&gt;');
		expect(xml).toContain('&lt;strong&gt;God&lt;/strong&gt; &amp;amp; &lt;em&gt;frisk&lt;/em&gt;');
		expect(xml).toContain('&lt;br&gt;\nNästa rad');
		expect(xml).toContain('&lt;li&gt;Två&lt;/li&gt;');
		expect(xml).toContain('Författare: Alex &amp;amp; &amp;lt;test&amp;gt;, Sara, Robin');
		expect(serializeReviewsRss([soda], '')).toContain('Författare: Alex&lt;/p&gt;');
	});

	it('preserves the renderer safety rules for HTML, links and images', () => {
		const xml = serializeReviewsRss(
			[
				{
					...review,
					description:
						'<script>alert("x")</script>\n\n[Klick](javascript:alert(1))\n\n![Bild](https://example.com/image.png)\n\n<https://example.com>'
				}
			],
			''
		);
		const description = itemValues(xml, 'description')[1];
		expect(description).toContain('&amp;lt;script&amp;gt;');
		expect(description).not.toContain('&lt;script&gt;');
		expect(description).not.toContain('&lt;a ');
		expect(description).not.toContain('&lt;img ');
	});

	it('emits channel metadata without items or build date for empty content', () => {
		const xml = serializeReviewsRss([], '');
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<rss version="2.0"');
		expect(xml).toContain('<title>En Stor Läsk Review</title>');
		expect(xml).toContain('<language>sv</language>');
		expect(xml).toContain('</channel>\n</rss>');
		expect(xml).not.toContain('<item>');
		expect(xml).not.toContain('<lastBuildDate>');
	});
});
