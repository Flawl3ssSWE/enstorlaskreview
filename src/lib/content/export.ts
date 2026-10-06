import type { ReviewContent } from '../types/bar-review';

/** Load the browser formatter only when downloading a review. */
export async function formatReviewJson(review: ReviewContent): Promise<string> {
	const [{ format }, { default: babel }, { default: estree }] = await Promise.all([
		import('prettier/standalone'),
		import('prettier/plugins/babel'),
		import('prettier/plugins/estree')
	]);
	return format(JSON.stringify(review), {
		parser: 'json',
		plugins: [babel, estree],
		useTabs: true,
		printWidth: 100,
		trailingComma: 'none',
		endOfLine: 'lf'
	});
}
