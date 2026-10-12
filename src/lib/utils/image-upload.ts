/** Prefer native decoding; load the CSP-compatible HEIC fallback only when needed. */
export async function decodeReviewImage(file: File): Promise<ImageBitmap> {
	if (file.size > 10 * 1024 * 1024 || !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
		throw new Error('Välj en JPEG-, PNG-, WebP-, HEIC- eller HEIF-bild på högst 10 MiB.');
	try {
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		if (/\.(heic|heif)$/i.test(file.name)) {
			try {
				const { heicTo } = await import('heic-to/csp');
				return await heicTo({
					blob: file,
					type: 'bitmap',
					options: { imageOrientation: 'from-image' }
				});
			} catch {
				throw new Error('HEIC-/HEIF-bilden kunde inte läsas. Välj en annan bild.');
			}
		}
		throw new Error('Bilden kunde inte läsas. Välj en giltig JPEG-, PNG- eller WebP-bild.');
	}
}
