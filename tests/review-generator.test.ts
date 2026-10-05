import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { validateReview } from '../src/lib/content/validation';
import {
	DRINK_CONTAINERS,
	DRINK_VOLUMES_ML,
	SODA_RATING_METRICS,
	VENUE_RATING_METRICS
} from '../src/lib/review-metadata';

const basePath = process.env.BASE_PATH ?? '';

async function fillReview(page: import('@playwright/test').Page) {
	await page.goto('skapa/');
	await page.getByLabel('Läskens namn / rubrik').fill('Ny hallonsoda');
	await page.getByLabel('Författare', { exact: true }).fill('Test');
	await page.getByLabel('Fri text').fill('**Frisk** och lättdrucken.');
	await page
		.getByLabel('Bild till recensionen')
		.setInputFiles('tests/fixtures/images/test-bar.png');
	await expect(page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' })).toBeVisible();
}

async function exportJson(page: import('@playwright/test').Page) {
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner JSON' }).click();
	const download = await downloadPromise;
	const json = JSON.parse(await readFile((await download.path())!, 'utf8'));
	validateReview(json, download.suggestedFilename());
	return { json, filename: download.suggestedFilename() };
}

test('generator downloads one flat review with one price and a separate compressed WebP', async ({
	page
}) => {
	await fillReview(page);
	await expect(page).toHaveURL(new RegExp(`${basePath}/skapa/`));
	await expect(
		page.getByRole('textbox', { name: 'Pris i kronor (valfritt)', exact: true })
	).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Lägg till recensent' })).toHaveCount(0);
	await expect(page.locator('#container option')).toHaveText(['Ej angiven', ...DRINK_CONTAINERS]);
	expect(await page.locator('#review-1-volume option').count()).toBe(DRINK_VOLUMES_ML.length + 2);
	await page.locator('#container').selectOption('Burk');
	await page.locator('#review-1-volume').selectOption('330');
	await page.getByLabel('Pris i kronor (valfritt)', { exact: true }).fill('25');
	await page.getByRole('checkbox', { name: /läskfavorit/ }).check();
	await page.getByLabel('Återköpspotential (valfritt)').selectOption('0');
	await page.getByLabel('Betygsätt stället också').check();
	for (const metric of SODA_RATING_METRICS)
		await page.locator(`#soda-${metric.key}`).fill(metric.key === 'sweetness' ? '3' : '4.5');
	for (const metric of VENUE_RATING_METRICS) await page.locator(`#venue-${metric.key}`).fill('0');
	const { json, filename } = await exportJson(page);
	expect(filename).toBe('ny-hallonsoda-test.json');
	expect(validateReview(json, filename).rating).toBe(3);
	expect(json).toMatchObject({
		author: 'Test',
		favorite: true,
		repurchasePotential: 0,
		description: '**Frisk** och lättdrucken.',
		location: '',
		beerPriceKr: 25,
		image: 'ny-hallonsoda-test.webp',
		container: 'Burk',
		volumeMl: 330
	});
	expect(json).not.toHaveProperty('reviews');
	expect(json).not.toHaveProperty('rating');
	expect(json).not.toHaveProperty('quality');
	expect(json).not.toHaveProperty('recommended');
	await page.getByLabel('Återköpspotential (valfritt)').selectOption({ label: 'Ej angiven' });
	await page.getByLabel('Betygsätt stället också').uncheck();
	await page.locator('#container').selectOption({ label: 'Ej angiven' });
	await expect(page.locator('#review-1-volume')).toHaveValue('330');
	await page.locator('#review-1-volume').selectOption({ label: 'Ej angiven' });
	const sodaOnly = (await exportJson(page)).json;
	for (const field of ['venueRatings', 'container', 'volumeMl', 'repurchasePotential'])
		expect(sodaOnly).not.toHaveProperty(field);
	const imagePromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner bild' }).click();
	const image = await imagePromise;
	expect(image.suggestedFilename()).toBe(json.image);
	const bytes = await readFile((await image.path())!);
	expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
	expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
	expect(bytes.length).toBeLessThanOrEqual(500 * 1024);
});

test('large images are resized and compressed without source EXIF metadata', async ({ page }) => {
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
});

test('replacing a PNG uses a new WebP filename in the edited JSON', async ({ page }) => {
	await page.goto('skapa/');
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
	const horizontal = page.getByRole('slider', { name: /Vågrät bildposition/ });
	const vertical = page.getByRole('slider', { name: /Lodrät bildposition/ });
	await expect(preview).toHaveCSS('object-fit', 'cover');
	await expect(preview).toHaveCSS('aspect-ratio', '16 / 9');
	await horizontal.focus();
	await horizontal.press('Home');
	await vertical.focus();
	await vertical.press('End');
	await expect(preview).toHaveCSS('object-position', '0% 100%');
	expect((await exportJson(page)).json).toMatchObject({ imageFocusX: 0, imageFocusY: 100 });
	await page.getByRole('button', { name: 'Centrera bilden' }).click();
	await expect(preview).toHaveCSS('object-position', '50% 50%');
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await expect(preview).toHaveAttribute('src', `${basePath}/images/test-bar.png`);
	await expect(preview).toHaveCSS('object-position', '25% 75%');
	await expect(horizontal).toHaveValue('25');
	await expect(vertical).toHaveValue('75');
	await vertical.focus();
	await vertical.press('Home');
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
		'background-position',
		'25% 75%'
	);
});

