<script lang="ts">
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { pageSeo, structuredDataScript, SITE_NAME } from '$lib/content/seo';

	const seo = $derived(
		pageSeo(page.route.id, base, page.data.bar, page.status, {
			search: browser ? page.url.search : '',
			reviews: page.data.bars
		})
	);
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta name="robots" content={seo.noindex ? 'noindex, follow' : 'index, follow'} />
	{#if seo.canonical}
		<link rel="canonical" href={seo.canonical} />
		<meta property="og:url" content={seo.canonical} />
	{/if}
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="sv_SE" />
	<meta property="og:type" content={seo.type} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.image} />
	<meta property="og:image:alt" content={seo.imageAlt} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image} />
	<meta name="twitter:image:alt" content={seo.imageAlt} />
	{#if seo.structuredData}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- serializeStructuredData escapes HTML delimiters. -->
		{@html structuredDataScript(seo.structuredData)}
	{/if}
</svelte:head>
