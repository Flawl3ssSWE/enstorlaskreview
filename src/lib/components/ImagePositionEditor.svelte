<script lang="ts">
	import ReviewImage from './ReviewImage.svelte';

	interface Props {
		src: string;
		focusX?: number;
		focusY?: number;
		zoom?: number;
	}

	let { src, focusX = $bindable(50), focusY = $bindable(50), zoom = 1 }: Props = $props();
	let dragging = $state(false);
	let drag:
		| {
				pointerId: number;
				x: number;
				y: number;
				focusX: number;
				focusY: number;
				overflowX: number;
				overflowY: number;
		  }
		| undefined;

	const clamp = (value: number) => Math.max(0, Math.min(100, value));

	function startDrag(event: PointerEvent) {
		if (!event.isPrimary || event.button !== 0) return;
		const target = event.currentTarget as HTMLButtonElement;
		const image = target.querySelector('img');
		if (!image?.naturalWidth || !image.naturalHeight) return;
		const width = target.clientWidth;
		const height = target.clientHeight;
		const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
		drag = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			focusX,
			focusY,
			overflowX: image.naturalWidth * scale * zoom - width,
			overflowY: image.naturalHeight * scale * zoom - height
		};
		target.setPointerCapture(event.pointerId);
		dragging = true;
	}

	function moveDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		if (drag.overflowX > 0.01) {
			focusX = clamp(drag.focusX - ((event.clientX - drag.x) / drag.overflowX) * 100);
		}
		if (drag.overflowY > 0.01) {
			focusY = clamp(drag.focusY - ((event.clientY - drag.y) / drag.overflowY) * 100);
		}
	}

	function endDrag(event: PointerEvent) {
		if (event.pointerId !== drag?.pointerId) return;
		drag = undefined;
		dragging = false;
	}

	function moveWithKeyboard(event: KeyboardEvent) {
		const step = event.shiftKey ? 10 : 1;
		switch (event.key) {
			case 'ArrowLeft':
				focusX = clamp(focusX + step);
				break;
			case 'ArrowRight':
				focusX = clamp(focusX - step);
				break;
			case 'ArrowUp':
				focusY = clamp(focusY + step);
				break;
			case 'ArrowDown':
				focusY = clamp(focusY - step);
				break;
			default:
				return;
		}
		event.preventDefault();
	}
</script>

<button
	type="button"
	aria-label="Justera bildens utsnitt"
	aria-describedby="image-position-help"
	class="block w-full touch-none overflow-hidden rounded-3xl border border-line p-0 select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember {dragging
		? 'cursor-grabbing'
		: 'cursor-grab'}"
	onpointerdown={startDrag}
	onpointermove={moveDrag}
	onpointerup={endDrag}
	onpointercancel={endDrag}
	onlostpointercapture={endDrag}
	onkeydown={moveWithKeyboard}
	ondragstart={(event) => event.preventDefault()}
>
	<ReviewImage {src} alt="Förhandsvisning av recensionsbild" {focusX} {focusY} {zoom} square />
</button>
