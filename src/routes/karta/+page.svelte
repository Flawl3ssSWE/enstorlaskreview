<script lang="ts">
	import ReviewMap from '$lib/components/ReviewMap.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const mapData = $derived(data.map);
</script>

<svelte:head>
	<title>Karta</title>
	<meta name="description" content="Se var vi har provat läsk och läs recensionerna på kartan." />
</svelte:head>

<section class="relative overflow-hidden px-4 pb-14 pt-8 sm:px-8 sm:pt-10">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="absolute -left-24 top-0 h-72 w-72 rounded-full bg-surface-raised blur-3xl"></div>
		<div class="absolute right-0 top-20 h-80 w-80 rounded-full bg-red-950/25 blur-3xl"></div>
		<div class="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-950/20 blur-3xl"></div>
	</div>

	<div class="mx-auto w-full max-w-6xl">
		<div
			class="rounded-[2rem] border border-line bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_-34px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-8"
		>
			<p class="text-xs font-semibold uppercase tracking-[0.34em] text-muted">
				En stor läsk review
			</p>
			<h1 class="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-5xl">
				Upptäck läsk på kartan.
			</h1>
			<div class="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
				<p>Här har vi provat läsk. Tryck på en punkt för att läsa recensionen.</p>
			</div>
		</div>

		<div class="mt-6">
			<ReviewMap markers={mapData.markers} />
		</div>

		{#if mapData.totalReviews === 0}
			<p
				class="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
			>
				Det finns inga publicerade recensioner att visa ännu.
			</p>
		{:else if mapData.markers.length === 0}
			<p
				class="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
			>
				Det finns ännu inga sparade kartpositioner för recensionerna.
			</p>
		{/if}
	</div>
</section>