test('zoom previews, resets and persists on review pages, cards and imports', async ({ page }) => {
	await fillReview(page);
	const preview = page.getByRole('img', { name: 'Förhandsvisning av recensionsbild' });
	const zoom = page.getByRole('slider', { name: /Zoom:/ });
	await expect(zoom).toHaveValue('1');
	await zoom.focus();
	await zoom.press('End');
	await expect(preview).toHaveCSS('transform', 'matrix(3, 0, 0, 3, 0, 0)');
	const horizontal = page.getByRole('slider', { name: /Vågrät bildposition/ });
	await horizontal.focus();
	await horizontal.press('Home');
	await expect(preview).toHaveAttribute('style', /transform-origin: 0% 50%/);
	expect((await exportJson(page)).json).toMatchObject({ imageZoom: 3, imageFocusX: 0 });
	await expect(preview.locator('..')).toHaveCSS('overflow', 'hidden');
	await page.getByRole('button', { name: 'Återställ utsnitt' }).click();
	await expect(zoom).toHaveValue('1');
	await expect(horizontal).toHaveValue('50');
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
	await page.getByLabel('Pris i kronor (valfritt)', { exact: true }).fill('22,5');
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
	expect(Date.parse(json.updatedAt)).toBeGreaterThan(Date.parse(saved.updatedAt));
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
	await expect(page.getByRole('heading', { name: 'Betyg på stället', exact: true })).toBeVisible();
	await expect(page.getByText('2/3', { exact: true })).toBeVisible();
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
	await expect(page.getByText('3/3', { exact: true })).toBeVisible();
	await expect(page.getByText('Frisk och balanserad enligt Alex.', { exact: true })).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Visa betyg och recension' })).toHaveCount(0);
	await expect(page.getByText(/Återköpspotential: 5\/5/)).toBeVisible();
	await page.goto('testsoda-robin/');
	await expect(page.getByText(/Återköpspotential: 0\/5/)).toBeVisible();
	await expect(page.getByText('0/3', { exact: true })).toBeVisible();
	await expect(page.getByText('Alldeles för söt enligt Robin.', { exact: true })).toBeVisible();
	await expect(page.getByText('Läskfavorit', { exact: true })).toHaveCount(0);
});

