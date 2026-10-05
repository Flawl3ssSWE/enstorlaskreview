<script lang="ts">
	import { REPURCHASE_POTENTIAL_LABELS } from '$lib/review-metadata';

	let { score }: { score?: number } = $props();
</script>

{#if score !== undefined}
	<p class="text-sm text-secondary">
		Återköpspotential: <strong class="font-semibold text-ink">{score}/5</strong>
		<span class="text-muted"> – {REPURCHASE_POTENTIAL_LABELS[score]}</span>
	</p>
{/if}
