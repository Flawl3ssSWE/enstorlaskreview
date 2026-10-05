<script lang="ts">
	import { DRINK_CONTAINERS } from '$lib/review-metadata';
	import type { DrinkContainer } from '$lib/types/bar-review';
	let {
		value = $bindable(),
		customValue = $bindable(),
		id
	}: {
		value?: DrinkContainer;
		customValue?: string;
		id: string;
	} = $props();
	const inputClass =
		'mt-2 w-full rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-ink focus:outline-accent';
</script>

<label class="block" for={id}
	>Förpackning (valfritt)
	<select
		{id}
		bind:value
		onchange={() => {
			if (value !== 'Annan') customValue = undefined;
		}}
		class={inputClass}
	>
		<option value={undefined}>Ej angiven</option>
		{#each DRINK_CONTAINERS as container}
			<option value={container}>{container}</option>
		{/each}
	</select>
</label>
{#if value === 'Annan'}
	<label class="block" for={`${id}-custom`}
		>Egen förpackning
		<input
			id={`${id}-custom`}
			bind:value={customValue}
			required
			maxlength="80"
			placeholder="Till exempel Pappmugg"
			class={inputClass}
		/>
	</label>
{/if}
