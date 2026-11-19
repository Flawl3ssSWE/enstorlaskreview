import { fillRating, fillTasting, openEditorTools } from './review-editor-helpers';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { validateReview } from '../src/lib/content/validation';
import {
	DRINK_CONTAINERS,
	DRINK_VOLUMES_ML,
	TASTING_RATING_METRICS,
	VENUE_RATING_METRICS
} from '../src/lib/review-metadata';

const basePath = process.env.BASE_PATH ?? '';

async function expectDrinkFact(
	page: import('@playwright/test').Page,
	label: string,
	value: string
) {
	const facts = page.getByRole('region', { name: 'Drycksfakta', exact: true });
	const row = facts.locator('dl > div').filter({
		has: page.getByRole('term').filter({ hasText: `${label}:` })
	});
	await expect(row).toHaveText(`${label}: ${value}`, { useInnerText: true });
}

async function forceWebpFallback(page: import('@playwright/test').Page) {
	await page.addInitScript(() => {
		const native = HTMLCanvasElement.prototype.toBlob;
		HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
			return native.call(this, callback, type === 'image/webp' ? 'image/png' : type, quality);
		};
	});
}

async function fillReview(page: import('@playwright/test').Page) {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page.getByLabel('Läskens namn / rubrik').fill('Ny hallonsoda');
	await page.getByLabel('Märke', { exact: true }).fill('Ny hallonsoda');
	await page.getByLabel('Författare', { exact: true }).fill('Test');
	await page.getByLabel('Fri text').fill('**Frisk** och lättdrucken.');
	await fillTasting(page);
	await fillRating(page, 'extra-name', 3);
	await fillRating(page, 'extra-packaging', 3);
	await page.locator('#review-1-volume').selectOption('330');
	await page.getByLabel('Serveringstemperatur', { exact: true }).selectOption('Kylskåpskall');
	await page.getByLabel('Is', { exact: true }).selectOption('false');
	await page.locator('#review-1-price').fill('20');
	await fillRating(page, 'extra-value', 3);
	await page.locator('#repurchase-potential').selectOption('3');
	await page
		.getByLabel('Bild till recensionen')
		.setInputFiles('tests/fixtures/images/test-bar.png');
	await expect(page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' })).toBeVisible();
}

async function exportJson(page: import('@playwright/test').Page) {
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner JSON' }).click();
	const download = await downloadPromise;
	const text = await readFile((await download.path())!, 'utf8');
	expect(text).toBe(
		await format(text, {
			...(await resolveConfig('content/reviews/example.json')),
			parser: 'json'
		})
	);
	const json = JSON.parse(text);
	validateReview(json, download.suggestedFilename());
	return { json, filename: download.suggestedFilename() };
}

test('sale purchases export the paid price and can be unchecked', async ({ page }) => {
	await fillReview(page);
	const sale = page.getByRole('checkbox', { name: 'Köpt på rea', exact: true });
	await expect(sale).not.toBeChecked();
	expect((await exportJson(page)).json).not.toHaveProperty('isOnSale');
	await sale.check();
	const { json } = await exportJson(page);
	expect(json).toMatchObject({ isOnSale: true, beerPriceKr: 20 });
	await sale.uncheck();
	expect((await exportJson(page)).json.isOnSale).not.toBe(true);
});

test('generator downloads one flat review with one price and a separate compressed WebP', async ({
	page
}) => {
	await fillReview(page);
	await expect(page).toHaveURL(new RegExp(`${basePath}/skapa/`));
	await expect(page.getByRole('textbox', { name: 'Pris i kronor', exact: true })).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Lägg till recensent' })).toHaveCount(0);
	await expect(page.locator('#container option')).toHaveText(['Ej angiven', ...DRINK_CONTAINERS]);
	expect(await page.locator('#review-1-volume option').count()).toBe(DRINK_VOLUMES_ML.length + 2);
	await page.locator('#container').selectOption('Burk');
	await page.locator('#review-1-volume').selectOption('330');
	await page.getByRole('checkbox', { name: 'Originalförpackning', exact: true }).check();
	await page.getByLabel('Pris i kronor', { exact: true }).fill('25');
	await page.getByRole('checkbox', { name: /läskfavorit/ }).check();
	await page.getByLabel('Återköpspotential').selectOption('1');
	await page.getByLabel('Betygsätt stället också').check();
	for (const { key } of TASTING_RATING_METRICS) await page.locator(`#tasting-${key}`).fill('5');
	for (const metric of VENUE_RATING_METRICS) await page.locator(`#venue-${metric.key}`).fill('1');
	const { json, filename } = await exportJson(page);
	expect(filename).toBe('ny-hallonsoda-test.json');
	expect(validateReview(json, filename).rating).toBe(3);
	expect(json).toMatchObject({
		author: 'Test',
		favorite: true,
		repurchasePotential: 1,
		description: '**Frisk** och lättdrucken.',
		location: '',
		beerPriceKr: 25,
		image: 'ny-hallonsoda-test.webp',
		container: 'Burk',
		volumeMl: 330,
		servingMethods: ['Originalförpackning']
	});
	expect(json).not.toHaveProperty('reviews');
	expect(json).not.toHaveProperty('rating');
	expect(json).not.toHaveProperty('quality');
	expect(json).not.toHaveProperty('recommended');
	await page.getByLabel('Betygsätt stället också').uncheck();
	const sodaOnly = (await exportJson(page)).json;
	expect(sodaOnly).not.toHaveProperty('venueRatings');
	const imagePromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner bild' }).click();
	const image = await imagePromise;
	expect(image.suggestedFilename()).toBe(json.image);
	const bytes = await readFile((await image.path())!);
	expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
	expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
	expect(bytes.length).toBeLessThanOrEqual(500 * 1024);
});

for (const fallback of [false, true]) {
	test(`large images are resized and stripped of EXIF with ${fallback ? 'fallback' : 'native'} WebP encoding`, async ({
		page
	}) => {
		if (fallback) await forceWebpFallback(page);
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.addInitScript(() => {
			document.addEventListener('securitypolicyviolation', (event) => {
				throw new Error(`CSP violation: ${event.violatedDirective}`);
			});
		});
		await fillReview(page);
		const source = await page.evaluate(async () => {
			const canvas = document.createElement('canvas');
			canvas.width = 2400;
			canvas.height = 1800;
			const context = canvas.getContext('2d')!;
			const pixels = context.createImageData(canvas.width, canvas.height);
			let seed = 42;
			for (let i = 0; i < pixels.data.length; i++) {
				seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
				pixels.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
			}
			context.putImageData(pixels, 0, 0);
			return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
		});
		const jpeg = Buffer.from(source, 'base64');
		// A valid EXIF header with an empty TIFF IFD and a private metadata sentinel.
		const exif = Buffer.concat([
			Buffer.from('Exif\0\0'),
			Buffer.from([73, 73, 42, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
			Buffer.from('private-location-sentinel')
		]);
		const marker = Buffer.from([255, 225, 0, 0]);
		marker.writeUInt16BE(exif.length + 2, 2);
		const input = Buffer.concat([jpeg.subarray(0, 2), marker, exif, jpeg.subarray(2)]);
		await page.getByLabel('Bild till recensionen').setInputFiles({
			name: 'large-with-exif.jpg',
			mimeType: 'image/jpeg',
			buffer: input
		});
		await expect(page.getByText(/Komprimerad bild:/)).toBeVisible();
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Ladda ner bild' }).click();
		const bytes = await readFile((await (await downloadPromise).path())!);
		expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
		expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
		expect(bytes.length).toBeLessThanOrEqual(500 * 1024);
		expect(bytes.length).toBeLessThan(input.length);
		expect(bytes.includes(Buffer.from('private-location-sentinel'))).toBe(false);
		const chunks: string[] = [];
		for (let offset = 12; offset + 8 <= bytes.length; ) {
			chunks.push(bytes.subarray(offset, offset + 4).toString());
			const length = bytes.readUInt32LE(offset + 4);
			offset += 8 + length + (length % 2);
		}
		expect(chunks).not.toContain('EXIF');
		expect(chunks).not.toContain('XMP ');
		const dimensions = await page.evaluate(async () => {
			const image = document.querySelector<HTMLImageElement>(
				'img[alt="Förhandsvisning av recensionsbild"]'
			)!;
			await image.decode();
			return [image.naturalWidth, image.naturalHeight];
		});
		expect(Math.max(...dimensions)).toBeLessThanOrEqual(1600);
		expect(dimensions[0] / dimensions[1]).toBeCloseTo(4 / 3, 2);
		expect(errors).toEqual([]);
	});
}

for (const name of ['photo.HEIC', 'photo.heif', 'fallback.HEIC']) {
	test(`${name} converts locally to an upright WebP under the static CSP`, async ({ page }) => {
		if (name === 'fallback.HEIC') await forceWebpFallback(page);
		await fillReview(page);
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.evaluate(() => {
			document.addEventListener('securitypolicyviolation', (event) => {
				throw new Error(`CSP violation: ${event.violatedDirective}`);
			});
		});
		await page.getByLabel('Bild till recensionen').setInputFiles({
			name,
			mimeType: 'application/octet-stream',
			buffer: await readFile('tests/fixtures/uploads/orientation-6.heic')
		});
		await expect(page.getByText(/Komprimerad bild:/)).toBeVisible({ timeout: 30000 });
		const dimensions = await page.evaluate(async () => {
			const image = document.querySelector<HTMLImageElement>(
				'img[alt="Förhandsvisning av recensionsbild"]'
			)!;
			await image.decode();
			return [image.naturalWidth, image.naturalHeight];
		});
		expect(dimensions).toEqual([1200, 800]);
		const { json } = await exportJson(page);
		expect(json.image).toBe('ny-hallonsoda-test.webp');
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Ladda ner bild' }).click();
		const bytes = await readFile((await (await downloadPromise).path())!);
		expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
		expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
		expect(bytes.length).toBeLessThanOrEqual(500 * 1024);
		expect(bytes.includes(Buffer.from('Exif'))).toBe(false);
		expect(errors).toEqual([]);
	});
}

test('invalid HEIC reports a Swedish error and allows choosing another image', async ({ page }) => {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page.getByLabel('Bild till recensionen').setInputFiles({
		name: 'broken.heic',
		mimeType: 'image/heic',
		buffer: Buffer.from('not an image')
	});
	await expect(page.getByRole('alert')).toHaveText(
		'HEIC-/HEIF-bilden kunde inte läsas. Välj en annan bild.',
		{ timeout: 30000 }
	);
	await expect(page.getByText('Behandlar bilden…')).toHaveCount(0);
	await page
		.getByLabel('Bild till recensionen')
		.setInputFiles('tests/fixtures/images/test-bar.png');
	await expect(page.getByText(/Komprimerad bild:/)).toBeVisible();
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('replacing a PNG uses a new WebP filename in the edited JSON', async ({ page }) => {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await page
		.getByLabel('Bild till recensionen')
		.setInputFiles('tests/fixtures/images/test-bar.png');
	await expect(page.getByText(/Komprimerad bild:/)).toBeVisible();
	const { json } = await exportJson(page);
	expect(json.image).toMatch(/^testsoda-\d+\.webp$/);
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner bild' }).click();
	expect((await downloadPromise).suggestedFilename()).toBe(json.image);
});

test('image positioning previews and exports the crop for new and existing reviews', async ({
	page
}) => {
	await fillReview(page);
	const preview = page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' });
	const editor = page.getByRole('button', { name: 'Justera bildens utsnitt' });
	await expect(preview).toHaveCSS('object-fit', 'cover');
	await expect(preview).toHaveCSS('aspect-ratio', '1 / 1');
	await expect(page.getByRole('slider', { name: /bildposition/ })).toHaveCount(0);
	await page.getByRole('slider', { name: /Zoom:/ }).focus();
	await page.getByRole('slider', { name: /Zoom:/ }).press('End');
	await editor.scrollIntoViewIfNeeded();
	const bounds = (await editor.boundingBox())!;
	await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
	await page.mouse.down();
	await page.mouse.move(bounds.x + bounds.width * 2, bounds.y - bounds.height, { steps: 5 });
	await page.mouse.up();
	await expect(preview).toHaveCSS('object-position', '0% 100%');
	expect((await exportJson(page)).json).toMatchObject({ imageFocusX: 0, imageFocusY: 100 });
	await page.getByRole('button', { name: 'Centrera bilden' }).click();
	await expect(preview).toHaveCSS('object-position', '50% 50%');
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await expect(preview).toHaveAttribute('src', `${basePath}/images/test-bar.png`);
	await expect(preview).toHaveCSS('object-position', '25% 75%');
	await editor.focus();
	for (let i = 0; i < 8; i++) await editor.press('Shift+ArrowDown');
	await expect(preview).toHaveCSS('object-position', '25% 0%');
	expect((await exportJson(page)).json).toMatchObject({
		image: 'test-bar.png',
		imageFocusX: 25,
		imageFocusY: 0
	});
	await expect(page.getByRole('button', { name: 'Ladda ner bild' })).toBeDisabled();
	await page.setViewportSize({ width: 375, height: 812 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.goto('testsoda/');
	await expect(page.getByRole('img', { name: 'Testläsk', exact: true })).toHaveCSS(
		'object-position',
		'25% 75%'
	);
	await page.goto('./?search=Testläsk&reviewer=alex');
	await expect(page.getByRole('img', { name: 'Testläsk', exact: true })).toHaveCSS(
		'object-position',
		'25% 75%'
	);
});

test('touch dragging follows the image crop and leaves uncropped axes centered', async ({
	page
}) => {
	await fillReview(page);
	const editor = page.getByRole('button', { name: 'Justera bildens utsnitt' });
	const preview = page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' });
	const touch = await page.context().newCDPSession(page);
	for (const [width, height, expected] of [
		[800, 400, '25% 50%'],
		[400, 800, '50% 25%'],
		[400, 400, '50% 50%']
	] as const) {
		const png = await page.evaluate(
			([width, height]) => {
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				return canvas.toDataURL('image/png').split(',')[1];
			},
			[width, height]
		);
		await page.getByRole('button', { name: 'Centrera bilden' }).click();
		await page.getByLabel('Bild till recensionen').setInputFiles({
			name: 'crop.png',
			mimeType: 'image/png',
			buffer: Buffer.from(png, 'base64')
		});
		await expect(page.getByText('Behandlar bilden…', { exact: true })).toHaveCount(0);
		await expect(preview).toHaveCSS('object-position', '50% 50%');
		await expect
			.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
			.toBe(width);
		await editor.scrollIntoViewIfNeeded();
		const bounds = (await editor.boundingBox())!;
		const start = {
			x: bounds.x + bounds.width / 2,
			y: bounds.y + bounds.height / 2
		};
		await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
		const distance = await editor.evaluate((element) => element.clientWidth / 4);
		await touch.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: start.x + distance, y: start.y + distance }]
		});
		await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
		await expect(preview).toHaveCSS('object-position', expected);
		await editor.dispatchEvent('pointermove', {
			pointerId: 2,
			clientX: start.x,
			clientY: start.y
		});
		await expect(preview).toHaveCSS('object-position', expected);
	}
});

test('zoom previews, resets and persists on review pages, cards and imports', async ({ page }) => {
	await fillReview(page);
	const preview = page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' });
	const zoom = page.getByRole('slider', { name: /Zoom:/ });
	await expect(zoom).toHaveValue('1');
	await zoom.focus();
	await zoom.press('End');
	await expect(preview).toHaveCSS('transform', 'matrix(3, 0, 0, 3, 0, 0)');
	const editor = page.getByRole('button', { name: 'Justera bildens utsnitt' });
	await editor.focus();
	for (let i = 0; i < 5; i++) await editor.press('Shift+ArrowRight');
	await expect(preview).toHaveAttribute('style', /transform-origin: 0% 50%/);
	expect((await exportJson(page)).json).toMatchObject({ imageZoom: 3, imageFocusX: 0 });
	await expect(preview.locator('..')).toHaveCSS('overflow', 'hidden');
	await page.getByRole('button', { name: 'Återställ utsnitt' }).click();
	await expect(zoom).toHaveValue('1');
	await expect(preview).toHaveCSS('object-position', '50% 50%');
	await expect(preview).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await expect(zoom).toHaveValue('1.5');
	await expect(preview).toHaveCSS('transform', 'matrix(1.5, 0, 0, 1.5, 0, 0)');
	expect((await exportJson(page)).json.imageZoom).toBe(1.5);
	await page
		.getByLabel('Recensionens JSON-fil', { exact: true })
		.setInputFiles('tests/fixtures/content/testsoda.json');
	await expect(zoom).toHaveValue('1.5');
	expect((await exportJson(page)).json.imageZoom).toBe(1.5);
	await page.getByRole('button', { name: 'Skapa ny recension', exact: true }).click();
	await expect(preview).toHaveCount(0);
	await page.goto('testsoda/');
	await expect(page.getByRole('img', { name: 'Testläsk', exact: true })).toHaveCSS(
		'transform',
		'matrix(1.5, 0, 0, 1.5, 0, 0)'
	);
	await page.goto('./?search=Testläsk&reviewer=alex');
	await expect(page.getByRole('img', { name: 'Testläsk', exact: true })).toHaveCSS(
		'transform',
		'matrix(1.5, 0, 0, 1.5, 0, 0)'
	);
});

test('JSON import loads an existing review and exports its edits with stable identity', async ({
	page
}) => {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	const chooserPromise = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Ladda in recension från JSON' }).click();
	await (await chooserPromise).setFiles('tests/fixtures/content/testsoda.json');
	await expect(
		page.getByRole('heading', { name: 'Redigera recension', exact: true })
	).toBeVisible();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(page.locator('#soda-taste')).toHaveValue('5');
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Alex');
	await expect(page.locator('#review-1-volume')).toHaveValue('330');
	await expect(page.getByLabel('Slug / filnamn')).toHaveAttribute('readonly', '');
	await expect(page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' })).toHaveCSS(
		'object-position',
		'25% 75%'
	);
	await page.getByLabel('Fri text').fill('Uppdaterad recension.');
	await page.getByLabel('Pris i kronor', { exact: true }).fill('22,5');
	const { json, filename } = await exportJson(page);
	expect(filename).toBe('testsoda.json');
	expect(json).toMatchObject({
		slug: 'testsoda',
		image: 'test-bar.png',
		createdAt: '2025-01-01T12:00:00.000Z',
		description: 'Uppdaterad recension.',
		beerPriceKr: 22.5,
		sodaId: 'testlask',
		imageFocusX: 25,
		imageFocusY: 75
	});
	await expect(page.getByRole('button', { name: 'Ladda ner bild' })).toBeDisabled();
	await page.getByRole('button', { name: 'Skapa ny recension', exact: true }).click();
	await expect(page.getByLabel('Läskens namn / rubrik')).toHaveValue('');
	await expect(page.getByLabel('Slug / filnamn')).not.toHaveAttribute('readonly', '');
	await expect(page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' })).toHaveCount(0);
});

test('JSON import supports a saved review outside the published collection', async ({ page }) => {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	const source = JSON.parse(await readFile('tests/fixtures/content/testsoda.json', 'utf8'));
	const saved = {
		...source,
		slug: 'sparad-lask',
		image: 'sparad-lask.png',
		recommended: true,
		coAuthors: ['Robin'],
		venueRatings: { atmosphere: 1, service: 2, selection: 3, cleanliness: 4, soundLevel: 5 }
	};
	const input = page.getByLabel('Recensionens JSON-fil', { exact: true });
	await input.setInputFiles({
		name: 'sparad-lask.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(saved))
	});
	await expect(page.getByText('Inläst fil: sparad-lask.json', { exact: true })).toBeVisible();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(page.locator('#soda-taste')).toHaveValue('5');
	await expect(page.locator('#venue-atmosphere')).toHaveValue('1');
	await expect(page.getByText(/Välj bilden sparad-lask.png/)).toBeVisible();
	const { json } = await exportJson(page);
	expect(json).toMatchObject({ ...saved, updatedAt: expect.any(String) });
	expect(json.venueRatings).toEqual(saved.venueRatings);
	expect(Date.parse(json.updatedAt)).toBeGreaterThan(Date.parse(saved.updatedAt));
	await page
		.getByRole('button', { name: 'Lägg till kvalitet, prisvärdhet och barhoppotential' })
		.click();
	await expect(page.locator('#venue-quality')).toHaveValue('');
	await page.locator('#venue-quality').fill('2');
	await page.locator('#venue-price').fill('4');
	await page.locator('#venue-barhopPotential').fill('3');
	expect((await exportJson(page)).json.venueRatings).toEqual({
		...saved.venueRatings,
		quality: 2,
		price: 4,
		barhopPotential: 3
	});
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda-robin');
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Robin');
	expect((await exportJson(page)).json.slug).toBe('testsoda-robin');
});

test('invalid JSON imports show Swedish errors and retain the current form', async ({ page }) => {
	await fillReview(page);
	const source = JSON.parse(await readFile('tests/fixtures/content/testsoda.json', 'utf8'));
	for (const [name, body, message] of [
		['testsoda.json', '{broken', 'Filen innehåller inte giltig JSON.'],
		['testsoda.json', JSON.stringify({ ...source, password: 'private' }), 'Okänt fält'],
		['wrong-name.json', JSON.stringify(source), 'Filnamnet måste motsvara'],
		[
			'testsoda.json',
			JSON.stringify({ ...source, image: '../private.png' }),
			'Bilden måste vara en lokal'
		],
		[
			'testbaren.json',
			await readFile('tests/fixtures/content/testbaren.json', 'utf8'),
			'Formuläret kan bara redigera läskrecensioner'
		],
		['large.json', ' '.repeat(256 * 1024 + 1), 'Välj en JSON-fil på högst 256 KiB.']
	]) {
		await page
			.getByLabel('Recensionens JSON-fil', { exact: true })
			.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(body) });
		await expect(page.getByRole('alert')).toContainText(message);
		await expect(page.getByLabel('Läskens namn / rubrik')).toHaveValue('Ny hallonsoda');
		await expect(
			page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' })
		).toBeVisible();
	}
	expect((await exportJson(page)).json.slug).toBe('ny-hallonsoda-test');
});

test('generator rejects reserved and duplicate slugs and incomplete coordinates', async ({
	page
}) => {
	await fillReview(page);
	for (const slug of ['skapa', 'testbaren']) {
		await page.getByLabel('Slug / filnamn').fill(slug);
		await page.getByRole('button', { name: 'Ladda ner JSON' }).click();
		await expect(page.getByRole('alert')).toBeVisible();
	}
	await page.getByLabel('Slug / filnamn').fill('ny-hallonsoda');
	await page.getByText('Koordinater för kartan (valfritt)', { exact: true }).click();
	await page.getByLabel('Latitud', { exact: true }).fill('57.7');
	await page.getByRole('button', { name: 'Ladda ner JSON' }).click();
	await expect(page.getByRole('alert')).toContainText('Ange både latitud och longitud');
	await page.setViewportSize({ width: 375, height: 812 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

test('soda detail shows separate soda and venue ratings', async ({ page }) => {
	await page.goto('hallonsoda/');
	await expect(page.getByRole('heading', { name: 'Läskbetyg', exact: true })).toBeVisible();
	const venue = page.getByRole('region', { name: 'Betyg på stället', exact: true });
	await expect(venue.getByRole('heading', { name: 'Betyg på stället', exact: true })).toBeVisible();
	await expect(venue.getByRole('listitem')).toHaveCount(5);
	await expect(
		page.getByRole('img', { name: 'Läskens helhetsbetyg 2 av 3', exact: true })
	).toBeVisible();
	await expect(page.getByText('25 kr', { exact: true })).toBeVisible();
	await expect(page.getByText('Matchar namnet', { exact: true })).toBeVisible();
	await expect(page.locator('main a[href*="google.com/maps"]')).toHaveCount(0);
});

test('reviews of the same soda have separate pages, cards and reviewer filters', async ({
	page
}) => {
	await page.goto('./?search=Testläsk');
	await expect(page.locator('main a[href*="testsoda"]')).toHaveCount(2);
	await page.goto('./?reviewer=alex&sort=score');
	await expect(page.getByRole('combobox', { name: 'Recensent' })).toHaveValue('alex');
	await expect(page.locator('main a[href*="testsoda"]')).toHaveCount(1);
	await expect(page.locator('main a[href*="testsoda"]')).toHaveAttribute(
		'href',
		`${basePath}/testsoda/`
	);
	await page.reload();
	await expect(page.getByRole('combobox', { name: 'Recensent' })).toHaveValue('alex');
	await expect(page.getByText('Läskfavorit', { exact: true })).toBeVisible();
	await expect(page.getByText(/Återköpspotential/)).toHaveCount(0);
	await page.locator('main a[href*="testsoda"]').click();
	await expect(
		page.getByRole('img', { name: 'Läskens helhetsbetyg 3 av 3', exact: true })
	).toBeVisible();
	await expect(page.getByText('Frisk och balanserad enligt Alex.', { exact: true })).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Visa betyg och recension' })).toHaveCount(0);
	await expect(page.getByText(/Återköpspotential: 5\/5/)).toBeVisible();
	await page.goto('testsoda-robin/');
	await expect(page.getByText(/Återköpspotential: 0\/5/)).toBeVisible();
	await expect(
		page.getByRole('img', { name: 'Läskens helhetsbetyg 0 av 3', exact: true })
	).toBeVisible();
	await expect(page.getByText('Alldeles för söt enligt Robin.', { exact: true })).toBeVisible();
	await expect(page.getByText('Läskfavorit', { exact: true })).toHaveCount(0);
});

test('editing keeps the existing review slug, image and creation date', async ({ page }) => {
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('testsoda');
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Alex');
	await expect(page.getByLabel('Slug / filnamn')).toHaveValue('testsoda');
	await expect(page.getByLabel('Slug / filnamn')).toHaveAttribute('readonly', '');
	await expect(page.locator('#container')).toHaveValue('Burk');
	await expect(page.locator('#review-1-volume')).toHaveValue('330');
	await expect(page.getByRole('checkbox', { name: 'Köpt på rea', exact: true })).toBeChecked();
	await expect(page.getByLabel('Återköpspotential')).toHaveValue('5');
	await expect(page.getByRole('checkbox', { name: /läskfavorit/ })).toBeChecked();
	await page.getByLabel('Pris i kronor', { exact: true }).fill('27');
	const { json, filename } = await exportJson(page);
	expect(filename).toBe('testsoda.json');
	expect(json).toMatchObject({
		author: 'Alex',
		favorite: true,
		repurchasePotential: 5,
		image: 'test-bar.png',
		createdAt: '2025-01-01T12:00:00.000Z',
		container: 'Burk',
		beerPriceKr: 27,
		isOnSale: true
	});
	expect(json).not.toHaveProperty('reviews');
	await page.getByRole('checkbox', { name: 'Köpt på rea', exact: true }).uncheck();
	expect((await exportJson(page)).json.isOnSale).toBe(false);
	await page.getByRole('checkbox', { name: 'Köpt på rea', exact: true }).check();
	await page.getByRole('combobox', { name: 'Redigera en befintlig recension' }).selectOption('');
	await expect(page.getByRole('checkbox', { name: 'Köpt på rea', exact: true })).not.toBeChecked();
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('hallonsoda');
	await expect(page.getByRole('checkbox', { name: 'Köpt på rea', exact: true })).not.toBeChecked();
	await expect(page.locator('#venue-atmosphere')).toHaveValue('1');
	await expect(page.getByLabel('Återköpspotential')).toHaveValue('');
	await expect(page.getByRole('checkbox', { name: /läskfavorit/ })).not.toBeChecked();
	await page.getByRole('combobox', { name: 'Redigera en befintlig recension' }).selectOption('');
	await expect(page.locator('#container')).toHaveValue('');
	await expect(page.locator('#review-1-price')).toHaveValue('');
	await expect(page.locator('#review-1-volume')).toHaveValue('');
	await page.getByLabel('Betygsätt stället också').check();
	await expect(page.locator('#venue-atmosphere')).toHaveValue('3');
});

test('each review uses its own price and volume for LPK and caffeine', async ({ page }) => {
	await page.goto('testsoda/');
	await expectDrinkFact(page, 'LPK (läsk per krona)', '1,65 cl/kr');
	await expectDrinkFact(page, 'Koffein', '32 mg/100 ml (105,6 mg totalt)');
	await page.goto('testsoda-robin/');
	await expectDrinkFact(page, 'LPK (läsk per krona)', '5 cl/kr');
	await expectDrinkFact(page, 'Koffein', '32 mg/100 ml (480 mg totalt)');
	await page.goto('hallonsoda/');
	await expect(page.getByText(/Koffein:/)).toHaveCount(0);
});

test('generator exports energy drink facts with the review price', async ({ page }) => {
	await fillReview(page);
	await page.getByLabel('Energidryck', { exact: true }).check();
	await page.getByLabel('Koffein i mg/100 ml').fill('32');
	await page.locator('#container').selectOption('Sprutmaskin');
	await page.locator('#review-1-volume').selectOption('400');
	await page.getByLabel('Pris i kronor', { exact: true }).fill('20');
	const { json } = await exportJson(page);
	expect(json).toMatchObject({
		isEnergyDrink: true,
		caffeineMgPer100Ml: 32,
		volumeMl: 400,
		beerPriceKr: 20
	});
});

test('custom packaging and volume remain editable in an independent review', async ({ page }) => {
	await page.goto('egen-forpackning/');
	await expectDrinkFact(page, 'Förpackning', 'Pappmugg');
	await expectDrinkFact(page, 'Volym', '27,5 cl');
	await expectDrinkFact(page, 'LPK (läsk per krona)', '1,38 cl/kr');
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('egen-forpackning');
	await expect(page.getByLabel('Egen förpackning', { exact: true })).toHaveValue('Pappmugg');
	await expect(page.locator('#review-1-volume')).toHaveValue('custom');
	await expect(page.getByLabel('Egen volym i ml', { exact: true })).toHaveValue('275');
	await page.locator('#repurchase-potential').selectOption('3');
	await page.getByLabel('Egen förpackning', { exact: true }).fill(' Termosmugg ');
	await page.getByLabel('Egen volym i ml', { exact: true }).fill('473.5');
	const { json } = await exportJson(page);
	expect(json).toMatchObject({
		container: 'Annan',
		customContainer: 'Termosmugg',
		volumeMl: 473.5
	});
	await page.locator('#container').selectOption('Burk');
	await page.locator('#review-1-volume').selectOption('330');
	await expect(page.locator('#container-custom')).toHaveCount(0);
	await expect(page.locator('#review-1-volume-custom')).toHaveCount(0);
	const standard = (await exportJson(page)).json;
	expect(standard).toMatchObject({ container: 'Burk', volumeMl: 330 });
	expect(standard).not.toHaveProperty('customContainer');
});

test('different reviewers create separate JSON files for the same soda', async ({ page }) => {
	await fillReview(page);
	await page.getByLabel('Författare', { exact: true }).fill('Alex');
	await page.getByLabel('Pris i kronor', { exact: true }).fill('20');
	await page.locator('#review-1-volume').selectOption('330');
	const first = await exportJson(page);
	await page.getByLabel('Författare', { exact: true }).fill('Robin');
	await page.getByLabel('Fri text').fill('En annan upplevelse.');
	await page.getByLabel('Pris i kronor', { exact: true }).fill('30');
	await page.locator('#review-1-volume').selectOption('500');
	await page.locator('#tasting-taste').fill('1');
	const second = await exportJson(page);
	expect(first.filename).toBe('ny-hallonsoda-alex.json');
	expect(second.filename).toBe('ny-hallonsoda-robin.json');
	expect(first.json).toMatchObject({
		title: 'Ny hallonsoda',
		sodaId: 'ny-hallonsoda',
		author: 'Alex',
		beerPriceKr: 20,
		volumeMl: 330,
		sodaTasting: { ratings: { taste: 3 } }
	});
	expect(second.json).toMatchObject({
		title: 'Ny hallonsoda',
		sodaId: 'ny-hallonsoda',
		author: 'Robin',
		beerPriceKr: 30,
		volumeMl: 500,
		sodaTasting: { ratings: { taste: 1 } }
	});
	expect(first.json).not.toHaveProperty('reviews');
	expect(second.json).not.toHaveProperty('reviews');
});

test('linked review pages offer reciprocal links with each authors own score', async ({ page }) => {
	await page.goto('testsoda/');
	const otherReviews = page.getByRole('region', { name: 'Fler recensioner av samma läsk' });
	await expect(otherReviews.getByRole('link')).toHaveCount(1);
	await expect(otherReviews.getByRole('link', { name: /Robin/ })).toHaveAttribute(
		'href',
		`${basePath}/testsoda-robin/`
	);
	await expect(otherReviews.getByText('0/3', { exact: true })).toBeVisible();
	await otherReviews.getByRole('link', { name: /Robin/ }).click();
	await expect(
		page
			.getByRole('region', { name: 'Fler recensioner av samma läsk' })
			.getByRole('link', { name: /Alex/ })
	).toHaveAttribute('href', `${basePath}/testsoda/`);
	await expect(page.getByRole('heading', { name: 'Testläsk', exact: true })).toBeVisible();
	await page.goto('egen-forpackning/');
	await expect(page.getByRole('region', { name: 'Fler recensioner av samma läsk' })).toHaveCount(0);
});

test('generator links a matching soda automatically and preserves the link when editing', async ({
	page
}) => {
	await fillReview(page);
	await page.getByLabel('Läskens namn / rubrik').fill('Testläsk');
	await page.getByLabel('Märke', { exact: true }).fill('Testläsk');
	await expect(page.locator('#linked-soda, #soda-id')).toHaveCount(0);
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Test');
	await expect(page.getByLabel('Pris i kronor', { exact: true })).toHaveValue('20');
	const created = await exportJson(page);
	expect(created.json).toMatchObject({ sodaId: 'testlask', slug: 'testlask-test', author: 'Test' });
	expect(created.json.beerPriceKr).toBe(20);
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('testsoda');
	await page.getByLabel('Läskens namn / rubrik').fill('Ändrad rubrik');
	const edited = await exportJson(page);
	expect(edited.json).toMatchObject({
		sodaId: 'testlask',
		slug: 'testsoda',
		author: 'Alex',
		beerPriceKr: 20
	});
});

test('V2 preview, export and import preserve the four quality scores and separate assessments', async ({
	page
}) => {
	await fillReview(page);
	const preview = page.getByRole('status', { name: 'Förhandsvisning av totalbetyg' });
	await expect(preview.getByText('1/3', { exact: true })).toBeVisible();
	await expect(preview).toContainText('Viktad poäng: 3/5');
	await page.locator('#tasting-taste').fill('4');
	await page.locator('#tasting-balance').fill('5');
	await page.locator('#tasting-aftertaste').fill('4');
	await page.locator('#tasting-mouthfeel').fill('4');
	await expect(preview).toContainText('Viktad poäng: 4,25/5');
	await page.locator('#profile-acidity').fill('5');
	await page.locator('#profile-carbonation').fill('1');
	await page.locator('#extra-name').fill('1');
	await page.locator('#extra-value').fill('5');
	await expect(page.getByLabel('Smakord (valfritt)')).toHaveCount(0);
	await page.getByLabel('Betygsätt stället också').check();
	await expect(page.locator('#venue-quality')).toHaveValue('');
	await expect(page.locator('#venue-quality')).toHaveAttribute('required', '');
	await expect(page.locator('#venue-price')).toHaveAttribute('required', '');
	await expect(page.locator('#venue-barhopPotential')).toHaveAttribute('required', '');
	for (const metric of VENUE_RATING_METRICS) await page.locator(`#venue-${metric.key}`).fill('1');
	await expect(preview.getByText('2/3', { exact: true })).toBeVisible();
	await expect(preview).toContainText('Viktad poäng: 4,25/5');
	const { json, filename } = await exportJson(page);
	expect(validateReview(json, filename).rating).toBe(2);
	expect(json.sodaTasting).toMatchObject({
		profile: { acidity: 5, carbonation: 1 },
		ratings: { taste: 4, balance: 5, aftertaste: 4, mouthfeel: 4 },
		extras: { name: 1, packaging: 3, value: 5 }
	});
	expect(json).not.toHaveProperty('sodaRatings');
	expect(json.venueRatings).toMatchObject({ quality: 1, price: 1, barhopPotential: 1 });
	await page.locator('#tasting-balance').fill('');
	await expect(preview).toContainText('Fyll i alla delbetyg');
	await page.locator('#tasting-balance').fill('0');
	await expect(preview).toContainText('heltal mellan 1 och 5');
	await page.locator('#tasting-balance').fill('2.5');
	await expect(preview).toContainText('Fyll i alla delbetyg');
	await page.locator('#tasting-balance').fill('6');
	await expect(preview.getByText(/^[0-3]\/3$/)).toHaveCount(0);
	const fileInput = page.getByLabel('Recensionens JSON-fil', { exact: true });
	await fileInput.setInputFiles({
		name: filename,
		mimeType: 'application/json',
		buffer: Buffer.from(
			JSON.stringify({
				...json,
				sodaTasting: {
					...json.sodaTasting,
					profile: { ...json.sodaTasting.profile, carbonation: 0 }
				}
			})
		)
	});
	await expect(page.getByRole('alert')).toContainText(
		'Kolsyra måste vara ett heltal mellan 1 och 5.'
	);
	await fileInput.setInputFiles({
		name: filename,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(json))
	});
	await expect(page.locator('#extra-name')).toHaveValue('1');
	await expect(page.locator('#profile-carbonation')).toHaveValue('1');
	await expect(page.locator('#extra-packaging')).toHaveValue('3');
	await expect(preview).toContainText('Viktad poäng: 4,25/5');
	const reexported = (await exportJson(page)).json;
	expect(reexported.sodaTasting).toEqual(json.sodaTasting);
	expect(reexported.venueRatings).toEqual(json.venueRatings);
	expect(json.sodaTasting).not.toHaveProperty('notes');
	await page.getByLabel('Redigera en befintlig recension').selectOption('hallonsoda');
	await expect(page.locator('#soda-mouthfeelMatch')).toHaveCount(0);
	await page.locator('#repurchase-potential').selectOption('3');
	await page.locator('#review-1-volume').selectOption('330');
	const legacy = await exportJson(page);
	expect(validateReview(legacy.json, legacy.filename).rating).toBe(2);
	expect(legacy.json.sodaRatings).not.toHaveProperty('mouthfeelMatch');
	expect(legacy.json).not.toHaveProperty('sodaTasting');
	await page.getByLabel('Redigera en befintlig recension').selectOption('');
	await expect(page.locator('#profile-acidity')).toHaveValue('');
	await expect(preview).toContainText('Fyll i alla delbetyg');
});

test('generator derives the same soda ID whether or not the title includes the brand', async ({
	page
}) => {
	await fillReview(page);
	await page.getByLabel('Läskens namn / rubrik').fill('Guava Zero');
	await page.locator('#brand').fill('Rockstar');
	await page.getByLabel('Författare', { exact: true }).fill('Anton');
	const exported = await exportJson(page);
	expect(exported.filename).toBe('guava-zero-anton.json');
	expect(exported.json).toMatchObject({
		title: 'Guava Zero',
		beerBrand: 'Rockstar',
		sodaId: 'rockstar-guava-zero'
	});
	await page.getByLabel('Läskens namn / rubrik').fill('Rockstar Guava Zero');
	expect((await exportJson(page)).json.sodaId).toBe('rockstar-guava-zero');
	await page.getByLabel('Läskens namn / rubrik').fill('Guava Zero');
	await page.locator('#brand').fill('Annat märke');
	expect((await exportJson(page)).json.sodaId).toBe('annat-marke-guava-zero');
});

test('generator accepts one decimal in prices with a comma or period', async ({ page }) => {
	await fillReview(page);
	await page.locator('#review-1-volume').selectOption('330');
	const price = page.getByLabel('Pris i kronor', { exact: true });
	for (const value of ['12,5', '12.5']) {
		await price.fill(value);
		expect((await exportJson(page)).json.beerPriceKr).toBe(12.5);
	}
	await price.fill('12,55');
	await page.getByRole('button', { name: 'Ladda ner JSON' }).click();
	await expect(price).toHaveJSProperty(
		'validationMessage',
		'Ange ett pris mellan 1 och 999 kr med högst en decimal.'
	);
	await price.fill('');
	await expect(price).toHaveJSProperty(
		'validationMessage',
		'Ange ett pris mellan 1 och 999 kr med högst en decimal.'
	);
});

test('nutrient bases convert, export, reload and reset independently', async ({ page }) => {
	await fillReview(page);
	await page.locator('#review-1-volume').selectOption('500');
	await page.getByLabel('Energidryck', { exact: true }).check();
	await page.getByLabel('Proteindryck', { exact: true }).check();
	await page.getByLabel('Socker (valfritt)').selectOption('sugared');
	await page.getByLabel('Koffein i mg/100 ml', { exact: true }).fill('32');
	await page
		.getByRole('combobox', { name: 'Ange koffein per', exact: true })
		.selectOption('container');
	await expect(page.locator('#caffeine')).toHaveValue('160');
	await page.getByLabel('Kolhydrater i g/100 ml', { exact: true }).fill('10');
	await page
		.getByRole('combobox', { name: 'Ange protein per', exact: true })
		.selectOption('container');
	await page.locator('#protein').fill('20');
	const { json } = await exportJson(page);
	expect(json).toMatchObject({
		isEnergyDrink: true,
		isProteinDrink: true,
		sugarType: 'sugared',
		caffeineMgPerContainer: 160,
		carbohydrateGPer100Ml: 10,
		proteinGPerContainer: 20
	});
	expect(json.caffeineMgPer100Ml).toBeUndefined();
	await page.getByLabel('Recensionens JSON-fil', { exact: true }).setInputFiles({
		name: `${json.slug}.json`,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(json))
	});
	await expect(
		page.getByRole('heading', { name: 'Redigera recension', exact: true })
	).toBeVisible();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(page.locator('#caffeine-basis')).toHaveValue('container');
	await expect(page.locator('#protein')).toHaveValue('20');
	await page.getByRole('combobox', { name: 'Ange protein per', exact: true }).selectOption('100ml');
	await expect(page.locator('#protein')).toHaveValue('4');
	expect((await exportJson(page)).json.proteinGPer100Ml).toBe(4);
	await page.getByRole('button', { name: 'Skapa ny recension', exact: true }).click();
	await expect(page.locator('#protein')).toHaveValue('');
	await expect(page.locator('#protein-basis')).toHaveValue('100ml');
	await page.locator('#protein').fill('0');
	await page
		.getByRole('combobox', { name: 'Ange protein per', exact: true })
		.selectOption('container');
	await expect(page.locator('#protein')).toHaveValue('');
});

test('home cards show and search the combined soda name', async ({ page }) => {
	await page.goto('./');
	const card = page.locator('a[href$="/hallonsoda/"]');
	await expect(
		card.getByRole('heading', { name: 'Testläsk Hallonsoda', exact: true })
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Testbaren', exact: true })).toBeVisible();
	await page.getByPlaceholder('Sök läsk, märke eller smak').fill('Testläsk Hallonsoda');
	await expect(card).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Testläsk', exact: true })).toHaveCount(0);
	await card.click();
	await expect(page.getByRole('heading', { name: 'Hallonsoda', exact: true })).toBeVisible();
});

test('home drink filters combine, survive reload and clear, with compact cards', async ({
	page
}) => {
	await page.goto('./?drinkType=energy&drinkType=sugar-free&drinkType=protein');
	await expect(page.getByRole('checkbox', { name: 'Energidryck', exact: true })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Sockerfri', exact: true })).toBeChecked();
	await expect(page.getByRole('heading', { name: 'Testläsk', exact: true })).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	const card = page
		.getByRole('link')
		.filter({ has: page.getByRole('heading', { name: 'Testläsk', exact: true }) });
	await expect(card.locator('[aria-label="Drycksfakta"]')).toHaveCount(0);
	await expect(card.getByText(/Koffein|KPL|PPL|LPK/)).toHaveCount(0);
	await expect(card.getByText('Märke ej angivet', { exact: true })).toHaveCount(0);
	await expect(card.getByText('20 kr*', { exact: true })).toBeVisible();
	expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
	await page.getByRole('checkbox', { name: 'Sockerfri', exact: true }).uncheck();
	await page.getByRole('checkbox', { name: 'Sockrad', exact: true }).check();
	await expect(page.getByRole('heading', { name: 'Testläsk', exact: true })).toHaveCount(0);
	await page.reload();
	await expect(page.getByRole('checkbox', { name: 'Sockrad', exact: true })).toBeChecked();
	await page.getByRole('button', { name: /Rensa/ }).click();
	await expect(page.getByRole('checkbox', { name: 'Sockrad', exact: true })).not.toBeChecked();
	await page.goto('testsoda/');
	await expectDrinkFact(page, 'KPL (kolhydrat per läsk)', '0 g/100 ml (0 g totalt)');
	await expectDrinkFact(page, 'PPL (protein per läsk)', '6,06 g/100 ml (20 g totalt)');
});

test('serving details support multiple methods, imports, edits and reset without changing packaging', async ({
	page
}) => {
	await page.goto('testsoda/');
	const methods = page.getByRole('region', { name: 'Drycksfakta', exact: true }).getByRole('list');
	await expect(methods.getByRole('button')).toHaveCount(2);
	await expect(methods.getByRole('button', { name: 'Om glas', exact: true })).toBeVisible();
	await expect(methods.getByRole('button', { name: 'Om sugrör', exact: true })).toBeVisible();
	await expectDrinkFact(page, 'Serveringstemperatur', 'Kylskåpskall');
	await expectDrinkFact(page, 'Servering', 'Utan is');
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await expect(page.getByRole('checkbox', { name: 'Glas', exact: true })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Sugrör', exact: true })).toBeChecked();
	await page.getByRole('checkbox', { name: 'Originalförpackning', exact: true }).check();
	const { json } = await exportJson(page);
	expect(json).toMatchObject({
		container: 'Burk',
		servingMethods: ['Originalförpackning', 'Glas', 'Sugrör'],
		servingTemperature: 'Kylskåpskall',
		servedWithIce: false
	});
	await page.getByLabel('Recensionens JSON-fil', { exact: true }).setInputFiles({
		name: `${json.slug}.json`,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(json))
	});
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(
		page.getByRole('checkbox', { name: 'Originalförpackning', exact: true })
	).toBeChecked();
	await page.getByRole('checkbox', { name: 'Glas', exact: true }).uncheck();
	await page.locator('#served-with-ice').selectOption({ label: 'Med is' });
	expect((await exportJson(page)).json).toMatchObject({
		servingMethods: ['Originalförpackning', 'Sugrör'],
		servedWithIce: true
	});
	await page.getByRole('button', { name: 'Skapa ny recension', exact: true }).click();
	await expect(
		page.getByRole('checkbox', { name: 'Originalförpackning', exact: true })
	).not.toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Sugrör', exact: true })).not.toBeChecked();
	await expect(page.locator('#serving-temperature option:checked')).toHaveText('Välj temperatur');
	await expect(page.locator('#served-with-ice option:checked')).toHaveText(
		'Välj med eller utan is'
	);
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda-robin');
	const unknown = (await exportJson(page)).json;
	expect(unknown.servingMethods).toBeUndefined();
	expect(unknown.servedWithIce).toBeUndefined();
	expect(unknown.servingTemperature).toBeUndefined();
});

test('nutrients automatically classify a new review, allow overrides and restore automatic choices', async ({
	page
}) => {
	await fillReview(page);
	const energy = page.getByLabel('Energidryck', { exact: true });
	const protein = page.getByLabel('Proteindryck', { exact: true });
	await expect(energy).not.toBeChecked();
	await expect(protein).not.toBeChecked();
	await page.locator('#caffeine').fill('32');
	await page.locator('#protein').fill('5');
	await page.locator('#carbohydrate').fill('10');
	await expect(energy).toBeChecked();
	await expect(protein).toBeChecked();
	await expect(page.locator('#sugar-type')).toHaveValue('sugared');
	expect((await exportJson(page)).json).toMatchObject({
		isEnergyDrink: true,
		isProteinDrink: true,
		sugarType: 'sugared'
	});
	await page.locator('#review-1-volume').selectOption('500');
	await page.locator('#caffeine-basis').selectOption('container');
	await expect(energy).toBeChecked();
	await page.locator('#carbohydrate').fill('0');
	await expect(page.locator('#sugar-type')).toHaveValue('sugar-free');
	await energy.uncheck();
	await protein.uncheck();
	await page.locator('#sugar-type').selectOption('sugared');
	await page.locator('#caffeine').fill('100');
	await page.locator('#protein').fill('6');
	await expect(energy).not.toBeChecked();
	await expect(protein).not.toBeChecked();
	const { json } = await exportJson(page);
	expect(json).toMatchObject({
		isEnergyDrink: false,
		isProteinDrink: false,
		sugarType: 'sugared',
		carbohydrateGPer100Ml: 0
	});
	await page.getByLabel('Recensionens JSON-fil', { exact: true }).setInputFiles({
		name: `${json.slug}.json`,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(json))
	});
	await expect(
		page.getByRole('heading', { name: 'Redigera recension', exact: true })
	).toBeVisible();
	await expect(energy).not.toBeChecked();
	await expect(protein).not.toBeChecked();
	await expect(page.locator('#sugar-type')).toHaveValue('sugared');
	await page.getByRole('button', { name: 'Använd automatiska dryckstyper', exact: true }).click();
	await expect(energy).toBeChecked();
	await expect(protein).toBeChecked();
	await expect(page.locator('#sugar-type')).toHaveValue('sugar-free');
	await page.locator('#caffeine').fill('0');
	await page.locator('#protein').fill('0');
	await expect(energy).not.toBeChecked();
	await expect(protein).not.toBeChecked();
	await page.locator('#carbohydrate').fill('');
	await expect(page.locator('#sugar-type')).toHaveValue('sugar-free');
	await page.locator('#caffeine').fill('');
	await page.locator('#protein').fill('');
	const cleared = (await exportJson(page)).json;
	expect(cleared.isEnergyDrink).toBeUndefined();
	expect(cleared.isProteinDrink).toBeUndefined();
	expect(cleared.sugarType).toBe('sugar-free');
});

test('electrolyte category is editable, survives import and reset, and combines with home filters', async ({
	page
}) => {
	await fillReview(page);
	await page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true }).check();
	const { json } = await exportJson(page);
	expect(json.isElectrolyteDrink).toBe(true);
	await page.getByLabel('Recensionens JSON-fil', { exact: true }).setInputFiles({
		name: `${json.slug}.json`,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(json))
	});
	await expect(
		page.getByRole('heading', { name: 'Redigera recension', exact: true })
	).toBeVisible();
	await expect(page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true })).toBeChecked();
	await page.getByRole('button', { name: 'Skapa ny recension', exact: true }).click();
	await expect(
		page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true })
	).not.toBeChecked();
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await expect(page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true })).toBeChecked();
	await page.getByRole('button', { name: 'Använd automatiska dryckstyper', exact: true }).click();
	await expect(page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true })).toBeChecked();
	await page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true }).uncheck();
	expect((await exportJson(page)).json.isElectrolyteDrink).toBe(false);
	await page.goto('./?drinkType=electrolyte&drinkType=energy&drinkType=sugar-free');
	await expect(page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true })).toBeChecked();
	const card = page
		.getByRole('link')
		.filter({ has: page.getByRole('heading', { name: 'Testläsk', exact: true }) });
	await expect(card.getByRole('img', { name: 'Elektrolytdryck', exact: true })).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
	await page.reload();
	await expect(page.getByRole('checkbox', { name: 'Elektrolytdryck', exact: true })).toBeChecked();
	await page.goto('testsoda/');
	await expect(page.getByRole('button', { name: 'Om elektrolytdryck', exact: true })).toBeVisible();
});

