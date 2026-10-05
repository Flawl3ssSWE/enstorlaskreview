import { expect, test } from '@playwright/test';

test('rating help opens on hover and keyboard focus and dismisses with Escape', async ({
	page
}) => {
	await page.goto('testsoda/');
	const help = page.getByRole('button', { name: 'Om sötma', exact: true });
	const tooltip = page.getByRole('tooltip').filter({ hasText: 'Hur söt är läsken?' });
	await expect(tooltip).toBeHidden();
	await help.hover();
	await expect(tooltip).toBeVisible();
	await expect(tooltip).toContainText('Sötmabalans:');
	await page.mouse.move(0, 0);
	await expect(tooltip).toBeHidden();
	await help.focus();
	await expect(tooltip).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(tooltip).toBeHidden();
	await expect(help).toHaveAttribute('aria-expanded', 'false');
});

test('help fits the mobile viewport and dismisses when tapping outside', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('statistik/');
	await page.getByRole('button', { name: 'Om snittpris per förpackning' }).click();
	const tooltip = page
		.getByRole('tooltip')
		.filter({ hasText: 'Förpackningarnas storlek varierar.' });
	await expect(tooltip).toBeVisible();
	const bounds = (await tooltip.boundingBox())!;
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
	expect(bounds.y).toBeGreaterThanOrEqual(0);
	expect(bounds.y + bounds.height).toBeLessThanOrEqual(812);
	await page.getByRole('heading', { name: 'Läsk i siffror.' }).click();
	await expect(tooltip).toBeHidden();
});

test('generator keeps labelled inputs and their rating descriptions', async ({ page }) => {
	await page.goto('skapa/');
	const sweetness = page.getByRole('spinbutton', { name: 'Sötma', exact: true });
	await expect(sweetness).toHaveAccessibleDescription(/0 = inte söt, 3 = perfekt, 5 = för söt/);
	await expect(page.locator('#soda-sweetness-help')).toBeVisible();
	await expect(page.locator('#soda-mouthfeel-help')).toBeVisible();
	await sweetness.fill('4.5');
	await expect(sweetness).toHaveValue('4.5');
});
