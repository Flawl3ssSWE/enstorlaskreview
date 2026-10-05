export const REVIEW_REPOSITORY = 'https://github.com/Flawl3ssSWE/enstorlaskreview';
export function reviewHistoryUrl(slug: string): string {
	return `${REVIEW_REPOSITORY}/commits/HEAD/content/reviews/${encodeURIComponent(slug)}.json`;
}