test('automatic soda IDs fit within 100 characters and imports preserve saved IDs', async ({
	page
}) => {
	await fillReview(page);
	await page.getByLabel('Författare', { exact: true }).fill('Anton');
	await page.getByLabel('Läskens namn / rubrik').fill('Homie Synbiotic Lime/Mint');
	await page.getByLabel('Märke', { exact: true }).fill('Homie');
	const automatic = await exportJson(page);
	expect(automatic.json).toMatchObject({
		sodaId: 'homie-synbiotic-limemint',
		slug: 'homie-synbiotic-limemint-anton'
	});
	await page.locator('#slug').fill('langt-lasknamn-anton');
	await page.getByLabel('Läskens namn / rubrik').fill('a'.repeat(99) + ' b'.repeat(40));
	await page.getByLabel('Märke', { exact: true }).fill('a'.repeat(99));
	expect((await exportJson(page)).json.sodaId).toBe('a'.repeat(99));
	const source = JSON.parse(await readFile('tests/fixtures/content/testsoda-robin.json', 'utf8'));
	const fileInput = page.getByLabel('Recensionens JSON-fil', { exact: true });
	await fileInput.setInputFiles({
		name: `${source.slug}.json`,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify({ ...source, sodaId: 'sparat-lask-id' }))
	});
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Robin');
	await page.getByLabel('Läskens namn / rubrik').fill('Ändrad rubrik');
	expect((await exportJson(page)).json.sodaId).toBe('sparat-lask-id');
	delete source.sodaId;
	await fileInput.setInputFiles({
		name: `${source.slug}.json`,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(source))
	});
	await expect(page.getByLabel('Läskens namn / rubrik')).toHaveValue('Testläsk');
	const restored = (await exportJson(page)).json;
	expect(restored).toMatchObject({ sodaId: 'testlask', slug: 'testsoda-robin' });
});
