<script lang="ts">
	import Info from '@lucide/svelte/icons/info';
	import type { Snippet } from 'svelte';

	let {
		active,
		field,
		message = 'Värdet har fyllts i automatiskt. Du kan ändra det själv.',
		kind = 'select',
		children
	}: {
		active: boolean;
		field: string;
		message?: string;
		kind?: 'input' | 'select';
		children: Snippet;
	} = $props();
	const id = $props.id();
	let open = $state(false);
	$effect(() => {
		if (!active) open = false;
	});
</script>

<div class="relative" class:automatic-field={active}>
	{@render children()}
	{#if active}
		<div class="absolute bottom-2 {kind === 'select' ? 'right-10' : 'right-2'}">
			<button
				type="button"
				aria-label={`Automatiskt ifyllt: ${field}`}
				aria-expanded={open}
				aria-controls={id}
				aria-describedby={open ? id : undefined}
				title={message}
				onclick={() => (open = !open)}
				onblur={() => (open = false)}
				onkeydown={(event) => {
					if (event.key === 'Escape') {
						open = false;
						event.stopPropagation();
					}
				}}
				class="flex size-8 items-center justify-center rounded-full text-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
			>
				<Info size={16} aria-hidden="true" />
			</button>
			<span
				{id}
				hidden={!open}
				class="absolute right-0 bottom-full z-30 mb-2 w-56 max-w-[calc(100vw-4rem)] rounded-xl border border-line bg-surface-raised p-3 text-sm text-ink shadow-lg"
				>{message}</span
			>
		</div>
	{/if}
</div>

<style>
	.automatic-field :global(input[data-automatic='true']) {
		padding-right: 3rem;
	}
	.automatic-field :global(select[data-automatic='true']) {
		padding-right: 5rem;
	}
</style>
