<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const heading = $derived(
		page.status === 404 ? '419 Läsken är inte recenserad' : `${page.status} Något gick fel`
	);
</script>

<div class="page-shell">
	<div
		class="rounded-3xl border border-line bg-surface px-6 py-12 text-center backdrop-blur-xl sm:p-12"
	>
		<h1 class="text-balance text-3xl font-semibold text-ink sm:text-4xl">{heading}</h1>
		<a href={resolve('/')} class="btn btn-secondary mt-8"> Till startsidan </a>
	</div>
</div>
