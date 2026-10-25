import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';

test('overview renders all published reviews and shared thresholds without JavaScript', async ({
	browser,
	request
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto(`${test.info().project.use.baseURL}table/`);
	await expect(page).toHaveTitle('Recensionsöversikt – En Stor Läsk Review');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
	const thresholds = page.getByRole('region', { name: 'Gränser för helhetsbetyg' });
	await expect(thresholds).toContainText('0 till under 2,5 poäng');
	await expect(thresholds).toContainText('2,5 till under 3,5 poäng');
	await expect(thresholds).toContainText('3,5 till under 4,5 poäng');
	await expect(thresholds).toContainText('4,5 till 5 poäng');
	const table = page.getByRole('table');
	await expect(table.locator('tr[data-review]')).toHaveCount(6);
	const soda = table.getByRole('row').filter({ has: page.locator('a[href$="/testsoda/"]') });
	await expect(soda.getByRole('img', { name: 'Helhetsbetyg 3 av 3' })).toBeVisible();
	await expect(soda).toContainText('Högsta betyg');
	await expect(soda).toContainText('Viktad läskmodell');
	await expect(soda.locator('[data-metric="taste"]')).toHaveText('5 / 5');
	for (const [rating, count] of [
		[0, 1],
		[1, 0],
		[2, 1],
		[3, 2]
	]) {
		await expect(thresholds.locator(`[data-rating-band="${rating}"]`)).toContainText(
			`${count} läskrecension`
		);
	}
	await expect(soda.getByRole('link', { name: 'Testläsk', exact: true })).toHaveAttribute(
		'href',
		`${basePath}/testsoda/`
	);
	const sitemap = await (await request.get('sitemap.xml')).text();
	expect(sitemap).not.toContain('/table/');
	await context.close();
});

test('column headings toggle sorting and search retains the chosen order', async ({ page }) => {
	await page.goto('table/');
	const table = page.getByRole('table');
	const rows = table.locator('tr[data-review]');
	const names = rows.getByRole('link');
	await expect(names.first()).toHaveText('Läsk med egen förpackning');
	await expect(page.getByRole('combobox', { name: 'Sortera efter' })).toHaveCount(0);
	const score = table.getByRole('columnheader', { name: 'Poäng' });
	await expect(score).toHaveAttribute('aria-sort', 'descending');
	await score.getByRole('button').click();
	await expect(score).toHaveAttribute('aria-sort', 'ascending');
	await expect(rows.first()).toContainText('Robin');
	await score.getByRole('button').focus();
	await page.keyboard.press('Enter');
	await expect(score).toHaveAttribute('aria-sort', 'descending');
	await table.getByRole('button', { name: 'Recension', exact: true }).click();
	await expect(names.first()).toHaveText('Andra testbaren');
	await table.getByRole('button', { name: 'Recension', exact: true }).click();
	await expect(names.first()).toHaveText('Testläsk');
	await table.getByRole('button', { name: 'Recensent', exact: true }).click();
	await expect(rows.first()).toContainText('Alex');
	await table.getByRole('button', { name: 'Betyg', exact: true }).click();
	await expect(rows.first()).toContainText('3/3');
	await table.getByRole('button', { name: 'Nästa', exact: true }).click();
	await expect(rows.last()).toContainText('Högsta betyg');
	await table.getByRole('button', { name: 'Nästa', exact: true }).click();
	await expect(rows.first()).toContainText('Robin');
	await expect(rows.last()).toContainText('Högsta betyg');
	await page.getByRole('searchbox', { name: 'Sök recension eller recensent' }).fill('Alex');
	await expect(names).toHaveCount(1);
	await expect(page.getByRole('status')).toContainText('Visar 1 av 6');
	await expect(table.getByRole('columnheader', { name: 'Nästa' })).toHaveAttribute(
		'aria-sort',
		'descending'
	);
	await page.getByRole('searchbox').fill('finns-inte');
	await expect(table).toContainText('Inga recensioner att visa.');
});

test('wide table and metric selector fit desktop and stay accessible on mobile', async ({
	page
}, testInfo) => {
	await page.goto('table/');
	await page.evaluate(() => document.fonts.ready);
	const table = page.getByRole('table');
	const frame = page.getByRole('region', { name: 'Recensionstabell', exact: true });
	await expect(table.locator('details')).toHaveCount(0);
	await expect(table.getByRole('combobox', { name: 'Välj delbetyg' })).toHaveCount(1);
	for (const width of [1280, 1600]) {
		await page.setViewportSize({ width, height: 900 });
		for (const theme of ['dark', 'light']) {
			const toggle = page.getByRole('button', { name: 'Mörkt läge', exact: true });
			if ((await toggle.getAttribute('aria-pressed')) !== String(theme === 'dark'))
				await toggle.click();
			expect((await frame.boundingBox())!.width).toBeGreaterThan(1152);
			expect((await table.locator('thead').boundingBox())!.height).toBeLessThanOrEqual(64);
			expect(await frame.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
				true
			);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await expect(
				table.getByRole('columnheader', { name: 'Återköpspotential', exact: true })
			).toBeVisible();
			await expect(table.locator('tr[data-review="testsoda"] [data-metric="taste"]')).toBeVisible();
			await page.screenshot({
				path: testInfo.outputPath(`wide-table-${width}-${theme}.png`),
				fullPage: true
			});
		}
	}
	await page.setViewportSize({ width: 375, height: 812 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await frame.evaluate((element) => {
		element.scrollLeft = element.scrollWidth;
	});
	await table
		.getByRole('columnheader', { name: 'Återköpspotential', exact: true })
		.scrollIntoViewIfNeeded();
	await expect(
		table.getByRole('columnheader', { name: 'Återköpspotential', exact: true })
	).toBeInViewport();
	await page.goto('./');
	await expect(page.getByRole('link', { name: 'Recensionsöversikt' })).toHaveCount(0);
});

test('individual-score selector swaps raw and transformed scores and sorts missing values last', async ({
	page
}) => {
	await page.goto('table/');
	const table = page.getByRole('table');
	const selector = table.getByRole('combobox', { name: 'Välj delbetyg' });
	const rows = table.locator('tr[data-review]');
	const soda = table.locator('tr[data-review="testsoda"]');
	const legacy = table.locator('tr[data-review="hallonsoda"]');
	await selector.selectOption('sweetness');
	await expect(soda.locator('[data-metric]')).toHaveText('3 / 5');
	await expect(legacy.locator('[data-metric]')).toHaveText('4 / 5');
	await table.getByRole('button', { name: 'Sortera efter Sötma', exact: true }).click();
	await expect(rows.first()).toContainText('Robin');
	await expect(rows.last().locator('[data-metric]')).toHaveText('–');
	await selector.selectOption('sweetnessBalance');
	await expect(soda.locator('[data-metric]')).toHaveText('5 / 5');
	await expect(legacy.locator('[data-metric]')).toHaveText('–');
	await expect(rows.first().getByRole('link')).toHaveText('Läsk med egen förpackning');
	await table
		.getByRole('button', { name: 'Sortera efter Sötmabalans i formeln', exact: true })
		.click();
	await expect(rows.first()).toContainText('Robin');
	await expect(rows.first().locator('[data-metric]')).toHaveText('0 / 5');
	await expect(rows.last().locator('[data-metric]')).toHaveText('–');
	await selector.selectOption('atmosphere');
	await expect(soda.locator('[data-metric]')).toHaveText('–');
	await expect(legacy.locator('[data-metric]')).toHaveText('1 / 5');
	await expect(rows.first().getByRole('link')).toHaveText('Hallonsoda');
});

test('rating cards count only soda reviews in the current search', async ({ page }) => {
	await page.goto('table/');
	const thresholds = page.getByRole('region', { name: 'Gränser för helhetsbetyg' });
	const search = page.getByRole('searchbox', { name: 'Sök recension eller recensent' });
	await search.fill('Alex');
	for (const rating of [0, 1, 2, 3])
		await expect(thresholds.locator(`[data-rating-band="${rating}"]`)).toContainText(
			`${rating === 3 ? 1 : 0} läskrecension`
		);
	await search.fill('Testbaren');
	await expect(page.getByRole('status')).toContainText('Visar 2 av 6');
	for (const rating of [0, 1, 2, 3])
		await expect(thresholds.locator(`[data-rating-band="${rating}"]`)).toContainText(
			'0 läskrecensioner'
		);
	await search.fill('finns-inte');
	for (const rating of [0, 1, 2, 3])
		await expect(thresholds.locator(`[data-rating-band="${rating}"]`)).toContainText(
			'0 läskrecensioner'
		);
});
