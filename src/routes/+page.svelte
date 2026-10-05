<script lang="ts">
	import { reviewerKey, reviewScore, selectReviewer, favoriteLabel } from '$lib/content/soda';
	import { capitalizeAuthorName } from '$lib/utils/authors';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { DRINK_CONTAINERS, DRINK_TYPE_FILTERS } from '$lib/review-metadata';
	import { matchesAdvancedFilters, readAdvancedFilters, parseMaxPrice } from '$lib/content/filters';
	import type { PublicReview } from '$lib/types/bar-review';

	type ReviewSort = 'latest' | 'oldest' | 'score';

	const sortOptions: Array<{ value: ReviewSort; label: string }> = [
		{ value: 'latest', label: 'Senaste' },
		{ value: 'oldest', label: 'Äldsta' },
		{ value: 'score', label: 'Högst betyg' }
	];

	let { data } = $props();
	let search = $state('');
	let sort = $state<ReviewSort>('latest');
	let reviewer = $state('');
	let drinkTypes = $state<string[]>([]);
	let brand = $state('');
	let container = $state('');
	let minRating = $state(0);
	let maxPrice = $state<number | undefined>(undefined);
	let favorite = $state(false);
	let filtersOpen = $state(false);
	const brands = $derived(
		[
			...new Set(
				(data.bars as PublicReview[])
					.map((bar) => bar.beerBrand?.trim())
					.filter((value): value is string => !!value)
			)
		].sort((a, b) => a.localeCompare(b, 'sv'))
	);
	const advancedFilters = $derived({ drinkTypes, brand, container, minRating, maxPrice, favorite });
	const activeFilterCount = $derived(
		drinkTypes.length +
			Number(!!brand) +
			Number(!!container) +
			Number(minRating > 0) +
			Number(maxPrice !== undefined) +
			Number(favorite)
	);
	const hasFilters = $derived(!!search || !!reviewer || activeFilterCount > 0);

	const reviewers = $derived.by(() => {
		const names = new Map<string, string>();
		for (const bar of data.bars)
			for (const name of [bar.author, ...(bar.coAuthors ?? [])]) names.set(reviewerKey(name), name);
		return [...names].sort((a, b) => a[1].localeCompare(b[1], 'sv'));
	});

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const filters = readAdvancedFilters(params, brands);
		({ brand, container, minRating, maxPrice, favorite } = filters);
		drinkTypes = filters.drinkTypes ?? [];
		filtersOpen = !!(
			drinkTypes.length ||
			brand ||
			container ||
			minRating ||
			maxPrice !== undefined ||
			favorite
		);
		search = (params.get('search') ?? '').slice(0, 80);
		sort = normalizeSort(params.get('sort'));
		const key = params.get('reviewer') ?? '';
		reviewer = reviewers.some(([name]) => name === key) ? key : '';
	});

	const normalize = (value: string) => value.toLowerCase();
	const normalizeSort = (value: string | null | undefined): ReviewSort => {
		if (value === 'oldest' || value === 'score') return value;
		return 'latest';
	};

	const getCreatedTime = (bar: PublicReview) => {
		const createdTime = new Date(bar.createdAt).getTime();
		return Number.isFinite(createdTime) ? createdTime : 0;
	};

	const compareByCreated = (
		first: PublicReview,
		second: PublicReview,
		direction: 'asc' | 'desc'
	) => {
		const firstCreated = getCreatedTime(first);
		const secondCreated = getCreatedTime(second);
		const createdDiff = firstCreated - secondCreated;

		if (createdDiff !== 0) {
			return direction === 'asc' ? createdDiff : -createdDiff;
		}

		return direction === 'asc'
			? first.slug.localeCompare(second.slug)
			: second.slug.localeCompare(first.slug);
	};

	const sortBars = (bars: PublicReview[], selectedSort: ReviewSort) => {
		return [...bars].sort((first, second) => {
			if (selectedSort === 'score') {
				const ratingDiff = second.rating - first.rating || reviewScore(second) - reviewScore(first);
				if (ratingDiff !== 0) return ratingDiff;
				return compareByCreated(first, second, 'desc');
			}

			if (selectedSort === 'oldest') {
				return compareByCreated(first, second, 'asc');
			}

			return compareByCreated(first, second, 'desc');
		});
	};

	const searchableBars = $derived.by(() => {
		const query = normalize(search.trim());
		const bars = (data.bars as PublicReview[])
			.map((bar) => selectReviewer(bar, reviewer))
			.filter((bar): bar is PublicReview => !!bar)
			.filter((bar) => matchesAdvancedFilters(bar, advancedFilters));
		const filteredBars = !query
			? bars
			: bars.filter((bar) => {
					const haystack = [
						bar.title,
						bar.location,
						bar.description,
						bar.beerBrand,
						bar.author,
						...(bar.coAuthors ?? [])
					]
						.filter(Boolean)
						.join(' ')
						.toLowerCase();

					return haystack.includes(query);
				});

		return sortBars(filteredBars, sort);
	});

	const updateUrl = (nextSearch: string, nextSort: ReviewSort) => {
		const params = new URLSearchParams(window.location.search);
		const trimmed = nextSearch.trim();

		if (trimmed) {
			params.set('search', trimmed);
		} else {
			params.delete('search');
		}

		if (nextSort === 'latest') {
			params.delete('sort');
		} else {
			params.set('sort', nextSort);
		}

		if (reviewer) params.set('reviewer', reviewer);
		else params.delete('reviewer');
		for (const [key, value] of Object.entries({
			brand,
			container,
			minRating: minRating || '',
			maxPrice: maxPrice ?? '',
			favorite: favorite ? '1' : ''
		})) {
			if (value !== '') params.set(key, String(value));
			else params.delete(key);
		}
		params.delete('drinkType');
		for (const type of drinkTypes) params.append('drinkType', type);
		const query = params.toString();
		const target = `${window.location.pathname}${query ? `?${query}` : ''}`;
		window.history.replaceState({}, '', target);
	};

	const resetFilters = () => {
		search = '';
		reviewer = '';
		drinkTypes = [];
		brand = '';
		container = '';
		minRating = 0;
		maxPrice = undefined;
		favorite = false;
		updateUrl(search, sort);
	};

	const handleSearch = (value: string) => {
		search = value;
		updateUrl(value, sort);
	};

	const handleSortChange = (event: Event) => {
		const nextSort = normalizeSort((event.currentTarget as HTMLSelectElement).value);
		sort = nextSort;
		updateUrl(search, nextSort);
	};
