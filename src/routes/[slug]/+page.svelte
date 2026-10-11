<script lang="ts">
	import ReviewPage from '$lib/components/ReviewPage.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<ReviewPage {data} />
