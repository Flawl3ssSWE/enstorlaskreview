import { loadReviewEditor } from '$lib/server/review-editor';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => loadReviewEditor();
