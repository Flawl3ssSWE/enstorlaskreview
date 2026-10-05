<script lang="ts">
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

<Navbar />

<main class="flex-1">
	{@render children?.()}
</main>

<footer
	class="flex h-16 flex-none items-center justify-center border-t border-line px-4 text-sm text-muted"
>
	<p class="mx-auto max-w-6xl text-center">
		Se även
		<a
			href="https://enstorstarkreview.se/"
			class="font-semibold text-secondary underline decoration-line underline-offset-4 transition-colors hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
		>
			En Stor Stark Review
		</a>
	</p>
</footer>
