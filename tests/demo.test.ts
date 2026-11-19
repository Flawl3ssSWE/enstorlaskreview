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
		await expect(page.getByText('* Köpt på rea', { exact: true })).toBeVisible();
		await expect(page.getByText(/happy hour/i)).toHaveCount(0);
		await expect(page.getByText('19,5 kr*', { exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: demoTitle, exact: true })).toBeVisible();
		const facts = page.getByRole('region', { name: 'Drycksfakta', exact: true });
		await expect(facts.locator('dt')).toHaveCount(9);
		await expect(facts.locator('svg[data-symbol="measure"]')).toBeVisible();
		await expect(facts.locator('svg[data-symbol="ice"]')).toBeVisible();
		await expect(facts.locator('svg.lucide-snowflake')).toBeVisible();
		await expect(facts).toContainText('Återanvändbar provsmakningsflaska');
		await expect(
			facts
				.getByRole('term')
				.filter({ hasText: 'Serveringsmetod:' })
				.getByRole('button', { name: 'Om serveringsmetod', exact: true })
		).toBeVisible();
		const methods = facts.getByRole('list');
		await expect(methods.getByRole('button')).toHaveCount(4);
		for (const method of ['originalförpackning', 'glas', 'sugrör', 'mugg']) {
			await expect(
				methods.getByRole('button', { name: `Om ${method}`, exact: true })
			).toBeVisible();
		}
		await expect(methods).toHaveText('', { useInnerText: true });
		await expect(
			methods
				.getByRole('button', { name: 'Om mugg', exact: true })
				.locator('svg[data-symbol="mug"]')
		).toBeVisible();
		await expect(
			methods
				.getByRole('button', { name: 'Om sugrör', exact: true })
				.locator('svg[data-symbol="straw"]')
		).toBeVisible();
		await expect(facts).toContainText('(160 mg totalt)');
		await expect(facts).toContainText('(20 g totalt)');
		await expect(facts).toContainText('(10 g totalt)');
		await expect(page.getByRole('region', { name: 'Recension', exact: true })).toBeVisible();
		const profile = page.getByRole('region', { name: 'Smakprofil', exact: true });
		await expect(profile.getByRole('listitem')).toHaveCount(5);
		await expect(profile.getByRole('listitem').filter({ hasText: 'Surhet' })).toContainText('4/5');
		const ratings = page.getByRole('region', { name: 'Delbetyg', exact: true });
		await expect(ratings.getByRole('listitem')).toHaveCount(4);
		await expect(ratings.getByRole('listitem').filter({ hasText: 'Balans' })).toContainText('5/5');
		await expect(
			page.getByText(/Skalan visar|Viktad poäng|Visas separat från helhetsbetyget/)
		).toHaveCount(0);
		const extras = page.getByRole('region', { name: 'Övriga betyg', exact: true });
		await expect(extras.getByRole('listitem')).toHaveCount(3);
		await expect(extras.getByRole('listitem').filter({ hasText: 'Förpackningen' })).toBeVisible();
		await expect(extras.getByRole('listitem').filter({ hasText: 'Förpackningen' })).toContainText(
			'5/5'
		);
		const venue = page.getByRole('region', { name: 'Betyg på stället', exact: true });
		await expect(venue.getByRole('listitem')).toHaveCount(8);
		for (const [label, score] of [
			['Kvalitet', '4/5'],
			['Prisvärdhet', '3/5'],
			['Barhoppotential', '4/5']
		]) {
			await expect(venue.getByRole('listitem').filter({ hasText: label })).toContainText(score);
		}
		const service = venue.getByRole('listitem').filter({ hasText: 'Service' });
		await expect(service).toBeVisible();
		await expect(service).toContainText('5/5');
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

test('drink facts explain their symbols on hover and keyboard focus', async ({ page }) => {
	await page.goto('demo/');
	const facts = page.getByRole('region', { name: 'Drycksfakta', exact: true });
	const straw = facts.getByRole('button', { name: 'Om sugrör', exact: true });
	const tooltip = facts.getByRole('tooltip');
	await expect(tooltip).toBeHidden();
	await straw.hover();
	await expect(tooltip).toHaveText('Läsken dracks med sugrör.');
	await page.mouse.move(0, 0);
	await expect(tooltip).toBeHidden();
	await straw.focus();
	await expect(tooltip).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(tooltip).toBeHidden();
});

test.describe('drink facts on touch screens', () => {
	test.use({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 812 } });

	test('a tap explains a symbol and tapping outside closes it', async ({ page }) => {
		await page.goto('demo/');
		const facts = page.getByRole('region', { name: 'Drycksfakta', exact: true });
		await facts.getByRole('button', { name: 'Om serveringstemperatur', exact: true }).tap();
		const tooltip = facts.getByRole('tooltip');
		await expect(tooltip).toHaveText('Läsken provades kylskåpskall.');
		await expect(tooltip).toBeInViewport({ ratio: 1 });
		await facts.getByText('Kylskåpskall', { exact: true }).tap();
		await expect(tooltip).toBeHidden();
		await facts.getByRole('button', { name: 'Om servering', exact: true }).tap();
		await expect(tooltip).toHaveText('Läsken serverades med is.');
		await facts.getByText('Med is', { exact: true }).tap();
		await expect(tooltip).toBeHidden();
		await facts.getByRole('button', { name: 'Om mugg', exact: true }).tap();
		await expect(tooltip).toHaveText('Läsken serverades i en mugg.');
	});
});
