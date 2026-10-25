import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hashStructuredData } from '../src/lib/server/static-csp.ts';

async function authorizeStructuredData(directory) {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) await authorizeStructuredData(path);
		else if (entry.name.endsWith('.html')) {
			const html = await readFile(path, 'utf8');
			const updated = hashStructuredData(html);
			if (updated !== html) await writeFile(path, updated);
		}
	}
}

await authorizeStructuredData('build');
// A rendered error route gives Pages a real styled 404, not an SPA fallback.
await copyFile('build/404/index.html', 'build/404.html');
await writeFile('build/.nojekyll', '');
