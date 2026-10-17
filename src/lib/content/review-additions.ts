/** Shared by CI and the browser publisher. Content validity is checked by the production build. */
export interface ReviewFileChange {
	path: string;
	status: string;
	mode: string;
}

export const AUTOMERGE_REVIEW_AUTHOR = 'Flawl3ssSWE';
export const REVIEW_REQUIRED_CHECKS = ['build', 'dependency-review', 'review-automerge-policy'];

export function isReviewAdditionsOnly(changes: ReviewFileChange[]): boolean {
	let reviews = 0;
	for (const change of changes) {
		if (change.status !== 'added' || change.mode !== '100644') return false;
		if (
			/^content\/reviews\/[0-9A-Za-z\u00C0-\u017F]+(?:-[0-9A-Za-z\u00C0-\u017F]+)*\.json$/.test(
				change.path
			)
		)
			reviews++;
		else if (
			!/^content\/reviews\/images\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:webp|png|jpg|jpeg)$/.test(
				change.path
			)
		)
			return false;
	}
	return reviews > 0;
}

export function reviewAutomergeAllowed(
	author: string,
	base: string,
	additionsOnly: boolean
): boolean {
	return author === AUTOMERGE_REVIEW_AUTHOR && base === 'main' && additionsOnly;
}