</script>

<svelte:head>
	<title>En Stor Läsk Review</title>
	<meta
		name="description"
		content="Läskrecensioner med fokus på smak, kolsyra och prisvärdhet. Hitta din nästa favorit hos En Stor Läsk Review."
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
		<p class="text-xs font-semibold uppercase tracking-[0.34em] text-accent">En stor läsk review</p>
		<h1 class="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-ink sm:text-5xl">
			Hitta din nästa favoritläsk.
		</h1>
		<p class="mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
			Smak, bubblor och betyg. Hitta något gott till nästa glas.
		</p>

		<div
			class="mt-6 rounded-2xl border border-line bg-surface-raised p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:p-5"
		>
			<div class="grid grid-cols-2 gap-3 lg:flex lg:items-end">
				<div class="col-span-2 flex min-w-0 flex-1 items-center gap-2">
					<div class="min-w-0 flex-1">
						<SearchBar value={search} onSearch={handleSearch} />
					</div>
					<button
						type="button"
						aria-label={`Avancerade filter${activeFilterCount ? ` (${activeFilterCount} aktiva)` : ''}`}
						title="Avancerade filter"
						aria-expanded={filtersOpen}
						aria-controls="advanced-filters"
						onclick={() => (filtersOpen = !filtersOpen)}
						class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line hover:bg-surface focus-visible:outline-accent {filtersOpen ||
						activeFilterCount > 0
							? 'bg-surface text-accent'
							: 'bg-surface-raised text-secondary'}"
					>
						<SlidersHorizontal size={20} strokeWidth={1.5} aria-hidden="true" />
						{#if activeFilterCount > 0}
							<span
								aria-hidden="true"
								class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-surface"
								>{activeFilterCount}</span
							>
						{/if}
					</button>
				</div>
				<label class="flex min-w-0 shrink-0 flex-col gap-1 lg:w-48">
					<span class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted"
						>Recensent</span
					>
					<select
						bind:value={reviewer}
						onchange={() => updateUrl(search, sort)}
						class="h-11 w-full rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-secondary focus:ring-2 focus:ring-red-300"
					>
						<option value="">Alla recensenter</option>
						{#each reviewers as [key, name]}<option value={key}>{capitalizeAuthorName(name)}</option
							>{/each}
					</select>
				</label>
				<label class="flex min-w-0 shrink-0 flex-col gap-1 lg:w-48">
					<span class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
						Sortera
					</span>
					<select
						value={sort}
						onchange={handleSortChange}
						class="h-11 w-full rounded-2xl border border-line bg-surface-raised px-4 text-sm font-semibold text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none backdrop-blur-md focus:ring-2 focus:ring-red-300"
					>
						{#each sortOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>
			<div id="advanced-filters" class="mt-4 border-t border-line pt-4" hidden={!filtersOpen}>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<label class="flex flex-col gap-2 text-sm text-secondary">
						Märke
						<select
							bind:value={brand}
							onchange={() => updateUrl(search, sort)}
							class="h-11 w-full rounded-2xl border border-line bg-surface-raised px-3 text-ink focus:ring-2 focus:ring-red-300"
						>
							<option value="">Alla märken</option>
							{#each brands as name}<option value={name}>{name}</option>{/each}
						</select>
					</label>
					<label class="flex flex-col gap-2 text-sm text-secondary">
						Förpackning
						<select
							bind:value={container}
							onchange={() => updateUrl(search, sort)}
							class="h-11 w-full rounded-2xl border border-line bg-surface-raised px-3 text-ink focus:ring-2 focus:ring-red-300"
						>
							<option value="">Alla förpackningar</option>
							{#each DRINK_CONTAINERS as name}<option value={name}>{name}</option>{/each}
						</select>
					</label>
					<label class="flex flex-col gap-2 text-sm text-secondary">
						Lägsta betyg
						<select
							bind:value={minRating}
							onchange={() => updateUrl(search, sort)}
							class="h-11 w-full rounded-2xl border border-line bg-surface-raised px-3 text-ink focus:ring-2 focus:ring-red-300"
						>
							<option value={0}>Alla betyg</option>
							<option value={1}>Minst 1 av 3</option>
							<option value={2}>Minst 2 av 3</option>
							<option value={3}>3 av 3</option>
						</select>
					</label>
					<label class="flex flex-col gap-2 text-sm text-secondary">
						Högsta pris (kr)
						<input
							type="number"
							min="0"
							step="any"
							value={maxPrice ?? ''}
							placeholder="Inget pristak"
							oninput={(event) => {
								maxPrice = parseMaxPrice(event.currentTarget.value);
								updateUrl(search, sort);
							}}
							class="h-11 w-full rounded-2xl border border-line bg-surface-raised px-3 text-ink placeholder:text-muted focus:ring-2 focus:ring-red-300"
						/>
					</label>
				</div>
				<fieldset class="mt-4">
					<legend class="text-sm text-secondary">Dryckstyp (kombinera val)</legend>
					<div class="flex flex-wrap gap-x-5">
						{#each DRINK_TYPE_FILTERS as type}
							<label class="flex min-h-11 items-center gap-2 text-sm text-secondary">
								<input
									type="checkbox"
									value={type.value}
									bind:group={drinkTypes}
									onchange={() => updateUrl(search, sort)}
									class="h-4 w-4 accent-red-400"
								/>{type.label}
							</label>
						{/each}
					</div>
				</fieldset>
				<label class="mt-4 flex min-h-11 items-center gap-3 text-sm text-secondary">
					<input
						type="checkbox"
						bind:checked={favorite}
						onchange={() => updateUrl(search, sort)}
						class="h-4 w-4 accent-red-400"
					/>
					Endast läskfavoriter
				</label>
				<p class="mt-2 text-xs text-muted">
					Filtren gäller vald recensent. Pristak kräver angivet pris.
				</p>
			</div>
			{#if hasFilters}
				<div
					class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
				>
					{#if activeFilterCount > 0}
						<p role="status" class="text-sm text-muted">
							Visar {searchableBars.length} av {data.bars.length} läsk
						</p>
					{/if}
					<button
						type="button"
						onclick={resetFilters}
						class="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-secondary hover:bg-surface focus-visible:outline-accent"
						>Rensa filter</button
					>
				</div>
			{/if}
		</div>
	</div>

	{#if searchableBars.length === 0}
		<div
			class="mx-auto mt-8 w-full max-w-6xl rounded-2xl border border-line bg-surface p-6 text-center"
		>
			<h2 class="text-xl font-semibold text-ink">Ingen läsk matchar dina filter</h2>
			<p class="mt-2 text-sm text-secondary">Prova att ändra sökningen eller rensa filtren.</p>
		</div>
	{/if}

	<div class="mx-auto mt-8 grid w-full max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
		{#each searchableBars as bar}
			<a href={resolve('/[slug]', { slug: bar.slug }) + '/'} class="block hover:no-underline">
				<Card
					drink={bar}
					title={bar.title}
					description={bar.description}
					rating={bar.rating}
					favorite={favoriteLabel(bar)}
					location={bar.location}
					beerBrand={bar.beerBrand}
					beerPriceKr={bar.beerPriceKr}
					isHappyHourPrice={bar.isHappyHourPrice}
					image={bar.image}
					imageFocusX={bar.imageFocusX}
					imageFocusY={bar.imageFocusY}
					imageZoom={bar.imageZoom}
					author={bar.author}
					coAuthors={bar.coAuthors}
				/>
			</a>
		{/each}
	</div>
</section>
