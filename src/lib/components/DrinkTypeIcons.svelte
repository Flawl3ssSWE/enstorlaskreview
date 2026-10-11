<script lang="ts">
	import Zap from '@lucide/svelte/icons/zap';
	import Droplets from '@lucide/svelte/icons/droplets';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import SugarCube from '$lib/components/svgs/SugarCube.svelte';
	import HelpTip from '$lib/components/HelpTip.svelte';
	import type { DrinkFacts } from '$lib/types/bar-review';
	import { drinkTypeLabels } from '$lib/utils/drink-facts';

	let {
		drink,
		interactive = false,
		compact = false
	}: {
		drink: DrinkFacts;
		interactive?: boolean;
		compact?: boolean;
	} = $props();
	const size = $derived(compact ? 16 : 22);
	const labels = $derived(drinkTypeLabels(drink));
	const explanations: Record<string, string> = {
		Energidryck: 'Klassad som energidryck. Koffeinhalten visas bara när den är angiven.',
		Elektrolytdryck: 'Klassad som elektrolytdryck.',
		Proteindryck: 'Klassad som proteindryck.',
		Sockerfri: 'Klassad som sockerfri.',
		Sockrad: 'Klassad som sockrad.'
	};
</script>

{#snippet symbol(label: string)}
	{#if label === 'Energidryck'}
		<Zap {size} strokeWidth={1.75} class="text-energy" aria-hidden="true" />
	{:else if label === 'Elektrolytdryck'}
		<Droplets {size} strokeWidth={1.75} class="text-electrolyte" aria-hidden="true" />
	{:else if label === 'Proteindryck'}
		<Dumbbell {size} strokeWidth={1.75} class="text-protein" aria-hidden="true" />
	{:else}
		<span class={label === 'Sockerfri' ? 'text-sugarfree' : 'text-sugared'}>
			<SugarCube {size} crossed={label === 'Sockerfri'} />
		</span>
	{/if}
{/snippet}

<span
	class="inline-flex flex-wrap items-center {compact ? 'gap-1' : 'gap-2'}"
	aria-label="Dryckstyp"
>
	{#each labels as label (label)}
		{#if interactive}
			<HelpTip {label} text={explanations[label]}>{@render symbol(label)}</HelpTip>
		{:else}
			<span
				class="inline-flex items-center justify-center {compact ? 'size-5' : 'size-7'}"
				role="img"
				aria-label={label}
				title={label}
			>
				{@render symbol(label)}
			</span>
		{/if}
	{/each}
</span>
