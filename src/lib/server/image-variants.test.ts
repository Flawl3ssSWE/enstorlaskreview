import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { createImageVariant } from './image-variants';

describe('build-generated image variants', () => {
	it.each(['png', 'jpeg', 'webp'] as const)(
		'converts %s images to small WebP without changing their frame',
		async (format) => {
			const source = await sharp({
				create: { width: 120, height: 80, channels: 3, background: '#e04536' }
			})
				.toFormat(format)
				.toBuffer();
			const preview = await createImageVariant(source, 32);
			const metadata = await sharp(preview).metadata();
			expect(metadata).toMatchObject({ format: 'webp', width: 32, height: 21 });
			expect(metadata.exif).toBeUndefined();
		}
	);

	it('keeps small images at their original size', async () => {
		const source = await sharp({
			create: { width: 12, height: 8, channels: 4, background: '#e0453680' }
		})
			.png()
			.toBuffer();
		expect(await sharp(await createImageVariant(source, 480)).metadata()).toMatchObject({
			width: 12,
			height: 8,
			hasAlpha: true
		});
	});

	it('rejects invalid image content', async () => {
		await expect(createImageVariant(new Uint8Array([1, 2, 3]), 32)).rejects.toThrow();
	});
});
