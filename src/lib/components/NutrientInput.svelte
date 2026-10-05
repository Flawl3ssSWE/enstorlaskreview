<script lang="ts">
	import { nutrientAmounts, formatDrinkNumber } from '$lib/utils/drink-facts';
	let {
		label,
		unit,
		prefix,
		required = false,
		volumeMl,
		per100Ml = $bindable(),
		perContainer = $bindable()
	}: {
		label: string;
		unit: string;
		prefix: string;
		required?: boolean;
		volumeMl?: number;
		per100Ml?: number;
		perContainer?: number;
	} = $props();
	let basis = $state('100ml');
	$effect(() => {
		if (perContainer !== undefined) basis = 'container';
		else if (per100Ml !== undefined) basis = '100ml';
	});
	const amount = $derived(nutrientAmounts(per100Ml, perContainer, volumeMl));
	const inputClass =
		'mt-2 w-full rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-ink focus:outline-accent';
	function changeBasis(event: Event) {
		const next = (event.currentTarget as HTMLSelectElement).value;
		const value = next === '100ml' ? amount.per100Ml : amount.perContainer;
		per100Ml = next === '100ml' ? value : undefined;
		perContainer = next === 'container' ? value : undefined;
		basis = next;
	}
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<label for={prefix}>
		{label} i {unit}/{basis === '100ml' ? '100 ml' : 'hela förpackningen'}
		<input
			id={prefix}
			type="number"
			min="0"
			step="any"
			{required}
			value={basis === '100ml' ? (per100Ml ?? '') : (perContainer ?? '')}
			oninput={(event) => {
				const value =
					event.currentTarget.value === '' ? undefined : event.currentTarget.valueAsNumber;
				if (basis === '100ml') per100Ml = value;
				else perContainer = value;
			}}
			class={inputClass}
		/>
	</label>
	<label for={`${prefix}-basis`}
		>Ange {label.toLowerCase()} per
		<select id={`${prefix}-basis`} value={basis} onchange={changeBasis} class={inputClass}>
			<option value="100ml">100 ml</option>
			<option value="container">Hela förpackningen (burk/flaska/glas)</option>
		</select>
	</label>
</div>
{#if amount.perContainer !== undefined && amount.per100Ml !== undefined}
	<p class="text-xs text-muted">
		{formatDrinkNumber(amount.per100Ml)}
		{unit}/100 ml · {formatDrinkNumber(amount.perContainer)}
		{unit} i hela förpackningen
	</p>
{:else}
	<p class="text-xs text-muted">
		Välj volym för att räkna om mellan 100 ml och hela förpackningen. Utan volym töms värdet när du
		byter enhet.
	</p>
{/if}
