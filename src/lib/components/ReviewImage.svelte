<script lang="ts">
	interface Props {
		src: string;
		alt: string;
		focusX?: number;
		focusY?: number;
		zoom?: number;
	}
	let { src, alt, focusX = 50, focusY = 50, zoom = 1 }: Props = $props();
</script>

<div class="aspect-[16/9] overflow-hidden">
	<img
		class="aspect-[16/9] w-full object-cover"
		{src}
		{alt}
		style={`object-position: ${focusX}% ${focusY}%; transform: scale(${zoom}); transform-origin: ${focusX}% ${focusY}%`}
	/>
</div>
