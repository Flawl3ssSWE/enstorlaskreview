/** Safari may return PNG when WebP is requested. Load our local encoder only when needed. */
export async function encodeReviewWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	try {
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/webp', quality)
		);
		if (blob?.type === 'image/webp') return blob;
	} catch {
		// Native encoding can also throw; the fallback works from the same resized pixels.
	}
	try {
		const { encodeCanvasWebp } = await import('./webp-encoder');
		return await encodeCanvasWebp(canvas, quality);
	} catch {
		throw new Error(
			'Bilden kunde inte komprimeras till WebP. Välj en annan bild eller försök igen.'
		);
	}
}
