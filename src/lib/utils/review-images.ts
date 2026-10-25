import { base } from '$app/paths';

/** Only published images have build-generated variants; editor blob URLs keep working. */
export function reviewImageVariants(src: string): { preview: string; srcset: string } | undefined {
	const prefix = `${base}/images/`;
	if (!src.startsWith(prefix)) return;
	const filename = src.slice(prefix.length);
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:jpg|jpeg|png|webp)$/.test(filename)) return;
	const path = `${base}/image-variants/${filename}`;
	return {
		preview: `${path}/preview.webp`,
		srcset: `${path}/480.webp 480w, ${path}/960.webp 960w`
	};
}
