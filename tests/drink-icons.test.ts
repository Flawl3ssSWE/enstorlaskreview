import { expect, test } from '@playwright/test';

test('header category symbols explain themselves on focus and tap without inventing caffeine values', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('testsoda/');
	const facts = page.getByRole('region', { name: 'Drycksfakta', exact: true });
	const symbols = page.getByRole('group', { name: 'Dryckens egenskaper', exact: true });
	await expect(facts.getByRole('button')).toHaveCount(0);
	const symbolsBox = await symbols.boundingBox();
	const reviewBox = await page
		.getByRole('heading', { name: 'Recension', exact: true })
		.boundingBox();
	expect(symbolsBox!.y + symbolsBox!.height).toBeLessThan(reviewBox!.y);
	for (const label of ['sockerfri', 'elektrolytdryck', 'energidryck', 'proteindryck']) {
		const icon = symbols.getByRole('button', { name: `Om ${label}`, exact: true });
		await expect(icon).toBeVisible();
		await icon.focus();
		await expect(icon).toHaveAttribute('aria-expanded', 'true');
		await expect(page.getByRole('tooltip')).toContainText(`Klassad som ${label}`);
		await page.keyboard.press('Escape');
		await expect(icon).toHaveAttribute('aria-expanded', 'false');
		await icon.click();
		await expect(page.getByRole('tooltip')).toBeVisible();
		await page.keyboard.press('Escape');
	}
	await expect(symbols.getByRole('button', { name: 'Om sockrad', exact: true })).toHaveCount(0);
	await expect(facts).toContainText('Koffein: 32 mg/100 ml');
	await expect(facts).not.toContainText('Koffein: 0');
	await page.goto('hallonsoda/');
	await expect(page.getByRole('button', { name: 'Om energidryck', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Om elektrolytdryck', exact: true })).toHaveCount(
		0
	);
	await expect(page.getByText(/Koffein:/)).toHaveCount(0);
});

test('category symbols on cards retain accessible names and work as review links', async ({
	page
}) => {
	await page.goto('./?reviewer=alex');
	const card = page
		.getByRole('link')
		.filter({ has: page.getByRole('heading', { name: 'Testläsk', exact: true }) });
	for (const label of ['Sockerfri', 'Elektrolytdryck', 'Energidryck', 'Proteindryck']) {
		await expect(card.getByRole('img', { name: label, exact: true })).toBeVisible();
	}
	await expect(card.getByRole('img', { name: 'Sockrad', exact: true })).toHaveCount(0);
	await expect(card.getByRole('button')).toHaveCount(0);
	await card.getByRole('img', { name: 'Sockerfri', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Testläsk', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Om sockerfri', exact: true })).toBeVisible();
});
