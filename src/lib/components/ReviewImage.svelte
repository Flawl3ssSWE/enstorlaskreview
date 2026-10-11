<script lang="ts">
	interface Props {
		src: string;
		alt: string;
		focusX?: number;
		focusY?: number;
		zoom?: number;
		square?: boolean;
	}
	let { src, alt, focusX = 50, focusY = 50, zoom = 1, square = false }: Props = $props();
</script>

<div class="overflow-hidden {square ? 'aspect-square' : 'aspect-[16/9]'}">
	<img
		class="h-full w-full object-cover {square ? 'aspect-square' : 'aspect-[16/9]'}"
		{src}
		{alt}
		style={`object-position: ${focusX}% ${focusY}%; transform: scale(${zoom}); transform-origin: ${focusX}% ${focusY}%`}
	/>
</div>
