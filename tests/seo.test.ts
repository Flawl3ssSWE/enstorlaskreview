import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';
const origin = `https://enstorlaskreview.se${basePath}`;

test('public pages render canonical and social metadata once and update on navigation', async ({
	page
}) => {
	await page.goto('./?search=Testgatan');
	await expect(page.locator('head title')).toHaveCount(1);
	await expect(page.locator('meta[name="description"]')).toHaveCount(1);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`);
	await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${origin}/`);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
	await page.getByRole('link', { name: 'Statistik', exact: true }).click();
	await expect(page).toHaveTitle('Läskstatistik – En Stor Läsk Review');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		`${origin}/statistik/`
	);
	await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
		'content',
		'Läskstatistik – En Stor Läsk Review'
	);
});

test('published reviews include safe structured data in the prerendered HTML', async ({
	page,
	request
}) => {
	const response = await request.get('testsoda/');
	const html = await response.text();
	expect(html).toContain('application/ld+json');
	const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
	const hash = createHash('sha256').update(jsonLd).digest('base64');
	expect(html).toContain(`'sha256-${hash}'`);
	expect(html).toContain('http-equiv="content-security-policy"');
	await page.goto('testsoda/');
	await expect(page.locator('head title')).toHaveCount(1);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		`${origin}/testsoda/`
	);
	const data = JSON.parse(
		(await page.locator('script[type="application/ld+json"]').textContent())!
	);
	expect(data['@type']).toBe('Review');
	expect(data.itemReviewed['@type']).toBe('Product');
	expect(data.url).toBe(`${origin}/testsoda/`);
	expect(data.reviewRating.worstRating).toBe(0);
	expect(data.reviewRating.bestRating).toBe(3);
	const socialImage = await page.locator('meta[property="og:image"]').getAttribute('content');
	const imagePath = new URL(socialImage!).pathname.slice(basePath.length + 1);
	expect((await request.get(imagePath)).ok()).toBe(true);
});

test('utility routes and errors are noindex without canonical or review data', async ({ page }) => {
	for (const path of ['demo/', 'skapa/', 'skapa/wizard/', 'testbaren/history/', '404/']) {
		// History redirects immediately to GitHub; keep this check on its static response.
		const response = await page.request.get(path);
		const html = await response.text();
		expect(html).toMatch(/name="robots" content="noindex, follow"/);
		expect(html).not.toContain('rel="canonical"');
		expect(html).not.toContain('application/ld+json');
	}
});

test('crawler files expose only base-aware public pages', async ({ request }) => {
	const sitemap = await request.get('sitemap.xml');
	expect(sitemap.ok()).toBe(true);
	expect(sitemap.headers()['content-type']).toContain('xml');
	const xml = await sitemap.text();
	expect(xml).toContain(`<loc>${origin}/testsoda/</loc>`);
	expect(xml).toContain(`<loc>${origin}/statistik/</loc>`);
	expect(xml).not.toMatch(/<loc>[^<]*(?:demo|skapa|history|404)/);
	const social = await request.get('social-preview.png');
	expect(social.ok()).toBe(true);
	expect(social.headers()['content-type']).toBe('image/png');
	const imageBytes = await social.body();
	expect(imageBytes.readUInt32BE(16)).toBe(1200);
	expect(imageBytes.readUInt32BE(20)).toBe(630);
	const robots = await request.get('robots.txt');
	expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
	const guide = await request.get('llms.txt');
	expect(guide.ok()).toBe(true);
	expect(await guide.text()).toContain(`${origin}/sitemap.xml`);
});
