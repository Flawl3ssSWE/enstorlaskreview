<script lang="ts">
	import { onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import ReviewImage from '$lib/components/ReviewImage.svelte';
	import DrinkAmountFields from '$lib/components/DrinkAmountFields.svelte';
	import NutrientInput from '$lib/components/NutrientInput.svelte';
	import ContainerSelect from '$lib/components/ContainerSelect.svelte';
	import RatingInputs from '$lib/components/RatingInputs.svelte';
	import {
		SERVING_METHODS,
		SERVING_TEMPERATURES,
		SODA_RATING_METRICS,
		VENUE_RATING_METRICS,
		REPURCHASE_POTENTIAL_LABELS
	} from '$lib/review-metadata';
	import { validateReview } from '$lib/content/validation';
	import { formatReviewJson } from '$lib/content/export';
	import { suggestDrinkTypes } from '$lib/utils/drink-facts';
	import { sodaScore } from '$lib/content/soda';
	import { ratingFromAverage } from '$lib/utils/ratings';
	import { generateSlug, generateSodaId } from '$lib/utils/slug';
	import type {
		DrinkContainer,
		SodaRatingValues,
		VenueRatingValues,
		ReviewContent
	} from '$lib/types/bar-review';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let selectedReview = $state('');
	let importedReview = $state<ReviewContent>();
	let reviewFileInput: HTMLInputElement;
	let importError = $state('');
	let importSelection = 0;
	const existingReview = $derived(
		importedReview ?? data.reviews.find((product) => product.slug === selectedReview)
	);
	let favorite = $state(false);
	let repurchasePotential = $state<number>();
	let title = $state('');
	let sodaId = $state('');
	const suggestedSodaId = $derived(generateSodaId(title).slice(0, 100).replace(/-$/, ''));
	const normalizedSodaId = $derived(sodaId.trim() ? generateSodaId(sodaId) : suggestedSodaId);
	let customSlug = $state('');
	let brand = $state('');
	let author = $state('');
	const suggestedSlug = $derived(generateSlug(`${title}${author.trim() ? `-${author}` : ''}`));
	const slug = $derived(customSlug || suggestedSlug);
	let container = $state<DrinkContainer>();
	let customContainer = $state<string>();
	let description = $state('');
	let location = $state('');
	let price = $state<number>();
	let volumeMl = $state<number>();
	let energyOverride = $state<boolean>();
	let caffeineMgPer100Ml = $state<number>();
	let caffeineMgPerContainer = $state<number>();
	let carbohydrateGPer100Ml = $state<number>();
	let carbohydrateGPerContainer = $state<number>();
	let proteinGPer100Ml = $state<number>();
	let proteinGPerContainer = $state<number>();
	let isElectrolyteDrink = $state<boolean>();
	let proteinOverride = $state<boolean>();
	let sugarOverride = $state<ReviewContent['sugarType'] | null>();
	const suggestedTypes = $derived(
		suggestDrinkTypes({
			caffeineMgPer100Ml,
			caffeineMgPerContainer,
			carbohydrateGPer100Ml,
			carbohydrateGPerContainer,
			proteinGPer100Ml,
			proteinGPerContainer
		})
	);
	const isEnergyDrink = $derived(energyOverride ?? suggestedTypes.isEnergyDrink);
	const isProteinDrink = $derived(proteinOverride ?? suggestedTypes.isProteinDrink);
	const sugarType = $derived(
		sugarOverride === null ? undefined : (sugarOverride ?? suggestedTypes.sugarType)
	);
	const hasTypeOverride = $derived(
		energyOverride !== undefined || proteinOverride !== undefined || sugarOverride !== undefined
	);
	function useAutomaticTypes() {
		energyOverride = undefined;
		proteinOverride = undefined;
		sugarOverride = undefined;
	}
	let servingMethods = $state<NonNullable<ReviewContent['servingMethods']>>([]);
	let servingTemperature = $state<ReviewContent['servingTemperature']>();
	let servedWithIce = $state<boolean>();
	let nutritionVersion = $state(0);
	let latitude = $state<number>();
	let longitude = $state<number>();
	let rateVenue = $state(false);
	let sodaRatings = $state<SodaRatingValues>(
		Object.fromEntries(SODA_RATING_METRICS.map(({ key }) => [key, 3])) as SodaRatingValues
	);
	const previewScore = $derived(
		SODA_RATING_METRICS.every(({ key }) => {
			const value = sodaRatings[key];
			return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5;
		})
			? sodaScore(sodaRatings)
			: undefined
	);
	const previewRating = $derived(
		previewScore === undefined ? undefined : ratingFromAverage(previewScore)
	);
	let venueRatings = $state<VenueRatingValues>(
		Object.fromEntries(VENUE_RATING_METRICS.map(({ key }) => [key, 3])) as VenueRatingValues
	);
	let image = $state<Blob>();
	let preview = $state('');
	let imageFocusX = $state(50);
	let imageFocusY = $state(50);
	let imageZoom = $state(1);
	const previewSrc = $derived(
		preview ||
			(existingReview && data.reviews.some(({ image }) => image === existingReview.image)
				? `${base}/images/${existingReview.image}`
				: '')
	);
	let imageBusy = $state(false);
	let imageError = $state('');
	let error = $state('');
	let notice = $state('');
	let selection = 0;
	let imageVersion = $state('');
	const imageName = $derived(
		image && existingReview
			? `${slug}-${imageVersion}.webp`
			: (existingReview?.image ?? `${slug}.webp`)
	);
	const inputClass =
		'mt-2 w-full rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-ink focus:outline-accent';
	const panelClass = 'space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-7';

	onDestroy(() => {
		selection++;
		importSelection++;
		if (preview) URL.revokeObjectURL(preview);
	});

	async function selectImage(event: Event) {
		const current = ++selection;
		const file = (event.target as HTMLInputElement).files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = '';
		image = undefined;
		imageError = '';
		notice = '';
		imageBusy = !!file;
		if (!file) return;
		try {
			if (file.size > 10 * 1024 * 1024 || !/\.(jpe?g|png|webp)$/i.test(file.name))
				throw new Error('Välj en JPEG-, PNG- eller WebP-bild på högst 10 MiB.');
			const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
			let blob: Blob | null = null;
			try {
				const canvas = document.createElement('canvas');
				const context = canvas.getContext('2d');
				if (!context) throw new Error('Bilden kunde inte behandlas.');
				let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
				while (true) {
					canvas.width = Math.max(1, Math.round(bitmap.width * scale));
					canvas.height = Math.max(1, Math.round(bitmap.height * scale));
					context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
					for (const quality of [0.82, 0.7, 0.6]) {
						blob = await new Promise<Blob | null>((resolve) =>
							canvas.toBlob(resolve, 'image/webp', quality)
						);
						if (!blob || blob.type !== 'image/webp')
							throw new Error('Webbläsaren kunde inte skapa WebP. Prova en annan webbläsare.');
						if (current !== selection) return;
						if (blob.size <= 500 * 1024) break;
					}
					if (blob && blob.size <= 500 * 1024) break;
					if (Math.max(canvas.width, canvas.height) <= 128)
						throw new Error('Bilden kunde inte komprimeras. Välj en annan bild.');
					scale *= 0.8;
				}
			} finally {
				bitmap.close();
			}
			if (!blob || current !== selection) return;
			imageVersion = Date.now().toString();
			image = blob;
			preview = URL.createObjectURL(blob);
		} catch (cause) {
			if (current === selection)
				imageError =
					cause instanceof Error && !(cause instanceof DOMException)
						? cause.message
						: 'Bilden kunde inte läsas. Välj en giltig JPEG-, PNG- eller WebP-bild.';
		} finally {
			if (current === selection) imageBusy = false;
		}
	}

	function download(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.append(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function selectSoda(event: Event) {
		sodaId = (event.currentTarget as HTMLSelectElement).value;
		const soda = data.sodas.find((soda) => soda.id === sodaId);
		if (soda) {
			title = soda.title;
			brand = soda.brand;
		}
	}

	async function importReview(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		const current = ++importSelection;
		importError = '';
		try {
			if (!file.name.endsWith('.json') || file.size > 256 * 1024)
				throw new Error('Välj en JSON-fil på högst 256 KiB.');
			const { rating: _rating, ...review } = validateReview(
				JSON.parse(await file.text()),
				file.name
			);
			if (!review.sodaRatings)
				throw new Error('Formuläret kan bara redigera läskrecensioner med läskbetyg.');
			if (current !== importSelection) return;
			selectedReview = '';
			importedReview = review;
			loadReview();
			notice = `Recensionen ${review.title} är inläst. Redigera och ladda ner den uppdaterade JSON-filen.`;
		} catch (cause) {
			if (current !== importSelection) return;
			importError =
				cause instanceof SyntaxError
					? 'Filen innehåller inte giltig JSON.'
					: cause instanceof Error && !(cause instanceof DOMException)
						? cause.message
						: 'Recensionen kunde inte läsas in.';
		}
	}

	function selectPublishedReview() {
		importSelection++;
		importedReview = undefined;
		importError = '';
		loadReview();
	}

	function startNewReview() {
		selectedReview = '';
		selectPublishedReview();
	}

	function loadReview() {
		nutritionVersion++;
		const product = existingReview;
		if (!product) {
			imageFocusX = 50;
			imageFocusY = 50;
			imageZoom = 1;
			title = '';
			sodaId = '';
			customSlug = '';
			brand = '';
			location = '';
			price = undefined;
			volumeMl = undefined;
			energyOverride = undefined;
			caffeineMgPer100Ml = undefined;
			caffeineMgPerContainer = undefined;
			carbohydrateGPer100Ml = undefined;
			carbohydrateGPerContainer = undefined;
			proteinGPer100Ml = undefined;
			proteinGPerContainer = undefined;
			proteinOverride = undefined;
			isElectrolyteDrink = undefined;
			sugarOverride = undefined;
			servingMethods = [];
			servingTemperature = undefined;
			servedWithIce = undefined;
			latitude = undefined;
			longitude = undefined;
			author = '';
			container = undefined;
			customContainer = undefined;
			description = '';
			favorite = false;
			repurchasePotential = undefined;
			rateVenue = false;
			venueRatings = Object.fromEntries(
				VENUE_RATING_METRICS.map(({ key }) => [key, 3])
			) as VenueRatingValues;
			sodaRatings = Object.fromEntries(
				SODA_RATING_METRICS.map(({ key }) => [key, 3])
			) as SodaRatingValues;
			image = undefined;
			if (preview) URL.revokeObjectURL(preview);
			preview = '';
			selection++;
			imageBusy = false;
			imageError = '';
			error = '';
			notice = '';
			return;
		}
		imageFocusX = product.imageFocusX ?? 50;
		imageFocusY = product.imageFocusY ?? 50;
		imageZoom = product.imageZoom ?? 1;
		title = product.title;
		sodaId = product.sodaId ?? '';
		customSlug = product.slug;
		brand = product.beerBrand ?? '';
		location = product.location;
		price = product.beerPriceKr;
		energyOverride = product.isEnergyDrink;
		caffeineMgPer100Ml = product.caffeineMgPer100Ml;
		caffeineMgPerContainer = product.caffeineMgPerContainer;
		carbohydrateGPer100Ml = product.carbohydrateGPer100Ml;
		carbohydrateGPerContainer = product.carbohydrateGPerContainer;
		proteinGPer100Ml = product.proteinGPer100Ml;
		proteinGPerContainer = product.proteinGPerContainer;
		proteinOverride = product.isProteinDrink;
		isElectrolyteDrink = product.isElectrolyteDrink;
		sugarOverride = product.sugarType;
		servingMethods = [...(product.servingMethods ?? [])];
		servingTemperature = product.servingTemperature;
		servedWithIce = product.servedWithIce;
		latitude = product.latitude;
		longitude = product.longitude;
		author = product.author;
		container = product.container;
		customContainer = product.customContainer;
		volumeMl = product.volumeMl;
		description = product.description;
		favorite = product.favorite ?? false;
		repurchasePotential = product.repurchasePotential;
		sodaRatings = { ...product.sodaRatings! };
		rateVenue = !!product.venueRatings;
		venueRatings = product.venueRatings
			? { ...product.venueRatings }
			: (Object.fromEntries(VENUE_RATING_METRICS.map(({ key }) => [key, 3])) as VenueRatingValues);
		image = undefined;
		if (preview) URL.revokeObjectURL(preview);
		preview = '';
		selection++;
		imageBusy = false;
		imageError = '';
		error = '';
		notice = '';
	}

	async function exportReview(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		notice = '';
		try {
			if ((!image && !existingReview) || imageBusy)
				throw new Error('Välj en bild och vänta tills den är klar.');
			if (data.existingSlugs.includes(slug.toLowerCase()) && slug !== existingReview?.slug)
				throw new Error('Denna slug används redan. Välj en annan.');
			if (sodaId.trim() && !normalizedSodaId)
				throw new Error('Ange ett läsknamn eller ID med minst en bokstav a–z eller siffra.');
			const now = new Date().toISOString();
			const review: ReviewContent = {
				title: title.trim(),
				...(normalizedSodaId ? { sodaId: normalizedSodaId } : {}),
				slug,
				image: imageName,
				location: location.trim(),
				createdAt: existingReview?.createdAt ?? now,
				updatedAt: now,
				author: author.trim(),
				description: description.trim(),
				favorite,
				...(existingReview?.recommended !== undefined
					? { recommended: existingReview.recommended }
					: {}),
				...(repurchasePotential !== undefined ? { repurchasePotential } : {}),
				sodaRatings: { ...sodaRatings },
				...(container ? { container } : {}),
				...(customContainer !== undefined ? { customContainer: customContainer.trim() } : {}),
				...(volumeMl !== undefined ? { volumeMl } : {}),
				...(rateVenue ? { venueRatings: { ...venueRatings } } : {}),
				...(existingReview?.coAuthors ? { coAuthors: existingReview.coAuthors } : {}),
				...(energyOverride !== undefined || isEnergyDrink ? { isEnergyDrink } : {}),
				...(proteinOverride !== undefined || isProteinDrink ? { isProteinDrink } : {}),
				...(isElectrolyteDrink !== undefined ? { isElectrolyteDrink } : {}),
				...(sugarType ? { sugarType } : {}),
				...(servingMethods.length ? { servingMethods: [...servingMethods] } : {}),
				...(servingTemperature ? { servingTemperature } : {}),
				...(servedWithIce !== undefined ? { servedWithIce } : {}),
				...(caffeineMgPer100Ml !== undefined ? { caffeineMgPer100Ml } : {}),
				...(caffeineMgPerContainer !== undefined ? { caffeineMgPerContainer } : {}),
				...(carbohydrateGPer100Ml !== undefined ? { carbohydrateGPer100Ml } : {}),
				...(carbohydrateGPerContainer !== undefined ? { carbohydrateGPerContainer } : {}),
				...(proteinGPer100Ml !== undefined ? { proteinGPer100Ml } : {}),
				...(proteinGPerContainer !== undefined ? { proteinGPerContainer } : {}),
				...(brand.trim() ? { beerBrand: brand.trim() } : {}),
				...(price !== undefined ? { beerPriceKr: price } : {}),
				...(latitude !== undefined ? { latitude } : {}),
				...(longitude !== undefined ? { longitude } : {}),
				imageFocusX,
				imageFocusY,
				imageZoom,
				...(existingReview?.isHappyHourPrice !== undefined
					? { isHappyHourPrice: existingReview.isHappyHourPrice }
					: {})
			};
			validateReview(review, `${slug}.json`);
			const json = await formatReviewJson(review);
			download(new Blob([json], { type: 'application/json' }), `${review.slug}.json`);
			notice = image
				? `JSON-filen är klar. Ladda också ner bilden ${imageName}.`
				: 'JSON-filen är klar. Den befintliga bilden används.';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Recensionen kunde inte exporteras.';
		}
	}
</script>

<svelte:head
	><title>Skapa recension – En Stor Läsk Review</title><meta
		name="description"
		content="Skapa en läskrecension och ladda ner den som JSON."
	/></svelte:head
>

<section class="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
	<header class="space-y-3">
		<p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Din nästa läsk</p>
		<h1 class="text-3xl font-semibold sm:text-4xl">
			{existingReview ? 'Redigera recension' : 'Skapa recension'}
		</h1>
		<div class="flex flex-wrap gap-3">
			<button
				type="button"
				onclick={() => reviewFileInput.click()}
				class="rounded-full border border-line bg-surface-raised px-5 py-3 font-semibold text-ink"
				>Ladda in recension från JSON</button
			>
			{#if existingReview}<button
					type="button"
					onclick={startNewReview}
					class="rounded-full border border-line px-5 py-3 font-semibold text-secondary"
					>Skapa ny recension</button
				>{/if}
			<input
				bind:this={reviewFileInput}
				type="file"
				accept=".json,application/json"
				aria-label="Recensionens JSON-fil"
				onchange={importReview}
				class="hidden"
			/>
		</div>
		<p class="text-sm text-muted">
			Ladda in en tidigare sparad JSON-fil eller välj en publicerad recension nedan.
		</p>
		{#if importError}<p role="alert" class="text-accent">{importError}</p>{/if}
		{#if importedReview}<p class="text-sm text-secondary">
				Inläst fil: {importedReview.slug}.json
			</p>{/if}
		<p class="text-secondary">
			Ange värden från 0 till 5. Sötma: 0 = inte söt, 3 = perfekt, 5 = för söt. Konsistens beskriver
			hur rinnig läsken är. Passande konsistens mäter hur väl den passar läsken. För övriga betyg är
			5 bäst. Halva poäng går bra. Smak väger 30 %, sötmabalans, kolsyra och drickbarhet 15 %
			vardera, passande konsistens och matchar namnet 10 % vardera, prisvärdhet 5 %. Varje recension
			har en egen författare, ett eget pris och en egen sida.
		</p>
		<p class="text-sm text-muted">
			Allt behandlas i din webbläsare. Formuläret sparas inte när du lämnar sidan.
		</p>
	</header>
	<noscript><p>Aktivera JavaScript för att skapa och ladda ner recensioner.</p></noscript>
	{#if data.reviews.length}
		<label class="block" for="existing-product"
			>Redigera en befintlig recension
			<select
				id="existing-product"
				bind:value={selectedReview}
				onchange={selectPublishedReview}
				class={inputClass}
			>
				<option value="">Ny recension</option>
				{#each data.reviews as product}<option value={product.slug}
						>{product.title} – {product.author}</option
					>{/each}
			</select>
		</label>
	{/if}
	<form onsubmit={exportReview} class="space-y-6">
		<section class={panelClass}>
			<h2 class="text-xl font-semibold">Om läsken</h2>
			{#if data.sodas.length}
				<label class="block" for="linked-soda"
					>Läsk att länka recensionen till (valfritt)
					<select
						id="linked-soda"
						value={data.sodas.some((soda) => soda.id === normalizedSodaId) ? normalizedSodaId : ''}
						onchange={selectSoda}
						class={inputClass}
					>
						<option value="">Ny läsk (automatiskt ID)</option>
						{#each data.sodas as soda}<option value={soda.id}>{soda.title} ({soda.id})</option
							>{/each}
					</select>
				</label>
			{/if}
			<label class="block" for="soda-id"
				>Läsk-ID (automatiskt)
				<input
					id="soda-id"
					maxlength="100"
					value={sodaId || suggestedSodaId}
					oninput={(event) => (sodaId = event.currentTarget.value)}
					class={inputClass}
					placeholder="Till exempel pepsi-max-tropical"
					aria-describedby="soda-id-help soda-id-preview"
				/>
			</label>
			<p id="soda-id-help" class="text-sm text-muted">
				ID skapas automatiskt från läskens namn, utan författarens namn. Samma läsk får samma ID och
				recensionerna behåller egna filnamn, priser och betyg. Du kan välja en befintlig läsk eller
				ange ett eget ID. Töm fältet för att använda det automatiska ID:t igen.
			</p>
			<p id="soda-id-preview" class="text-sm text-secondary" aria-live="polite">
				{#if normalizedSodaId}Läsk-ID som sparas: <span class="font-semibold text-ink"
						>{normalizedSodaId}</span
					>
				{:else if sodaId.trim()}Ange ett läsknamn eller ID med minst en bokstav a–z eller siffra.
				{:else}ID skapas när du anger läskens namn.{/if}
			</p>

			<label class="block" for="title"
				>Läskens namn / rubrik<input
					id="title"
					required
					maxlength="200"
					bind:value={title}
					class={inputClass}
					placeholder="Till exempel Hallonsoda"
				/></label
			>
			<div class="grid gap-5 sm:grid-cols-2">
				<label for="brand"
					>Märke (valfritt)<input
						id="brand"
						maxlength="100"
						bind:value={brand}
						class={inputClass}
					/></label
				>
			</div>
			<fieldset class="space-y-3">
				<legend class="font-semibold">Serveringsmetod (valfritt, välj flera)</legend>
				<div class="flex flex-wrap gap-x-5 gap-y-2">
					{#each SERVING_METHODS as method}
						<label class="flex min-h-11 items-center gap-2"
							><input
								type="checkbox"
								value={method}
								bind:group={servingMethods}
								class="size-5 accent-ember"
							/>{method}</label
						>
					{/each}
				</div>
				<p class="text-sm text-muted">
					Hur drack du drycken? Kombinera till exempel Glas och Sugrör. Förpackning är vad drycken
					såldes i.
				</p>
			</fieldset>
			<div class="grid gap-5 sm:grid-cols-2">
				<label for="serving-temperature"
					>Serveringstemperatur (valfritt)
					<select id="serving-temperature" bind:value={servingTemperature} class={inputClass}>
						<option value={undefined}>Ej angiven</option>
						{#each SERVING_TEMPERATURES as temperature}<option value={temperature}
								>{temperature}</option
							>{/each}
					</select>
				</label>
				<label for="served-with-ice"
					>Is (valfritt)
					<select id="served-with-ice" bind:value={servedWithIce} class={inputClass}>
						<option value={undefined}>Ej angivet</option>
						<option value={true}>Med is</option>
						<option value={false}>Utan is</option>
					</select>
				</label>
			</div>
			{#key nutritionVersion}
				<NutrientInput
					label="Koffein"
					unit="mg"
					prefix="caffeine"
					required={isEnergyDrink}
					{volumeMl}
					bind:per100Ml={caffeineMgPer100Ml}
					bind:perContainer={caffeineMgPerContainer}
				/>
				<NutrientInput
					label="Kolhydrater"
					unit="g"
					prefix="carbohydrate"
					{volumeMl}
					bind:per100Ml={carbohydrateGPer100Ml}
					bind:perContainer={carbohydrateGPerContainer}
				/>
				<NutrientInput
					label="Protein"
					unit="g"
					prefix="protein"
					{volumeMl}
					bind:per100Ml={proteinGPer100Ml}
					bind:perContainer={proteinGPerContainer}
				/>
			{/key}
			<label class="flex items-center gap-3"
				><input
					type="checkbox"
					checked={isEnergyDrink}
					onchange={(event) => (energyOverride = event.currentTarget.checked)}
					class="size-5 accent-ember"
				/>Energidryck</label
			>
			<label class="flex items-center gap-3"
				><input
					type="checkbox"
					checked={isProteinDrink}
					onchange={(event) => (proteinOverride = event.currentTarget.checked)}
					class="size-5 accent-ember"
				/>Proteindryck</label
			>
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					checked={isElectrolyteDrink ?? false}
					onchange={(event) => (isElectrolyteDrink = event.currentTarget.checked)}
					class="size-5 accent-ember"
				/>Elektrolytdryck
			</label>
			<p class="text-sm text-muted">
				Välj Elektrolytdryck enligt etiketten. Det kan kombineras med övriga dryckstyper.
			</p>
			<label class="block" for="sugar-type"
				>Socker (valfritt)
				<select
					id="sugar-type"
					value={sugarType ?? ''}
					onchange={(event) =>
						(sugarOverride = event.currentTarget.value
							? (event.currentTarget.value as ReviewContent['sugarType'])
							: null)}
					class={inputClass}
				>
					<option value="">Ej angivet</option>
					<option value="sugar-free">Sockerfri</option>
					<option value="sugared">Sockrad</option>
				</select>
			</label>
			<p class="text-sm text-muted">
				Dryckstyp fylls i automatiskt: koffein över 0 ger Energidryck, protein över 0 ger
				Proteindryck och kolhydrater över 0 föreslår Sockrad. 0 g kolhydrater föreslår Sockerfri.
				Tomma värden ger inget förslag. Du kan ändra valen enligt etiketten; koffein finns även i
				vanlig läsk och kolhydrater är inte alltid socker.
			</p>
			{#if hasTypeOverride}
				<button
					type="button"
					onclick={useAutomaticTypes}
					class="text-sm text-accent underline underline-offset-4"
					>Använd automatiska dryckstyper</button
				>
			{/if}
			<label class="block" for="author"
				>Författare<input
					id="author"
					required
					maxlength="100"
					bind:value={author}
					class={inputClass}
				/></label
			>
			<label class="block" for="slug"
				>Slug / filnamn<input
					id="slug"
					readonly={!!existingReview}
					maxlength="160"
					bind:value={customSlug}
					placeholder={suggestedSlug || 'hallonsoda-anton'}
					class={inputClass}
					aria-describedby="slug-help"
				/></label
			>
			<p id="slug-help" class="text-sm text-muted">
				Lämna tomt för att skapa från läskens namn och författaren. Filnamn: {slug ||
					'hallonsoda'}.json. Använd en unik slug för varje recension. Recensioner av samma läsk
				sparas som egna JSON-filer.
			</p>
		</section>
		<section class={panelClass}>
			<h2 class="text-xl font-semibold">Läskbetyg</h2>
			<div
				role="status"
				aria-label="Förhandsvisning av totalbetyg"
				aria-live="polite"
				aria-atomic="true"
				class="rounded-2xl border border-accent/30 bg-surface-raised p-5"
			>
				<p class="text-sm font-semibold text-secondary">Recensionens totalbetyg</p>
				{#if previewScore !== undefined}
					<p class="mt-2 text-4xl font-bold text-accent">{previewRating}/3</p>
					<p class="mt-2 text-sm text-secondary">
						Viktad poäng: {previewScore.toLocaleString('sv-SE', { maximumFractionDigits: 2 })}/5
					</p>
				{:else}
					<p class="mt-2 text-sm text-secondary">
						Fyll i alla läskbetyg med värden mellan 0 och 5 för att se totalbetyget.
					</p>
				{/if}
				<p class="mt-2 text-sm text-muted">
					Uppdateras när du ändrar delbetygen. Platsbetygen påverkar inte totalbetyget.
				</p>
			</div>

			<RatingInputs metrics={SODA_RATING_METRICS} bind:values={sodaRatings} prefix="soda" />
		</section>
		<section class={panelClass}>
			<h2 class="text-xl font-semibold">Din recension</h2>
			{#key existingReview?.slug ?? ''}
				<ContainerSelect id="container" bind:value={container} bind:customValue={customContainer} />
				<DrinkAmountFields bind:volumeMl bind:beerPriceKr={price} prefix="review-1" />
			{/key}
			<label class="flex items-center gap-3"
				><input type="checkbox" bind:checked={favorite} class="size-5 accent-ember" />Jag väljer den
				här läsken som en läskfavorit</label
			>
			<p class="text-sm text-muted">
				En läskfavorit är en läsk du aktivt väljer framför andra, inte bara tycker är värd att
				prova.
			</p>
			<label class="block" for="repurchase-potential">
				Återköpspotential (valfritt)
				<select
					id="repurchase-potential"
					bind:value={repurchasePotential}
					class={inputClass}
					aria-describedby="repurchase-potential-help"
				>
					<option value={undefined}>Ej angiven</option>
					{#each REPURCHASE_POTENTIAL_LABELS as label, score}
						<option value={score}>{score}/5 – {label}</option>
					{/each}
				</select>
			</label>
			<p id="repurchase-potential-help" class="text-sm text-muted">
				Hur gärna köper du läsken igen? Påverkar inte helhetsbetyget.
			</p>
			<label class="block" for="description"
				>Fri text<textarea
					id="description"
					rows="8"
					required
					maxlength="50000"
					bind:value={description}
					class={inputClass}
					placeholder="Beskriv smaken och din upplevelse…"
				></textarea></label
			>
			<p class="text-sm text-muted">Markdown för rubriker, listor och fetstil går bra.</p>
			<label class="block" for="image"
				>Bild till recensionen<input
					id="image"
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onchange={selectImage}
					class={inputClass}
				/></label
			>
			<p class="text-sm text-muted">
				Välj en bild på högst 10 MiB. Bilden roteras, skalas till högst 1 600 pixlar och komprimeras
				till WebP på högst 500 KiB. Originalets metadata, inklusive GPS-position, tas bort.
			</p>
			{#if imageBusy}<p role="status">Behandlar bilden…</p>{/if}
			{#if imageError}<p role="alert" class="text-accent">{imageError}</p>{/if}
			{#if image}<p class="text-sm text-muted">
					Komprimerad bild: {Math.ceil(image.size / 1024)} KiB (WebP).
				</p>{/if}
			{#if importedReview && !previewSrc}<p class="text-sm text-muted">
					Välj bilden {importedReview.image} för att förhandsvisa den. Du kan behålla bildens filnamn
					när du laddar ner JSON-filen utan att välja en ny bild.
				</p>{/if}
			{#if previewSrc}
				<div class="space-y-4">
					<h3 class="font-semibold text-ink">Så visas bilden i recensionen</h3>
					<div class="overflow-hidden rounded-3xl border border-line">
						<ReviewImage
							src={previewSrc}
							alt="Förhandsvisning av recensionsbild"
							focusX={imageFocusX}
							focusY={imageFocusY}
							zoom={imageZoom}
						/>
					</div>
					<p id="image-position-help" class="text-sm text-muted">
						Zooma från 100 till 300 % och justera utsnittet som visas i recensionen och på
						recensionskortet. Originalbilden behålls. På stående bilder syns främst den lodräta
						justeringen, på breda bilder den vågräta.
					</p>
					<label class="block" for="image-zoom">
						Zoom: {Math.round(imageZoom * 100)} %
						<input
							id="image-zoom"
							type="range"
							min="1"
							max="3"
							step="0.05"
							bind:value={imageZoom}
							aria-describedby="image-position-help"
							class="mt-2 block w-full accent-ember"
						/>
					</label>
					<label class="block" for="image-focus-x">
						Vågrät bildposition: {imageFocusX} %
						<input
							id="image-focus-x"
							type="range"
							min="0"
							max="100"
							step="1"
							bind:value={imageFocusX}
							aria-describedby="image-position-help"
							class="mt-2 block w-full accent-ember"
						/>
					</label>
					<label class="block" for="image-focus-y">
						Lodrät bildposition: {imageFocusY} %
						<input
							id="image-focus-y"
							type="range"
							min="0"
							max="100"
							step="1"
							bind:value={imageFocusY}
							aria-describedby="image-position-help"
							class="mt-2 block w-full accent-ember"
						/>
					</label>
					<button
						type="button"
						class="rounded-full border border-line px-4 py-2 text-sm text-secondary"
						onclick={() => {
							imageFocusX = 50;
							imageFocusY = 50;
						}}>Centrera bilden</button
					>
					<button
						type="button"
						class="rounded-full border border-line px-4 py-2 text-sm text-secondary"
						onclick={() => {
							imageZoom = 1;
							imageFocusX = 50;
							imageFocusY = 50;
						}}>Återställ utsnitt</button
					>
				</div>
			{/if}
		</section>
		<section class={panelClass}>
			<h2 class="text-xl font-semibold">Stället (valfritt)</h2>
			<label class="block" for="location"
				>Plats / adress<input
					id="location"
					maxlength="300"
					bind:value={location}
					class={inputClass}
				/></label
			>
			<label class="flex items-center gap-3"
				><input type="checkbox" bind:checked={rateVenue} class="size-5 accent-ember" />Betygsätt
				stället också</label
			>
			<p class="text-sm text-muted">
				Platsbetygen visas separat och påverkar inte läskens helhetsbetyg.
			</p>
			{#if rateVenue}<RatingInputs
					metrics={VENUE_RATING_METRICS}
					bind:values={venueRatings}
					prefix="venue"
				/>{/if}
			<details>
				<summary class="cursor-pointer text-secondary">Koordinater för kartan (valfritt)</summary>
				<p class="mt-3 text-sm text-muted">
					Ange båda koordinaterna manuellt för att visa platsen på kartan.
				</p>
				<div class="mt-4 grid gap-5 sm:grid-cols-2">
					<label for="latitude"
						>Latitud<input
							id="latitude"
							type="number"
							min="-90"
							max="90"
							step="any"
							bind:value={latitude}
							class={inputClass}
						/></label
					><label for="longitude"
						>Longitud<input
							id="longitude"
							type="number"
							min="-180"
							max="180"
							step="any"
							bind:value={longitude}
							class={inputClass}
						/></label
					>
				</div>
			</details>
		</section>
		<section class={panelClass}>
			<h2 class="text-xl font-semibold">Ladda ner</h2>
			<p class="text-secondary">
				Lägg JSON-filen i <code>content/reviews/</code> och bilden i
				<code>content/reviews/images/</code>. Publicera sedan genom projektets vanliga bygg- och
				granskningsflöde.
			</p>
			{#if error}<p role="alert" class="text-accent">{error}</p>{/if}
			{#if notice}<p role="status" class="text-secondary">{notice}</p>{/if}
			<div class="flex flex-wrap gap-3">
				<button
					type="submit"
					disabled={imageBusy}
					class="rounded-full bg-ember px-5 py-3 font-semibold text-white disabled:opacity-50"
					>Ladda ner JSON</button
				><button
					type="button"
					disabled={!image || imageBusy || !slug}
					onclick={() => image && download(image, imageName)}
					class="rounded-full border border-line px-5 py-3 font-semibold disabled:opacity-50"
					>Ladda ner bild</button
				>
			</div>
		</section>
	</form>
</section>
