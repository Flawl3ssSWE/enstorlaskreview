<script lang="ts">
	import DrinkTypeLabels from '$lib/components/DrinkTypeLabels.svelte';
	import type { DrinkFacts } from '$lib/types/bar-review';
	import {
		drinkVolumeMl,
		laskPerKrona,
		formatDrinkNumber,
		formatDrinkVolume,
		nutritionFacts,
		drinkTypeLabels
	} from '$lib/utils/drink-facts';
	let { drink }: { drink: DrinkFacts } = $props();
	const lpk = $derived(laskPerKrona(drink));
	const volume = $derived(drinkVolumeMl(drink));
</script>

{#if drink.servingMethods?.length}
	<p class="text-sm text-secondary">Serveringsmetod: {drink.servingMethods.join(' · ')}</p>
{/if}
{#if drink.servingTemperature}
	<p class="text-sm text-secondary">Serveringstemperatur: {drink.servingTemperature}</p>
{/if}
{#if drink.servedWithIce !== undefined}
	<p class="text-sm text-secondary">Servering: {drink.servedWithIce ? 'Med is' : 'Utan is'}</p>
{/if}
{#if volume !== undefined}
	<p class="text-sm text-secondary">Volym: {formatDrinkVolume(volume)}</p>
{/if}
{#if lpk !== undefined}
	<p class="text-sm text-secondary">LPK (läsk per krona): {formatDrinkNumber(lpk)} cl/kr</p>
{/if}

{#if drinkTypeLabels(drink).length}
	<p class="text-sm"><DrinkTypeLabels {drink} /></p>
{/if}
{#each nutritionFacts(drink) as fact}
	<p class="text-sm text-secondary">
		{fact.label}: {#if fact.per100Ml !== undefined}{formatDrinkNumber(fact.per100Ml)}
			{fact.unit}/100 ml{/if}{#if fact.perContainer !== undefined}{fact.per100Ml !== undefined
				? ' · '
				: ''}{formatDrinkNumber(fact.perContainer)}
			{fact.unit} i hela förpackningen{/if}
	</p>
{/each}
