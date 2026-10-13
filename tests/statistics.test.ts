import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';

test('soda statistics show comparable nutrient records and linked price extremes without JavaScript', async ({
	browser
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto(`http://127.0.0.1:4173${basePath}/statistik/`);
	await expect(page.getByRole('region', { name: 'Överblick', exact: true })).toContainText(
		'Recenserade produkter'
	);
	await expect(page.getByRole('heading', { name: 'Högst literpris', exact: true })).toBeVisible();
	const caffeine = page.getByRole('region', { name: 'Mest koffein', exact: true });
	await expect(caffeine.getByRole('region', { name: 'Per 100 ml', exact: true })).toContainText(
		'32 mg/100 ml'
	);
	await expect(
		caffeine.getByRole('region', { name: 'Per förpackning', exact: true })
	).toContainText('480 mg');
	await expect(
		caffeine.getByRole('region', { name: 'Per förpackning', exact: true })
	).toContainText('1,5 l');
	await expect(
		caffeine
			.getByRole('region', { name: 'Per 100 ml', exact: true })
			.getByRole('link', { name: 'Testläsk', exact: true })
			.first()
	).toHaveAttribute('href', `${basePath}/testsoda/`);
	const protein = page.getByRole('region', { name: 'Mest protein', exact: true });
	await expect(protein.getByRole('region', { name: 'Per 100 ml', exact: true })).toContainText(
		'6,06 g/100 ml'
	);
	await expect(protein.getByRole('region', { name: 'Per förpackning', exact: true })).toContainText(
		'20 g'
	);
	const carbohydrate = page.getByRole('region', { name: 'Mest kolhydrater', exact: true });
	await expect(carbohydrate.getByRole('region', { name: 'Per 100 ml', exact: true })).toContainText(
		'0 g/100 ml'
	);
	await expect(page.getByRole('region', { name: 'Innehållstoppen', exact: true })).toContainText(
		'Kolhydrater är inte samma sak som socker'
	);
	await context.close();
});

test('statistics overview and nutrient sections fit mobile and desktop in both themes', async ({
	page
}, testInfo) => {
	await page.goto('statistik/');
	for (const width of [375, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		for (const theme of ['dark', 'light']) {
			const toggle = page.getByRole('button', { name: 'Mörkt läge', exact: true });
			if ((await toggle.getAttribute('aria-pressed')) !== String(theme === 'dark'))
				await toggle.click();
			await expect(
				page.getByRole('region', { name: 'Innehållstoppen', exact: true })
			).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.screenshot({
				path: testInfo.outputPath(`statistics-${theme}-${width}.png`),
				fullPage: true
			});
		}
	}
});
