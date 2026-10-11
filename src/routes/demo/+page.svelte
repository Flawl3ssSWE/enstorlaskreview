<script lang="ts">
	import ReviewPage from '$lib/components/ReviewPage.svelte';
	import imageSrc from '$lib/images/demo-soda.webp';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<ReviewPage {data} {imageSrc} demo />
