import type { PublicReview } from '../types/bar-review';
import { capitalizeAuthorName } from '../utils/authors';

export const SITE_ORIGIN = 'https://enstorlaskreview.se';
export const SITE_NAME = 'En Stor Läsk Review';
const defaultDescription =
	'Läskrecensioner med fokus på smak, kolsyra och prisvärdhet. Hitta din nästa favorit hos En Stor Läsk Review.';

export const PUBLIC_PAGES = ['', 'about', 'karta', 'statistik'] as const;

export function publicUrl(path: string, base: string): string {
	return `${SITE_ORIGIN}${base}/${path.replace(/^\/+/, '')}`;
}

function plainDescription(value: string, limit?: number): string {
	return value
		.replace(/<[^>]*>/g, '')
		.replace(/[#*_`~]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, limit);
}

/** Route IDs prevent utilities and error pages from inheriting public review metadata. */
export function pageSeo(
	route: string | null,
	base: string,
	review?: PublicReview,
	status = 200,
	options: { search?: string; reviews?: readonly PublicReview[] } = {}
) {
	const pages: Record<string, [string, string]> = {
		'/': [SITE_NAME, defaultDescription],
		'/about': [
			`Vanliga frågor – ${SITE_NAME}`,
			'Läs om hur vi provar läsk, sätter betyg och hanterar integritet hos En Stor Läsk Review.'
		],
		'/karta': [
			`Läskkarta – ${SITE_NAME}`,
			'Se var vi har provat läsk och läs recensionerna på kartan.'
		],
		'/statistik': [
			`Läskstatistik – ${SITE_NAME}`,
			'Jämför läskbetyg, literpriser, märken och innehåll från våra publicerade recensioner.'
		],
		'/table': [
			`Recensionsöversikt – ${SITE_NAME}`,
			'Översikt över recensionernas poäng och betygsgränser.'
		],
		'/demo': [
			`Demorecension – ${SITE_NAME}`,
			'En påhittad läsk som visar hur recensionerna fungerar.'
		],
		'/skapa': [
			`Skapa recension – ${SITE_NAME}`,
			'Skapa en läskrecension och skicka som PR eller JSON.'
		],
		'/skapa/wizard': [
			`Skapa recension steg för steg – ${SITE_NAME}`,
			'Skapa en läskrecension steg för steg.'
		],
		'/[slug]/history': [
			`Ändringshistorik – ${SITE_NAME}`,
			'Visa recensionens ändringshistorik på GitHub.'
		]
	};
	const isReview = route === '/[slug]' && !!review && status < 400;
	const isPublic =
		status < 400 && (isReview || ['/', '/about', '/karta', '/statistik'].includes(route ?? ''));
	const filtered = route === '/' && new URLSearchParams(options.search).size > 0;
	const noindex = !isPublic || filtered;
	const [title, description] =
		status >= 400 || route === '/404'
			? [
					status === 404 || route === '/404'
						? `419 Läsken är inte recenserad – ${SITE_NAME}`
						: `${status} Något gick fel – ${SITE_NAME}`,
					'Sidan kunde inte visas. Gå till startsidan för att hitta våra läskrecensioner.'
				]
			: isReview
				? [`${review.title} – ${SITE_NAME}`, plainDescription(review.description, 200)]
				: (pages[route ?? ''] ?? [SITE_NAME, defaultDescription]);
	const path = isReview
		? `${encodeURIComponent(review.slug)}/`
		: route === '/'
			? ''
			: `${route?.slice(1)}/`;
	return {
		title,
		description,
		noindex,
		canonical: isPublic ? publicUrl(path, base) : undefined,
		image: publicUrl(
			isReview ? `images/${encodeURIComponent(review.image)}` : 'social-preview.png',
			base
		),
		imageAlt: isReview ? review.title : SITE_NAME,
		type: isReview ? 'article' : 'website',
		structuredData: isReview
			? reviewStructuredData(review, base)
			: route === '/' && isPublic && !filtered
				? homeStructuredData(options.reviews ?? [], base)
				: undefined
	};
}

export function homeStructuredData(reviews: readonly PublicReview[], base: string) {
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': publicUrl('#website', base),
				url: publicUrl('', base),
				name: SITE_NAME,
				inLanguage: 'sv',
				description: defaultDescription
			},
			{
				'@type': 'ItemList',
				name: 'Publicerade läskrecensioner',
				itemListElement: [...reviews]
					.sort(
						(a, b) =>
							Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
							a.slug.localeCompare(b.slug, 'sv')
					)
					.map((review, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						url: publicUrl(`${encodeURIComponent(review.slug)}/`, base),
						name: review.title
					}))
			}
		]
	};
}

