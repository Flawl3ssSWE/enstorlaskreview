export const REVIEW_REPOSITORY_OWNER = 'Flawl3ssSWE';
export const REVIEW_REPOSITORY_NAME = 'enstorlaskreview';
export const REVIEW_BASE_BRANCH = 'main';
export const REVIEW_REPOSITORY = `https://github.com/${REVIEW_REPOSITORY_OWNER}/${REVIEW_REPOSITORY_NAME}`;
export function reviewHistoryUrl(slug: string): string {
	return `${REVIEW_REPOSITORY}/commits/HEAD/content/reviews/${encodeURIComponent(slug)}.json`;
}
