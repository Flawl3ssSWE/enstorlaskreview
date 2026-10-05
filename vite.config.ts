import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Compile icons with the app so dev re-optimization cannot leave them on a stale Svelte runtime.
	optimizeDeps: { exclude: ['@lucide/svelte'] },
	test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
});
