<script lang="ts">
	import { REPURCHASE_POTENTIAL_LABELS } from '$lib/review-metadata';
</script>

<svelte:head>
	<title>FAQ</title>
	<meta name="description" content="Vanliga frågor om hur En Stor Läsk Review fungerar" />
</svelte:head>

<div class="mx-auto w-full max-w-4xl px-4 pb-12 pt-6">
	<div
		class="rounded-3xl border border-line bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-10"
	>
		<p class="text-xs font-semibold uppercase tracking-[0.4em] text-muted">FAQ</p>
		<h1 class="mt-4 text-3xl font-semibold text-ink sm:text-4xl">Vanliga frågor</h1>

		<div class="mt-8 space-y-7">
			<section>
				<h2 class="text-2xl font-semibold text-ink">Vad är En Stor Läsk Review?</h2>
				<p class="mt-2 text-secondary">
					En oberoende guide till läsk. Vi provar olika sorter och recenserar smak, kolsyra och
					prisvärdhet så att du kan upptäcka nya smaker och hitta din nästa favorit.
				</p>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Hur fungerar betygen?</h2>
				<p class="mt-2 text-secondary">
					Läsken får ett helhetsbetyg mellan 0 och 3. I nya recensioner väger smak 30 %;
					sötmabalans, kolsyra och drickbarhet 15 % vardera; passande konsistens och hur väl smaken
					matchar namnet 10 % vardera; prisvärdhet 5 %. Sötma 3 är perfekt och ger högst
					balansbetyg, medan både för lite och för mycket sötma drar ned. Konsistens beskriver hur
					rinnig läsken är; ett separat betyg bedömer hur väl konsistensen passar läsken. Äldre
					recensioner behåller sin tidigare beräkning.
				</p>
				<ul class="mt-3 space-y-2 text-secondary">
					<li><strong>0/3</strong>: Inget extra.</li>
					<li><strong>1/3</strong>: Sticker ut lite från mängden.</li>
					<li><strong>2/3</strong>: Riktigt bra.</li>
					<li><strong>3/3</strong>: Måste provas. Väldigt sällsynt.</li>
				</ul>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Vilka står bakom recensionerna?</h2>
				<p class="mt-2 text-secondary">
					Författaren står vid varje recension. Varje recensent har en egen sida med sin text och
					betyg. Fler recensioner av samma läsk länkas därifrån. ”Läskfavorit” är en särskild
					utmärkelse för en läsk recensenten aktivt väljer framför andra.
				</p>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Vad är återköpspotential?</h2>
				<p class="mt-2 text-secondary">
					Återköpspotential visar hur gärna recensenten köper läsken igen. Den bedöms separat på en
					skala från 0 till 5 och påverkar inte helhetsbetyget. Saknat betyg betyder att
					återköpspotentialen ännu inte har bedömts.
				</p>
				<ul class="mt-3 space-y-1 text-secondary">
					{#each REPURCHASE_POTENTIAL_LABELS as label, score}
						<li><strong>{score}/5</strong>: {label}.</li>
					{/each}
				</ul>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Varför finns det betyg på stället?</h2>
				<p class="mt-2 text-secondary">
					Ibland provar vi läsk på ett café, en restaurang eller en bar. Då kan recensionen också
					innehålla betyg på stället. De visas separat och påverkar inte läskens helhetsbetyg.
				</p>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Varför saknas vissa läsksorter?</h2>
				<p class="mt-2 text-secondary">Vi har inte hunnit prova och recensera dem än.</p>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Hur fungerar kartan och integriteten?</h2>
				<p class="mt-2 text-secondary">
					Kartan visar platser där vi har provat läsk, när recensionen har en sparad kartposition.
					Koordinaterna anges manuellt och sparas tillsammans med recensionerna. Kartdata hämtas
					från OpenFreeMap först när du godkänner att kartan laddas.
				</p>
				<p class="mt-2 text-secondary">
					Vi ber inte om tillgång till din position. Kartan öppnas över Göteborg och du kan själv
					flytta och zooma den. Ditt godkännande gäller bara medan kartsidan är öppen och sparas
					inte i kakor eller lokal lagring.
				</p>
				<p class="mt-2 text-secondary">
					När kartan laddas får OpenFreeMap din IP-adress och information om vilket kartområde som
					visas. Läs mer i
					<a class="underline underline-offset-4" href="https://openfreemap.org/privacy/">
						OpenFreeMaps integritetspolicy</a
					>.
				</p>
			</section>
		</div>
	</div>
</div>
