<script lang="ts">
	let {
		rating,
		label = 'Helhetsbetyg',
		large = false,
		words = false
	}: { rating: number; label?: string; large?: boolean; words?: boolean } = $props();
	const fill = $derived(Math.max(0, Math.min(3, rating)) / 3);
</script>

<span
	class="inline-flex shrink-0 items-center gap-1.5 tabular-nums"
	role="img"
	aria-label={`${label} ${rating} av 3`}
>
	<svg viewBox="0 0 48 64" class={large ? 'h-16 w-12' : 'h-10 w-7'} fill="none" aria-hidden="true">
		<path
			d="M27 17 32 3h6l-5 14"
			fill="var(--color-surface-raised)"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
		<path d="m31 8 6 2m-8 3 6 2" stroke="var(--color-accent)" stroke-width="3" />
		<path d="m10 20 5 36h18l5-36Z" fill="var(--color-surface-raised)" />
		<polygon
			points={`${15 - 5 * fill},${56 - 36 * fill} ${33 + 5 * fill},${56 - 36 * fill} 33,56 15,56`}
			fill="var(--color-accent)"
		/>
		<path
			d="m10 20 5 36h18l5-36M8 17h32v5H8Z"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
	</svg>
	<span aria-hidden="true" class="font-semibold whitespace-nowrap"
		>{rating}{words ? ' av 3' : '/3'}</span
	>
</span>
