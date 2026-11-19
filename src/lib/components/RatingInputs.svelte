<script lang="ts">
	import { TASTING_MIN_RATING } from '$lib/review-metadata';
	import { MediaQuery } from 'svelte/reactivity';

	let {
		metrics,
		values = $bindable(),
		prefix,
		minimum = TASTING_MIN_RATING
	}: {
		metrics: readonly { key: string; label: string; description: string }[];
		values: Record<string, number | undefined>;
		prefix: string;
		minimum?: number;
	} = $props();

	const compact = new MediaQuery('(width < 40rem)');
	const options = $derived(Array.from({ length: 6 - minimum }, (_, index) => index + minimum));
	let invalidRating = $state.raw<{ key: string; draft: typeof values }>();
</script>

<div class="grid gap-3 sm:grid-cols-2 sm:gap-4">
	{#each metrics as metric (metric.key)}
		{@const id = `${prefix}-${metric.key}`}
		{#if compact.current}
			{@const invalid =
				invalidRating?.key === metric.key &&
				invalidRating.draft === values &&
				!options.some((option) => option === values[metric.key])}
			<div
				role="radiogroup"
				aria-labelledby={`${id}-label`}
				aria-describedby={`${id}-help${invalid ? ` ${id}-error` : ''}`}
				aria-required="true"
				aria-invalid={invalid || undefined}
				class="min-w-0 rounded-xl border bg-surface-raised p-3 {invalid
					? 'border-accent'
					: 'border-line'}"
			>
				<p id={`${id}-label`} class="font-semibold">{metric.label}</p>
				<p id={`${id}-help`} class="mt-1 text-sm text-muted">{metric.description}</p>
				<div
					class="mt-2 grid gap-1 {minimum === 0
						? 'grid-cols-3 min-[375px]:grid-cols-6'
						: 'grid-cols-5'}"
				>
					{#each options as option (option)}
						<label for={`${id}-${option}`} class="relative cursor-pointer">
							<input
								id={`${id}-${option}`}
								type="radio"
								name={id}
								value={option}
								checked={values[metric.key] === option}
								required
								class="peer sr-only"
								oninvalid={(event) => {
									event.preventDefault();
									invalidRating = { key: metric.key, draft: values };
								}}
								onchange={() => {
									values[metric.key] = option;
									invalidRating = undefined;
								}}
							/>
							<span
								class="grid min-h-11 place-items-center rounded-lg border border-line bg-surface font-semibold tabular-nums text-ink peer-checked:border-ember peer-checked:bg-ember peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
								>{option}</span
							>
						</label>
					{/each}
				</div>
				{#if invalid}
					<p id={`${id}-error`} role="alert" class="mt-2 text-sm text-accent">
						Välj ett värde från {minimum} till 5.
					</p>
				{/if}
			</div>
		{:else}
			<div class="rounded-xl border border-line bg-surface-raised p-4">
				<div class="flex justify-between gap-3 font-semibold">
					<label for={id}>{metric.label}</label>
					<span>{values[metric.key] ?? '–'}/5</span>
				</div>
				<p id={`${id}-help`} class="mt-1 text-sm text-muted">
					{metric.description}
				</p>
				<input
					{id}
					aria-describedby={`${id}-help`}
					type="number"
					min={minimum}
					max="5"
					step="1"
					required
					bind:value={values[metric.key]}
					class="mt-3 w-full rounded-lg border border-line bg-surface p-2 focus:outline-accent"
				/>
			</div>
		{/if}
	{/each}
</div>
