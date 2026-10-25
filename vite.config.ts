import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Compile icons with the app so dev re-optimization cannot leave them on a stale Svelte runtime.
	optimizeDeps: { exclude: ['@lucide/svelte'] },
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			thresholds: { statements: 85, branches: 88, functions: 88, lines: 85 },
			reporter: ['text', 'json-summary', 'html'],
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/types/**', 'src/lib/demo/**']
		}
	}
});
