<script lang="ts">
	import ReviewImage from '$lib/components/ReviewImage.svelte';
	import RepurchasePotential from '$lib/components/RepurchasePotential.svelte';
	import { favoriteLabel, sweetnessBalance } from '$lib/content/soda';
	import { resolve, base } from '$app/paths';
	import type { PageProps } from './$types';
	import { UNKNOWN_BRAND_LABEL } from '$lib/brand';
	import ArrowLongLeft from '$lib/components/svgs/ArrowLongLeft.svelte';
	import { formatDrinkContainer } from '$lib/utils/drink-facts';
	import DrinkFacts from '$lib/components/DrinkFacts.svelte';
	import HelpTip from '$lib/components/HelpTip.svelte';
	import ReviewDescription from '$lib/components/ReviewDescription.svelte';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import {
		REVIEW_RATING_METRICS,
		SODA_RATING_METRICS,
		VENUE_RATING_METRICS
	} from '$lib/review-metadata';
	import { formatAuthors } from '$lib/utils/authors';
	import { getBeerPriceDisplay } from '$lib/utils/price';

	let { data }: PageProps = $props();
	const bar = $derived(data.bar);
	const favorite = $derived(favoriteLabel(bar));
	const balance = $derived(
		bar.sodaRatings?.mouthfeelMatch !== undefined
			? sweetnessBalance(bar.sodaRatings.sweetness)
			: undefined
	);

	const beerPriceDisplay = $derived(getBeerPriceDisplay(bar.beerPriceKr, bar.isHappyHourPrice));
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

	function getBarWidth(value: number): string {
		return `${Math.max(0, Math.min(100, (value / 5) * 100))}%`;
	}
</script>

