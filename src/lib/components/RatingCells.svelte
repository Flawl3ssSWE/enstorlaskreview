<script lang="ts">
	let { value }: { value: number } = $props();
</script>

<div class="grid grid-cols-5 gap-1.5" aria-hidden="true">
	{#each Array.from({ length: 5 }) as _, index (index)}
		<div class="h-2 overflow-hidden rounded-sm bg-line">
			<div
				class="h-full bg-accent"
				style:width={`${Math.max(0, Math.min(1, value - index)) * 100}%`}
			></div>
		</div>
	{/each}
</div>
