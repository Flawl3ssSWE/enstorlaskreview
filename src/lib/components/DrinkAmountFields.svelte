<script lang="ts">
	import { untrack } from 'svelte';
	import { parsePriceInput } from '$lib/utils/price';
	import { DRINK_VOLUMES_ML } from '$lib/review-metadata';
	import { formatDrinkVolume } from '$lib/utils/drink-facts';
	let {
		volumeMl = $bindable(),
		beerPriceKr = $bindable(),
		prefix
	}: {
		volumeMl?: number;
		beerPriceKr?: number;
		prefix: string;
	} = $props();
	let priceInput = $state('');
	$effect(() => {
		if (!Object.is(beerPriceKr, parsePriceInput(untrack(() => priceInput))))
			priceInput = beerPriceKr === undefined ? '' : String(beerPriceKr).replace('.', ',');
	});
	function updatePrice(event: Event) {
		priceInput = (event.currentTarget as HTMLInputElement).value;
		beerPriceKr = parsePriceInput(priceInput);
	}
	let customVolume = $state(false);
	const selectedVolume = $derived(
		customVolume ||
			(volumeMl !== undefined && !DRINK_VOLUMES_ML.some((value) => value === volumeMl))
			? 'custom'
			: String(volumeMl ?? '')
	);
	function selectVolume(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		customVolume = value === 'custom';
		volumeMl = value === '' || customVolume ? undefined : Number(value);
	}
	const inputClass =
		'mt-2 w-full rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-ink focus:outline-accent';
</script>

<div class="grid gap-5 sm:grid-cols-2">
	<div>
		<label for={`${prefix}-volume`}
			>Volym (valfritt)
			<select
				id={`${prefix}-volume`}
				value={selectedVolume}
				onchange={selectVolume}
				class={inputClass}
			>
				<option value="">Ej angiven</option>
				{#each DRINK_VOLUMES_ML as volume}<option value={String(volume)}
						>{formatDrinkVolume(volume)}</option
					>{/each}
				<option value="custom">Annan volym</option>
			</select>
		</label>
		{#if selectedVolume === 'custom'}
			<label class="mt-3 block" for={`${prefix}-volume-custom`}
				>Egen volym i ml
				<input
					id={`${prefix}-volume-custom`}
					type="number"
					min="0.01"
					step="any"
					required
					bind:value={volumeMl}
					oninput={() => (customVolume = true)}
					class={inputClass}
				/>
			</label>
		{/if}
	</div>
	<label for={`${prefix}-price`}
		>Pris i kronor (valfritt)<input
			id={`${prefix}-price`}
			type="text"
			inputmode="decimal"
			value={priceInput}
			oninput={updatePrice}
			aria-describedby={`${prefix}-price-help`}
			class={inputClass}
		/></label
	>
</div>
<p id={`${prefix}-price-help`} class="text-sm text-muted">
	Ange 1–999 kr med högst en decimal, till exempel 12,5 eller 12.5.
</p>
<p class="text-sm text-muted">
	LPK är volym delat med pris, i cl/kr. Välj förpackning och volym separat. Ange priset du betalade
	för den valda volymen. Ange volymen för färdig dryck vid SodaStream eller sprutmaskin.
</p>
