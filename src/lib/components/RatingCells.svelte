<script lang="ts">
	let {
		value,
		compact = false,
		muted = false
	}: { value: number; compact?: boolean; muted?: boolean } = $props();
</script>

<div class="grid grid-cols-5 {compact ? 'gap-1' : 'gap-1.5'}" aria-hidden="true">
	{#each Array.from({ length: 5 }) as _, index (index)}
		<div class="overflow-hidden bg-line {compact ? 'h-1.5 rounded-full' : 'h-2 rounded-sm'}">
			<div
				class="h-full {muted ? 'bg-secondary' : 'bg-accent'}"
				style:width={`${Math.max(0, Math.min(1, value - index)) * 100}%`}
			></div>
		</div>
	{/each}
</div>
