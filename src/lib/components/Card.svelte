<script lang="ts">
	import { base } from '$app/paths';
	import defaultImage from '$lib/images/image.png';
	import DrinkTypeLabels from '$lib/components/DrinkTypeLabels.svelte';
	import ReviewDescription from '$lib/components/ReviewDescription.svelte';
	import { UNKNOWN_BRAND_LABEL } from '$lib/brand';
	import { formatAuthors } from '$lib/utils/authors';
	import { getBeerPriceDisplay } from '$lib/utils/price';

	import type { DrinkFacts } from '$lib/types/bar-review';
	import { drinkTypeLabels, nutritionFacts, formatDrinkNumber } from '$lib/utils/drink-facts';
	interface Props {
		drink?: DrinkFacts;
		title: string;
		description: string;
		rating: number;
		favorite?: string;
		image?: string;
		imageFocusX?: number;
		imageFocusY?: number;
		imageZoom?: number;
		location: string;
		beerBrand?: string;
		beerPriceKr?: number;
		isHappyHourPrice?: boolean;
		author?: string;
		coAuthors?: string[] | string;
	}

	let {
		drink,
		title,
		description,
		rating,
		favorite,
		image = defaultImage,
		imageFocusX = 50,
		imageFocusY = 50,
		imageZoom = 1,
		location,
		beerBrand,
		beerPriceKr,
		isHappyHourPrice = false,
		author,
		coAuthors
	}: Props = $props();

	const nutrients = $derived(
		drink ? nutritionFacts(drink).filter((fact) => fact.short !== 'Koffein') : []
	);
	const types = $derived(drink ? drinkTypeLabels(drink) : []);
	const resolvedImage = $derived(image === defaultImage ? defaultImage : `${base}/images/${image}`);

	const beerPriceDisplay = $derived(getBeerPriceDisplay(beerPriceKr, isHappyHourPrice));
	const beerBrandDisplay = $derived(beerBrand?.trim() || UNKNOWN_BRAND_LABEL);
</script>

<div
	class="group h-full overflow-hidden rounded-3xl border border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur-xl transition duration-300 hover:bg-surface-raised"
>
	<div class="relative aspect-[16/9] overflow-hidden">
		<div class="h-full w-full transition duration-500 group-hover:scale-[1.04]">
			<div
				class="h-full w-full bg-cover bg-center"
				style={`background-image: url('${resolvedImage}'); background-position: ${imageFocusX ?? 50}% ${imageFocusY ?? 50}%; transform: scale(${imageZoom}); transform-origin: ${imageFocusX ?? 50}% ${imageFocusY ?? 50}%`}
				role="img"
				aria-label={title}
			></div>
		</div>
		<div
			class="absolute inset-0 bg-gradient-to-t from-surface/65 via-surface/15 to-transparent"
		></div>
	</div>
	<div class="space-y-3 px-5 pb-5 pt-4">
		<div class="space-y-1">
			<div class="flex items-start justify-between gap-4">
				<h2 class="min-w-0 text-xl font-semibold text-ink">{title}</h2>
				<div
					class="inline-flex min-w-12 shrink-0 items-baseline justify-center whitespace-nowrap rounded-full border border-red-400/25 bg-red-950/50 px-2.5 py-1 text-accent"
				>
					<span class="text-lg font-semibold leading-none">{rating}</span>
					<span class="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
						>/3</span
					>
				</div>
			</div>
			{#if favorite}<p
					class="inline-block rounded-full border border-accent/30 bg-surface-raised px-3 py-1 text-xs font-semibold text-accent"
				>
					{favorite}
				</p>{/if}

			<p class="text-[11px] uppercase tracking-[0.24em] text-muted">{location}</p>
			<div class="flex min-w-0 items-baseline justify-between gap-2 text-xs leading-4">
				{#if author}<p
						class="min-w-0 truncate text-secondary"
						title={formatAuthors(author, coAuthors)}
					>
						av {formatAuthors(author, coAuthors)}
					</p>{/if}
				{#if drink && types.length}
					<p class="flex shrink-0 gap-2 text-[10px] font-semibold" aria-label="Dryckstyp">
						<DrinkTypeLabels {drink} separated={false} />
					</p>
				{/if}
			</div>
			<div
				class="mt-3 rounded-2xl border border-line bg-surface-raised px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
				class:py-1={nutrients.length > 0}
				class:py-2.5={nutrients.length === 0}
			>
				<div class="flex items-start justify-between gap-3" class:mt-1={nutrients.length === 0}>
					<p class="min-w-0 text-base font-semibold leading-tight text-ink">
						{beerBrandDisplay}
					</p>
					{#if beerPriceDisplay}
						<p class="whitespace-nowrap text-base font-semibold leading-tight text-ink">
							{beerPriceDisplay.text}
						</p>
					{/if}
				</div>
				{#if nutrients.length}
					<div
						class="flex items-center gap-3 whitespace-nowrap text-[10px] leading-4 text-secondary"
						aria-label="Drycksfakta"
					>
						{#each nutrients as fact}
							<span
								title={`${fact.label}, ${fact.perContainer !== undefined ? 'hela förpackningen' : 'per 100 ml'}`}
							>
								{fact.short}
								{formatDrinkNumber(fact.perContainer ?? fact.per100Ml!)}
								{fact.unit}{fact.perContainer === undefined ? '/100 ml' : ''}
							</span>
						{/each}
					</div>
				{/if}
				{#if beerPriceDisplay?.note}
					<p class="mt-1 text-[10px] leading-tight text-muted">{beerPriceDisplay.note}</p>
				{/if}
			</div>
		</div>
		<ReviewDescription {description} variant="preview" />
	</div>
</div>
