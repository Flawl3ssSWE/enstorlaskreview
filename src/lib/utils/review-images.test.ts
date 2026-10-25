import { expect, it, vi } from 'vitest';
vi.mock('$app/paths', () => ({ base: '/enstorlaskreview' }));
import { reviewImageVariants } from './review-images';

it('uses the configured repository path for every generated variant', () => {
	expect(reviewImageVariants('/enstorlaskreview/images/test-bar.png')).toEqual({
		preview: '/enstorlaskreview/image-variants/test-bar.png/preview.webp',
		srcset:
			'/enstorlaskreview/image-variants/test-bar.png/480.webp 480w, /enstorlaskreview/image-variants/test-bar.png/960.webp 960w'
	});
});

it.each([
	'blob:local-editor-preview',
	'/enstorlaskreview/images/../private.png',
	'https://example.com/photo.webp',
	'/images/test-bar.png',
	'/enstorlaskreview/images/a.png?private=true'
])('does not create variant URLs for %s', (src) => {
	expect(reviewImageVariants(src)).toBeUndefined();
});
