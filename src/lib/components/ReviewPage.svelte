<script lang="ts">
	import FavoriteBadge from '$lib/components/FavoriteBadge.svelte';
	import RatingCells from '$lib/components/RatingCells.svelte';
	import ReviewImage from '$lib/components/ReviewImage.svelte';
	import RepurchasePotential from '$lib/components/RepurchasePotential.svelte';
	import { favoriteLabel, isSodaReview, sweetnessBalance } from '$lib/content/soda';
	import { resolve, base } from '$app/paths';
	import type { PublicReview } from '$lib/types/bar-review';
	import { UNKNOWN_BRAND_LABEL } from '$lib/brand';
	import ArrowLongLeft from '$lib/components/svgs/ArrowLongLeft.svelte';
	import SugarCube from '$lib/components/svgs/SugarCube.svelte';
	import { drinkVolumeMl, drinkTypeLabels, nutritionFacts } from '$lib/utils/drink-facts';
	import DrinkFacts from '$lib/components/DrinkFacts.svelte';
	import DrinkTypeIcons from '$lib/components/DrinkTypeIcons.svelte';
	import HelpTip from '$lib/components/HelpTip.svelte';
	import ReviewDescription from '$lib/components/ReviewDescription.svelte';
	import Bubbles from '@lucide/svelte/icons/bubbles';
	import Citrus from '@lucide/svelte/icons/citrus';
	import Leaf from '@lucide/svelte/icons/leaf';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Package from '@lucide/svelte/icons/package';
	import Tag from '@lucide/svelte/icons/tag';
	import Type from '@lucide/svelte/icons/type';
	import Waves from '@lucide/svelte/icons/waves';
	import RatingMug from '$lib/components/RatingMug.svelte';
	import {
		REVIEW_RATING_METRICS,
		SODA_RATING_METRICS,
		TASTING_PROFILE_METRICS,
		TASTING_RATING_METRICS,
		TASTING_EXTRA_METRICS,
		TASTING_VENUE_RATING_METRICS,
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
	const ratingFormat = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
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
						value: bar.sodaRatings![metric.key]!,
						description:
							metric.key === 'sweetness' && balance !== undefined
								? `${metric.description} Sötmabalans: ${ratingFormat.format(balance)}/5. Perfekt sötma (3) ger högst poäng.`
								: metric.description
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

	type RatingField = { key: string; label: string; description: string; value: number };
	const profileSteps = [1, 2, 3, 4, 5];
	const profileStyles = {
		sweetness: { icon: SugarCube, color: 'text-sugared' },
		acidity: { icon: Citrus, color: 'text-energy' },
		carbonation: { icon: Bubbles, color: 'text-protein' },
		body: { icon: Waves, color: 'text-electrolyte' },
		bitterness: { icon: Leaf, color: 'text-sugarfree' }
	};
	const extraIcons = { name: Type, packaging: Package, value: Tag };
</script>

{#snippet ratingLabel(field: Pick<RatingField, 'label' | 'description'>)}
	<span class="flex min-w-0 items-center gap-0.5">
		<span class="font-medium text-ink">{field.label}</span>
		<HelpTip label={field.label} text={field.description} />
	</span>
{/snippet}

{#snippet ratingValue(value: number, color = 'text-accent')}
	<span class="shrink-0 whitespace-nowrap tabular-nums"
		><span class="text-lg font-semibold leading-none {color}">{ratingFormat.format(value)}</span
		><span class="text-xs text-muted">/5</span></span
	>
{/snippet}

{#snippet ratingBars(
	fields: readonly RatingField[],
	options: { wide?: boolean; muted?: boolean } = {}
)}
	<ul class="grid gap-x-10 gap-y-3 {options.wide ? 'sm:grid-cols-2' : ''}">
		{#each fields as field (field.key)}
			<li class="min-w-0 space-y-1">
				<div class="flex items-center justify-between gap-3 text-sm">
					{@render ratingLabel(field)}
					{@render ratingValue(field.value)}
				</div>
				<RatingCells value={field.value} compact muted={options.muted} />
			</li>
		{/each}
	</ul>
{/snippet}

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
				<h1
					class="break-words text-balance text-3xl font-semibold text-ink sm:text-4xl lg:text-5xl"
				>
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
					<RatingMug
						rating={bar.rating}
						label={isSodaReview(bar) ? 'Läskens helhetsbetyg' : 'Helhetsbetyg'}
						large
						words
					/>
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
				{#if bar.repurchasePotential !== undefined}
					<div class="mt-3">
						<RepurchasePotential score={bar.repurchasePotential} tasting={!!bar.sodaTasting} />
					</div>
				{/if}
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

			{#if bar.sodaTasting}
				{@const tasting = bar.sodaTasting}
				<div class="grid items-start gap-x-10 gap-y-6 border-t border-line pt-6 md:grid-cols-2">
					<section class="min-w-0 space-y-3" aria-labelledby="ratings-heading">
						<h2 id="ratings-heading" class="text-base font-semibold text-ink">Delbetyg</h2>
						{@render ratingBars(
							TASTING_RATING_METRICS.map((metric) => ({
								...metric,
								value: tasting.ratings[metric.key],
								description: `${metric.description} ${metric.weight} % av helhetsbetyget.`
							}))
						)}
					</section>
					<section
						class="min-w-0 rounded-2xl border border-line bg-linear-to-br from-accent-soft/45 to-surface-raised/55 px-3.5 py-3 sm:px-4"
						aria-labelledby="profile-heading"
					>
						<h2 id="profile-heading" class="mb-1 text-base font-semibold text-ink">Smakprofil</h2>
						<ul class="divide-y divide-line">
							{#each TASTING_PROFILE_METRICS as metric (metric.key)}
								{@const value = tasting.profile[metric.key]}
								{@const { icon: Icon, color } = profileStyles[metric.key]}
								<li
									class="grid min-h-10 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-1.5 py-1 text-sm sm:gap-x-3"
								>
									<span
										class="grid size-7 place-items-center rounded-full bg-current/10 {color}"
										aria-hidden="true"
									>
										<Icon size={16} />
									</span>
									{@render ratingLabel(metric)}
									<span class="flex items-center gap-1 {color}" aria-hidden="true">
										{#each profileSteps as step (step)}
											<span
												class="size-2 rounded-full {step === value
													? 'scale-125 bg-current'
													: step < value
														? 'bg-current/55'
														: 'border border-current/40'}"
											></span>
										{/each}
									</span>
									<span class="w-7 text-right">{@render ratingValue(value, color)}</span>
								</li>
							{/each}
						</ul>
					</section>
				</div>
			{:else}
				<section class="space-y-3 border-t border-line pt-6" aria-labelledby="ratings-heading">
					<h2 id="ratings-heading" class="text-base font-semibold text-ink">
						{bar.sodaRatings ? 'Läskbetyg' : 'Betygsfördelning'}
					</h2>
					{@render ratingBars(ratingFields, { wide: true })}
				</section>
			{/if}

			{#if bar.sodaTasting}
				{@const extras = bar.sodaTasting.extras}
				<section class="space-y-3" aria-labelledby="extras-heading">
					<h2 id="extras-heading" class="text-base font-semibold text-ink">Övriga betyg</h2>
					<ul class="grid gap-2 sm:grid-cols-3 sm:gap-3">
						{#each TASTING_EXTRA_METRICS as metric (metric.key)}
							{@const Icon = extraIcons[metric.key]}
							<li
								class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface-raised/50 px-3 py-2 sm:grid-cols-[1fr_auto] sm:px-4 sm:py-3"
							>
								<span
									class="grid size-8 place-items-center rounded-full bg-accent-soft text-accent sm:col-start-1 sm:row-start-1"
									aria-hidden="true"
								>
									<Icon size={17} strokeWidth={1.75} />
								</span>
								<div class="min-w-0 text-sm sm:col-span-2 sm:row-start-2">
									{@render ratingLabel(metric)}
								</div>
								<span class="sm:col-start-2 sm:row-start-1">
									{@render ratingValue(extras[metric.key])}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if bar.venueRatings}
				{@const venue = bar.venueRatings}
				<section
					class="space-y-3 border-t border-line pt-6"
					aria-labelledby="venue-ratings-heading"
				>
					<h2 id="venue-ratings-heading" class="text-base font-semibold text-ink">
						Betyg på stället
					</h2>
					{@render ratingBars(
						(bar.sodaTasting ? TASTING_VENUE_RATING_METRICS : VENUE_RATING_METRICS).map(
							(metric) => ({
								...metric,
								value: venue[metric.key]
							})
						),
						{ wide: true, muted: true }
					)}
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
									<RatingMug rating={review.rating} />
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
