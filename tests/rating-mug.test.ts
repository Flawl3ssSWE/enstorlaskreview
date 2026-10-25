import { expect, test } from '@playwright/test';

test('mugs show four distinct fill levels and keep every numeric rating without JavaScript', async ({
	browser
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto(`${test.info().project.use.baseURL}about/`);
	const fills: string[] = [];
	for (let rating = 0; rating <= 3; rating++) {
		const mug = page.getByRole('img', { name: `Helhetsbetyg ${rating} av 3`, exact: true });
		await expect(mug).toBeVisible();
		await expect(mug).toContainText(`${rating}/3`);
		fills.push((await mug.locator('polygon').getAttribute('points'))!);
	}
	expect(new Set(fills).size).toBe(4);
	await context.close();
});

test('cards and review pages pair the mug with a written score', async ({ page }) => {
	await page.goto('./?search=Testläsk');
	const card = page.locator('main a[href$="/testsoda/"]');
	await expect(card.getByRole('img', { name: 'Helhetsbetyg 3 av 3' })).toContainText('3/3');
	await card.click();
	await expect(page.getByRole('img', { name: 'Läskens helhetsbetyg 3 av 3' })).toContainText(
		'3 av 3'
	);
});

test('map previews fit a resized viewport and Escape respects an open dialog', async ({ page }) => {
	await page.route('https://tiles.openfreemap.org/**', (route) =>
		route.fulfill({ json: { version: 8, sources: {}, layers: [] } })
	);
	await page.goto('karta/');
	await page.getByRole('button', { name: 'Jag godkänner – ladda kartan' }).click();
	const marker = page.getByRole('button', { name: /Visa Testbaren på kartan/ });
	await marker.click();
	const preview = page.getByRole('region', { name: 'Information om Testbaren', exact: true });
	await expect(preview.getByRole('img', { name: /Helhetsbetyg/ })).toBeVisible();
	await page.setViewportSize({ width: 320, height: 568 });
	await expect(preview.getByRole('link', { name: 'Läs recension' })).toBeVisible();
	const bounds = await preview.boundingBox();
	expect(bounds!.width).toBeLessThanOrEqual(320);
	await page.evaluate(() => {
		const dialog = document.createElement('dialog');
		dialog.textContent = 'Dialog';
		document.body.append(dialog);
		dialog.showModal();
	});
	await page.keyboard.press('Escape');
	await expect(preview).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(preview).toHaveCount(0);
	await expect(marker).toBeFocused();
});
