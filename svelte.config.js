import adapter from '@sveltejs/adapter-static';
import { readdirSync } from 'node:fs';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({ strict: true }),
		paths: { base: process.env.BASE_PATH ?? '', relative: false },
		files: { assets: process.env.REVIEW_STATIC_DIR ?? 'static' },
		prerender: {
			handleUnseenRoutes: ({ routes }) => {
				const isEmpty = !readdirSync(process.env.REVIEW_CONTENT_DIR ?? 'content/reviews').some(
					(name) => name.endsWith('.json')
				);
				if (
					!isEmpty ||
					routes.some(
						(route) => !['/[slug]', '/[slug]/history', '/images/[filename]'].includes(route)
					)
				) {
					throw new Error(`Routes were not prerendered: ${routes.join(', ')}`);
				}
			}
		},
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'img-src': ['self', 'data:', 'blob:', 'https://tiles.openfreemap.org'],
				'style-src': ['self', 'unsafe-inline'],
				// Permit the local WebP WASM encoder; JavaScript eval remains disabled.
				'script-src': ['self', 'wasm-unsafe-eval'],
				'connect-src': ['self', 'https://tiles.openfreemap.org', 'https://api.github.com'],
				'font-src': ['self'],
				'worker-src': ['self', 'blob:'],
				'child-src': ['self', 'blob:'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'object-src': ['none']
			}
		}
	}
};

export default config;
