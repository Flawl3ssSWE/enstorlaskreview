import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, symlink, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import fixture from '../../../tests/fixtures/content/testbaren.json';
import { loadReviews, imageSignatureMatches } from './content';
const directories: string[] = [];
afterEach(async () => {
	await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function setup() {
	const root = await mkdtemp(join(tmpdir(), 'review-content-'));
	directories.push(root);
	const content = join(root, 'reviews');
	const images = join(content, 'images');
	await mkdir(content);
	await mkdir(images);
	await writeFile(join(content, 'testbaren.json'), JSON.stringify(fixture));
	await copyFile('tests/fixtures/images/test-bar.png', join(images, 'test-bar.png'));
	return { content, images };
}
describe('build-time public content loading', () => {
	it('loads real files and supports an empty collection', async () => {
		expect(
			await loadReviews(resolve('tests/fixtures/content'), resolve('tests/fixtures/images'))
		).toHaveLength(6);
		const { content, images } = await setup();
		await rm(join(content, 'testbaren.json'));
		await rm(join(images, 'test-bar.png'));
		expect(await loadReviews(content, images)).toEqual([]);
	});
	it('loads images alongside the review JSON by default', async () => {
		const { content } = await setup();
		expect(await loadReviews(content)).toHaveLength(1);
	});
	it('rejects a linked images directory and unexpected content folders', async () => {
		const { content, images } = await setup();
		await rm(images, { recursive: true });
		await symlink(resolve('tests/fixtures/images'), images);
		await expect(loadReviews(content)).rejects.toThrow('Otillåten');
		await rm(images);
		await mkdir(join(content, 'drafts'));
		await expect(loadReviews(content)).rejects.toThrow('Otillåten');
	});
	it('rejects missing and spoofed images', async () => {
		const { content, images } = await setup();
		await writeFile(join(images, 'test-bar.png'), 'not an image');
		await expect(loadReviews(content, images)).rejects.toThrow('filtypen');
		await rm(join(images, 'test-bar.png'));
		await expect(loadReviews(content, images)).rejects.toThrow();
	});
	it('rejects unreferenced images and linked content', async () => {
		const { content, images } = await setup();
		await writeFile(join(images, 'private.png'), 'private');
		await expect(loadReviews(content, images)).rejects.toThrow('Orefererad');
		await rm(join(images, 'private.png'));
		await symlink(join(content, 'testbaren.json'), join(content, 'linked.json'));
		await expect(loadReviews(content, images)).rejects.toThrow('Otillåten');
	});
	it('rejects linked images', async () => {
		const { content, images } = await setup();
		await rm(join(images, 'test-bar.png'));
		await symlink(resolve('tests/fixtures/images/test-bar.png'), join(images, 'test-bar.png'));
		await expect(loadReviews(content, images)).rejects.toThrow('Ogiltig bild');
	});
	it('rejects duplicate slugs regardless of casing', async () => {
		const { content, images } = await setup();
		await writeFile(
			join(content, 'Testbaren.json'),
			JSON.stringify({ ...fixture, slug: 'Testbaren' })
		);
		await expect(loadReviews(content, images)).rejects.toThrow('Duplicerad');
	});
	it('checks the supported raster signatures', () => {
		expect(imageSignatureMatches(new Uint8Array([255, 216, 255]), 'a.jpg')).toBe(true);
		expect(imageSignatureMatches(Buffer.from('RIFF0000WEBP'), 'a.webp')).toBe(true);
		expect(imageSignatureMatches(Buffer.from('<svg>'), 'a.png')).toBe(false);
	});
});