test('editing keeps the existing review slug, image and creation date', async ({ page }) => {
	await page.goto('skapa/');
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('testsoda');
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Alex');
	await expect(page.getByLabel('Slug / filnamn')).toHaveValue('testsoda');
	await expect(page.getByLabel('Slug / filnamn')).toHaveAttribute('readonly', '');
	await expect(page.locator('#container')).toHaveValue('Burk');
	await expect(page.locator('#review-1-volume')).toHaveValue('330');
	await expect(page.getByLabel('Återköpspotential (valfritt)')).toHaveValue('5');
	await expect(page.getByRole('checkbox', { name: /läskfavorit/ })).toBeChecked();
	await page.getByLabel('Pris i kronor (valfritt)', { exact: true }).fill('27');
	const { json, filename } = await exportJson(page);
	expect(filename).toBe('testsoda.json');
	expect(json).toMatchObject({
		author: 'Alex',
		favorite: true,
		repurchasePotential: 5,
		image: 'test-bar.png',
		createdAt: '2025-01-01T12:00:00.000Z',
		container: 'Burk',
		beerPriceKr: 27
	});
	expect(json).not.toHaveProperty('reviews');
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('hallonsoda');
	await expect(page.locator('#venue-atmosphere')).toHaveValue('1');
	await expect(page.getByLabel('Återköpspotential (valfritt)')).toHaveValue('');
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
	await expect(page.getByText('LPK (läsk per krona): 1,65 cl/kr', { exact: true })).toBeVisible();
	await expect(
		page.getByText('Koffein: 32 mg/100 ml · 105,6 mg i hela förpackningen', { exact: true })
	).toBeVisible();
	await page.goto('testsoda-robin/');
	await expect(page.getByText('LPK (läsk per krona): 5 cl/kr', { exact: true })).toBeVisible();
	await expect(
		page.getByText('Koffein: 32 mg/100 ml · 480 mg i hela förpackningen', { exact: true })
	).toBeVisible();
	await page.goto('hallonsoda/');
	await expect(page.getByText(/Koffein:/)).toHaveCount(0);
});

