<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		OVERALL_RATING_LEVELS,
		SODA_RATING_METRICS,
		REVIEW_RATING_METRICS
	} from '$lib/review-metadata';
	import RatingMug from '$lib/components/RatingMug.svelte';
	import {
		CALIBRATION_METRICS,
		calibrateOverview,
		defaultCalibrationWeights
	} from '$lib/content/score-calibration';
	import { formatAuthors } from '$lib/utils/authors';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let search = $state('');
	let weights = $state(defaultCalibrationWeights());
	const weightTotal = $derived(CALIBRATION_METRICS.reduce((sum, { key }) => sum + weights[key], 0));
	const calibrated = $derived(data.reviews.map((review) => calibrateOverview(review, weights)));
	let selectedMetric = $state('taste');
	const metricOptions = [
		...SODA_RATING_METRICS.map(({ key, label }) => ({ key, label })),
		{ key: 'sweetnessBalance', label: 'Sötmabalans i formeln' },
		...REVIEW_RATING_METRICS.map(({ key, label }) => ({ key, label }))
	];
	const metricLabel = $derived(metricOptions.find(({ key }) => key === selectedMetric)!.label);
	function metricValue(review: PageProps['data']['reviews'][number]): number | undefined {
		return selectedMetric === 'sweetnessBalance'
			? review.sweetnessBalance
			: review.metrics.find(({ key }) => key === selectedMetric)?.value;
	}
	type SortKey =
		| 'title'
		| 'author'
		| 'model'
		| 'score'
		| 'rating'
		| 'remaining'
		| 'favorite'
		| 'repurchasePotential'
		| 'metrics';
	let sort = $state<SortKey>('score');
	let descending = $state(true);
	const columns: { key: SortKey; label: string; width: number }[] = [
		{ key: 'title', label: 'Recension', width: 17 },
		{ key: 'author', label: 'Recensent', width: 9 },
		{ key: 'model', label: 'Beräkning', width: 10 },
		{ key: 'score', label: 'Poäng', width: 7 },
		{ key: 'rating', label: 'Betyg', width: 8 },
		{ key: 'remaining', label: 'Nästa', width: 11 },
		{ key: 'metrics', label: 'Delbetyg', width: 18 },
		{ key: 'favorite', label: 'Läskfavorit', width: 8 },
		{ key: 'repurchasePotential', label: 'Återköpspotential', width: 12 }
	];
	function sortBy(key: SortKey) {
		descending =
			sort === key
				? !descending
				: ['score', 'rating', 'favorite', 'repurchasePotential', 'metrics'].includes(key);
		sort = key;
	}
	const number = (value: number) => value.toLocaleString('sv-SE', { maximumFractionDigits: 3 });
	const rows = $derived(
		calibrated
			.filter((review) =>
				`${review.title} ${formatAuthors(review.author, review.coAuthors)}`
					.toLocaleLowerCase('sv')
					.includes(search.trim().toLocaleLowerCase('sv'))
			)
			.toSorted((a, b) => {
				const left = sort === 'metrics' ? metricValue(a) : a[sort];
				const right = sort === 'metrics' ? metricValue(b) : b[sort];
				if (left === null || left === undefined)
					return right === null || right === undefined ? a.title.localeCompare(b.title, 'sv') : 1;
				if (right === null || right === undefined) return -1;
				const order =
					typeof left === 'string'
						? left.localeCompare(String(right), 'sv')
						: Number(left) - Number(right);
				return (
					(descending ? -order : order) ||
					a.title.localeCompare(b.title, 'sv') ||
					a.slug.localeCompare(b.slug)
				);
			})
	);
	const bandCounts = $derived(
		OVERALL_RATING_LEVELS.map(
			({ rating }) => rows.filter((review) => review.isSoda && review.rating === rating).length
		)
	);
</script>

