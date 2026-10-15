import type { Page } from '@playwright/test';

export async function openEditorTools(page: Page) {
	const toggle = page.getByRole('button', { name: 'Verktyg', exact: true });
	if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}
