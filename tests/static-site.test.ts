import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '';

test('footer keeps its height at the bottom of short and long pages', async ({ page }) => {
	for (const viewport of [
		{ width: 320, height: 568 },
		{ width: 390, height: 844 },
		{ width: 1280, height: 1000 }
	]) {
		await page.setViewportSize(viewport);
		for (const route of ['./?search=finns-inte', 'about/', 'testbaren/', 'statistik/', '404/']) {
			await page.goto(route);
			await page.evaluate(() => document.fonts.ready);
			const footer = page.getByRole('contentinfo');
			await expect(footer.getByRole('link', { name: 'En Stor Stark Review' })).toHaveAttribute(
				'href',
				'https://enstorstarkreview.se/'
			);
			const dimensions = await footer.evaluate((element) => {
				const rect = element.getBoundingClientRect();
				return {
					height: rect.height,
					bottom: rect.bottom + window.scrollY,
					pageHeight: document.documentElement.scrollHeight
				};
			});
			expect(dimensions.height).toBe(64);
			expect(Math.abs(dimensions.bottom - dimensions.pageHeight)).toBeLessThanOrEqual(1);
		}
	}
});

test('search and sorting survive direct navigation and reload', async ({ page }) => {
	const scriptErrors: string[] = [];
	page.on('pageerror', (error) => scriptErrors.push(error.message));
	await page.goto('./?search=Testgatan&sort=oldest');
	await expect(page.locator('main a[href*="testbaren"]')).toHaveCount(2);
	await expect(page.getByRole('combobox', { name: 'Sortera' })).toHaveValue('oldest');
	await page.reload();
	await expect(page.getByRole('combobox', { name: 'Sortera' })).toHaveValue('oldest');
	await page.getByRole('combobox', { name: 'Sortera' }).selectOption('latest');
	await expect(page.locator('main a[href*="testbaren"]').first()).toHaveAttribute(
		'href',
		`${basePath}/andra-testbaren/`
	);
	await page.goto('./?search=finns-inte');
	await expect(page.locator('main a[href*="testbaren"]')).toHaveCount(0);
	expect(scriptErrors).toEqual([]);
});

test('detail pages keep ratings, images, authors, and GitHub history', async ({ page }) => {
	const scriptErrors: string[] = [];
	page.on('pageerror', (error) => scriptErrors.push(error.message));
	await page.goto('testbaren/');
	await expect(page.getByRole('heading', { name: 'Testbaren', exact: true })).toBeVisible();
	await expect(page.getByText('65 kr*', { exact: true })).toBeVisible();
	await expect(page.getByText('Test, Sara', { exact: true })).toBeVisible();

	expect(
		await page
			.getByRole('img', { name: 'Testbaren', exact: true })
			.evaluate((image) => (image as HTMLImageElement).naturalWidth)
	).toBeGreaterThan(0);
	await expect(page.getByRole('link', { name: 'Visa historik på GitHub' })).toHaveAttribute(
		'href',
		'https://github.com/Flawl3ssSWE/enstorlaskreview/commits/HEAD/content/reviews/testbaren.json'
	);
	await expect(page.getByRole('button', { name: 'Publicera recension' })).toHaveCount(0);
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Testbaren', exact: true })).toBeVisible();
	expect(scriptErrors).toEqual([]);
});

test('review image endpoints publish the exact referenced bytes at stable URLs', async ({
	request
}) => {
	const image = await request.get('images/test-bar.png');
	expect(image.status()).toBe(200);
	expect(image.headers()['content-type']).toBe('image/png');
	expect(await image.body()).toEqual(await readFile('tests/fixtures/images/test-bar.png'));
	const missing = await request.get('images/unreferenced.png');
	expect(missing.status()).toBe(404);
});

