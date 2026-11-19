<script lang="ts">
	import Coins from '@lucide/svelte/icons/coins';
	import GlassWater from '@lucide/svelte/icons/glass-water';
	import HandPlatter from '@lucide/svelte/icons/hand-platter';
	import Package from '@lucide/svelte/icons/package';
	import Snowflake from '@lucide/svelte/icons/snowflake';
	import Thermometer from '@lucide/svelte/icons/thermometer';
	import Zap from '@lucide/svelte/icons/zap';
	import Wheat from '@lucide/svelte/icons/wheat';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import HelpTip from '$lib/components/HelpTip.svelte';
	import DrinkFactSymbol, {
		type DrinkFactSymbolKind
	} from '$lib/components/svgs/DrinkFactSymbol.svelte';
	import type { DrinkContainer, DrinkFacts } from '$lib/types/bar-review';
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
	const containerSymbols: Record<DrinkContainer, DrinkFactSymbolKind | undefined> = {
		Burk: 'can',
		Flaska: 'bottle',
		Glasflaska: 'bottle',
		'SodaStream smak': 'bottle',
		Sprutmaskin: 'tap',
		Annan: undefined
	};
	type FactGlyph = DrinkFactSymbolKind | typeof Package;
	const packagingIcon = $derived(
		drink.container ? (containerSymbols[drink.container] ?? Package) : Package
	);
	const servingIcons = $derived({
		Originalförpackning: packagingIcon,
		Glas: GlassWater,
		Sugrör: 'straw' as const,
		Mugg: 'mug' as const
	});
	const servingTips = {
		Originalförpackning: 'Läsken dracks direkt ur originalförpackningen.',
		Glas: 'Läsken serverades i ett glas.',
		Sugrör: 'Läsken dracks med sugrör.',
		Mugg: 'Läsken serverades i en mugg.'
	};
	const facts = $derived([
		...(volume !== undefined
			? [
					{
						label: 'Volym',
						tip: 'Mängden läsk i den provade förpackningen eller serveringen.',
						value: formatDrinkVolume(volume),
						icon: 'measure' as const,
						color: 'text-protein',
						featured: true
					}
				]
			: []),
		...(lpk !== undefined
			? [
					{
						label: 'LPK (läsk per krona)',
						tip: 'Så många centiliter läsk du får per krona.',
						value: `${formatDrinkNumber(lpk)} cl/kr`,
						icon: Coins,
						color: 'text-energy',
						featured: true
					}
				]
			: []),
		...(drink.container
			? [
					{
						label: 'Förpackning',
						tip: 'Så var läsken förpackad när den köptes.',
						value: formatDrinkContainer(drink),
						icon: packagingIcon,
						color: 'text-accent',
						featured: false
					}
				]
			: []),
		...(drink.servingMethods?.length
			? [
					{
						label: 'Serveringsmetod',
						tip: 'Visar vad läsken dracks ur och om sugrör användes.',
						value: drink.servingMethods,
						icon: HandPlatter,
						color: 'text-accent',
						featured: false
					}
				]
			: []),
		...(drink.servingTemperature
			? [
					{
						label: 'Serveringstemperatur',
						tip: `Läsken provades ${drink.servingTemperature.toLocaleLowerCase('sv-SE')}.`,
						value: drink.servingTemperature,
						icon: drink.servingTemperature === 'Kylskåpskall' ? Snowflake : Thermometer,
						color:
							drink.servingTemperature === 'Kylskåpskall'
								? 'text-protein'
								: drink.servingTemperature === 'Varm'
									? 'text-energy'
									: 'text-accent',
						featured: false
					}
				]
			: []),
		...(drink.servedWithIce !== undefined
			? [
					{
						label: 'Servering',
						tip: drink.servedWithIce ? 'Läsken serverades med is.' : 'Läsken serverades utan is.',
						value: drink.servedWithIce ? 'Med is' : 'Utan is',
						icon: drink.servedWithIce ? ('ice' as const) : ('no-ice' as const),
						color: drink.servedWithIce ? 'text-protein' : 'text-muted',
						featured: false
					}
				]
			: [])
	]);
	const nutrientDetails = {
		Koffein: { icon: Zap, color: 'text-energy', tip: 'Mängden koffein i läsken.' },
		KPL: { icon: Wheat, color: 'text-sugared', tip: 'Mängden kolhydrater i läsken.' },
		PPL: { icon: Dumbbell, color: 'text-protein', tip: 'Mängden protein i läsken.' }
	} as const;
</script>

{#snippet factGlyph(Icon: FactGlyph)}
	{#if typeof Icon === 'string'}
		<DrinkFactSymbol kind={Icon} size={16} />
	{:else}
		<Icon size={16} aria-hidden="true" />
	{/if}
{/snippet}

{#snippet factBadge(color: string, icon: FactGlyph, label: string, tip: string)}
	<span class="inline-flex {color}">
		<HelpTip {label} text={tip} appearance="badge">
			{@render factGlyph(icon)}
		</HelpTip>
	</span>
{/snippet}

<dl class="divide-y divide-line/70">
	{#each facts as fact (fact.label)}
		<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1.5 first:pt-0">
			<dt class="inline-flex min-w-0 items-center gap-1.5 text-xs text-secondary">
				{@render factBadge(fact.color, fact.icon, fact.label, fact.tip)}
				{fact.label}:
			</dt>
			<dd
				class="min-w-0 break-words text-sm font-semibold {fact.featured
					? 'tabular-nums text-accent'
					: 'text-ink'}"
			>
				{#if Array.isArray(fact.value)}
					<ul class="flex flex-wrap gap-1.5">
						{#each fact.value as method (method)}
							<li class="flex">
								{@render factBadge(
									'text-accent',
									servingIcons[method],
									method,
									servingTips[method]
								)}
							</li>
						{/each}
					</ul>
				{:else}
					{fact.value}
				{/if}
			</dd>
		</div>
	{/each}
	{#each nutritionFacts(drink) as fact (fact.short)}
		{@const { icon, color, tip } = nutrientDetails[fact.short]}
		<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1.5 first:pt-0 last:pb-0">
			<dt class="inline-flex min-w-0 items-center gap-1.5 text-xs text-secondary">
				{@render factBadge(color, icon, fact.label, tip)}
				{fact.label}:
			</dt>
			<dd class="text-sm tabular-nums text-ink">
				{#if fact.per100Ml !== undefined}<span class="font-semibold"
						>{formatDrinkNumber(fact.per100Ml)} {fact.unit}/100 ml</span
					>{/if}{#if fact.perContainer !== undefined}
					{@const total = `${formatDrinkNumber(fact.perContainer)} ${fact.unit}`}
					<span class="text-xs text-secondary">
						{fact.per100Ml !== undefined ? ` (${total} totalt)` : `${total} i hela förpackningen`}
					</span>
				{/if}
			</dd>
		</div>
	{/each}
</dl>
