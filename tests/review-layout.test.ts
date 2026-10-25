import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';

test('refreshed soda pages keep their details in both themes and responsive layouts', async ({
	page
}, testInfo) => {
	for (const width of [320, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('testsoda/');
		await page.evaluate(() => document.fonts.ready);
		const image = page.getByRole('img', { name: 'Testläsk', exact: true });
		const title = page.getByRole('heading', { name: 'Testläsk', exact: true });
		await expect(image).toHaveCSS('aspect-ratio', '1 / 1');
		await expect(image).toHaveCSS('object-position', '25% 75%');
		await expect(image).toHaveCSS('transform', 'matrix(1.5, 0, 0, 1.5, 0, 0)');
		const photoBox = await image.locator('..').boundingBox();
		const titleBox = await title.boundingBox();
		if (width === 320) {
			expect(titleBox!.y).toBeGreaterThanOrEqual(photoBox!.y + photoBox!.height);
		} else {
			expect(titleBox!.x).toBeGreaterThanOrEqual(photoBox!.x + photoBox!.width);
			expect(titleBox!.y).toBeLessThan(photoBox!.y + photoBox!.height);
		}

		await expect(page.getByRole('img', { name: 'Läskens helhetsbetyg 3 av 3' })).toBeVisible();
		await expect(page.getByText('* Köpt på rea', { exact: true })).toBeVisible();
		await expect(page.getByText('Läskfavorit', { exact: true })).toBeVisible();
		await expect(page.getByText(/Återköpspotential:/)).toContainText('5/5');
		const facts = page.getByRole('region', { name: 'Drycksfakta', exact: true });
		await expect(facts).toContainText('Förpackning: Burk');
		await expect(facts).toContainText('Koffein: 32 mg/100 ml');
		await expect(facts).toContainText('Serveringsmetod: Glas · Sugrör');
		await expect(page.getByRole('region', { name: 'Recension', exact: true })).toContainText(
			'Frisk och balanserad enligt Alex.'
		);
		await expect(
			page.getByRole('region', { name: 'Läskbetyg', exact: true }).getByRole('listitem')
		).toHaveCount(8);
		await expect(page.getByRole('link', { name: 'Tillbaka till recensioner' })).toHaveAttribute(
			'href',
			`${basePath}/`
		);
		await expect(page.getByRole('link', { name: 'Visa historik på GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/Flawl3ssSWE/enstorlaskreview/commits/HEAD/content/reviews/testsoda.json'
		);
		for (const theme of ['dark', 'light']) {
			const toggle = page.getByRole('button', { name: 'Mörkt läge', exact: true });
			if ((await toggle.getAttribute('aria-pressed')) !== String(theme === 'dark'))
				await toggle.click();
			await page.screenshot({
				path: testInfo.outputPath(`soda-${theme}-${width}.png`),
				fullPage: true,
				animations: 'disabled'
			});
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
		}
	}
});

test('reviews without a sale flag omit the sale notice', async ({ page }) => {
	await page.goto('hallonsoda/');
	await expect(page.getByText('* Köpt på rea', { exact: true })).toHaveCount(0);
});

test('favorite seals follow each review on cards and soda pages', async ({ page }, testInfo) => {
	for (const width of [320, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('./?search=Testläsk');
		const favoriteCard = page.locator('main a[href$="/testsoda/"]');
		const otherCard = page.locator('main a[href$="/testsoda-robin/"]');
		const badge = favoriteCard.getByText('Läskfavorit', { exact: true });
		await expect(badge).toBeVisible();
		const badgeImage = badge.locator('..').locator('img');
		await expect(badgeImage).toBeVisible();
		await expect(badgeImage).toHaveJSProperty('naturalWidth', 1312);
		await expect(otherCard.getByText('Läskfavorit', { exact: true })).toHaveCount(0);
		const photo = await favoriteCard.getByRole('img', { name: 'Testläsk' }).boundingBox();
		const seal = await badge.locator('..').boundingBox();
		expect(seal!.x).toBeGreaterThan(photo!.x);
		expect(seal!.y).toBeGreaterThan(photo!.y);
		expect(seal!.x + seal!.width).toBeLessThan(photo!.x + photo!.width);
		expect(seal!.y + seal!.height).toBeLessThan(photo!.y + photo!.height);
		await favoriteCard.screenshot({ path: testInfo.outputPath(`favorite-card-${width}.png`) });
		await favoriteCard.click();
		await expect(
			page.getByRole('heading', { name: 'Testläsk', level: 1, exact: true })
		).toBeVisible();
		await expect(page.getByText('Läskfavorit', { exact: true })).toBeVisible();
		await expect(
			page.getByText('Läskfavorit', { exact: true }).locator('..').locator('img')
		).toHaveJSProperty('naturalWidth', 1312);
	}
	for (const slug of ['testsoda-robin', 'hallonsoda']) {
		await page.goto(`${slug}/`);
		await expect(page.getByText('Läskfavorit', { exact: true })).toHaveCount(0);
	}
});

test('sale cards show an asterisk without the sale note on the main page', async ({ page }) => {
	await page.goto('./?search=Testläsk');
	const card = page.locator('main a[href$="/testsoda/"]');
	await expect(card.getByText('20 kr*', { exact: true })).toBeVisible();
	await expect(page.getByText(/Köpt på rea/)).toHaveCount(0);
	await card.click();
	await expect(page.getByText('20 kr*', { exact: true })).toBeVisible();
	await expect(page.getByText('* Köpt på rea', { exact: true })).toBeVisible();
});
