<script lang="ts">
	import type { DrinkFacts } from '$lib/types/bar-review';
	import { drinkTypeLabels } from '$lib/utils/drink-facts';
	let { drink, separated = true }: { drink: DrinkFacts; separated?: boolean } = $props();
	const labels = $derived(drinkTypeLabels(drink));
</script>

{#each labels as label, index}
	{#if separated && index > 0}{' · '}{/if}<span
		class:text-energy={label === 'Energidryck'}
		class:text-electrolyte={label === 'Elektrolytdryck'}
		class:text-protein={label === 'Proteindryck'}
		class:text-sugarfree={label === 'Sockerfri'}
		class:text-sugared={label === 'Sockrad'}>{label}</span
	>
{/each}
