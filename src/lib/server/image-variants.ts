import sharp from 'sharp';

export const REVIEW_IMAGE_VARIANTS = ['preview.webp', '480.webp', '960.webp'] as const;

/** Preserve the entire frame: crop and zoom are shared with the original in the browser. */
export async function createImageVariant(bytes: Uint8Array, width: number): Promise<Uint8Array> {
	return sharp(bytes, { limitInputPixels: 40_000_000 })
		.rotate()
		.resize({ width, withoutEnlargement: true })
		.webp({ quality: width <= 32 ? 40 : 78 })
		.toBuffer();
}
