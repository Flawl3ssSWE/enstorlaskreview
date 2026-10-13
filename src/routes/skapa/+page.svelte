<script lang="ts">
	import ReviewEditor from '$lib/components/ReviewEditor.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<ReviewEditor {data} />
