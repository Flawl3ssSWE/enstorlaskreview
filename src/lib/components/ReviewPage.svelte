<script lang="ts">
	import FavoriteBadge from '$lib/components/FavoriteBadge.svelte';
	import RatingCells from '$lib/components/RatingCells.svelte';
	import ReviewImage from '$lib/components/ReviewImage.svelte';
	import RepurchasePotential from '$lib/components/RepurchasePotential.svelte';
	import { favoriteLabel, sweetnessBalance } from '$lib/content/soda';
	import { resolve, base } from '$app/paths';
	import type { PublicReview } from '$lib/types/bar-review';
	import { UNKNOWN_BRAND_LABEL } from '$lib/brand';
	import ArrowLongLeft from '$lib/components/svgs/ArrowLongLeft.svelte';
	import { drinkVolumeMl, drinkTypeLabels, nutritionFacts } from '$lib/utils/drink-facts';
	import DrinkFacts from '$lib/components/DrinkFacts.svelte';
	import DrinkTypeIcons from '$lib/components/DrinkTypeIcons.svelte';
	import HelpTip from '$lib/components/HelpTip.svelte';
	import ReviewDescription from '$lib/components/ReviewDescription.svelte';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import CupSoda from '@lucide/svelte/icons/cup-soda';
	import {
		REVIEW_RATING_METRICS,
		SODA_RATING_METRICS,
		VENUE_RATING_METRICS
	} from '$lib/review-metadata';
	import { formatAuthors } from '$lib/utils/authors';
	import { getBeerPriceDisplay } from '$lib/utils/price';

	let {
		data,
		imageSrc,
		demo = false
	}: {
		data: {
			bar: PublicReview;
			relatedReviews: Pick<PublicReview, 'slug' | 'title' | 'author' | 'rating' | 'createdAt'>[];
			historyUrl: string | null;
		};
		imageSrc?: string;
		demo?: boolean;
	} = $props();
	const bar = $derived(data.bar);
	const favorite = $derived(favoriteLabel(bar));
	const types = $derived(drinkTypeLabels(bar));
	const hasDrinkFacts = $derived(
		!!bar.container ||
			drinkVolumeMl(bar) !== undefined ||
			nutritionFacts(bar).length > 0 ||
			!!bar.servingMethods?.length ||
			!!bar.servingTemperature ||
			bar.servedWithIce !== undefined
	);
	const balance = $derived(
		bar.sodaRatings?.mouthfeelMatch !== undefined
			? sweetnessBalance(bar.sodaRatings.sweetness)
			: undefined
	);

	const beerPriceDisplay = $derived(
		getBeerPriceDisplay(bar.beerPriceKr, bar.isHappyHourPrice, bar.isOnSale)
	);
	const beerBrandDisplay = $derived(bar.beerBrand?.trim() || UNKNOWN_BRAND_LABEL);
	const ratingFields = $derived(
		bar.sodaRatings
			? SODA_RATING_METRICS.filter((metric) => bar.sodaRatings![metric.key] !== undefined).map(
					(metric) => ({
						...metric,
						value: bar.sodaRatings![metric.key]!
					})
				)
			: REVIEW_RATING_METRICS.map((metric) => ({ ...metric, value: bar[metric.key]! }))
	);
	const googleMapsUrl = $derived(
		`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bar.location)}`
	);

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		if (Number.isNaN(d.getTime())) return 'Okänt datum';
		return d.toLocaleDateString('sv-SE', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'Europe/Stockholm'
		});
	}

	function formatRating(rating: number): string {
		return `${rating.toLocaleString('sv-SE', { maximumFractionDigits: 1 })}/5`;
	}
</script>

<svelte:head>
	<title>{bar.title} – En Stor Läsk Review</title>
</svelte:head>

