<script lang="ts">
	import { base } from '$app/paths';
	import Navbar from '../lib/components/Navbar.svelte';
	import '@fontsource/archivo/latin-500.css';
	import '@fontsource/archivo/latin-600.css';
	import '@fontsource/archivo/latin-700.css';
	import '@fontsource/archivo/latin-800.css';
	import '@fontsource/ibm-plex-sans/latin-400.css';
	import '@fontsource/ibm-plex-sans/latin-500.css';
	import '@fontsource/ibm-plex-sans/latin-600.css';
	import '@fontsource/ibm-plex-sans/latin-700.css';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title="En Stor Läsk Review"
		href={`${base}/rss.xml`}
	/>
</svelte:head>

<Navbar />

<main class="flex-1">
	{@render children?.()}
</main>

<footer
	class="flex h-16 flex-none items-center justify-center border-t border-line px-4 text-sm text-muted"
>
	<p class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 text-center">
		<span>
			Se även
			<a
				href="https://enstorstarkreview.se/"
				class="font-semibold text-secondary underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
			>
				En Stor Stark Review
			</a>
		</span>
		<a
			href={`${base}/rss.xml`}
			class="font-semibold text-secondary underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
			>RSS-flöde</a
		>
	</p>
</footer>
