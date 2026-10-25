<script lang="ts">
	import badgeImage from '$lib/images/laskfavorit.png';

	let { large = false }: { large?: boolean } = $props();
</script>

<span class="favorite-badge" class:large>
	<img src={badgeImage} alt="" width="1312" height="1199" />
	<span class="sr-only">Läskfavorit</span>
</span>

<style>
	.favorite-badge {
		position: relative;
		display: block;
		width: 6.5rem;
		flex-shrink: 0;
		filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.25));
		pointer-events: none;
	}

	img {
		display: block;
		width: 100%;
		height: auto;
	}

	@media (min-width: 640px) {
		.large {
			width: 8rem;
		}
	}
</style>
