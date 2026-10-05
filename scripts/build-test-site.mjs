import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.test-site', { recursive: true });
const assetDirectory = await mkdtemp('.test-site/assets-');
try {
	await cp('static', assetDirectory, { recursive: true });
	const result = spawnSync('pnpm', ['build'], {
		stdio: 'inherit',
		env: {
			...process.env,
			REVIEW_CONTENT_DIR: 'tests/fixtures/content',
			REVIEW_CONTENT_IMAGE_DIR: 'tests/fixtures/images',
			REVIEW_STATIC_DIR: assetDirectory
		}
	});
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} finally {
	await rm(assetDirectory, { recursive: true, force: true });
}
