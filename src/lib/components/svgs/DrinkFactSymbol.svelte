<script module lang="ts">
	export type DrinkFactSymbolKind =
		| 'measure'
		| 'can'
		| 'bottle'
		| 'tap'
		| 'mug'
		| 'straw'
		| 'ice'
		| 'no-ice';
</script>

<script lang="ts">
	let { kind, size = 16 }: { kind: DrinkFactSymbolKind; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.65"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	data-symbol={kind}
>
	{#if kind === 'measure'}
		<path d="M3 5h13v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" />
		<path d="M16 8h2.5a2.5 2.5 0 0 1 0 5H16" />
		<path d="M8 9h3m-3 4h2m-2 3h3" />
		<path
			d="M12.5 12H16v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5h1.5Z"
			fill="currentColor"
			fill-opacity=".13"
			stroke="none"
		/>
	{:else if kind === 'can'}
		<path d="M8 3h8l1.5 3v12l-1.5 3H8l-1.5-3V6Z" fill="currentColor" fill-opacity=".13" />
		<path d="M6.5 6h11m-11 12h11m-6-15h2.5m-4 13 4.5-6" />
	{:else if kind === 'bottle'}
		<path
			d="M10 3h4v5l2 3a4 4 0 0 1 1 3v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-5a4 4 0 0 1 1-3l2-3Z"
			fill="currentColor"
			fill-opacity=".13"
		/>
		<path d="M10 6h4m-7 8h10m-10 4h10" />
	{:else if kind === 'tap'}
		<path d="M5 20h14m-11 0V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2h-4V9h-2" />
		<path d="M11 5V3m5 10v1m0 2v1" />
	{:else if kind === 'mug'}
		<path d="M4 6h12v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z" fill="currentColor" fill-opacity=".13" />
		<path d="M16 8h2a2.5 2.5 0 0 1 0 5h-2" />
	{:else if kind === 'straw'}
		<path d="M5 20 12 7l6-4 1.5 2.5L14 9l-6.5 12.5Z" fill="currentColor" fill-opacity=".13" />
		<path d="m12 7 2 2m-3.5.5 2.3 1.4" />
	{:else}
		<path d="m12 3 7 4v10l-7 4-7-4V7Z" fill="currentColor" fill-opacity=".13" />
		<path d="m5 7 7 4 7-4m-7 4v10m3-12 1.5-1" />
		{#if kind === 'no-ice'}<path d="M3 3 21 21" stroke-width="2" />{/if}
	{/if}
</svg>
