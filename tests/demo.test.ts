import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';
const demoTitle = 'Demoläsk Citrus & Bär – endast förhandsvisning';

test('permanent demo shares the full review layout without entering published collections', async ({
	page,
	request
}, testInfo) => {
	for (const path of ['', 'statistik/', 'karta/', 'rss.xml']) {
		const response = await request.get(path);
		expect(response.ok()).toBe(true);
		const body = await response.text();
		expect(body).not.toContain('Demoläsk');
		expect(body).not.toContain('Demorecensent');
	}
	await page.goto('');
	await page.getByPlaceholder('Sök läsk, märke eller smak').fill('Demoläsk');
	await expect(page.getByRole('heading', { name: demoTitle, exact: true })).toHaveCount(0);
	await expect(page.locator(`a[href="${basePath}/demo/"]`)).toHaveCount(0);

	for (const width of [320, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('demo/');
		await expect(page.getByText('Demosida.', { exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: demoTitle, exact: true })).toBeVisible();
		const facts = page.getByRole('region', { name: 'Drycksfakta', exact: true });
		await expect(facts.locator('dt')).toHaveCount(9);
		await expect(facts).toContainText('Återanvändbar provsmakningsflaska');
		await expect(facts).toContainText('Originalförpackning · Glas · Sugrör · Mugg');
		await expect(facts).toContainText('160 mg i hela förpackningen');
		await expect(facts).toContainText('20 g i hela förpackningen');
		await expect(facts).toContainText('10 g i hela förpackningen');
		await expect(
			page.getByRole('region', { name: 'Läskbetyg', exact: true }).getByRole('listitem')
		).toHaveCount(8);
		await expect(
			page.getByRole('region', { name: 'Betyg på stället', exact: true }).getByRole('listitem')
		).toHaveCount(5);
		await expect(page.getByRole('link', { name: 'Visa historik på GitHub' })).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Tillbaka till recensioner' })).toHaveAttribute(
			'href',
			`${basePath}/`
		);
		const image = page.getByRole('img', { name: demoTitle, exact: true });
		await expect(image).toBeVisible();
		expect(
			await image.evaluate((image) => (image as HTMLImageElement).naturalWidth)
		).toBeGreaterThan(0);
		for (const theme of ['dark', 'light']) {
			const toggle = page.getByRole('button', { name: 'Mörkt läge', exact: true });
			if ((await toggle.getAttribute('aria-pressed')) !== String(theme === 'dark'))
				await toggle.click();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.screenshot({
				path: testInfo.outputPath(`demo-${theme}-${width}.png`),
				fullPage: true
			});
		}
	}
	const oldRoute = await request.get('demo-lask/');
	expect(oldRoute.status()).toBe(404);
});
