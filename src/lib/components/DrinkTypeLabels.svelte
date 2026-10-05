<script lang="ts">
	import type { DrinkFacts } from '$lib/types/bar-review';
	import { drinkTypeLabels } from '$lib/utils/drink-facts';
	let { drink, separated = true }: { drink: DrinkFacts; separated?: boolean } = $props();
	const labels = $derived(drinkTypeLabels(drink));
</script>

{#each labels as label, index}
	{#if separated && index > 0}{' · '}{/if}<span
		class:text-amber-300={label === 'Energidryck'}
		class:text-violet-300={label === 'Elektrolytdryck'}
		class:text-sky-300={label === 'Proteindryck'}
		class:text-emerald-300={label === 'Sockerfri'}
		class:text-fuchsia-300={label === 'Sockrad'}>{label}</span
	>
{/each}
