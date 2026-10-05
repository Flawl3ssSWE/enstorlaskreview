<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Ändringshistorik på GitHub</title>
	<meta http-equiv="refresh" content={`0;url=${data.historyUrl}`} />
	<meta name="robots" content="noindex" />
</svelte:head>
<section class="mx-auto max-w-4xl px-4 py-12">
	<h1 class="text-3xl font-semibold text-ink">Ändringshistorik på GitHub</h1>
	<a class="mt-4 inline-block text-secondary underline" href={data.historyUrl}
		>Visa ändringshistorik på GitHub</a
	>
</section>
