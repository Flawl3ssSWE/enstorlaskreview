<script lang="ts">
	import { resolve } from '$app/paths';
	import HelpTip from '$lib/components/HelpTip.svelte';
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
	const cards = $derived([
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
			title: 'Högst läskbetyg',
			products: data.statistics.topRatedProducts,
			unit: '/ 5',
			empty: 'Inga läskbetyg än.'
		},
		{
			title: 'Lägst literpris',
			products: data.statistics.bestValueProducts,
			unit: 'kr/l',
			empty: 'Inga recensioner med både pris och volym än.'
		}
	]);
</script>

<svelte:head>
	<title>Statistik</title>
	<meta
		name="description"
		content="Smak, kolsyra, läskfavoriter och literpriser från våra läskrecensioner"
	/>
</svelte:head>

<section class="relative overflow-hidden px-4 pb-14 pt-8 sm:px-8 sm:pt-10">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="absolute -left-24 top-0 h-72 w-72 rounded-full bg-surface-raised blur-3xl"></div>
		<div class="absolute right-0 top-20 h-80 w-80 rounded-full bg-red-950/25 blur-3xl"></div>
		<div class="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-950/20 blur-3xl"></div>
	</div>

	<div
		class="mx-auto w-full max-w-6xl rounded-[2rem] border border-line bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_-34px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-8"
	>
		<p class="text-xs font-semibold uppercase tracking-[0.34em] text-muted">En stor läsk review</p>
		<h1 class="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-5xl">Läsk i siffror.</h1>
		<p class="mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
			Favoriter, betyg och priser från våra recensioner.
		</p>
	</div>

	{#if data.statistics.totalReviews === 0}
		<div
			class="mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-line bg-surface p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur-xl"
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
		<div class="mx-auto mt-8 grid w-full max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each cards as card}
				<div
					class="rounded-3xl border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur-xl"
				>
					<div class="flex items-center gap-1">
						<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{card.label}</p>
						<HelpTip label={card.label} text={card.note} />
					</div>
					<p class="mt-3 text-4xl font-bold text-ink">{card.value}</p>
				</div>
			{/each}
		</div>

		<div class="mx-auto mt-5 grid w-full max-w-6xl grid-cols-1 gap-5 lg:grid-cols-2">
			{#each rankings as ranking}
				<section
					class="rounded-3xl border border-line bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur-xl"
				>
					<h2 class="text-xl font-semibold text-ink">{ranking.title}</h2>
					{#if ranking.products.length}
						<p class="mt-3 text-4xl font-bold text-accent">
							{formatDecimal(ranking.products[0].value)}
							<span class="text-2xl">{ranking.unit}</span>
						</p>
						<ul class="mt-5 space-y-2">
							{#each ranking.products as product (product.slug)}
								<li>
									<a
										href={resolve('/[slug]', { slug: product.slug }) + '/'}
										class="text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
										>{product.title}</a
									>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mt-3 text-sm text-secondary">{ranking.empty}</p>
					{/if}
				</section>
			{/each}
		</div>

		{#if data.statistics.sodaReviewCount > 0}
			<section
				class="mx-auto mt-5 w-full max-w-6xl rounded-3xl border border-line bg-surface p-6 backdrop-blur-xl"
			>
				<h2 class="text-xl font-semibold text-ink">Läskens betygsprofil</h2>
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
							<div
								aria-hidden="true"
								class="mt-2 h-2 overflow-hidden rounded-full bg-surface-raised"
							>
								<div
									class="h-full rounded-full bg-accent"
									style:width={`${(metric.average ?? 0) * 20}%`}
								></div>
							</div>
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
