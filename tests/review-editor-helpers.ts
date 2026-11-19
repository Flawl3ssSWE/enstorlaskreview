import type { Page } from '@playwright/test';
import { TASTING_PROFILE_METRICS, TASTING_RATING_METRICS } from '../src/lib/review-metadata';

export async function openEditorTools(page: Page) {
	const toggle = page.getByRole('button', { name: 'Verktyg', exact: true });
	if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

export async function fillRating(page: Page, id: string, value: number, mobile = false) {
	if (mobile) await page.locator(`label[for="${id}-${value}"]`).click();
	else await page.locator(`#${id}`).fill(String(value));
}

export async function fillTasting(page: Page, mobile = false) {
	for (const { key } of TASTING_PROFILE_METRICS)
		await fillRating(page, `profile-${key}`, 3, mobile);
	for (const { key } of TASTING_RATING_METRICS) await fillRating(page, `tasting-${key}`, 3, mobile);
}
