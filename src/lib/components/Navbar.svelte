<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import House from '@lucide/svelte/icons/house';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import ChartBar from '@lucide/svelte/icons/chart-line';
	import Map from '@lucide/svelte/icons/map';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import { resolve, base } from '$app/paths';

	const links = [
		{ href: '/', label: 'Hem', icon: House },
		{ href: '/karta/', label: 'Karta', icon: Map },
		{ href: '/statistik/', label: 'Statistik', icon: ChartBar },
		{ href: '/about/', label: 'FAQ', icon: CircleHelp }
	] as const;

	const REST = 'border-line bg-surface/80 text-secondary hover:bg-accent-soft hover:text-accent';
	const ACTIVE = 'border-ember bg-ember text-white hover:text-white';
	let isDark = $state(true);
	let menuOpen = $state(false);
	let menu: HTMLDialogElement;

	onMount(() => {
		isDark = document.documentElement.dataset.theme !== 'light';
		const syncTheme = (event: StorageEvent) => {
			if (event.key !== 'soda-theme') return;
			isDark = event.newValue !== 'light';
			document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
		};
		window.addEventListener('storage', syncTheme);
		return () => window.removeEventListener('storage', syncTheme);
	});

	afterNavigate(() => menu?.close());

	function toggleTheme() {
		isDark = !isDark;
		const theme = isDark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('soda-theme', theme);
		} catch {
			// The selected theme still works when storage is unavailable.
		}
	}

	function openMenu() {
		menu.showModal();
		menuOpen = true;
	}

	function closeOnBackdrop(event: MouseEvent) {
		if (event.target !== menu) return;
		const box = menu.getBoundingClientRect();
		if (
			event.clientX < box.left ||
			event.clientX > box.right ||
			event.clientY < box.top ||
			event.clientY > box.bottom
		)
			menu.close();
	}
</script>

<header class="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
	<nav
		aria-label="Huvudmeny"
		class="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6 lg:gap-6 lg:px-8"
	>
		<a href={resolve('/')} class="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl">
			<img
				src={`${base}/image-variants/logo/80.webp`}
				width="40"
				height="40"
				decoding="async"
				alt="En Stor Läsk Review – hem"
				class="size-10 shrink-0 object-contain"
			/>
			<span class="text-sm font-semibold tracking-wide text-ink sm:text-base"
				>En Stor Läsk Review</span
			>
		</a>
		<ul class="hidden shrink-0 items-center gap-1.5 text-sm font-semibold lg:flex">
			{#each links as link (link.href)}
				{@const active = page.url.pathname === `${base}${link.href}`}
				{@const Icon = link.icon}
				<li>
					<a
						href={resolve(link.href)}
						aria-current={active ? 'page' : undefined}
						class="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 transition-colors {active
							? ACTIVE
							: REST}"
					>
						<Icon size={15} strokeWidth={1.75} aria-hidden="true" />{link.label}
					</a>
				</li>
			{/each}
		</ul>
		<button
			type="button"
			onclick={toggleTheme}
			aria-label="Mörkt läge"
			aria-pressed={isDark}
			title={isDark ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
			class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors {REST}"
		>
			{#if isDark}<Sun size={18} aria-hidden="true" />{:else}<Moon
					size={18}
					aria-hidden="true"
				/>{/if}
		</button>
		<button
			type="button"
			onclick={openMenu}
			aria-label="Meny"
			aria-controls="site-menu"
			aria-expanded={menuOpen}
			class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border lg:hidden {REST}"
		>
			<Menu size={20} aria-hidden="true" />
		</button>
		<dialog
			id="site-menu"
			aria-label="Meny"
			bind:this={menu}
			onclose={() => (menuOpen = false)}
			onclick={closeOnBackdrop}
			class="fixed inset-x-3 bottom-auto top-[4.5rem] m-0 max-h-[calc(100dvh-5rem)] w-auto max-w-none overflow-y-auto rounded-3xl border border-line bg-surface p-3 text-ink shadow-xl backdrop:bg-black/40 sm:left-auto sm:right-6 sm:w-80"
		>
			<div class="mb-2 flex items-center justify-between pl-4">
				<p class="text-sm font-semibold">Meny</p>
				<button
					type="button"
					aria-label="Stäng menyn"
					onclick={() => menu.close()}
					class="flex size-11 items-center justify-center rounded-full border {REST}"
					><X size={20} aria-hidden="true" /></button
				>
			</div>
			<ul class="flex flex-col gap-1">
				{#each links as link (link.href)}
					{@const active = page.url.pathname === `${base}${link.href}`}
					{@const Icon = link.icon}
					<li>
						<a
							href={resolve(link.href)}
							onclick={() => menu.close()}
							aria-current={active ? 'page' : undefined}
							class="flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-base font-semibold {active
								? ACTIVE
								: REST}"
						>
							<Icon size={20} aria-hidden="true" />{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</dialog>
	</nav>
</header>

<style>
	:global(html:has(#site-menu[open])) {
		overflow: hidden;
	}
</style>
