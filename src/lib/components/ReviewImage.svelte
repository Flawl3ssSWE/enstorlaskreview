<script lang="ts">
	import { reviewImageVariants } from '$lib/utils/review-images';

	interface Props {
		src: string;
		alt: string;
		focusX?: number;
		focusY?: number;
		zoom?: number;
		square?: boolean;
		priority?: boolean;
		sizes?: string;
	}
	let {
		src,
		alt,
		focusX = 50,
		focusY = 50,
		zoom = 1,
		square = false,
		priority = true,
		sizes = '(min-width: 768px) 560px, 100vw'
	}: Props = $props();
	const variants = $derived(reviewImageVariants(src));
	const crop = $derived(
		`object-position: ${focusX}% ${focusY}%; transform: scale(${zoom}); transform-origin: ${focusX}% ${focusY}%`
	);
</script>

<div class="relative overflow-hidden {square ? 'aspect-square' : 'aspect-[16/9]'}">
	{#if variants}
		<img
			class="absolute inset-0 h-full w-full object-cover"
			src={variants.preview}
			alt=""
			aria-hidden="true"
			loading={priority ? 'eager' : 'lazy'}
			style={crop}
		/>
	{/if}
	<img
		class="relative h-full w-full object-cover {square ? 'aspect-square' : 'aspect-[16/9]'}"
		{src}
		srcset={variants?.srcset}
		{sizes}
		{alt}
		loading={priority ? 'eager' : 'lazy'}
		fetchpriority={priority ? 'high' : 'auto'}
		decoding="async"
		style={crop}
	/>
</div>
