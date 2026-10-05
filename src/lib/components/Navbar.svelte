<script lang="ts">
	import { page } from '$app/state';
	import House from '@lucide/svelte/icons/house';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import ChartBar from '@lucide/svelte/icons/chart-line';
	import Map from '@lucide/svelte/icons/map';
	import { resolve, base } from '$app/paths';

	const links = [
		{ href: '/', label: 'Hem', icon: House },
		{ href: '/karta/', label: 'Karta', icon: Map },
		{ href: '/statistik/', label: 'Statistik', icon: ChartBar },
		{ href: '/about/', label: 'FAQ', icon: CircleHelp }
	] as const;

	const REST =
		'border-line bg-surface text-secondary hover:border-red-400/25 hover:bg-red-950/50 hover:text-accent';
	const ACTIVE = 'border-ember bg-ember text-white hover:text-white';
</script>

<nav
	class="sticky top-0 z-30 border-b border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl px-3 sm:px-6"
>
	<div
		class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 sm:flex-nowrap sm:gap-x-8 sm:py-2.5"
	>
		<a href={resolve('/')} class="flex min-w-0 items-center gap-2.5">
			<img
				src={`${base}/logo.png`}
				alt="En Stor Läsk Review – hem"
				class="h-12 w-12 shrink-0 rounded-xl object-contain sm:h-14 sm:w-14"
			/>
			<span class="text-sm font-semibold tracking-wide text-ink sm:text-base">
				En Stor Läsk Review
			</span>
		</a>
		<ul
			class="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] sm:gap-2 sm:text-xs"
		>
			{#each links as link (link.href)}
				{@const active = page.url.pathname === `${base}${link.href}`}
				{@const Icon = link.icon}
				<li>
					<a
						href={resolve(link.href)}
						aria-current={active ? 'page' : undefined}
						class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-200 ease-linear sm:px-3.5 sm:py-1.5 {active
							? ACTIVE
							: REST}"
					>
						<Icon size={14} strokeWidth={1.75} class="shrink-0" aria-hidden="true" />
						<span class="sr-only sm:not-sr-only">{link.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</nav>
