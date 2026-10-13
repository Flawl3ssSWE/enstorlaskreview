import encode, { init } from '@jsquash/webp/encode.js';
import wasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simdWasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';

// Explicit Vite asset URLs keep both encoder variants local and respect the deployment base path.
let ready: ReturnType<typeof init> | undefined;

export async function encodeCanvasWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	ready ??= init({
		locateFile: (name: string) => (name === 'webp_enc_simd.wasm' ? simdWasmUrl : wasmUrl)
	}).catch((error) => {
		ready = undefined;
		throw error;
	});
	await ready;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Bilden kunde inte behandlas.');
	const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
	const bytes = await encode(pixels, { quality: quality * 100, low_memory: 1 });
	return new Blob([bytes], { type: 'image/webp' });
}