<section class="mx-auto w-full max-w-[100rem] space-y-6 px-4 pb-14 pt-8 sm:px-6 sm:pt-10 lg:px-8">
	<header class="space-y-3">
		<h1 class="text-3xl font-semibold text-ink sm:text-4xl">Recensionsöversikt</h1>
		<p class="max-w-3xl text-secondary">
			Alla publicerade recensioner med beräknad poäng och helhetsbetyg. Sidan är inte
			lösenordsskyddad och finns inte i den vanliga menyn.
		</p>
		<a
			href={resolve('/skapa') + '/'}
			class="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:text-accent"
			>Skapa eller redigera recension</a
		>
	</header>

	<section class="glass-panel p-5 sm:p-6" aria-labelledby="thresholds-heading">
		<h2 id="thresholds-heading" class="text-xl font-semibold text-ink">Gränser för helhetsbetyg</h2>
		<div class="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
			{#each OVERALL_RATING_LEVELS as level, index (level.rating)}
				<div class="rounded-xl border border-line p-3" data-rating-band={level.rating}>
					<RatingMug rating={level.rating} />
					<p class="mt-2 text-sm text-secondary">
						{number(level.minimum)} till {#if OVERALL_RATING_LEVELS[index + 1]}under {number(
								OVERALL_RATING_LEVELS[index + 1].minimum
							)}{:else}5{/if} poäng
					</p>
					<p class="mt-3 text-lg font-semibold tabular-nums text-ink">
						{bandCounts[index]}
						{bandCounts[index] === 1 ? 'läskrecension' : 'läskrecensioner'}
					</p>
				</div>
			{/each}
		</div>
		<p class="mt-4 text-sm text-muted">
			Antalen gäller läskrecensioner som matchar sökningen. Varje recension räknas separat;
			platsrecensioner ingår inte. Poängen visas med upp till tre decimaler. Betyg och avstånd till
			nästa gräns beräknas före avrundning.
		</p>
		<details class="mt-4 text-sm text-secondary">
			<summary class="min-h-11 cursor-pointer py-3 font-semibold text-ink"
				>Så räknas poängen</summary
			>
			<ul class="mt-2 grid gap-2 sm:grid-cols-2">
				{#each SODA_RATING_METRICS.filter(({ weight }) => weight > 0) as metric (metric.key)}
					<li>
						{metric.key === 'sweetness' ? 'Sötmabalans' : metric.label}: {number(
							metric.weight * 100
						)} %
					</li>
				{/each}
			</ul>
			<p class="mt-4">
				Sötmabalans = sötma ÷ 3 × 5 när sötman är 0–3, annars (5 − sötma) ÷ 2 × 5. Sötma 3 ger
				alltså högsta balanspoängen. Kolsyra går från 0 = avslagen till 5 = väldigt kolsyrad och
				räknas direkt. Konsistensens rinnighet påverkar inte totalen.
			</p>
			<p class="mt-3">
				Äldre läskrecensioner utan passande konsistens använder snittet av smak, kolsyra,
				drickbarhet, matchar namnet och prisvärdhet. Platsrecensioner använder sina egna vikter.
				Läskfavorit, återköpspotential och separata platsbetyg påverkar inte läskbetyget.
			</p>
		</details>
	</section>

	<details class="glass-panel p-5 sm:p-6">
		<summary class="min-h-11 cursor-pointer py-2 text-xl font-semibold text-ink">
			Kalibrera poängen
		</summary>
		<p id="calibration-help" class="mt-3 max-w-3xl text-sm text-secondary">
			Prova olika procentvikter för den viktade läskmodellen. Poäng, helhetsbetyg, nästa gräns och
			antal uppdateras direkt i tabellen. Ändringarna gäller bara här och sparas inte. Äldre
			läskmodeller och platsmodeller behåller sina beräkningar.
		</p>
		<p class="mt-3 text-sm text-secondary">
			Summa: {number(weightTotal)} %. Vikterna normaliseras till 100 % i beräkningen.
			{#if weightTotal === 0}När alla vikter är 0 används standardvikterna.{/if}
		</p>
		<div class="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each CALIBRATION_METRICS as metric (metric.key)}
				<label class="block min-w-0 text-sm text-ink">
					<span class="flex items-center justify-between gap-3">
						<span>{metric.key === 'sweetness' ? 'Sötmabalans' : metric.label}</span>
						<span class="tabular-nums">{weights[metric.key]} %</span>
					</span>
					<input
						type="range"
						min="0"
						max="100"
						step="1"
						bind:value={weights[metric.key]}
						aria-describedby="calibration-help"
						aria-valuetext={`${weights[metric.key]} procent`}
						class="min-h-11 w-full cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
					/>
				</label>
			{/each}
		</div>
		<button
			type="button"
			onclick={() => (weights = defaultCalibrationWeights())}
			class="mt-4 min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:text-accent"
			>Återställ standardvikter</button
		>
	</details>

	<label class="block max-w-xl space-y-2"
		><span class="field-label">Sök recension eller recensent</span><input
			class="field"
			type="search"
			bind:value={search}
		/></label
	>
	<p class="text-sm text-secondary" role="status">
		Visar {rows.length} av {data.reviews.length} recensioner. Streck (–) betyder att valt delbetyg saknas
		eller inte ingår i recensionens modell.
	</p>
	<!-- Keyboard users can scroll the full table on narrow screens. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="max-w-full overflow-x-auto rounded-2xl border border-line bg-surface focus-visible:outline-2 focus-visible:outline-accent"
		role="region"
		aria-label="Recensionstabell"
		tabindex="0"
	>
		<table class="w-full min-w-6xl table-fixed text-left text-sm">
			<caption class="sr-only"
				>Alla publicerade recensioner och deras poäng. Klicka på en kolumnrubrik för att sortera.</caption
			>
			<thead class="border-b border-line bg-surface-raised text-secondary"
				><tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							style:width={`${column.width}%`}
							class="break-words px-3 py-2 align-top font-semibold"
							aria-sort={sort === column.key
								? descending
									? 'descending'
									: 'ascending'
								: undefined}
						>
							{#if column.key === 'metrics'}
								<div class="flex items-center gap-1">
									<select
										class="field h-11 min-h-11! min-w-0 flex-1 px-2 py-2 text-sm"
										aria-label="Välj delbetyg"
										bind:value={selectedMetric}
									>
										<optgroup label="Läskbetyg"
											>{#each SODA_RATING_METRICS as metric (metric.key)}<option value={metric.key}
													>{metric.label}</option
												>{/each}<option value="sweetnessBalance">Sötmabalans i formeln</option
											></optgroup
										>
										<optgroup label="Platsbetyg"
											>{#each REVIEW_RATING_METRICS as metric (metric.key)}<option
													value={metric.key}>{metric.label}</option
												>{/each}</optgroup
										>
									</select>
									<button
										type="button"
										onclick={() => sortBy('metrics')}
										aria-label={`Sortera efter ${metricLabel}`}
										title={`Sortera efter ${metricLabel}`}
										class="inline-flex size-11 shrink-0 items-center justify-center rounded-sm hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
										><span aria-hidden="true"
											>{sort === 'metrics' ? (descending ? '↓' : '↑') : '↕'}</span
										></button
									>
								</div>
							{:else}
								<button
									type="button"
									onclick={() => {
										sortBy(column.key);
									}}
									class="flex min-h-11 w-full flex-wrap items-center gap-1 rounded-sm text-left hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
								>
									<span>{column.label}</span><span aria-hidden="true"
										>{sort === column.key ? (descending ? '↓' : '↑') : '↕'}</span
									>
								</button>{/if}
						</th>
					{/each}
				</tr></thead
			>
			<tbody class="divide-y divide-line">
				{#each rows as review (review.slug)}
					<tr data-review={review.slug} class="align-top text-secondary">
						<th scope="row" class="break-words p-3 font-semibold"
							><a
								href={resolve('/[slug]', { slug: review.slug }) + '/'}
								class="text-ink underline decoration-line underline-offset-4 hover:text-accent"
								>{review.title}</a
							></th
						>
						<td class="break-words p-3">{formatAuthors(review.author, review.coAuthors)}</td>
						<td class="p-3">{review.model}</td>
						<td
							class="p-3 font-semibold tabular-nums text-ink"
							title={review.score.toLocaleString('sv-SE', { maximumFractionDigits: 15 })}
							>{number(review.score)}<span class="block text-xs font-normal text-muted">av 5</span
							></td
						>
						<td class="p-3 text-ink"><RatingMug rating={review.rating} /></td>
						<td class="p-3 tabular-nums"
							>{#if review.remaining === null}Högsta betyg{:else}{review.remaining < 0.001
									? '<0,001'
									: number(review.remaining)}<span class="block text-xs text-muted"
									>till {review.nextRating}/3</span
								>{/if}</td
						>
						<td class="p-3 tabular-nums" data-metric={selectedMetric}
							>{metricValue(review) === undefined ? '–' : `${number(metricValue(review)!)} / 5`}</td
						>
						<td class="p-3"
							>{review.favorite === undefined ? 'Ej angivet' : review.favorite ? 'Ja' : 'Nej'}</td
						>
						<td class="p-3 tabular-nums"
							>{review.repurchasePotential === undefined
								? 'Ej angivet'
								: `${review.repurchasePotential}/5`}</td
						>
					</tr>
				{:else}<tr
						><td colspan="9" class="p-6 text-center text-muted">Inga recensioner att visa.</td></tr
					>{/each}
			</tbody>
		</table>
	</div>
</section>
