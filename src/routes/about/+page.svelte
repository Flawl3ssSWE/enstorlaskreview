<script lang="ts">
	import RatingMug from '$lib/components/RatingMug.svelte';
	import { base } from '$app/paths';
	import {
		TASTING_REPURCHASE_POTENTIAL_LABELS,
		TASTING_MIN_RATING,
		TASTING_RATING_METRICS
	} from '$lib/review-metadata';
</script>

<div class="page-shell">
	<h1 class="text-balance text-3xl font-semibold text-ink sm:text-4xl">Vanliga frågor</h1>
	<div class="glass-panel mt-8 p-6 sm:p-8">
		<div class="max-w-prose space-y-10">
			<section>
				<h2 class="text-2xl font-semibold text-ink">Vad är En Stor Läsk Review?</h2>
				<p class="mt-2 text-secondary">
					En oberoende guide till läsk. Vi provar olika sorter och recenserar smak, kolsyra och
					prisvärdhet så att du kan upptäcka nya smaker och hitta din nästa favorit.
				</p>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Recenserar ni öl också?</h2>
				<p class="mt-2 text-secondary">
					Vi recenserar läsk. En Stor Läsk Review är en parodi på
					<a href="https://enstorstarkreview.se/" class="font-semibold underline underline-offset-4"
						>En Stor Stark Review</a
					>, där du hittar ölrecensionerna.
				</p>
			</section>

			<section>
				<h2 class="text-2xl font-semibold text-ink">Hur fungerar betygen?</h2>
				<p class="mt-2 text-secondary">
					Läsken får ett helhetsbetyg mellan 0 och 3 muggar. För nya recensioner väger vi ihop fyra
					delbetyg på skalan 1–5. Äldre recensioner behåller sin tidigare beräkning.
				</p>
				<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary">
					{#each TASTING_RATING_METRICS as metric (metric.key)}
						<li>{metric.label} <strong>{metric.weight} %</strong></li>
					{/each}
				</ul>
				<p class="mt-3 text-secondary">
					Smakprofilen beskriver hur tydligt sötma, surhet, kolsyra, fyllighet och beska märks. En
					riktigt sur läsk kan få full poäng i balans om syran fungerar ihop med resten av smaken.
					Namn, förpackning, prisvärdhet och återköpspotential visas separat i den nya modellen.
				</p>
				<ul class="mt-3 space-y-2 text-secondary">
					<li class="flex items-center gap-3"><RatingMug rating={0} /> Inget extra.</li>
					<li class="flex items-center gap-3">
						<RatingMug rating={1} /> Sticker ut lite från mängden.
					</li>
					<li class="flex items-center gap-3"><RatingMug rating={2} /> Riktigt bra.</li>
					<li class="flex items-center gap-3">
						<RatingMug rating={3} /> Måste provas. Väldigt sällsynt.
					</li>
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
					Återköpspotential visar hur gärna recensenten köper läsken igen. Den bedöms på en skala
					från 1 till 5 i den nya modellen och visas separat från helhetsbetyget.
				</p>
				<ul class="mt-3 space-y-1 text-secondary">
					{#each TASTING_REPURCHASE_POTENTIAL_LABELS as label, index}
						<li><strong>{index + TASTING_MIN_RATING}/5</strong> – {label}.</li>
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
				<h2 class="text-2xl font-semibold text-ink">Hur följer jag nya recensioner?</h2>
				<p class="mt-2 text-secondary">
					Lägg till vårt <a
						href={`${base}/rss.xml`}
						class="font-semibold underline underline-offset-4">RSS-flöde</a
					>
					i din RSS-läsare för att följa nya läskrecensioner. Du behöver inget konto. Ändringar i en
					publicerad recension skapar ingen ny post.
				</p>
			</section>
			<section>
				<h2 class="text-2xl font-semibold text-ink">Hur fungerar sorteringen Närmast?</h2>
				<p class="mt-2 text-secondary">
					Välj Närmast på startsidan och tryck på Visa avstånd från min position. Om du tillåter
					platsåtkomst räknas avstånd fågelvägen till recensioner med manuellt sparade koordinater.
					Recensioner utan koordinater visas sist. Utan position visas de senaste recensionerna
					först. Din position används bara i webbläsaren, sparas inte och skickas inte till oss.
					Platsåtkomsten avslutas när du byter sortering eller lämnar startsidan.
				</p>
			</section>
			<section>
				<h2 class="text-2xl font-semibold text-ink">Hur fungerar kartan och integriteten?</h2>
				<p class="mt-2 text-secondary">
					Kartan visar platser där vi har provat läsk, när recensionen har en sparad kartposition.
					Koordinaterna anges manuellt och sparas tillsammans med recensionerna. Kartdata hämtas
					från OpenFreeMap först när du godkänner att kartan laddas.
				</p>
				<p class="mt-2 text-secondary">
					Kartan ber inte om tillgång till din position. Den öppnas över Göteborg och du kan själv
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
