import { loadReviews } from '$lib/server/content';
import { buildReviewMap } from '$lib/content/derived';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async () => ({ map: buildReviewMap(await loadReviews()) });