test('navigation, statistics, and About work without server actions', async ({ page }) => {
	await page.goto('./');
	await page.getByRole('link', { name: 'Statistik', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`${basePath}/statistik/`));
	await expect(page.getByRole('heading', { name: 'Lägst literpris', exact: true })).toBeVisible();
	await expect(page.getByText('20 kr/l', { exact: true })).toBeVisible();
	await expect(
		page.getByText('Snittbetyg för läsk', { exact: true }).locator('../..')
	).toContainText('3,5 / 5');
	await expect(page.getByRole('heading', { name: 'Läskens betygsprofil' })).toBeVisible();
	await expect(
		page
			.getByRole('heading', { name: 'Högst läskbetyg' })
			.locator('..')
			.getByRole('link', { name: 'Testläsk' })
	).toHaveAttribute('href', `${basePath}/testsoda/`);
	await expect(page.getByText('39,2 kr', { exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'FAQ', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Vanliga frågor' })).toBeVisible();
	await expect(page.locator('form')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Skapa utkast' })).toHaveCount(0);
});

test('pages use no analytics, tracking cookies, or consent banner', async ({ page }) => {
	const trackingRequests: string[] = [];
	page.on('request', (request) => {
		if (/google-analytics\.com|googletagmanager\.com/.test(request.url())) {
			trackingRequests.push(request.url());
		}
	});
	for (const route of ['./', 'testbaren/', 'about/']) {
		await page.goto(route);
		await expect(page.getByRole('button', { name: /Avböj|Godkänn/ })).toHaveCount(0);
		expect(await page.content()).not.toMatch(/google-analytics\.com|googletagmanager\.com|gtag/);
	}
	await page.reload();
	expect(await page.context().cookies()).toEqual([]);
	expect(await page.evaluate(() => 'gtag' in window || 'dataLayer' in window)).toBe(false);
	expect(trackingRequests).toEqual([]);
});

test('soda branding and icons load from the configured base path', async ({ page, request }) => {
	await page.goto('./');
	await expect(page.getByRole('link', { name: /En Stor Läsk Review/ })).toBeVisible();
	const logo = page.getByRole('img', { name: 'En Stor Läsk Review – hem' });
	await expect(logo).toHaveAttribute('src', `${basePath}/logo.png`);
	expect(await logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(
		0
	);
	for (const [rel, filename] of [
		['icon', 'favicon.png'],
		['apple-touch-icon', 'apple-touch-icon.png']
	]) {
		const iconUrl = await page.locator(`link[rel="${rel}"]`).getAttribute('href');
		expect(new URL(iconUrl!, page.url()).pathname).toBe(`${basePath}/${filename}`);
		const response = await request.get(filename);
		expect(response.ok()).toBe(true);
		expect(response.headers()['content-type']).toContain('image/png');
	}
});

test('map waits for acceptance, bundles its worker, and never requests location', async ({
	page
}) => {
	await page.addInitScript(() => {
		const state = { calls: 0 };
		Object.assign(window, { locationTest: state });
		navigator.geolocation.watchPosition = () => {
			state.calls++;
			return 1;
		};
		navigator.geolocation.getCurrentPosition = () => {
			state.calls++;
		};
	});
	const mapRequests: string[] = [];
	await page.route('https://tiles.openfreemap.org/**', (route) => {
		mapRequests.push(route.request().url());
		return route.fulfill({ json: { version: 8, sources: {}, layers: [] } });
	});
	const workerFailures: string[] = [];
	page.on('requestfailed', (request) => {
		if (request.url().includes('worker')) workerFailures.push(request.url());
	});
	await page.goto('karta/');
	const accept = page.getByRole('button', { name: 'Jag godkänner – ladda kartan' });
	await expect(accept).toBeVisible();
	await page.waitForLoadState('networkidle');
	expect(mapRequests).toEqual([]);
	await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
	await expect(
		page.getByRole('link', { name: 'Läs mer om kartan och integriteten' })
	).toHaveAttribute('href', `${basePath}/about/`);
	await accept.focus();
	await page.keyboard.press('Enter');
	const marker = page.getByRole('button', { name: /Testbaren/ }).first();
	await expect(marker).toBeVisible({ timeout: 15000 });
	await expect(accept).toHaveCount(0);
	expect(mapRequests.length).toBeGreaterThan(0);
	await expect(page.getByText('65 kr*', { exact: true }).first()).toBeVisible();
	await marker.click();
	await expect(page.getByRole('link', { name: 'Läs recension' })).toHaveAttribute(
		'href',
		`${basePath}/testbaren/`
	);
	await page.getByRole('link', { name: 'FAQ', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`${basePath}/about/`));
	const previousRequestCount = mapRequests.length;
	await page.getByRole('link', { name: 'Karta', exact: true }).click();
	await expect(accept).toBeVisible();
	await page.waitForLoadState('networkidle');
	expect(mapRequests).toHaveLength(previousRequestCount);
	await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
	expect(
		await page.evaluate(
			() => (window as unknown as { locationTest: { calls: number } }).locationTest.calls
		)
	).toBe(0);
	expect(workerFailures).toEqual([]);
});

test('map failures after acceptance show a Swedish error', async ({ page }) => {
	await page.route('https://tiles.openfreemap.org/**', (route) => route.abort());
	await page.goto('karta/');
	await page.getByRole('button', { name: 'Jag godkänner – ladda kartan' }).click();
	await expect(page.getByRole('status')).toHaveText(
		'Kartan kunde inte laddas just nu. Försök igen om en liten stund.'
	);
});

test('the Pages 404 artifact has Swedish content and a base-aware home link', async ({
	request
}) => {
	const response = await request.get('404.html');
	expect(response.ok()).toBe(true);
	const html = await response.text();
	expect(html).toContain('419 Läsken är inte recenserad');
	expect(html).toContain('Till startsidan');
	expect(html).toContain('http-equiv="content-security-policy"');
	expect(html).not.toContain('%sveltekit.nonce%');
	expect(html).toContain(`href="${basePath}/"`);
	const missing = await request.get('does-not-exist/deep/');
	expect(missing.status()).toBe(404);
	expect(await missing.text()).toContain('Till startsidan');
	const legacy = await request.get('testbaren/history/');
	expect(legacy.status()).toBe(200);
	expect(await legacy.text()).toContain('http-equiv="refresh"');
});

test('fonts stay local and the mobile review layout fits the viewport', async ({
	page
}, testInfo) => {
	const fontRequests: string[] = [];
	page.on('request', (request) => {
		if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) fontRequests.push(request.url());
	});
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('testbaren/');
	await page.evaluate(() => document.fonts.ready);
	expect(await page.evaluate(() => document.fonts.check('600 16px "Archivo"'))).toBe(true);
	expect(await page.evaluate(() => document.fonts.check('400 16px "IBM Plex Sans"'))).toBe(true);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	expect(fontRequests).toEqual([]);
	await page.screenshot({ path: testInfo.outputPath('review-mobile.png'), fullPage: true });
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('./');
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
});

test('filter icon shares the search row and shows review counts only with advanced filters', async ({
	page
}) => {
	for (const width of [320, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('./');
		const toggle = page.getByRole('button', { name: 'Avancerade filter' });
		const search = page.locator('input[name="search"]');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(page.getByRole('status')).toHaveCount(0);
		const searchBox = await search.boundingBox();
		const toggleBox = await toggle.boundingBox();
		expect(searchBox).not.toBeNull();
		expect(toggleBox).not.toBeNull();
		expect(Math.abs(searchBox!.y - toggleBox!.y)).toBeLessThanOrEqual(1);
		await search.fill('Testgatan');
		await expect(page.getByRole('status')).toHaveCount(0);
		await toggle.focus();
		await page.keyboard.press('Enter');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(page.getByRole('combobox', { name: 'Märke', exact: true })).toBeVisible();
		await expect(page.getByRole('status')).toHaveCount(0);
		await page.getByRole('combobox', { name: 'Märke', exact: true }).selectOption('Pripps Blå');
		await expect(toggle).toHaveAccessibleName('Avancerade filter (1 aktiva)');
		await expect(page.getByRole('status')).toContainText('Visar 2 av');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(page.getByRole('combobox', { name: 'Märke', exact: true })).toBeHidden();
		await expect(page.getByRole('status')).toBeVisible();
		await page.getByRole('button', { name: 'Rensa filter' }).click();
		await expect(page.getByRole('status')).toHaveCount(0);
		await expect(toggle).toHaveAccessibleName('Avancerade filter');
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
	}
});

test('advanced filters combine, survive reload, and reset on mobile', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('./?brand=Pripps+Blå&minRating=2&maxPrice=65&sort=oldest');
	await expect(page.getByRole('combobox', { name: 'Märke', exact: true })).toHaveValue(
		'Pripps Blå'
	);
	await expect(page.locator('main a[href*="testbaren"]')).toHaveCount(1);
	await expect(page.getByRole('status')).toContainText('Visar 1 av');
	await page.reload();
	await expect(page.getByRole('spinbutton', { name: 'Högsta pris (kr)' })).toHaveValue('65');
	await page.getByRole('spinbutton', { name: 'Högsta pris (kr)' }).fill('64');
	await expect(page.getByRole('heading', { name: 'Ingen läsk matchar dina filter' })).toBeVisible();
	await expect(page).toHaveURL(/maxPrice=64/);
	await page.getByRole('button', { name: 'Rensa filter' }).click();
	await expect(page.getByRole('combobox', { name: 'Sortera' })).toHaveValue('oldest');
	await expect(page).toHaveURL(new RegExp(`${basePath}/\\?sort=oldest$`));
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

test('packaging and favorite follow the selected reviewer', async ({ page }) => {
	await page.goto('./?container=Burk&favorite=1&reviewer=alex&minRating=3');
	await expect(page.locator('main a[href*="testsoda"]')).toHaveCount(1);
	await page.getByRole('combobox', { name: 'Recensent', exact: true }).selectOption('robin');
	await expect(page.locator('main a[href*="testsoda"]')).toHaveCount(0);
	await page.getByRole('button', { name: 'Rensa filter' }).click();
	await page.getByRole('combobox', { name: 'Förpackning', exact: true }).selectOption('Flaska');
	await page.getByRole('checkbox', { name: 'Endast läskfavoriter' }).check();
	await expect(page.locator('main a[href*="testsoda"]')).toHaveCount(0);
	await page.getByRole('checkbox', { name: 'Endast läskfavoriter' }).uncheck();
	await expect(page.locator('main a[href*="testsoda"]')).toHaveCount(1);
});
