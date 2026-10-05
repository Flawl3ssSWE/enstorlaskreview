import { loadReviews } from '$lib/server/content';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async () => ({ bars: await loadReviews() });
