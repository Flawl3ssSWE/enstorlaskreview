<script lang="ts">
	import Coins from '@lucide/svelte/icons/coins';
	import GlassWater from '@lucide/svelte/icons/glass-water';
	import Package from '@lucide/svelte/icons/package';
	import Ruler from '@lucide/svelte/icons/ruler';
	import Snowflake from '@lucide/svelte/icons/snowflake';
	import Thermometer from '@lucide/svelte/icons/thermometer';
	import Zap from '@lucide/svelte/icons/zap';
	import Wheat from '@lucide/svelte/icons/wheat';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import type { DrinkFacts } from '$lib/types/bar-review';
	import {
		drinkVolumeMl,
		laskPerKrona,
		formatDrinkNumber,
		formatDrinkVolume,
		formatDrinkContainer,
		nutritionFacts
	} from '$lib/utils/drink-facts';

	let { drink }: { drink: DrinkFacts } = $props();
	const lpk = $derived(laskPerKrona(drink));
	const volume = $derived(drinkVolumeMl(drink));
	const facts = $derived([
		...(volume !== undefined
			? [{ label: 'Volym', value: formatDrinkVolume(volume), icon: Ruler, featured: true }]
			: []),
		...(lpk !== undefined
			? [
					{
						label: 'LPK (läsk per krona)',
						value: `${formatDrinkNumber(lpk)} cl/kr`,
						icon: Coins,
						featured: true
					}
				]
			: []),
		...(drink.container
			? [
					{
						label: 'Förpackning',
						value: formatDrinkContainer(drink),
						icon: Package,
						featured: false
					}
				]
			: []),
		...(drink.servingMethods?.length
			? [
					{
						label: 'Serveringsmetod',
						value: drink.servingMethods.join(' · '),
						icon: GlassWater,
						featured: false
					}
				]
			: []),
		...(drink.servingTemperature
			? [
					{
						label: 'Serveringstemperatur',
						value: drink.servingTemperature,
						icon: Thermometer,
						featured: false
					}
				]
			: []),
		...(drink.servedWithIce !== undefined
			? [
					{
						label: 'Servering',
						value: drink.servedWithIce ? 'Med is' : 'Utan is',
						icon: Snowflake,
						featured: false
					}
				]
			: [])
	]);
</script>

<dl class="divide-y divide-line/70">
	{#each facts as fact (fact.label)}
		<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1.5 first:pt-0">
			<dt class="inline-flex min-w-0 items-center gap-2 text-xs text-secondary">
				<fact.icon size={15} class="shrink-0 self-center text-accent" aria-hidden="true" />
				{fact.label}:
			</dt>
			<dd
				class="break-words text-sm font-semibold {fact.featured
					? 'tabular-nums text-accent'
					: 'text-ink'}"
			>
				{fact.value}
			</dd>
		</div>
	{/each}
	{#each nutritionFacts(drink) as fact (fact.short)}
		{@const Icon = fact.short === 'Koffein' ? Zap : fact.short === 'KPL' ? Wheat : Dumbbell}
		<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1.5 first:pt-0 last:pb-0">
			<dt class="inline-flex min-w-0 items-center gap-2 text-xs text-secondary">
				<Icon size={15} class="shrink-0 self-center text-accent" aria-hidden="true" />
				{fact.label}:
			</dt>
			<dd class="text-sm tabular-nums text-ink">
				{#if fact.per100Ml !== undefined}<span class="font-semibold"
						>{formatDrinkNumber(fact.per100Ml)} {fact.unit}/100 ml</span
					>{/if}{#if fact.perContainer !== undefined}<span class="text-xs text-secondary"
						>{fact.per100Ml !== undefined ? ' · ' : ''}{formatDrinkNumber(fact.perContainer)}
						{fact.unit} i hela förpackningen</span
					>{/if}
			</dd>
		</div>
	{/each}
</dl>
