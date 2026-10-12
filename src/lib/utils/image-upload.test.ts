import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeReviewImage } from './image-upload';

const { heicTo } = vi.hoisted(() => ({ heicTo: vi.fn() }));
vi.mock('heic-to/csp', () => ({ heicTo }));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetAllMocks();
});

describe('review image decoding', () => {
	it('prefers native decoding and preserves orientation without using the HEIC decoder', async () => {
		const bitmap = {} as ImageBitmap;
		const native = vi.fn().mockResolvedValue(bitmap);
		vi.stubGlobal('createImageBitmap', native);
		const file = new File(['image'], 'photo.HEIC');
		expect(await decodeReviewImage(file)).toBe(bitmap);
		expect(native).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' });
		expect(heicTo).not.toHaveBeenCalled();
	});

	it.each(['photo.HEIC', 'photo.heif'])(
		'falls back for %s without relying on MIME type',
		async (name) => {
			vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
			const bitmap = {} as ImageBitmap;
			heicTo.mockResolvedValue(bitmap);
			const file = new File(['image'], name);
			expect(await decodeReviewImage(file)).toBe(bitmap);
			expect(heicTo).toHaveBeenCalledWith({
				blob: file,
				type: 'bitmap',
				options: { imageOrientation: 'from-image' }
			});
		}
	);

	it('reports invalid HEIC in Swedish', async () => {
		vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
		heicTo.mockRejectedValue('decoder details');
		await expect(decodeReviewImage(new File(['invalid'], 'photo.heic'))).rejects.toThrow(
			'HEIC-/HEIF-bilden kunde inte läsas. Välj en annan bild.'
		);
	});

	it('does not use the HEIC decoder for an invalid PNG', async () => {
		vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('invalid')));
		await expect(decodeReviewImage(new File(['invalid'], 'photo.png'))).rejects.toThrow(
			'Bilden kunde inte läsas.'
		);
		expect(heicTo).not.toHaveBeenCalled();
	});

	it.each([
		new File(['invalid'], 'image.svg'),
		new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.heic')
	])('rejects unsupported or oversized files before decoding', async (file) => {
		const native = vi.fn();
		vi.stubGlobal('createImageBitmap', native);
		await expect(decodeReviewImage(file)).rejects.toThrow('på högst 10 MiB');
		expect(native).not.toHaveBeenCalled();
		expect(heicTo).not.toHaveBeenCalled();
	});
});
