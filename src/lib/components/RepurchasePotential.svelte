<script lang="ts">
	import {
		REPURCHASE_POTENTIAL_LABELS,
		TASTING_MIN_RATING,
		TASTING_REPURCHASE_POTENTIAL_LABELS
	} from '$lib/review-metadata';

	let { score, tasting = false }: { score?: number; tasting?: boolean } = $props();
</script>

{#if score !== undefined}
	<p class="text-sm text-secondary">
		Återköpspotential: <strong class="font-semibold text-ink">{score}/5</strong>
		<span class="text-muted">
			– {tasting
				? TASTING_REPURCHASE_POTENTIAL_LABELS[score - TASTING_MIN_RATING]
				: REPURCHASE_POTENTIAL_LABELS[score]}</span
		>
	</p>
{/if}
