import { loadReviews } from '../src/lib/server/content.ts';
const reviews = await loadReviews();
console.log(`Validerade ${reviews.length} publicerade recensioner.`);
