import { copyFile, writeFile } from 'node:fs/promises';
// A rendered error route gives Pages a real styled 404, not an SPA fallback.
await copyFile('build/404/index.html', 'build/404.html');
await writeFile('build/.nojekyll', '');
