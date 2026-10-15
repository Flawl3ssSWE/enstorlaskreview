import { openEditorTools } from './review-editor-helpers';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { validateReview } from '../src/lib/content/validation';

async function image(page: Page) {
	await page
		.getByLabel('Bild till recensionen')
		.setInputFiles('tests/fixtures/images/test-bar.png');
	await expect(page.getByText('Komprimerad bild:')).toBeVisible();
}

for (const route of ['skapa/', 'skapa/wizard/']) {
	for (const source of ['published', 'imported']) {
		test(`${route} opens the saved image when loading a ${source} review from another step`, async ({
			page
		}) => {
			await page.goto(route);
			await page.getByRole('button', { name: '3. Data', exact: true }).click();
			await openEditorTools(page);
			if (source === 'published') {
				await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
			} else {
				await page
					.getByLabel('Recensionens JSON-fil', { exact: true })
					.setInputFiles('tests/fixtures/content/testsoda.json');
			}
			await expect(page.getByRole('button', { name: '1. Bild', exact: true })).toHaveAttribute(
				'aria-current',
				'step'
			);
			await expect(page.getByRole('heading', { name: 'Bild', exact: true })).not.toBeFocused();
			const preview = page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' });
			await expect(preview).toBeVisible();
			await expect(preview).toHaveAttribute(
				'src',
				`${process.env.BASE_PATH ?? ''}/images/test-bar.png`
			);
			await expect(preview).toHaveCSS('object-position', '25% 75%');
			await expect(page.getByRole('slider', { name: /Zoom:/ })).toHaveValue('1.5');
			expect(
				await preview.evaluate((image: HTMLImageElement) =>
					image.decode().then(() => image.naturalWidth)
				)
			).toBeGreaterThan(0);
			const crop = page.getByRole('button', { name: 'Justera bildens utsnitt' });
			await crop.press('Shift+ArrowRight');
			await page.getByRole('slider', { name: /Zoom:/ }).press('End');
			await page.getByRole('button', { name: '4. Skicka recension', exact: true }).click();
			const downloaded = page.waitForEvent('download');
			await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
			const file = await downloaded;
			const json = JSON.parse(await readFile((await file.path())!, 'utf8'));
			expect(json).toMatchObject({
				slug: 'testsoda',
				image: 'test-bar.png',
				imageFocusX: 15,
				imageFocusY: 75,
				imageZoom: 3
			});
			await expect(
				page.getByRole('button', { name: 'Ladda ner bild', exact: true })
			).toBeDisabled();
		});
	}

	test(`${route} guides image, taste and data without losing values`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto(route);
		await expect(page.getByRole('button', { name: 'Verktyg', exact: true })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
		await expect(page.getByRole('group', { name: 'Visningsläge', exact: true })).toBeHidden();
		await page.getByRole('button', { name: 'Nästa', exact: true }).click();
		await expect(page.getByRole('alert')).toContainText('Välj en bild');
		await image(page);
		await page.getByRole('button', { name: 'Nästa', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Smak', exact: true })).toBeFocused();
		await page.getByLabel('Fri text').fill('Frisk och god.');
		await page.getByRole('button', { name: 'Nästa', exact: true }).click();
		await expect(page.getByLabel('Återköpspotential')).toBeFocused();
		await page.getByLabel('Återköpspotential').selectOption('0');
		await page.getByRole('button', { name: 'Nästa', exact: true }).click();
		await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Anton');
		await expect(page.locator('#sugar-type')).toHaveValue('sugar-free');
		await page.getByLabel('Läskens namn / rubrik').fill('Testläsk Zero');
		await expect(page.locator('#brand')).toHaveValue('Testläsk');
		const brandHint = page.getByRole('button', { name: 'Automatiskt ifyllt: Märke', exact: true });
		const brandPosition = await page.locator('#brand').boundingBox();
		await brandHint.click();
		await expect(brandHint).toHaveAccessibleDescription(
			'Värdet har fyllts i automatiskt. Du kan ändra det själv.'
		);
		expect(await page.locator('#brand').boundingBox()).toEqual(brandPosition);
		await brandHint.press('Escape');
		await expect(brandHint).toHaveAttribute('aria-expanded', 'false');
		await page.locator('#brand').fill('Eget märke');
		await expect(brandHint).toHaveCount(0);
		await page.getByLabel('Läskens namn / rubrik').fill('Ny testläsk');
		await expect(page.locator('#brand')).toHaveValue('Eget märke');
		await page.locator('#review-1-volume').selectOption('800');
		await expect(page.locator('#container')).toHaveValue('SodaStream smak');
		await page.locator('#review-1-volume').selectOption('355');
		await expect(page.locator('#container')).toHaveValue('Burk');
		const containerHint = page.getByRole('button', {
			name: 'Automatiskt ifyllt: Förpackning',
			exact: true
		});
		await containerHint.click();
		await expect(containerHint).toHaveAccessibleDescription(
			'Förpackningen har valts automatiskt utifrån volymen. Du kan ändra den själv.'
		);
		await page.locator('#container').selectOption('Glasflaska');
		await expect(containerHint).toHaveCount(0);
		await page.locator('#review-1-volume').selectOption('500');
		await expect(page.locator('#container')).toHaveValue('Glasflaska');
		await page.getByRole('checkbox', { name: 'Originalförpackning', exact: true }).check();
		await expect(page.locator('#served-with-ice')).toHaveValue('false');
		await page.locator('#served-with-ice').selectOption({ label: 'Med is' });
		await page.getByRole('checkbox', { name: 'Glas', exact: true }).check();
		await expect(page.locator('#served-with-ice')).toHaveValue('true');
		await page.locator('#carbohydrate').fill('10');
		await expect(page.locator('#sugar-type')).toHaveValue('sugared');
		await page.locator('#sugar-type').selectOption('sugar-free');
		await page.locator('#carbohydrate').fill('12');
		await expect(page.locator('#sugar-type')).toHaveValue('sugar-free');
		await page.getByRole('button', { name: 'Nästa', exact: true }).click();
		await expect(page.locator('#review-1-price')).toBeFocused();
		await page.locator('#review-1-price').fill('12,55');
		await page.getByRole('button', { name: 'Nästa', exact: true }).click();
		await expect(page.locator('#review-1-price')).toBeFocused();
		await page.locator('#review-1-price').fill('12,5');
		await expect(page.getByRole('slider', { name: 'Prislinjal' })).toHaveCount(0);
		await openEditorTools(page);
		await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
		await expect(page.getByLabel('Fri text')).toHaveValue('Frisk och god.');
		await page.getByRole('button', { name: 'Skapa steg för steg', exact: true }).click();
		await page.getByRole('button', { name: 'Verktyg', exact: true }).click();
		await expect(page.getByRole('group', { name: 'Visningsläge', exact: true })).toBeHidden();
		await expect(page.locator('#review-1-price')).toHaveValue('12,5');
		await page.getByRole('button', { name: 'Nästa', exact: true }).click();
		const downloaded = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
		const file = await downloaded;
		const json = JSON.parse(await readFile((await file.path())!, 'utf8'));
		validateReview(json, file.suggestedFilename());
		expect(json).toMatchObject({
			author: 'Anton',
			repurchasePotential: 0,
			volumeMl: 500,
			container: 'Glasflaska',
			beerPriceKr: 12.5
		});
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(errors).toEqual([]);
	});
}

test('final validation and older imports require repurchase potential without changing public content', async ({
	page
}) => {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await page.getByRole('button', { name: '2. Smak', exact: true }).click();
	await expect(page.locator('#repurchase-potential')).toHaveValue('5');
	const fixture = JSON.parse(await readFile('tests/fixtures/content/testsoda.json', 'utf8'));
	delete fixture.repurchasePotential;
	delete fixture.sugarType;
	delete fixture.container;
	validateReview(fixture, 'testsoda.json');
	await page.getByLabel('Recensionens JSON-fil').setInputFiles({
		name: 'testsoda.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(fixture))
	});
	await page.getByRole('button', { name: '3. Data', exact: true }).click();
	await expect(page.locator('#sugar-type')).toHaveValue('');
	await expect(page.locator('#container')).toHaveValue('');
	await page.locator('#review-1-volume').selectOption('500');
	await expect(page.locator('#container')).toHaveValue('Burk');
	await page.locator('#carbohydrate').fill('1');
	await expect(page.locator('#sugar-type')).toHaveValue('sugared');
	await page.getByRole('button', { name: '4. Skicka recension', exact: true }).click();
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	await expect(page.locator('#repurchase-potential')).toBeFocused();
	await page.locator('#repurchase-potential').selectOption('5');
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	expect(
		JSON.parse(await readFile((await (await download).path())!, 'utf8')).repurchasePotential
	).toBe(5);
});

test('required data and automatic reset work in the full form', async ({ page }) => {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await image(page);
	await page.locator('#repurchase-potential').selectOption('0');
	await page.getByLabel('Fri text').fill('Frisk.');
	await page.getByLabel('Läskens namn / rubrik').fill('Testläsk Zero');
	await page.locator('#review-1-price').fill('20');
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	await expect(page.locator('#review-1-volume')).toBeFocused();
	await page.locator('#review-1-volume').selectOption('330');
	await page.locator('#container').selectOption('');
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	await expect(page.locator('#container')).toBeFocused();
	await page.locator('#brand').fill('Eget');
	await page.locator('#sugar-type').selectOption('sugared');
	await page.getByRole('checkbox', { name: 'Originalförpackning', exact: true }).check();
	await page.locator('#served-with-ice').selectOption({ label: 'Med is' });
	await page.getByRole('button', { name: 'Återställ automatiska förslag', exact: true }).click();
	await expect(page.locator('#brand')).toHaveValue('Testläsk');
	await expect(page.locator('#container')).toHaveValue('Burk');
	await expect(page.locator('#sugar-type')).toHaveValue('sugar-free');
	await expect(page.locator('#served-with-ice')).toHaveValue('false');
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Koordinater för kartan (valfritt)', { exact: true }).click();
	await page.locator('#latitude').fill('91');
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	await expect(page.locator('#latitude')).toBeFocused();
	await page.locator('#latitude').fill('');
	const downloaded = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	await downloaded;
});
