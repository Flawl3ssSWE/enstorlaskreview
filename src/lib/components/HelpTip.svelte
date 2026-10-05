<script lang="ts">
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import { onDestroy } from 'svelte';

	const generatedId = $props.id();
	let { label, text, id = generatedId }: { label: string; text: string; id?: string } = $props();
	let trigger: HTMLButtonElement;
	let panel: HTMLDivElement;
	let open = $state(false);
	let closeTimer: ReturnType<typeof setTimeout>;
	onDestroy(() => clearTimeout(closeTimer));

	function show() {
		clearTimeout(closeTimer);
		panel.showPopover();
		const rect = trigger.getBoundingClientRect();
		const margin = 16;
		panel.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - panel.offsetWidth - margin))}px`;
		const below = rect.bottom + 8;
		panel.style.top = `${below + panel.offsetHeight <= window.innerHeight - margin ? below : Math.max(margin, rect.top - panel.offsetHeight - 8)}px`;
	}

	function hide() {
		clearTimeout(closeTimer);
		panel?.hidePopover();
	}

	function leave() {
		closeTimer = setTimeout(() => {
			if (document.activeElement !== trigger) hide();
		}, 150);
	}
</script>

<svelte:window onresize={hide} />

<button
	bind:this={trigger}
	type="button"
	aria-label={`Om ${label.toLocaleLowerCase('sv-SE')}`}
	aria-describedby={id}
	aria-expanded={open}
	aria-controls={id}
	onpointerenter={show}
	onpointerleave={leave}
	onfocus={show}
	onblur={hide}
	onclick={show}
	class="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
>
	<CircleHelp size={16} aria-hidden="true" />
</button>
<div
	bind:this={panel}
	{id}
	popover="auto"
	role="tooltip"
	ontoggle={() => (open = panel.matches(':popover-open'))}
	onpointerenter={() => clearTimeout(closeTimer)}
	onpointerleave={leave}
	class="fixed m-0 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface-raised p-3 text-left text-sm font-normal normal-case leading-relaxed tracking-normal text-secondary shadow-xl"
>
	{text}
</div>
