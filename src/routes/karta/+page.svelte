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

<section class="page-shell">
	<div class="mx-auto w-full max-w-6xl">
		<div class="space-y-4">
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