export function reviewStructuredData(review: PublicReview, base: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Review',
		url: publicUrl(`${encodeURIComponent(review.slug)}/`, base),
		inLanguage: 'sv',
		name: review.title,
		reviewBody: plainDescription(review.description),
		datePublished: review.createdAt,
		dateModified: review.updatedAt,
		author: [review.author, ...(review.coAuthors ?? [])].map((name) => ({
			'@type': 'Person',
			name: capitalizeAuthorName(name)
		})),
		publisher: { '@type': 'Organization', name: SITE_NAME },
		itemReviewed: {
			'@type': review.sodaRatings ? 'Product' : 'LocalBusiness',
			name: review.title,
			image: publicUrl(`images/${encodeURIComponent(review.image)}`, base),
			...(review.sodaRatings && review.beerBrand
				? { brand: { '@type': 'Brand', name: review.beerBrand } }
				: {})
		},
		reviewRating: {
			'@type': 'Rating',
			ratingValue: review.rating,
			worstRating: 0,
			bestRating: 3
		}
	};
}

/** Escape markup delimiters so review text cannot end the inert JSON-LD script. */
export function serializeStructuredData(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]!;
	});
}

export function serializeSitemap(reviews: readonly PublicReview[], base: string): string {
	const entries = [
		...PUBLIC_PAGES.map(
			(path) => `<url><loc>${escapeXml(publicUrl(path ? `${path}/` : '', base))}</loc></url>`
		),
		...[...reviews]
			.sort((a, b) => a.slug.localeCompare(b.slug, 'sv'))
			.map(
				(review) =>
					`<url><loc>${escapeXml(publicUrl(`${encodeURIComponent(review.slug)}/`, base))}</loc><lastmod>${escapeXml(review.updatedAt)}</lastmod></url>`
			)
	];
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

export function serializeRobots(base: string): string {
	// Keep utility routes crawlable so their noindex metadata can be read.
	return `User-agent: *\nAllow: /\n\nSitemap: ${publicUrl('sitemap.xml', base)}\n`;
}

export function serializeLlmsGuide(base: string): string {
	return `# ${SITE_NAME}\n\n> En svensk, oberoende guide med publicerade recensioner av läsk.\n\nRecensionerna bygger på recensenternas egna omdömen. Helhetsbetyget går från 0 till 3; delbetygen har egna skalor. Pris och tillgänglighet gäller vid recensionstillfället. Läskens egenskaper och omdömen om inköpsstället hålls isär.\n\n## Publika sidor\n\n- [Recensioner](${publicUrl('', base)}): Sök och filtrera publicerade recensioner. Varje recension har en egen permanent sida med författare och datum.\n- [Vanliga frågor](${publicUrl('about/', base)}): Betygsmetod och integritet.\n- [Karta](${publicUrl('karta/', base)}): Inköpsställen med manuellt sparade koordinater.\n- [Statistik](${publicUrl('statistik/', base)}): Sammanställningar av publicerade recensioner.\n- [Webbplatskarta](${publicUrl('sitemap.xml', base)}): Alla publika recensionsadresser.\n- [RSS](${publicUrl('rss.xml', base)}): Publicerade recensioner.\n\n## Avgränsningar\n\nDemosidan innehåller påhittade exempel. Recensionsverktyget och historikomdirigeringarna är inte recensioner. Utkast är inte publicerat innehåll. Citera recensionens permanenta adress och författare, och skilj subjektiva omdömen från produktfakta.\n`;
}

export function structuredDataScript(value: unknown): string {
	return `<script type="application/ld+json">${serializeStructuredData(value)}</script>`;
}
