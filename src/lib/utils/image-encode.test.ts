import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeReviewWebp } from './image-encode';

const { encodeCanvasWebp } = vi.hoisted(() => ({ encodeCanvasWebp: vi.fn() }));
vi.mock('./webp-encoder', () => ({ encodeCanvasWebp }));

afterEach(() => vi.resetAllMocks());

describe('review WebP encoding', () => {
	it('keeps native WebP without invoking the fallback', async () => {
		const blob = new Blob(['native'], { type: 'image/webp' });
		const toBlob = vi.fn((callback: BlobCallback) => callback(blob));
		const canvas = { toBlob } as unknown as HTMLCanvasElement;
		expect(await encodeReviewWebp(canvas, 0.82)).toBe(blob);
		expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.82);
		expect(encodeCanvasWebp).not.toHaveBeenCalled();
	});

	it.each([new Blob(['png'], { type: 'image/png' }), null])(
		'uses the fallback when native encoding returns %s',
		async (native) => {
			const canvas = { toBlob: (callback: BlobCallback) => callback(native) } as HTMLCanvasElement;
			const blob = new Blob(['fallback'], { type: 'image/webp' });
			encodeCanvasWebp.mockResolvedValue(blob);
			expect(await encodeReviewWebp(canvas, 0.7)).toBe(blob);
			expect(encodeCanvasWebp).toHaveBeenCalledWith(canvas, 0.7);
		}
	);

	it('uses the fallback when native encoding throws', async () => {
		const canvas = {
			toBlob: () => {
				throw new Error('unsupported');
			}
		} as unknown as HTMLCanvasElement;
		const blob = new Blob(['fallback'], { type: 'image/webp' });
		encodeCanvasWebp.mockResolvedValue(blob);
		expect(await encodeReviewWebp(canvas, 0.6)).toBe(blob);
	});

	it('reports fallback failure in Swedish and allows retrying', async () => {
		const canvas = { toBlob: (callback: BlobCallback) => callback(null) } as HTMLCanvasElement;
		encodeCanvasWebp.mockRejectedValueOnce(new Error('encoder details'));
		await expect(encodeReviewWebp(canvas, 0.82)).rejects.toThrow(
			'Bilden kunde inte komprimeras till WebP. Välj en annan bild eller försök igen.'
		);
		const blob = new Blob(['retry'], { type: 'image/webp' });
		encodeCanvasWebp.mockResolvedValue(blob);
		expect(await encodeReviewWebp(canvas, 0.82)).toBe(blob);
	});
});