<section class="page-shell">
	{#if demo}
		<p class="mb-3 border-l-2 border-accent pl-3 text-sm text-secondary">
			<span class="font-semibold text-accent">Demosida.</span>
			En påhittad läsk som visar sidans alla detaljer. Bild och värden är exempel.
		</p>
	{/if}
	<a href={resolve('/')} class="btn btn-secondary">
		<ArrowLongLeft className="size-5" />
		<span>Tillbaka till recensioner</span>
	</a>

	<article class="glass-panel mt-4 overflow-hidden">
		<div class="md:grid md:grid-cols-2">
			<div class="p-3">
				<div class="relative overflow-hidden rounded-2xl">
					<ReviewImage
						src={imageSrc ?? `${base}/images/${bar.image}`}
						alt={bar.title}
						focusX={bar.imageFocusX}
						focusY={bar.imageFocusY}
						zoom={bar.imageZoom}
						square
					/>
					{#if favorite}
						<div class="absolute left-3 top-3 sm:left-4 sm:top-4">
							<FavoriteBadge large />
						</div>
					{/if}
				</div>
			</div>
			<header
				class="flex min-w-0 flex-col p-5 pb-0 sm:p-8 sm:pb-0 md:justify-center md:p-8 lg:p-10"
			>
				<h1 class="text-balance text-3xl font-semibold text-ink sm:text-4xl lg:text-5xl">
					{bar.title}
				</h1>
				{#if bar.location}
					<a
						href={googleMapsUrl}
						target="_blank"
						rel="external noopener noreferrer"
						class="mt-3 inline-flex items-start gap-1.5 self-start rounded-sm text-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
					>
						<MapPin size={18} strokeWidth={1.75} class="mt-0.5 shrink-0" aria-hidden="true" />
						<span>{bar.location}</span>
					</a>
				{/if}
				<div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
					<div class="flex shrink-0 items-center gap-4">
						<p
							class="flex gap-1"
							role="img"
							aria-label={`${bar.sodaRatings ? 'Läskens helhetsbetyg' : 'Helhetsbetyg'} ${bar.rating} av 3`}
						>
							{#each { length: 3 } as _, index (index)}
								<CupSoda
									size={32}
									strokeWidth={1.75}
									class={index < bar.rating ? 'text-accent' : 'text-muted/40'}
									aria-hidden="true"
								/>
							{/each}
						</p>
						<p class="text-sm text-secondary" aria-hidden="true">
							<span class="font-semibold tabular-nums text-ink">{bar.rating} av 3</span>
						</p>
					</div>
					{#if types.length}
						<div role="group" aria-label="Dryckens egenskaper">
							<DrinkTypeIcons drink={bar} interactive />
						</div>
					{/if}
				</div>
				<p class="mt-4 text-lg text-secondary">
					<span class="font-semibold text-ink">{beerBrandDisplay}</span>
					{#if beerPriceDisplay}<span class="mx-1.5 text-muted" aria-hidden="true">·</span><span
							class="whitespace-nowrap font-semibold tabular-nums text-ink"
							>{beerPriceDisplay.text}</span
						>{/if}
				</p>
				{#if beerPriceDisplay?.note}<p class="mt-1 text-sm text-muted">
						{beerPriceDisplay.note}
					</p>{/if}
				<div class="mt-3"><RepurchasePotential score={bar.repurchasePotential} /></div>
				<div
					class="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-5 text-sm text-secondary"
				>
					<p>Av <span class="text-ink">{formatAuthors(bar.author, bar.coAuthors)}</span></p>
					<p>Skapad {formatDate(bar.createdAt)}</p>
				</div>
				<p class="mt-1 text-xs text-muted">Uppdaterad {formatDate(bar.updatedAt)}</p>
			</header>
		</div>

		<div class="space-y-8 p-5 sm:p-8">
			<div
				class="grid gap-8 {hasDrinkFacts
					? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12'
					: ''}"
			>
				<section class="min-w-0 max-w-prose space-y-3" aria-labelledby="review-heading">
					<h2 id="review-heading" class="text-xl font-semibold text-ink">Recension</h2>
					<ReviewDescription description={bar.description} />
				</section>
				{#if hasDrinkFacts}
					<section
						class="min-w-0 space-y-2 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
						aria-labelledby="drink-facts-heading"
					>
						<h2 id="drink-facts-heading" class="mb-3 text-xl font-semibold text-ink">
							Drycksfakta
						</h2>
						<DrinkFacts drink={bar} />
					</section>
				{/if}
			</div>

			<section class="space-y-4 border-t border-line pt-6" aria-labelledby="ratings-heading">
				<h2 id="ratings-heading" class="text-xl font-semibold text-ink">
					{bar.sodaRatings ? 'Läskbetyg' : 'Betygsfördelning'}
				</h2>
				<ul class="grid gap-x-10 gap-y-4 sm:grid-cols-2">
					{#each ratingFields as field (field.key)}
						<li class="min-w-0">
							<div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
								<span class="flex items-center gap-1 text-secondary">
									<span>{field.label}</span>
									<HelpTip
										label={field.label}
										text={`${field.description}${field.key === 'sweetness' && balance !== undefined ? ` Sötmabalans: ${formatRating(balance)}. Perfekt sötma (3) ger högst poäng.` : ''}`}
									/>
								</span>
								<span class="shrink-0 font-semibold tabular-nums text-ink"
									>{formatRating(field.value)}</span
								>
							</div>
							<RatingCells value={field.value} />
						</li>
					{/each}
				</ul>
			</section>

			{#if bar.venueRatings}
				<section
					class="space-y-4 border-t border-line pt-6"
					aria-labelledby="venue-ratings-heading"
				>
					<div class="flex items-center gap-1">
						<h2 id="venue-ratings-heading" class="text-xl font-semibold text-ink">
							Betyg på stället
						</h2>
						<HelpTip label="Betyg på stället" text="Påverkar inte läskens helhetsbetyg." />
					</div>
					<ul class="grid gap-x-10 gap-y-4 sm:grid-cols-2">
						{#each VENUE_RATING_METRICS as field (field.key)}
							<li class="min-w-0">
								<div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
									<span class="flex items-center gap-1 text-secondary">
										<span>{field.label}</span>
										<HelpTip label={field.label} text={field.description} />
									</span>
									<span class="shrink-0 font-semibold tabular-nums text-ink">
										{formatRating(bar.venueRatings[field.key])}
									</span>
								</div>
								<RatingCells value={bar.venueRatings[field.key]} />
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.relatedReviews.length}
				<section
					class="space-y-4 border-t border-line pt-6"
					aria-labelledby="related-reviews-heading"
				>
					<h2 id="related-reviews-heading" class="text-xl font-semibold text-ink">
						Fler recensioner av samma läsk
					</h2>
					<ul class="grid gap-3 sm:grid-cols-2">
						{#each data.relatedReviews as review (review.slug)}
							<li>
								<a
									href={resolve('/[slug]', { slug: review.slug }) + '/'}
									class="flex h-full items-start justify-between gap-4 rounded-2xl border border-line p-4 transition-colors hover:border-accent hover:bg-surface-raised"
								>
									<div class="min-w-0">
										<p class="font-semibold text-ink">{formatAuthors(review.author)}</p>
										<p class="mt-1 text-sm text-secondary">{review.title}</p>
										<p class="mt-1 text-xs text-muted">{formatDate(review.createdAt)}</p>
									</div>
									<span class="shrink-0 font-semibold tabular-nums text-accent"
										>{review.rating}/3</span
									>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.historyUrl}
				<div class="border-t border-line pt-5">
					<a
						href={data.historyUrl}
						class="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface-raised px-5 py-2 text-sm font-semibold text-secondary transition-colors hover:text-ink"
						>Visa historik på GitHub</a
					>
				</div>
			{/if}
		</div>
	</article>
</section>
