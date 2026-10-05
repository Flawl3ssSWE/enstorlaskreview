<script lang="ts">
	import { resolve } from '$app/paths';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import type { PublicReviewMapMarker } from '$lib/types/review-map';
	import { createReviewMarkers } from './review-map/markers';

	interface Props {
		markers: PublicReviewMapMarker[];
		onReady?: () => void;
	}
	let { markers, onReady }: Props = $props();
	let container = $state<HTMLDivElement>();
	let selectedMarker = $state<PublicReviewMapMarker | null>(null);
	let mapUnavailable = $state(false);
	let mapAccepted = $state(false);
	let markerController: ReturnType<typeof createReviewMarkers> | null = null;
	let selectedElement: HTMLButtonElement | null = null;
	const GOTHENBURG_CENTER: [number, number] = [11.9746, 57.7089];
	const GOTHENBURG_START_ZOOM = 12.5;

	const showMarker = (marker: PublicReviewMapMarker, element: HTMLButtonElement) => {
		selectedMarker = marker;
		selectedElement = element;
		markerController?.select(marker.slug);
	};
	const closePreview = () => {
		selectedMarker = null;
		markerController?.select(null);
		selectedElement?.focus();
	};
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && selectedMarker) {
			event.preventDefault();
			closePreview();
		}
	};
	$effect(() => {
		const items = markers;
		markerController?.sync(items);
	});
	$effect(() => {
		if (!mapAccepted) return;
		let destroyed = false;
		let map: import('maplibre-gl').Map | null = null;
		const initialize = async () => {
			try {
				const maplibre = await import('maplibre-gl');
				maplibre.setWorkerUrl(maplibreWorkerUrl);
				if (destroyed || !container) return;
				const initializedMap = new maplibre.Map({
					container,
					style: 'https://tiles.openfreemap.org/styles/liberty',
					center: GOTHENBURG_CENTER,
					zoom: GOTHENBURG_START_ZOOM
				});
				map = initializedMap;
				initializedMap.addControl(
					new maplibre.NavigationControl({ showCompass: false }),
					'top-right'
				);
				markerController = createReviewMarkers(initializedMap, maplibre, showMarker);
				markerController.sync(markers);
				initializedMap.once('load', () => {
					markerController?.sync(markers);
					onReady?.();
				});
				initializedMap.once('error', () => {
					mapUnavailable = true;
				});
			} catch (error) {
				console.error('Kartan kunde inte laddas:', error);
				mapUnavailable = true;
			}
		};
		void initialize();
		return () => {
			destroyed = true;
			markerController?.destroy();
			markerController = null;
			map?.remove();
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="relative overflow-hidden rounded-[1.65rem] border border-line bg-surface-raised shadow-[0_16px_40px_-30px_rgba(15,23,42,0.55)]"
>
	<div
		bind:this={container}
		class="h-[min(66svh,38rem)] min-h-[24rem] w-full"
		aria-label="Karta över platser där vi har provat läsk"
	></div>

	{#if !mapAccepted}
		<section
			class="absolute inset-0 flex items-center justify-center bg-surface-raised p-6 text-center"
			aria-labelledby="map-acceptance-title"
		>
			<div class="max-w-md">
				<h2 id="map-acceptance-title" class="text-2xl font-semibold text-ink">Visa kartan?</h2>
				<p class="mt-3 text-sm leading-relaxed text-secondary">
					När du laddar kartan hämtar din webbläsare kartdata från OpenFreeMap. Då får leverantören
					din IP-adress och information om vilket kartområde du visar. Vi ber inte om din position.
				</p>
				<a
					href={resolve('/about') + '/'}
					class="mt-3 inline-block text-sm text-secondary underline underline-offset-4"
				>
					Läs mer om kartan och integriteten
				</a>
				<button
					type="button"
					onclick={() => (mapAccepted = true)}
					class="mx-auto mt-6 block min-h-11 rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
				>
					Jag godkänner – ladda kartan
				</button>
			</div>
		</section>
	{/if}

	{#if mapUnavailable}
		<div class="pointer-events-none absolute inset-x-4 top-4 space-y-2">
			<div
				class="rounded-2xl border border-amber-300/80 bg-amber-950/95 p-4 text-sm text-amber-100 shadow-sm"
				role="status"
			>
				Kartan kunde inte laddas just nu. Försök igen om en liten stund.
			</div>
		</div>
	{/if}

	{#if selectedMarker}
		<section
			class="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-line bg-surface-raised p-4 shadow-[0_18px_42px_-22px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:bottom-5 sm:left-5 sm:right-auto sm:w-80"
			aria-label={`Information om ${selectedMarker.title}`}
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Recension</p>
					<h2 class="mt-1 text-xl font-semibold text-ink">{selectedMarker.title}</h2>
				</div>
				<button
					type="button"
					class="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised text-lg text-secondary transition hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
					onclick={closePreview}
					aria-label="Stäng förhandsvisning"
				>
					×
				</button>
			</div>
			<p class="mt-2 text-sm text-secondary">{selectedMarker.location}</p>
			<p class="mt-3 text-sm font-semibold text-ink">
				Helhetsbetyg: {selectedMarker.rating}/3
			</p>
			<a
				href={resolve('/[slug]', { slug: selectedMarker.slug }) + '/'}
				class="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-ember px-4 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
			>
				Läs recension
			</a>
		</section>
	{/if}
</div>

<style>
	:global(.bar-map-marker-positioner) {
		width: 2rem;
		height: 2rem;
	}

	:global(.bar-map-marker-positioner:focus-within) {
		z-index: 1;
	}

	@media (hover: hover) and (pointer: fine) {
		:global(.bar-map-marker-positioner:hover) {
			z-index: 1;
		}

		:global(.bar-map-marker:hover) {
			transform: scale(1.08);
		}
	}

	:global(.bar-map-marker-positioner.is-selected) {
		z-index: 2;
	}

	:global(.bar-map-marker) {
		display: grid;
		width: 100%;
		height: 100%;
		place-items: center;
		cursor: pointer;
		border: 3px solid rgb(255 255 255 / 0.96);
		border-radius: 9999px;
		background: var(--color-ember);
		box-shadow: 0 5px 14px rgb(15 23 42 / 0.32);
		transition:
			transform 150ms ease,
			background-color 150ms ease;
	}

	:global(.bar-map-marker::after) {
		width: 0.42rem;
		height: 0.42rem;
		content: '';
		border-radius: 9999px;
		background: white;
	}

	:global(.bar-map-marker.is-selected) {
		transform: scale(1.14);
		background: var(--color-primary-gray);
	}

	:global(.bar-map-marker:focus-visible) {
		outline: 3px solid rgb(56 189 248);
		outline-offset: 3px;
	}

	:global(.bar-map-marker-price) {
		position: absolute;
		top: 50%;
		left: calc(100% + 0.375rem);
		padding: 0.38rem 0.55rem;
		pointer-events: none;
		transform: translateY(-50%);
		border: 1px solid var(--color-line);
		border-radius: 9999px;
		background: var(--color-surface-raised);
		box-shadow: 0 5px 14px rgb(15 23 42 / 0.2);
		color: var(--color-ink);
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
		transition:
			color 150ms ease,
			background-color 150ms ease;
	}

	:global(.bar-map-marker-positioner.is-selected .bar-map-marker-price) {
		background: var(--color-primary-gray);
		color: white;
	}

	:global(.bar-map-marker-description) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	:global(.maplibregl-ctrl-group) {
		background: var(--color-surface-raised);
		overflow: hidden;
		border: 1px solid var(--color-line);
		border-radius: 1rem;
		box-shadow: 0 8px 22px rgb(15 23 42 / 0.18);
	}

	:global(.maplibregl-ctrl-group button) {
		width: 2.4rem;
		height: 2.4rem;
	}

	:global(.maplibregl-ctrl-group button + button) {
		border-top-color: var(--color-line);
	}

	:global(.maplibregl-ctrl-group button .maplibregl-ctrl-icon),
	:global(.maplibregl-ctrl-attrib-button) {
		filter: invert(1);
	}

	:global(.maplibregl-ctrl-attrib) {
		color: var(--color-ink);
		border-radius: 0.5rem 0 0 0;
		background: var(--color-surface);
	}
</style>