<section class="mx-auto w-full max-w-4xl px-4 pb-12 pt-6 sm:px-6">
	<a
		href={resolve('/')}
		class="inline-flex items-center gap-2 text-sm font-semibold text-secondary transition-colors hover:text-ink"
	>
		<ArrowLongLeft className="size-5" />
		<span>Tillbaka till recensioner</span>
	</a>

	<article
		class="mt-4 overflow-hidden rounded-3xl border border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur-xl"
	>
		<ReviewImage
			src={`${base}/images/${bar.image}`}
			alt={bar.title}
			focusX={bar.imageFocusX}
			focusY={bar.imageFocusY}
			zoom={bar.imageZoom}
		/>

		<div class="space-y-6 p-5 sm:p-8">
			{#if favorite}<p
					class="inline-block rounded-full border border-accent/30 bg-surface-raised px-3 py-1 text-sm font-semibold text-accent"
				>
					{favorite}
				</p>{/if}
			<RepurchasePotential score={bar.repurchasePotential} />
			<header class="space-y-3">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<div class="flex flex-wrap items-center gap-3">
							<p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Recension</p>
						</div>
						<h1 class="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
							{bar.title}
						</h1>
						{#if bar.location}
							<a
								href={googleMapsUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="mt-1 inline-flex items-center gap-1.5 text-sm uppercase tracking-[0.2em] text-muted transition-colors hover:text-secondary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
							>
								<MapPin size={16} strokeWidth={1.75} class="shrink-0" aria-hidden="true" />
								<span>{bar.location}</span>
							</a>
						{/if}
					</div>
					<div class="grid w-full gap-3 sm:w-auto sm:min-w-44">
						<div
							class="rounded-2xl border border-line bg-surface-raised px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
						>
							<p class="text-xs uppercase tracking-[0.2em] text-muted">
								{bar.sodaRatings ? 'Läskens helhetsbetyg' : 'Helhetsbetyg'}
							</p>
							<p class="text-4xl font-bold text-ink sm:text-5xl">
								{`${bar.rating}/3`}
							</p>
						</div>
						<div
							class="rounded-2xl border border-line bg-surface-raised px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
						>
							<div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
								<div class="min-w-0">
									<p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
										Märke
									</p>
									<p class="text-xl font-bold leading-tight text-ink">
										{beerBrandDisplay}
									</p>
								</div>
								{#if beerPriceDisplay}
									<div class="text-right">
										<p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
											Pris
										</p>
										<p class="whitespace-nowrap text-3xl font-bold leading-none text-ink">
											{beerPriceDisplay.text}
										</p>
									</div>
								{/if}
							</div>
							{#if beerPriceDisplay?.note}
								<p class="mt-2 text-right text-xs text-muted">{beerPriceDisplay.note}</p>
							{/if}
						</div>
					</div>
				</div>

				<div class="space-y-1 text-sm text-secondary">
					<div>
						<span class="text-muted">Författare:</span>
						<span class="ml-2 text-ink">{formatAuthors(bar.author, bar.coAuthors)}</span>
					</div>
					<div class="text-xs text-muted">
						<span>Skapad {formatDate(bar.createdAt)}</span>
						<span class="mx-2">•</span>
						<span>Uppdaterad {formatDate(bar.updatedAt)}</span>
					</div>
				</div>
			</header>

			<section class="space-y-2">
				<h2 class="text-base font-semibold text-ink">Recension</h2>
				{#if bar.container}<p class="text-sm text-secondary">
						Förpackning: {formatDrinkContainer(bar)}
					</p>{/if}
				<DrinkFacts drink={bar} />
				<ReviewDescription description={bar.description} />
			</section>

			{#if data.relatedReviews.length}
				<section class="space-y-3" aria-labelledby="related-reviews-heading">
					<h2 id="related-reviews-heading" class="text-base font-semibold text-ink">
						Fler recensioner av samma läsk
					</h2>
					<ul class="space-y-2">
						{#each data.relatedReviews as review (review.slug)}
							<li>
								<a
									href={resolve('/[slug]', { slug: review.slug }) + '/'}
									class="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-raised p-4 transition hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
								>
									<div class="min-w-0">
										<p class="font-semibold text-ink">{formatAuthors(review.author)}</p>
										<p class="text-sm text-secondary">{review.title}</p>
										<p class="mt-1 text-xs text-muted">{formatDate(review.createdAt)}</p>
									</div>
									<span class="shrink-0 font-semibold text-accent">{review.rating}/3</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="space-y-3">
				<h2 class="text-base font-semibold text-ink">
					{bar.sodaRatings ? 'Läskbetyg' : 'Betygsfördelning'}
				</h2>
				<ul class="space-y-3">
					{#each ratingFields as field (field.key)}
						<li
							class="rounded-xl border border-line bg-surface p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
						>
							<div class="mb-2 flex items-center justify-between text-sm">
								<span class="flex items-center gap-1 text-secondary">
									<span>{field.label}</span>
									<HelpTip
										label={field.label}
										text={`${field.description}${field.key === 'sweetness' && balance !== undefined ? ` Sötmabalans: ${formatRating(balance)}. Perfekt sötma (3) ger högst poäng.` : ''}`}
									/>
								</span>
								<span class="font-semibold text-ink">{formatRating(field.value)}</span>
							</div>
							<div class="h-2 w-full rounded-full bg-line">
								<div
									class="h-2 rounded-full bg-accent"
									style={`width: ${getBarWidth(field.value)}`}
								></div>
							</div>
						</li>
					{/each}
				</ul>
			</section>

			{#if bar.venueRatings}
				<section class="space-y-3">
					<div class="flex items-center gap-1">
						<h2 class="text-base font-semibold text-ink">Betyg på stället</h2>
						<HelpTip label="Betyg på stället" text="Påverkar inte läskens helhetsbetyg." />
					</div>
					<ul class="space-y-2">
						{#each VENUE_RATING_METRICS as field (field.key)}
							<li class="flex justify-between rounded-xl border border-line p-3">
								<span>{field.label}</span><span>{bar.venueRatings[field.key]}/5</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			<div class="border-t border-line pt-4">
				<a
					href={data.historyUrl}
					class="mr-2 inline-flex items-center justify-center rounded-full border border-line bg-surface-raised px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary transition hover:bg-surface-raised hover:text-ink"
				>
					Visa historik på GitHub
				</a>
			</div>
		</div>
	</article>
</section>
