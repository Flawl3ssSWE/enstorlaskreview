import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';

test('a test soda follows V2 calibration and stays outside the published reviews', async ({
	page
}) => {
	await page.setViewportSize({ width: 320, height: 812 });
	await page.goto('table/');
	const reviews = page.getByRole('table');
	const originalReviews = await reviews.innerText();
	const thresholds = page.getByRole('region', { name: 'Gränser för helhetsbetyg' });
	const originalThresholds = await thresholds.innerText();
	await page.getByText('Testa en egen läsk', { exact: true }).click();
	const result = page.getByRole('status', { name: 'Testläskens resultat' });
	const balance = page.getByRole('combobox', { name: 'Balans', exact: true });
	const mouthfeel = page.getByRole('combobox', { name: 'Munkänsla', exact: true });
	await balance.selectOption('1');
	await expect(result).toContainText('2,5/5 poäng');
	await expect(
		result.getByRole('img', { name: 'Helhetsbetyg med standardvikter 1 av 3' })
	).toBeVisible();
	await mouthfeel.selectOption('2');
	await expect(result).toContainText('2,35/5 poäng');
	await expect(
		result.getByRole('img', { name: 'Helhetsbetyg med standardvikter 0 av 3' })
	).toBeVisible();
	await page.getByText('Kalibrera poängen', { exact: true }).click();
	await page.getByRole('slider', { name: /^Smak/ }).fill('100');
	await expect(result).toContainText('2,594/5 poäng');
	await expect(
		result.getByRole('img', { name: 'Helhetsbetyg med dina v2-vikter 1 av 3' })
	).toBeVisible();
	await expect(
		result.getByRole('img', { name: 'Helhetsbetyg med standardvikter 0 av 3' })
	).toBeVisible();
	for (const slider of await page.getByRole('slider').all()) await slider.fill('0');
	await expect(result.getByText('2,35/5 poäng', { exact: true })).toHaveCount(2);
	await page.getByRole('slider', { name: /^Smak/ }).fill('100');
	await expect(result).toContainText('3/5 poäng');
	await page.getByRole('button', { name: 'Återställ standardvikter' }).click();
	await expect(result.getByText('2,35/5 poäng', { exact: true })).toHaveCount(2);
	expect(await reviews.innerText()).toBe(originalReviews);
	expect(await thresholds.innerText()).toBe(originalThresholds);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('calibration sliders update scores, ratings, counts and sorting and can be reset', async ({
	page
}) => {
	await page.goto('table/');
	await page.getByText('Kalibrera poängen', { exact: true }).click();
	await page.getByLabel('Betygsmodell att kalibrera').selectOption('weighted');
	const soda = page.locator('tr[data-review="testsoda"]');
	const legacy = page.locator('tr[data-review="hallonsoda"]');
	const originalLegacy = await legacy.innerText();
	const thresholds = page.getByRole('region', { name: 'Gränser för helhetsbetyg' });
	const panel = page
		.locator('details')
		.filter({ has: page.getByRole('slider', { name: /^Smak/ }) });
	for (const slider of await panel.getByRole('slider').all()) await slider.fill('0');
	await expect(panel).toContainText('När alla vikter är 0 används standardvikterna.');
	await expect(soda.getByRole('img', { name: 'Helhetsbetyg 3 av 3' })).toBeVisible();
	const sweetness = panel.getByRole('slider', { name: /^Sötmabalans/ });
	await sweetness.fill('100');
	await expect(soda).toContainText('Kalibrerad läskmodell');
	await expect(soda.getByRole('img', { name: 'Helhetsbetyg 3 av 3' })).toBeVisible();
	expect(await legacy.innerText()).toBe(originalLegacy);
	await expect(thresholds.locator('[data-rating-band="0"]')).toContainText('1 läskrecension');
	await expect(thresholds.locator('[data-rating-band="2"]')).toContainText('1 läskrecension');
	await expect(page.locator('tr[data-review]').last()).toContainText('Robin');
	await sweetness.focus();
	await page.keyboard.press('ArrowLeft');
	await expect(sweetness).toHaveValue('99');
	await page.setViewportSize({ width: 375, height: 812 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await panel.getByRole('button', { name: 'Återställ standardvikter' }).click();
	await expect(sweetness).toHaveValue('15');
	await expect(soda).toContainText('Viktad läskmodell');
	await expect(thresholds.locator('[data-rating-band="2"]')).toContainText('1 läskrecension');
	await page.reload();
	await page.getByText('Kalibrera poängen', { exact: true }).click();
	await page.getByLabel('Betygsmodell att kalibrera').selectOption('weighted');
	await expect(sweetness).toHaveValue('15');
});

test('V2 is the default calibration and the example stays outside published results', async ({
	page
}) => {
	await page.goto('table/');
	const formula = page.getByRole('heading', { name: 'Så räknas läskmodell V2' });
	await expect(formula).toBeHidden();
	await page.getByText('Så räknas poängen', { exact: true }).click();
	await expect(formula).toBeVisible();
	await expect(
		page.getByText('Smak × 40 % + Balans × 25 % + Eftersmak × 20 % + Munkänsla × 15 %', {
			exact: true
		})
	).toBeVisible();
	await page.getByText('Kalibrera poängen', { exact: true }).click();
	const model = page.getByLabel('Betygsmodell att kalibrera');
	await expect(model).toHaveValue('v2');
	const example = page.getByRole('region', { name: 'Räkneexempel' });
	await expect(example.getByText('4,25/5 · 2/3 muggar', { exact: true })).toHaveCount(2);
	const table = page.getByRole('table');
	const before = await table.innerText();
	await expect(page.getByRole('slider')).toHaveCount(4);
	const balance = page.getByRole('slider', { name: /^Balans/ });
	await expect(balance).toHaveValue('25');
	await balance.fill('100');
	await expect(example).toContainText('4,571/5 · 3/3 muggar');
	expect(await table.innerText()).toBe(before);
	await model.selectOption('weighted');
	await expect(example).toHaveCount(0);
	await model.selectOption('v2');
	await expect(balance).toHaveValue('100');
	await page.getByRole('button', { name: 'Återställ standardvikter' }).click();
	await expect(example.getByText('4,25/5 · 2/3 muggar', { exact: true })).toHaveCount(2);
});

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
