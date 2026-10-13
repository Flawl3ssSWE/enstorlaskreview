import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { validateReview } from '../src/lib/content/validation';

test('wizard validates steps, retains values, imports and exports decimal soda prices', async ({
	page
}, testInfo) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('skapa/');
	await page.getByRole('link', { name: 'Skapa steg för steg' }).click();
	await expect(page).toHaveURL(/\/skapa\/wizard\/$/);
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Steg 1 av 5');
	await page.getByLabel('Läskens namn / rubrik').fill('Wizardläsk');
	await page.getByLabel('Författare', { exact: true }).fill('Test');
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Läskbetyg', exact: true })).toBeFocused();
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await page.locator('#review-1-price').fill('12,5');
	const ruler = page.getByRole('slider', { name: 'Prislinjal' });
	await expect(ruler).toHaveAttribute('aria-valuenow', '12.5');
	await ruler.focus();
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('#review-1-price')).toHaveValue('12,6');
	await page.keyboard.press('Home');
	await expect(ruler).toHaveAttribute('aria-valuenow', '1');
	await page.keyboard.press('End');
	await expect(ruler).toHaveAttribute('aria-valuenow', '999');
	await page.locator('#review-1-price').fill('');
	await expect(ruler).toHaveAttribute('aria-valuetext', 'Inget pris');
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const box = (await ruler.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + 20);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2 - 24, box.y + 20, { steps: 4 });
	await page.mouse.up();
	await expect(page.locator('#review-1-price')).toHaveValue('21');
	await page.locator('#review-1-price').fill('12,5');
	await page.getByLabel('Fri text').fill('Frisk läsk från stegformuläret.');
	await page
		.getByLabel('Bild till recensionen')
		.setInputFiles('tests/fixtures/images/test-bar.png');
	await expect(page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('wizard-dark-mobile.png'), fullPage: true });
	await page.getByRole('button', { name: 'Mörkt läge', exact: true }).click();
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.screenshot({ path: testInfo.outputPath('wizard-light-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 375, height: 812 });
	await page.getByRole('button', { name: 'Föregående', exact: true }).click();
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await expect(page.locator('#review-1-price')).toHaveValue('12,5');
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	const downloaded = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	const file = await downloaded;
	const json = JSON.parse(await readFile((await file.path())!, 'utf8'));
	validateReview(json, file.suggestedFilename());
	expect(json).toMatchObject({ title: 'Wizardläsk', beerPriceKr: 12.5, author: 'Test' });
	await page.getByLabel('Recensionens JSON-fil', { exact: true }).setInputFiles({
		name: file.suggestedFilename(),
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(json))
	});
	await expect(
		page.getByRole('heading', { name: 'Redigera recension', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: '3. Din recension', exact: true }).click();
	await expect(page.locator('#review-1-price')).toHaveValue('12,5');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	expect(errors).toEqual([]);
});

test('wizard final validation returns to a missing required field', async ({ page }) => {
	await page.goto('skapa/wizard/');
	await page.getByRole('button', { name: '5. Skicka recension', exact: true }).click();
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	await expect(page.getByLabel('Läskens namn / rubrik')).toBeVisible();
	await expect(page.getByLabel('Läskens namn / rubrik')).toBeFocused();
});