test('generator exports energy drink facts with the review price', async ({ page }) => {
	await fillReview(page);
	await page.getByLabel('Energidryck', { exact: true }).check();
	await page.getByLabel('Koffein i mg/100 ml').fill('32');
	await page.locator('#container').selectOption('Sprutmaskin');
	await page.locator('#review-1-volume').selectOption('400');
	await page.getByLabel('Pris i kronor (valfritt)', { exact: true }).fill('20');
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
	await expect(page.getByText('Förpackning: Pappmugg', { exact: true })).toBeVisible();
	await expect(page.getByText('Volym: 27,5 cl', { exact: true })).toBeVisible();
	await expect(page.getByText('LPK (läsk per krona): 1,38 cl/kr', { exact: true })).toBeVisible();
	await page.goto('skapa/');
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('egen-forpackning');
	await expect(page.getByLabel('Egen förpackning', { exact: true })).toHaveValue('Pappmugg');
	await expect(page.locator('#review-1-volume')).toHaveValue('custom');
	await expect(page.getByLabel('Egen volym i ml', { exact: true })).toHaveValue('275');
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
	await expect(page.getByLabel('Läsk-ID (automatiskt)', { exact: true })).toHaveValue(
		'ny-hallonsoda'
	);
	await page.getByLabel('Pris i kronor (valfritt)', { exact: true }).fill('20');
	await page.locator('#review-1-volume').selectOption('330');
	const first = await exportJson(page);
	await page.getByLabel('Författare', { exact: true }).fill('Robin');
	await page.getByLabel('Fri text').fill('En annan upplevelse.');
	await page.getByLabel('Pris i kronor (valfritt)', { exact: true }).fill('30');
	await page.locator('#review-1-volume').selectOption('500');
	await page.locator('#soda-taste').fill('0');
	const second = await exportJson(page);
	expect(first.filename).toBe('ny-hallonsoda-alex.json');
	expect(second.filename).toBe('ny-hallonsoda-robin.json');
	expect(first.json).toMatchObject({
		title: 'Ny hallonsoda',
		sodaId: 'ny-hallonsoda',
		author: 'Alex',
		beerPriceKr: 20,
		volumeMl: 330,
		sodaRatings: { taste: 3 }
	});
	expect(second.json).toMatchObject({
		title: 'Ny hallonsoda',
		sodaId: 'ny-hallonsoda',
		author: 'Robin',
		beerPriceKr: 30,
		volumeMl: 500,
		sodaRatings: { taste: 0 }
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

test('generator selects an existing soda and preserves links when editing', async ({ page }) => {
	await fillReview(page);
	await page
		.getByRole('combobox', { name: 'Läsk att länka recensionen till (valfritt)', exact: true })
		.selectOption('testlask');
	await expect(page.getByLabel('Läskens namn / rubrik')).toHaveValue('Testläsk');
	await expect(page.getByLabel('Läsk-ID (automatiskt)', { exact: true })).toHaveValue('testlask');
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Test');
	await expect(page.getByLabel('Pris i kronor (valfritt)', { exact: true })).toHaveValue('');
	const created = await exportJson(page);
	expect(created.json).toMatchObject({ sodaId: 'testlask', slug: 'testlask-test', author: 'Test' });
	expect(created.json).not.toHaveProperty('beerPriceKr');
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('testsoda');
	await expect(page.locator('#linked-soda')).toHaveValue('testlask');
	const edited = await exportJson(page);
	expect(edited.json).toMatchObject({
		sodaId: 'testlask',
		slug: 'testsoda',
		author: 'Alex',
		beerPriceKr: 20
	});
	await page.getByRole('combobox', { name: 'Redigera en befintlig recension' }).selectOption('');
	await expect(page.getByLabel('Läsk-ID (automatiskt)', { exact: true })).toHaveValue('');
});

test('total rating preview updates with soda scores and matches exported JSON', async ({
	page
}) => {
	await fillReview(page);
	const preview = page.getByRole('status', { name: 'Förhandsvisning av totalbetyg' });
	await expect(preview.getByText('2/3', { exact: true })).toBeVisible();
	await expect(preview).toContainText('Viktad poäng: 3,3/5');
	for (const metric of SODA_RATING_METRICS)
		await page.locator(`#soda-${metric.key}`).fill(metric.key === 'sweetness' ? '3' : '5');
	await expect(preview.getByText('3/3', { exact: true })).toBeVisible();
	await expect(preview).toContainText('Viktad poäng: 5/5');
	await page.locator('#soda-mouthfeel').fill('0');
	await expect(preview).toContainText('Viktad poäng: 5/5');
	await page.getByLabel('Betygsätt stället också').check();
	for (const metric of VENUE_RATING_METRICS) await page.locator(`#venue-${metric.key}`).fill('0');
	await expect(preview.getByText('3/3', { exact: true })).toBeVisible();
	await page.locator('#soda-sweetness').fill('5');
	await expect(preview.getByText('2/3', { exact: true })).toBeVisible();
	await expect(preview).toContainText('Viktad poäng: 4,25/5');
	await page.locator('#soda-taste').fill('0');
	await expect(preview.getByText('1/3', { exact: true })).toBeVisible();
	const exported = await exportJson(page);
	expect(validateReview(exported.json, exported.filename).rating).toBe(1);
	await page.locator('#soda-carbonation').fill('');
	await expect(preview).toContainText('Fyll i alla läskbetyg');
	await expect(preview.getByText(/^[0-3]\/3$/)).toHaveCount(0);
	await page.locator('#soda-carbonation').fill('6');
	await expect(preview).toContainText('Fyll i alla läskbetyg');
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('testsoda');
	await expect(preview.getByText('3/3', { exact: true })).toBeVisible();
	await page
		.getByRole('combobox', { name: 'Redigera en befintlig recension' })
		.selectOption('testsoda-robin');
	await expect(preview.getByText('0/3', { exact: true })).toBeVisible();
	await page.getByRole('combobox', { name: 'Redigera en befintlig recension' }).selectOption('');
	await expect(preview.getByText('2/3', { exact: true })).toBeVisible();
});

test('generator formats entered soda names into a previewed valid soda ID', async ({ page }) => {
	await fillReview(page);
	await page.getByLabel('Läskens namn / rubrik').fill('Rockstar Guava Zero');
	await page.getByLabel('Författare', { exact: true }).fill('Anton');
	await page.getByLabel('Läsk-ID (automatiskt)', { exact: true }).fill('Rockstar Guava Zero');
	await expect(page.locator('#soda-id-preview')).toHaveText(
		'Läsk-ID som sparas: rockstar-guava-zero'
	);
	const exported = await exportJson(page);
	expect(exported.filename).toBe('rockstar-guava-zero-anton.json');
	expect(exported.json).toMatchObject({
		title: 'Rockstar Guava Zero',
		author: 'Anton',
		sodaId: 'rockstar-guava-zero'
	});
	await page.getByLabel('Läsk-ID (automatiskt)', { exact: true }).fill('--__');
	await page.getByRole('button', { name: 'Ladda ner JSON' }).click();
	await expect(page.getByRole('alert')).toHaveText(
		'Ange ett läsknamn eller ID med minst en bokstav a–z eller siffra.'
	);
	await page.getByLabel('Läsk-ID (automatiskt)', { exact: true }).fill('');
	const automatic = await exportJson(page);
	expect(automatic.json.sodaId).toBe('rockstar-guava-zero');
});

test('generator accepts one decimal in prices with a comma or period', async ({ page }) => {
	await fillReview(page);
	await page.locator('#review-1-volume').selectOption('330');
	const price = page.getByLabel('Pris i kronor (valfritt)', { exact: true });
	for (const value of ['12,5', '12.5']) {
		await price.fill(value);
		expect((await exportJson(page)).json.beerPriceKr).toBe(12.5);
	}
	await price.fill('12,55');
	await page.getByRole('button', { name: 'Ladda ner JSON' }).click();
	await expect(page.getByRole('alert')).toContainText('högst en decimal');
	await price.fill('');
	expect((await exportJson(page)).json).not.toHaveProperty('beerPriceKr');
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

test('home drink filters combine, survive reload and clear, with compact nutritional facts', async ({
	page
}) => {
	await page.goto('./?drinkType=energy&drinkType=sugar-free&drinkType=protein');
	await expect(page.getByLabel('Energidryck', { exact: true })).toBeChecked();
	await expect(page.getByLabel('Sockerfri', { exact: true })).toBeChecked();
	await expect(page.getByRole('heading', { name: 'Testläsk', exact: true })).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	const facts = page.locator('[aria-label="Drycksfakta"]');
	await expect(facts.getByText('KPL 0 g', { exact: true })).toBeVisible();
	await expect(facts.getByText('PPL 20 g', { exact: true })).toBeVisible();
	await expect(
		page
			.getByRole('link')
			.filter({ has: page.getByRole('heading', { name: 'Testläsk', exact: true }) })
			.getByText(/Koffein/)
	).toHaveCount(0);
	const imageBox = await page
		.getByRole('img', { name: 'Testläsk', exact: true })
		.locator('..')
		.boundingBox();
	const imageAreaBox = await page
		.getByRole('img', { name: 'Testläsk', exact: true })
		.locator('../..')
		.boundingBox();
	expect(imageBox!.height).toBeCloseTo(imageAreaBox!.height, 1);
	const factsBox = await facts.boundingBox();
	expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(factsBox!.y);
	expect(await facts.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
	await page.getByLabel('Sockerfri', { exact: true }).uncheck();
	await page.getByLabel('Sockrad', { exact: true }).check();
	await expect(page.getByRole('heading', { name: 'Testläsk', exact: true })).toHaveCount(0);
	await page.reload();
	await expect(page.getByLabel('Sockrad', { exact: true })).toBeChecked();
	await page.getByRole('button', { name: /Rensa/ }).click();
	await expect(page.getByLabel('Sockrad', { exact: true })).not.toBeChecked();
	await page.goto('testsoda/');
	await expect(
		page.getByText('KPL (kolhydrat per läsk): 0 g/100 ml · 0 g i hela förpackningen', {
			exact: true
		})
	).toBeVisible();
	await expect(
		page.getByText('PPL (protein per läsk): 6,06 g/100 ml · 20 g i hela förpackningen', {
			exact: true
		})
	).toBeVisible();
});

test('serving details support multiple methods, imports, edits and reset without changing packaging', async ({
	page
}) => {
	await page.goto('testsoda/');
	await expect(page.getByText('Serveringsmetod: Glas · Sugrör', { exact: true })).toBeVisible();
	await expect(page.getByText('Serveringstemperatur: Kylskåpskall', { exact: true })).toBeVisible();
	await expect(page.getByText('Servering: Utan is', { exact: true })).toBeVisible();
	await page.goto('skapa/');
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
	await expect(page.locator('#serving-temperature option:checked')).toHaveText('Ej angiven');
	await expect(page.locator('#served-with-ice option:checked')).toHaveText('Ej angivet');
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
	await expect(page.locator('#sugar-type')).toHaveValue('');
	await page.locator('#caffeine').fill('');
	await page.locator('#protein').fill('');
	const cleared = (await exportJson(page)).json;
	expect(cleared.isEnergyDrink).toBeUndefined();
	expect(cleared.isProteinDrink).toBeUndefined();
	expect(cleared.sugarType).toBeUndefined();
});

test('electrolyte category is editable, survives import and reset, and combines with home filters', async ({
	page
}) => {
	await fillReview(page);
	await page.getByLabel('Elektrolytdryck', { exact: true }).check();
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
	await expect(page.getByLabel('Elektrolytdryck', { exact: true })).toBeChecked();
	await page.getByRole('button', { name: 'Skapa ny recension', exact: true }).click();
	await expect(page.getByLabel('Elektrolytdryck', { exact: true })).not.toBeChecked();
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await expect(page.getByLabel('Elektrolytdryck', { exact: true })).toBeChecked();
	await page.getByRole('button', { name: 'Använd automatiska dryckstyper', exact: true }).click();
	await expect(page.getByLabel('Elektrolytdryck', { exact: true })).toBeChecked();
	await page.getByLabel('Elektrolytdryck', { exact: true }).uncheck();
	expect((await exportJson(page)).json.isElectrolyteDrink).toBe(false);
	await page.goto('./?drinkType=electrolyte&drinkType=energy&drinkType=sugar-free');
	await expect(page.getByLabel('Elektrolytdryck', { exact: true })).toBeChecked();
	const card = page
		.getByRole('link')
		.filter({ has: page.getByRole('heading', { name: 'Testläsk', exact: true }) });
	await expect(card.getByText('Elektrolytdryck', { exact: true })).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
	await page.reload();
	await expect(page.getByLabel('Elektrolytdryck', { exact: true })).toBeChecked();
	await page.goto('testsoda/');
	await expect(page.getByText('Elektrolytdryck', { exact: true })).toBeVisible();
});

test('automatic soda IDs follow the drink name, exclude author names and preserve explicit IDs', async ({
	page
}) => {
	await fillReview(page);
	const id = page.getByLabel('Läsk-ID (automatiskt)', { exact: true });
	await expect(id).toHaveValue('ny-hallonsoda');
	await page.getByLabel('Författare', { exact: true }).fill('Anton');
	await expect(id).toHaveValue('ny-hallonsoda');
	await page.getByLabel('Läskens namn / rubrik').fill('Homie Synbiotic Lime/Mint');
	await expect(id).toHaveValue('homie-synbiotic-limemint');
	const automatic = await exportJson(page);
	expect(automatic.json).toMatchObject({
		sodaId: 'homie-synbiotic-limemint',
		slug: 'homie-synbiotic-limemint-anton'
	});
	await id.fill('mitt-stabila-id');
	await page.getByLabel('Läskens namn / rubrik').fill('Nytt visningsnamn');
	await expect(id).toHaveValue('mitt-stabila-id');
	expect((await exportJson(page)).json.sodaId).toBe('mitt-stabila-id');
	await id.fill('');
	await expect(id).toHaveValue('nytt-visningsnamn');
	await page.locator('#slug').fill('langt-lasknamn-anton');
	await page.getByLabel('Läskens namn / rubrik').fill('a'.repeat(99) + ' b'.repeat(40));
	await expect(id).toHaveValue('a'.repeat(99));
	expect((await exportJson(page)).json.sodaId).toBe('a'.repeat(99));
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await expect(id).toHaveValue('testlask');
	await page.getByLabel('Läskens namn / rubrik').fill('Ändrad rubrik');
	expect((await exportJson(page)).json.sodaId).toBe('testlask');
	const source = JSON.parse(await readFile('tests/fixtures/content/testsoda-robin.json', 'utf8'));
	delete source.sodaId;
	await page.getByLabel('Recensionens JSON-fil', { exact: true }).setInputFiles({
		name: `${source.slug}.json`,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(source))
	});
	await expect(page.getByLabel('Författare', { exact: true })).toHaveValue('Robin');
	await expect(id).toHaveValue('testlask');
	const restored = (await exportJson(page)).json;
	expect(restored).toMatchObject({ sodaId: 'testlask', slug: 'testsoda-robin' });
});
