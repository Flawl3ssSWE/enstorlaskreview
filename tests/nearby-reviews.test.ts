import { expect, test } from '@playwright/test';

test('nearest sorting requires explicit consent, shows distances and clears its watcher', async ({
	page
}) => {
	await page.addInitScript(() => {
		let watches = 0;
		let cleared = 0;
		Object.defineProperty(navigator, 'geolocation', {
			value: {
				watchPosition(success: PositionCallback) {
					watches++;
					success({
						coords: { latitude: 57.7, longitude: 11.97, accuracy: 20 }
					} as GeolocationPosition);
					return 42;
				},
				clearWatch(id: number) {
					if (id === 42) cleared++;
				}
			}
		});
		Object.defineProperty(window, 'locationCalls', { get: () => ({ watches, cleared }) });
	});
	await page.goto('./?sort=nearest');
	const calls = () =>
		page.evaluate(
			() =>
				(window as unknown as { locationCalls: { watches: number; cleared: number } }).locationCalls
		);
	expect(await calls()).toEqual({ watches: 0, cleared: 0 });
	await page.getByRole('button', { name: 'Visa avstånd från min position' }).click();
	await expect(page.getByTestId('review-distance').first()).toBeVisible();
	expect(await calls()).toEqual({ watches: 1, cleared: 0 });
	const cards = page.locator('a').filter({ has: page.locator('h2') });
	const distances = await cards.evaluateAll((elements) =>
		elements.map((element) => {
			const text = element.querySelector('[data-testid="review-distance"]')?.textContent;
			return text ? Number.parseFloat(text.trim().replace(',', '.')) : Infinity;
		})
	);
	expect(distances).toEqual([...distances].sort((a, b) => a - b));
	await page.getByRole('combobox', { name: 'Sortera', exact: true }).selectOption('latest');
	expect(await calls()).toEqual({ watches: 1, cleared: 1 });
	await expect(page.getByTestId('review-distance')).toHaveCount(0);
	await page.getByRole('combobox', { name: 'Sortera', exact: true }).selectOption('nearest');
	await page.getByRole('button', { name: 'Visa avstånd från min position' }).click();
	await page.getByRole('link', { name: 'Statistik', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Läsk i siffror.' })).toBeVisible();
	await expect.poll(calls).toEqual({ watches: 2, cleared: 2 });
});

test('denied location keeps soda reviews readable and uses latest ordering', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'geolocation', {
			value: {
				watchPosition(_success: PositionCallback, failure: PositionErrorCallback) {
					failure({ code: 1 } as GeolocationPositionError);
					return 1;
				},
				clearWatch() {}
			}
		});
	});
	await page.goto('./?sort=nearest');
	await page.getByRole('button', { name: 'Visa avstånd från min position' }).click();
	await expect(page.getByRole('status')).toContainText('Platsåtkomst nekades');
	await expect(page.getByRole('heading', { name: 'Hallonsoda', exact: true })).toBeVisible();
	await expect(page.getByTestId('review-distance')).toHaveCount(0);
	const titles = await page.locator('h2').allTextContents();
	await page.getByRole('combobox', { name: 'Sortera', exact: true }).selectOption('latest');
	expect(await page.locator('h2').allTextContents()).toEqual(titles);
});
