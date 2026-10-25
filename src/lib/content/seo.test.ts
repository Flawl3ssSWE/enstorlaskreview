import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/content/testsoda.json';
import legacyFixture from '../../../tests/fixtures/content/testbaren.json';
import { validateReview } from './validation';
import {
	homeStructuredData,
	pageSeo,
	publicUrl,
	reviewStructuredData,
	serializeLlmsGuide,
	serializeRobots,
	serializeSitemap,
	serializeStructuredData
} from './seo';

const soda = validateReview(fixture, 'testsoda.json');
const legacy = validateReview(legacyFixture, 'testbaren.json');

describe('public search metadata', () => {
	it.each(['', '/enstorlaskreview'])('uses the canonical origin and base path %s', (base) => {
		const seo = pageSeo('/[slug]', base, { ...soda, slug: 'läsk-ö' });
		expect(seo.canonical).toBe(`https://enstorlaskreview.se${base}/l%C3%A4sk-%C3%B6/`);
		expect(seo.image).toBe(`https://enstorlaskreview.se${base}/images/${soda.image}`);
		expect(seo.title).toBe(`${soda.title} – En Stor Läsk Review`);
		expect(seo.noindex).toBe(false);
		expect(pageSeo('/', base).canonical).toBe(`https://enstorlaskreview.se${base}/`);
	});

	it('keeps filtered homepages out of the index while pointing to the clean canonical', () => {
		const seo = pageSeo('/', '/enstorlaskreview', undefined, 200, {
			search: '?search=läsk&sort=oldest'
		});
		expect(seo.noindex).toBe(true);
		expect(seo.canonical).toBe('https://enstorlaskreview.se/enstorlaskreview/');
		expect(seo.structuredData).toBeUndefined();
	});

	it('describes the website and public review list on the unfiltered homepage', () => {
		const data = homeStructuredData([soda, legacy], '/enstorlaskreview');
		expect(data['@graph'][0]).toMatchObject({
			'@type': 'WebSite',
			url: 'https://enstorlaskreview.se/enstorlaskreview/'
		});
		expect(data['@graph'][1]).toMatchObject({
			'@type': 'ItemList',
			itemListElement: expect.arrayContaining([
				expect.objectContaining({
					url: `https://enstorlaskreview.se/enstorlaskreview/${soda.slug}/`
				})
			])
		});
		expect(pageSeo('/', '', undefined, 200, { reviews: [soda] }).structuredData).toBeDefined();
	});

	it('retains the complete written review in structured data', () => {
		const description = 'Läsk med långa bubblor. '.repeat(100);
		expect(reviewStructuredData({ ...soda, description }, '').reviewBody).toBe(description.trim());
	});

	it('describes products with the visible rating scale, authors, and dates', () => {
		const data = reviewStructuredData({ ...soda, rating: 0 }, '/enstorlaskreview');
		expect(data.itemReviewed['@type']).toBe('Product');
		expect(data.itemReviewed.brand?.name).toBe(soda.beerBrand);
		expect(data.reviewRating).toEqual({
			'@type': 'Rating',
			ratingValue: 0,
			worstRating: 0,
			bestRating: 3
		});
		expect(data.author).toHaveLength(1 + (soda.coAuthors?.length ?? 0));
		expect(data.datePublished).toBe(soda.createdAt);
		expect(data.dateModified).toBe(soda.updatedAt);
		expect(reviewStructuredData(legacy, '').itemReviewed['@type']).toBe('LocalBusiness');
	});

	it.each(['/demo', '/skapa', '/skapa/wizard', '/[slug]/history', '/404', null])(
		'keeps utility route %s out of the index and structured reviews',
		(route) => {
			const seo = pageSeo(route, '', soda);
			expect(seo.noindex).toBe(true);
			expect(seo.canonical).toBeUndefined();
			expect(seo.structuredData).toBeUndefined();
		}
	);

	it('does not publish stale review metadata on an error', () => {
		const seo = pageSeo('/[slug]', '', soda, 404);
		expect(seo.noindex).toBe(true);
		expect(seo.canonical).toBeUndefined();
		expect(seo.structuredData).toBeUndefined();
		expect(seo.title).toContain('419 Läsken är inte recenserad');
	});

	it('escapes script terminators without changing structured text', () => {
		const value = { name: '</script><img src=x onerror=alert(1)> & \u2028\u2029' };
		const json = serializeStructuredData(value);
		expect(json).not.toMatch(/[<>&\u2028\u2029]/);
		expect(JSON.parse(json)).toEqual(value);
	});

	it('uses plain bounded descriptions rather than Markdown formatting', () => {
		const seo = pageSeo('/[slug]', '', {
			...soda,
			description: `## Smak\n\n**Frisk** och *god*. ${'Läsk '.repeat(100)}`
		});
		expect(seo.description).toMatch(/^Smak Frisk och god\./);
		expect(seo.description.length).toBeLessThanOrEqual(200);
	});
});

describe('crawler discovery', () => {
	it.each(['', '/enstorlaskreview'])(
		'lists public pages and published reviews under %s',
		(base) => {
			const xml = serializeSitemap([soda, legacy], base);
			const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
			expect(urls).toHaveLength(6);
			for (const path of [
				'',
				'about/',
				'karta/',
				'statistik/',
				`${soda.slug}/`,
				`${legacy.slug}/`
			]) {
				expect(urls).toContain(publicUrl(path, base));
			}
			expect(xml).toContain(`<lastmod>${soda.updatedAt}</lastmod>`);
			expect(xml).not.toMatch(/demo|skapa|history|404/);
			expect(serializeRobots(base)).toContain(`Sitemap: ${publicUrl('sitemap.xml', base)}`);
			expect(serializeRobots(base)).not.toContain('Disallow:');
			const guide = serializeLlmsGuide(base);
			expect(guide).toContain(publicUrl('sitemap.xml', base));
			expect(guide).toContain(publicUrl('rss.xml', base));
		}
	);

	it('produces a valid sitemap without any reviews', () => {
		const xml = serializeSitemap([], '');
		expect([...xml.matchAll(/<url>/g)]).toHaveLength(4);
		expect(xml).not.toContain('lastmod');
	});
});
