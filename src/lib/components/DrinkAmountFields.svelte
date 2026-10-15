<script lang="ts">
	import { untrack } from 'svelte';
	import { parsePriceInput, isValidBeerPriceKr } from '$lib/utils/price';
	import { DRINK_VOLUMES_ML } from '$lib/review-metadata';
	import { formatDrinkVolume } from '$lib/utils/drink-facts';
	let {
		volumeMl = $bindable(),
		beerPriceKr = $bindable(),
		prefix,
		required = false,
		children
	}: {
		volumeMl?: number;
		beerPriceKr?: number;
		prefix: string;
		required?: boolean;
		children?: import('svelte').Snippet;
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
	let volumeElement: HTMLSelectElement;
	$effect(() => {
		volumeElement?.setCustomValidity(required && !selectedVolume ? 'Välj en volym.' : '');
	});
	let priceElement: HTMLInputElement;
	$effect(() => {
		priceElement?.setCustomValidity(
			(required && beerPriceKr === undefined) ||
				(beerPriceKr !== undefined && !isValidBeerPriceKr(beerPriceKr))
				? 'Ange ett pris mellan 1 och 999 kr med högst en decimal.'
				: ''
		);
	});
	const inputClass = 'field mt-2';
</script>

<div class="grid gap-5 sm:grid-cols-2">
	<div>
		<label for={`${prefix}-volume`}
			>Volym{required ? '' : ' (valfritt)'}
			<select
				id={`${prefix}-volume`}
				bind:this={volumeElement}
				{required}
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
	{#if children}<div class="space-y-3">{@render children()}</div>{/if}
	<label for={`${prefix}-price`}
		>Pris i kronor{required ? '' : ' (valfritt)'}<input
			id={`${prefix}-price`}
			bind:this={priceElement}
			{required}
			type="text"
			inputmode="decimal"
			value={priceInput}
			oninput={updatePrice}
			placeholder="12,5"
			class={inputClass}
		/></label
	>
</div>
