import { readdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const base = process.env.BASE_PATH ?? '';
const siteUrl = `https://enstorlaskreview.se${base}/`;

test('static RSS parses with all fixture reviews, absolute URLs and full text', async ({
	page,
	request
}) => {
	const response = await request.get('rss.xml', { maxRedirects: 0 });
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('application/rss+xml; charset=utf-8');
	const xml = await response.text();
	expect(xml).toBe(await readFile('build/rss.xml', 'utf8'));
	const files = (await readdir('tests/fixtures/content')).filter((file) => file.endsWith('.json'));
	const fixtures = await Promise.all(
		files.map(
			async (file) =>
				JSON.parse(await readFile(`tests/fixtures/content/${file}`, 'utf8')) as {
					slug: string;
					title: string;
					createdAt: string;
					updatedAt: string;
				}
		)
	);
	fixtures.sort(
		(a, b) =>
			Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
			(a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
	);
	await page.goto('./');
	const parsed = await page.evaluate((source) => {
		const doc = new DOMParser().parseFromString(source, 'application/xml');
		return {
			errors: doc.querySelectorAll('parsererror').length,
			version: doc.documentElement.getAttribute('version'),
			language: doc.querySelector('channel > language')?.textContent,
			link: doc.querySelector('channel > link')?.textContent,
			self: doc
				.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'link')[0]
				?.getAttribute('href'),
			buildDate: doc.querySelector('lastBuildDate')?.textContent,
			items: [...doc.querySelectorAll('item')].map((item) => ({
				title: item.querySelector('title')?.textContent,
				link: item.querySelector('link')?.textContent,
				guid: item.querySelector('guid')?.textContent,
				permalink: item.querySelector('guid')?.getAttribute('isPermaLink'),
				date: item.querySelector('pubDate')?.textContent,
				description: item.querySelector('description')?.textContent
			}))
		};
	}, xml);
	expect(parsed.errors).toBe(0);
	expect(parsed.version).toBe('2.0');
	expect(parsed.language).toBe('sv');
	expect(parsed.link).toBe(siteUrl);
	expect(parsed.self).toBe(`${siteUrl}rss.xml`);
	expect(parsed.buildDate).toBe(
		new Date(Math.max(...fixtures.map((review) => Date.parse(review.updatedAt)))).toUTCString()
	);
	expect(parsed.items).toHaveLength(fixtures.length);
	for (const [index, review] of fixtures.entries()) {
		const url = `${siteUrl}${encodeURIComponent(review.slug)}/`;
		expect(parsed.items[index]).toMatchObject({
			title: review.title,
			link: url,
			guid: url,
			permalink: 'true',
			date: new Date(review.createdAt).toUTCString()
		});
	}
	expect(parsed.items.find((item) => item.title === 'Testbaren')?.description).toBe(
		'<p><strong>En testrecension</strong>, inte en verklig bar.</p>\n<p>Författare: Test, Sara</p>'
	);
	expect(parsed.items.find((item) => item.title === 'Testläsk')?.description).toContain(
		'Frisk och balanserad enligt Alex.'
	);
});

test('shared pages advertise and link the RSS feed', async ({ page }) => {
	for (const route of ['./', 'testbaren/', 'about/']) {
		await page.goto(route);
		await expect(
			page.locator('head link[rel="alternate"][type="application/rss+xml"]')
		).toHaveAttribute('href', `${base}/rss.xml`);
		await expect(
			page.getByRole('contentinfo').getByRole('link', { name: 'RSS-flöde' })
		).toHaveAttribute('href', `${base}/rss.xml`);
	}
});
