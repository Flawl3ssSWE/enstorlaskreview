<script lang="ts">
	import AutomaticField from './AutomaticField.svelte';
	import { DRINK_CONTAINERS } from '$lib/review-metadata';
	import type { DrinkContainer } from '$lib/types/bar-review';
	let {
		value = $bindable(),
		customValue = $bindable(),
		id,
		required = false,
		suggested = false,
		onchange
	}: {
		value?: DrinkContainer;
		customValue?: string;
		id: string;
		required?: boolean;
		suggested?: boolean;
		onchange?: (value: DrinkContainer | undefined) => void;
	} = $props();
	let selectElement: HTMLSelectElement;
	$effect(() => {
		selectElement?.setCustomValidity(required && !value ? 'Välj en förpackning.' : '');
	});
	const inputClass =
		'mt-2 w-full rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-ink focus:outline-accent';
</script>

<AutomaticField
	active={suggested}
	field="Förpackning"
	message="Förpackningen har valts automatiskt utifrån volymen. Du kan ändra den själv."
>
	<label class="block" for={id}
		>Förpackning{required ? '' : ' (valfritt)'}
		<select
			{id}
			bind:this={selectElement}
			{required}
			bind:value
			onchange={() => {
				if (value !== 'Annan') customValue = undefined;
				onchange?.(value);
			}}
			data-automatic={suggested}
			aria-describedby={suggested ? `${id}-automatic-help` : undefined}
			class={inputClass}
		>
			<option value="">Ej angiven</option>
			{#each DRINK_CONTAINERS as container}
				<option value={container}>{container}</option>
			{/each}
		</select>
	</label>
</AutomaticField>
<span id={`${id}-automatic-help`} class="sr-only"
	>Automatiskt förslag från volymen. Du kan ändra förpackningen.</span
>
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
