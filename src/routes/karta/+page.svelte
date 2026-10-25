<script lang="ts">
	import ReviewMap from '$lib/components/ReviewMap.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const mapData = $derived(data.map);
</script>

<section class="page-shell">
	<div class="mx-auto w-full max-w-6xl">
		<div class="space-y-2">
			<h1 class="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
				Upptäck läsk på kartan.
			</h1>
			<div class="text-base leading-relaxed text-secondary">
				<p>Här har vi provat läsk. Tryck på en punkt för att läsa recensionen.</p>
			</div>
		</div>

		<div class="mt-4">
			<ReviewMap markers={mapData.markers} />
		</div>

		{#if mapData.totalReviews === 0}
			<p class="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-secondary">
				Det finns inga publicerade recensioner att visa ännu.
			</p>
		{:else if mapData.markers.length === 0}
			<p class="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-secondary">
				Det finns ännu inga sparade kartpositioner för recensionerna.
			</p>
		{/if}
	</div>
</section>
