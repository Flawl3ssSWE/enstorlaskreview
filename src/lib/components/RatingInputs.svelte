<script lang="ts">
	let {
		metrics,
		values = $bindable(),
		prefix
	}: {
		metrics: readonly { key: string; label: string; description: string }[];
		values: Record<string, number>;
		prefix: string;
	} = $props();
</script>

<div class="grid gap-4 sm:grid-cols-2">
	{#each metrics as metric (metric.key)}
		<div class="rounded-xl border border-line bg-surface-raised p-4">
			<div class="flex justify-between gap-3 font-semibold">
				<label for={`${prefix}-${metric.key}`}>{metric.label}</label>
				<span>{values[metric.key] ?? '–'}/5</span>
			</div>
			<p id={`${prefix}-${metric.key}-help`} class="mt-1 text-sm text-muted">
				{metric.description}
			</p>
			<input
				id={`${prefix}-${metric.key}`}
				aria-describedby={`${prefix}-${metric.key}-help`}
				type="number"
				min="0"
				max="5"
				step="0.5"
				required
				bind:value={values[metric.key]}
				class="mt-3 w-full rounded-lg border border-line bg-surface p-2 focus:outline-accent"
			/>
		</div>
	{/each}
</div>
