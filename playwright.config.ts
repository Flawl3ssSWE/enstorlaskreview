import { defineConfig } from '@playwright/test';
const basePath = process.env.BASE_PATH ?? '';
export default defineConfig({
	workers: 1,
	webServer: {
		command: 'pnpm test:build && pnpm preview --host 127.0.0.1',
		url: `http://127.0.0.1:4173${basePath}/`,
		timeout: 120000,
		reuseExistingServer: false
	},
	use: {
		baseURL: `http://127.0.0.1:4173${basePath}/`,
		launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
	},
	testDir: 'tests',
	testMatch: '**/*.test.ts'
});
