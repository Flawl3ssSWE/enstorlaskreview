import type { PublicReview } from '../types/bar-review';
import { formatAuthors } from '../utils/authors';
import { renderReviewMarkdown } from '../utils/review-markdown';

const origin = 'https://enstorlaskreview.se';

function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]!;
	});
}

/** Serializes validated public content; review URLs provide stable item identities. */
export function serializeReviewsRss(reviews: readonly PublicReview[], base: string): string {
	const siteUrl = `${origin}${base}/`;
	const sorted = [...reviews].sort(
		(a, b) =>
			Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
			(a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
	);
	const latestUpdate = reviews.reduce(
		(latest, review) => Math.max(latest, Date.parse(review.updatedAt)),
		-Infinity
	);
	const items = sorted.map((review) => {
		const url = `${siteUrl}${encodeURIComponent(review.slug)}/`;
		const credits = `<p>Författare: ${escapeXml(formatAuthors(review.author, review.coAuthors))}</p>`;
		const html = renderReviewMarkdown(review.description) + credits;
		return `    <item>
      <title>${escapeXml(review.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(review.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(html)}</description>
    </item>`;
	});
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>En Stor Läsk Review</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Recensioner av läsk från En Stor Läsk Review.</description>
    <language>sv</language>
    <atom:link href="${escapeXml(`${siteUrl}rss.xml`)}" rel="self" type="application/rss+xml" />
${reviews.length ? `    <lastBuildDate>${new Date(latestUpdate).toUTCString()}</lastBuildDate>\n` : ''}${items.length ? items.join('\n') + '\n' : ''}  </channel>
</rss>
`;
}
