<script lang="ts">
	let { crossed = false, size = 22 }: { crossed?: boolean; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
	<path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
	{#if crossed}<path d="M3 3 21 21" stroke-width="2.5" />{/if}
</svg>
