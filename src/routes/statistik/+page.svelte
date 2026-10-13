<script lang="ts">
	import { resolve } from '$app/paths';
	import RatingCells from '$lib/components/RatingCells.svelte';
	import HelpTip from '$lib/components/HelpTip.svelte';
	import { formatDrinkNumber, formatDrinkVolume } from '$lib/utils/drink-facts';
	import { capitalizeAuthorName } from '$lib/utils/authors';
	import { SODA_RATING_METRICS } from '$lib/review-metadata';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const decimalFormatter = new Intl.NumberFormat('sv-SE', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 1
	});
	const wholeNumberFormatter = new Intl.NumberFormat('sv-SE');

	const formatDecimal = (value: number | null): string =>
		value === null ? '–' : decimalFormatter.format(value);
	const formatWholeNumber = (value: number): string => wholeNumberFormatter.format(value);
	const overview = $derived([
		{
			label: 'Recenserade produkter',
			value: formatWholeNumber(data.statistics.productCount),
			note: `${formatWholeNumber(data.statistics.totalReviews)} publicerade recensioner. Samma produkt kan ha flera recensioner.`
		},
		{
			label: 'Märken',
			value: formatWholeNumber(data.statistics.brandCount),
			note: 'Olika märken bland recensioner med angivet märke.'
		},
		{
			label: 'Läskfavorit',
			value:
				data.statistics.favoritePercentage === null
					? '–'
					: `${formatDecimal(data.statistics.favoritePercentage)} %`,
			note: `${data.statistics.favoriteCount} av ${data.statistics.favoriteReviewCount} recensioner med angivet favoritval.`
		},
		{
			label: 'Återköpspotential',
			value:
				data.statistics.averageRepurchasePotential === null
					? '–'
					: `${formatDecimal(data.statistics.averageRepurchasePotential)} / 5`,
			note: `Genomsnitt från ${data.statistics.repurchaseReviewCount} recensioner med angiven återköpspotential. Påverkar inte helhetsbetyget.`
		},
		{
			label: 'Snittbetyg för läsk',
			value:
				data.statistics.averageSodaScore === null
					? '–'
					: `${formatDecimal(data.statistics.averageSodaScore)} / 5`,
			note: `Viktat läskbetyg från ${data.statistics.sodaReviewCount} recensioner. Platsbetyg ingår inte.`
		},
		{
			label: 'Snittpris per förpackning',
			value:
				data.statistics.averagePrice === null
					? '–'
					: `${formatDecimal(data.statistics.averagePrice)} kr`,
			note: `Baserat på ${data.statistics.priceReviewCount} prisuppgifter. Förpackningarnas storlek varierar.`
		},
		{
			label: 'Snittpris per liter',
			value:
				data.statistics.averagePricePerLiter === null
					? '–'
					: `${formatDecimal(data.statistics.averagePricePerLiter)} kr/l`,
			note: `Genomsnittligt literpris från ${data.statistics.unitPriceReviewCount} recensioner med både pris och volym.`
		}
	]);
	const rankings = $derived([
		{
			title: 'Lägst literpris',
			products: data.statistics.bestValueProducts,
			unit: 'kr/l',
			empty: 'Inga recensioner med både pris och volym än.'
		},
		{
			title: 'Högst literpris',
			products: data.statistics.mostExpensiveProducts,
			unit: 'kr/l',
			empty: 'Inga recensioner med både pris och volym än.'
		},
		{
			title: 'Högst läskbetyg',
			products: data.statistics.topRatedProducts,
			unit: '/ 5',
			empty: 'Inga läskbetyg än.'
		}
	]);
</script>

<svelte:head>
	<title>Statistik</title>
	<meta
		name="description"
		content="Betyg, literpriser och innehållstoppar för koffein, protein och kolhydrater från våra läskrecensioner"
	/>
</svelte:head>

