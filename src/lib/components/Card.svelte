<script lang="ts">
	import { base } from '$app/paths';
	import FavoriteBadge from '$lib/components/FavoriteBadge.svelte';
	import ReviewImage from '$lib/components/ReviewImage.svelte';
	import RatingMug from '$lib/components/RatingMug.svelte';
	import ReviewDistance from '$lib/components/ReviewDistance.svelte';
	import defaultImage from '$lib/images/image.png';
	import DrinkTypeIcons from '$lib/components/DrinkTypeIcons.svelte';
	import ReviewDescription from '$lib/components/ReviewDescription.svelte';
	import { formatAuthors } from '$lib/utils/authors';
	import { getBeerPriceDisplay } from '$lib/utils/price';

	import type { DrinkFacts } from '$lib/types/bar-review';
	import { drinkTypeLabels } from '$lib/utils/drink-facts';
	interface Props {
		drink?: DrinkFacts;
		distanceKm?: number | null;
		title: string;
		imagePriority?: boolean;
		description: string;
		rating: number;
		favorite?: string;
		image?: string;
		imageFocusX?: number;
		imageFocusY?: number;
		imageZoom?: number;
		location: string;
		beerPriceKr?: number;
		isHappyHourPrice?: boolean;
		author?: string;
		coAuthors?: string[] | string;
	}

	let {
		drink,
		imagePriority = false,
		distanceKm,
		title,
		description,
		rating,
		favorite,
		image = defaultImage,
		imageFocusX = 50,
		imageFocusY = 50,
		imageZoom = 1,
		location,
		beerPriceKr,
		isHappyHourPrice = false,
		author,
		coAuthors
	}: Props = $props();

	const types = $derived(drink ? drinkTypeLabels(drink) : []);
	const resolvedImage = $derived(image === defaultImage ? defaultImage : `${base}/images/${image}`);

	const beerPriceDisplay = $derived(
		getBeerPriceDisplay(beerPriceKr, isHappyHourPrice, drink?.isOnSale)
	);
</script>

<div
	class="glass-panel group row-span-2 grid h-full grid-rows-subgrid gap-y-0 overflow-hidden transition-colors duration-200 hover:bg-surface-raised"
>
	<div class="relative aspect-square overflow-hidden">
		<div
			class="h-full w-full transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
		>
			<ReviewImage
				src={resolvedImage}
				alt={title}
				focusX={imageFocusX}
				focusY={imageFocusY}
				zoom={imageZoom}
				priority={imagePriority}
				sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
				square
			/>
		</div>
		<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
		{#if distanceKm != null}<div class="absolute right-4 top-4">
				<ReviewDistance {distanceKm} variant="photo" />
			</div>{/if}
		{#if favorite}
			<div class="absolute left-3 top-3">
				<FavoriteBadge />
			</div>
		{/if}
		<div class="absolute inset-x-0 bottom-0 p-5 text-on-photo">
			<div class="flex items-end justify-between gap-3">
				<h2 class="min-w-0 break-words text-xl font-semibold leading-snug">{title}</h2>
				<div
					class="inline-flex shrink-0 items-center justify-center rounded-full bg-black/50 px-2.5 py-1 tabular-nums backdrop-blur-md"
				>
					<RatingMug {rating} />
				</div>
			</div>
			<p class="mt-1 text-sm text-on-photo/85">{location}</p>
		</div>
	</div>
	<div class="space-y-2 px-5 py-4">
		{#if author || types.length || beerPriceDisplay}
			<div class="flex items-center justify-between gap-3">
				{#if author}<p class="min-w-0 text-xs text-secondary">
						av {formatAuthors(author, coAuthors)}
					</p>{/if}
				<div class="ml-auto flex shrink-0 items-center gap-2">
					{#if drink && types.length}<DrinkTypeIcons {drink} compact />{/if}
					{#if beerPriceDisplay}<p
							class="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-ink"
						>
							{beerPriceDisplay.text}
						</p>{/if}
				</div>
			</div>
		{/if}
		{#if beerPriceDisplay?.note && !drink?.isOnSale}<p class="text-xs text-muted">
				{beerPriceDisplay.note}
			</p>{/if}
		<ReviewDescription {description} variant="preview" />
	</div>
</div>
