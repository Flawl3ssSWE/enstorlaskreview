import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';

test('warm themes persist across pages and reloads under the static CSP', async ({
	page
}, testInfo) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (event) => {
			throw new Error(`CSP: ${event.violatedDirective}`);
		});
	});
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('./');
	const toggle = page.getByRole('button', { name: 'Mörkt läge', exact: true });
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: testInfo.outputPath('home-dark.png'), fullPage: true });
	await toggle.focus();
	await page.keyboard.press('Enter');
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
	await expect(page.locator('html')).toHaveCSS('--color-accent', '#a32637');
	await page.screenshot({ path: testInfo.outputPath('home-light.png'), fullPage: true });
	await page.getByRole('link', { name: 'Statistik', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.screenshot({ path: testInfo.outputPath('statistics-light.png'), fullPage: true });
	await page.reload();
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await page.goto('testsoda/');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.setViewportSize({ width: 320, height: 700 });
	await page.screenshot({ path: testInfo.outputPath('review-light-mobile.png'), fullPage: true });
	await page.goto('./');
	await page.screenshot({ path: testInfo.outputPath('home-light-mobile.png'), fullPage: true });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await toggle.click();
	await expect(page.locator('html')).toHaveCSS('--color-accent', '#fca5a5');
	await page.reload();
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	expect(await page.context().cookies()).toEqual([]);
	expect(errors).toEqual([]);
});

test('theme switching works when local storage is unavailable', async ({ page }) => {
	await page.addInitScript(() => {
		Storage.prototype.getItem = () => {
			throw new Error('Storage unavailable');
		};
		Storage.prototype.setItem = () => {
			throw new Error('Storage unavailable');
		};
	});
	await page.goto('./');
	await page.getByRole('button', { name: 'Mörkt läge', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.getByRole('button', { name: 'Mörkt läge', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('mobile menu supports keyboard dismissal and closes after navigation', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await page.goto('./');
	const toggle = page.getByRole('button', { name: 'Meny', exact: true });
	const menu = page.getByRole('dialog', { name: 'Meny', exact: true });
	await toggle.focus();
	await page.keyboard.press('Enter');
	await expect(menu).toBeVisible();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('Escape');
	await expect(menu).toBeHidden();
	await expect(toggle).toBeFocused();
	await toggle.click();
	await menu.getByRole('link', { name: 'Statistik', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`${basePath}/statistik/`));
	await expect(menu).toBeHidden();
	await toggle.click();
	await expect(menu.getByRole('link', { name: 'Statistik' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByRole('button', { name: 'Stäng menyn' }).click();
	await expect(menu).toBeHidden();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