<section class="page-shell">
	<div class="mx-auto w-full max-w-6xl">
		<h1 class="text-balance text-3xl font-semibold leading-tight text-ink sm:text-5xl">
			Läsk i siffror.
		</h1>
		<p class="mt-4 max-w-2xl text-base leading-relaxed text-secondary">
			Favoriter, prisfynd och innehållstoppar. Allt bygger på våra publicerade recensioner.
		</p>
	</div>

	{#if data.statistics.totalReviews === 0}
		<div
			class="mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-line bg-surface p-8 text-center backdrop-blur-xl"
		>
			<h2 class="text-2xl font-semibold text-ink">Ingen statistik än</h2>
			<p class="mt-3 text-sm leading-relaxed text-secondary">
				Statistiken vaknar till liv när den första recensionen har publicerats.
			</p>
			<a
				href={resolve('/')}
				class="mt-6 inline-flex rounded-full border border-line bg-surface-raised px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-secondary transition hover:bg-surface-raised hover:text-ink"
			>
				Till recensionerna
			</a>
		</div>
	{:else}
		<div class="mt-8 grid items-start gap-6 lg:grid-cols-2">
			<section class="glass-panel p-6 sm:p-8" aria-labelledby="overview-heading">
				<h2 id="overview-heading" class="text-2xl font-semibold text-ink">Överblick</h2>
				<dl class="mt-4 divide-y divide-line">
					{#each overview as item (item.label)}
						<div class="flex items-baseline justify-between gap-4 py-4">
							<dt class="min-w-0">
								<span class="font-semibold text-secondary">{item.label}</span>
								<span class="mt-1 block text-sm leading-relaxed text-muted">{item.note}</span>
							</dt>
							<dd class="shrink-0 text-xl font-semibold tabular-nums text-ink sm:text-2xl">
								{item.value}
							</dd>
						</div>
					{/each}
				</dl>
			</section>

			<section class="glass-panel p-6 sm:p-8" aria-labelledby="records-heading">
				<h2 id="records-heading" class="text-2xl font-semibold text-ink">Betyg och priser</h2>
				<p class="mt-3 text-sm leading-relaxed text-secondary">
					Literpriset gör olika förpackningsstorlekar jämförbara. Priserna gäller vid
					recensionstillfället.
				</p>
				<div class="mt-6 space-y-6">
					{#each rankings as ranking, index (ranking.title)}
						<section aria-labelledby={`ranking-${index}`} class="border-t border-line pt-5">
							<h3 id={`ranking-${index}`} class="text-lg font-semibold text-ink">
								{ranking.title}
							</h3>
							{#if ranking.products.length}
								<p class="mt-2 text-2xl font-semibold tabular-nums text-accent">
									{formatDecimal(ranking.products[0].value)}
									{ranking.unit}
								</p>
								<ul class="mt-3 space-y-2">
									{#each ranking.products as product (product.slug)}
										<li>
											<a
												href={resolve('/[slug]', { slug: product.slug }) + '/'}
												class="font-medium text-secondary underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent"
												>{product.title}</a
											>
										</li>
									{/each}
								</ul>
							{:else}<p class="mt-3 text-sm text-muted">{ranking.empty}</p>{/if}
						</section>
					{/each}
				</div>
			</section>
		</div>

		<section class="glass-panel mt-6 p-6 sm:p-8" aria-labelledby="nutrients-heading">
			<h2 id="nutrients-heading" class="text-2xl font-semibold text-ink">Innehållstoppen</h2>
			<p class="mt-3 max-w-prose leading-relaxed text-secondary">
				Vilken läsk har mest koffein, protein eller kolhydrater? Per 100 ml jämför koncentrationen;
				per förpackning visar mängden i hela den angivna volymen.
			</p>
			<p class="mt-2 max-w-prose text-sm leading-relaxed text-muted">
				Högst innehåll är inget kvalitetsbetyg. Kolhydrater är inte samma sak som socker. Bara
				angivna uppgifter ingår; en saknad mängd räknas inte som noll.
			</p>
			<div class="mt-8 grid gap-8 lg:grid-cols-3">
				{#each data.statistics.nutrients as nutrient (nutrient.key)}
					<section
						aria-labelledby={`nutrient-${nutrient.key}`}
						class="min-w-0 border-t border-line pt-5"
					>
						<h3 id={`nutrient-${nutrient.key}`} class="text-xl font-semibold text-ink">
							Mest {nutrient.label.toLowerCase()}
						</h3>
						{#each [{ basis: '100ml', label: 'Per 100 ml', products: nutrient.highestPer100Ml, count: nutrient.per100MlCount, unit: `${nutrient.unit}/100 ml` }, { basis: 'container', label: 'Per förpackning', products: nutrient.highestPerContainer, count: nutrient.perContainerCount, unit: nutrient.unit }] as ranking (ranking.basis)}
							<section aria-labelledby={`nutrient-${nutrient.key}-${ranking.basis}`} class="mt-6">
								<h4
									id={`nutrient-${nutrient.key}-${ranking.basis}`}
									class="text-sm font-semibold text-secondary"
								>
									{ranking.label}
								</h4>
								{#if ranking.products.length}
									<p class="mt-2 text-2xl font-semibold tabular-nums text-accent">
										{formatDrinkNumber(ranking.products[0].value)}
										{ranking.unit}
									</p>
									<ul class="mt-3 space-y-3">
										{#each ranking.products as product (product.slug)}
											<li>
												<a
													href={resolve('/[slug]', { slug: product.slug }) + '/'}
													class="font-medium text-secondary underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent"
													>{product.title}</a
												>
												<p class="mt-1 text-sm text-muted">
													Av {capitalizeAuthorName(
														product.author
													)}{#if ranking.basis === 'container'}
														· {product.volumeMl === undefined
															? 'Volym ej angiven'
															: formatDrinkVolume(product.volumeMl)}{/if}
												</p>
											</li>
										{/each}
									</ul>
									<p class="mt-3 text-sm text-muted">
										Baserat på {ranking.count}
										{ranking.count === 1 ? 'recension' : 'recensioner'} med jämförbar mängd.
									</p>
								{:else}<p class="mt-2 text-sm text-muted">Inga jämförbara uppgifter än.</p>{/if}
							</section>
						{/each}
					</section>
				{/each}
			</div>
		</section>

		{#if data.statistics.sodaReviewCount > 0}
			<section class="glass-panel mt-6 p-6 sm:p-8">
				<h2 class="text-2xl font-semibold text-ink">Läskens betygsprofil</h2>
				<p class="mt-2 text-sm leading-relaxed text-secondary">
					Snitt på skalan 0–5. Sötma och konsistens beskriver egenskaper, inte kvalitet.
				</p>
				<dl class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
					{#each data.statistics.ratingAverages as metric}
						{@const metadata = SODA_RATING_METRICS.find(({ key }) => key === metric.key)!}
						<div>
							<div class="flex items-baseline justify-between gap-3">
								<dt class="flex items-center gap-1 text-sm font-semibold text-secondary">
									{metadata.label}<HelpTip
										label={metadata.label}
										text={`${metadata.description} Baserat på ${metric.count} delbetyg.`}
									/>
								</dt>
								<dd class="text-sm text-ink">
									{formatDecimal(metric.average)}{metric.average === null ? '' : ' / 5'}
								</dd>
							</div>
							<div class="mt-2"><RatingCells value={metric.average ?? 0} /></div>
						</div>
					{/each}
				</dl>
			</section>
		{/if}
		<p class="mx-auto mt-4 w-full max-w-6xl text-xs leading-relaxed text-muted">
			Betyg, läskfavoriter och priser räknas per recension. Saknade uppgifter ingår inte i
			respektive snitt. Literpris beräknas från angivet pris och volym; eventuella kampanjpriser
			ingår. Priserna gäller vid recensionstillfället.
		</p>
	{/if}
</section>
