import type { ReviewRatingKey } from './types/bar-review.ts';

export interface ReviewRatingMetric {
	key: ReviewRatingKey;
	label: string;
	description: string;
	weight: number;
}

export const REVIEW_RATING_METRICS = [
	{
		key: 'atmosphere',
		label: 'Atmosfär',
		description: 'Stämning och känsla på platsen',
		weight: 0.18
	},
	{
		key: 'service',
		label: 'Service',
		description: 'Personalens bemötande och snabbhet',
		weight: 0.14
	},
	{
		key: 'selection',
		label: 'Utbud',
		description: 'Variation av drycker',
		weight: 0.1
	},
	{
		key: 'quality',
		label: 'Kvalitet',
		description: 'Kvalitet på dryck',
		weight: 0.18
	},
	{
		key: 'price',
		label: 'Prisvärdhet',
		description: 'Värde för pengarna',
		weight: 0.07
	},
	{
		key: 'cleanliness',
		label: 'Renlighet',
		description: 'Hygien och ordning',
		weight: 0.12
	},
	{
		key: 'soundLevel',
		label: 'Ljudnivå',
		description: 'Ljudnivå (0=högljutt, 5=tyst)',
		weight: 0.03
	},
	{
		key: 'barhopPotential',
		label: 'Barhoppotential',
		description: 'Hur bra är baren för att hoppa vidare från?',
		weight: 0.18
	}
] as const satisfies readonly ReviewRatingMetric[];

/** New soda scores use sweetness balance and consistency suitability. */
export const SODA_RATING_METRICS = [
	{ key: 'taste', label: 'Smak', description: 'Hur god och tydlig är smaken?', weight: 0.3 },
	{
		key: 'sweetness',
		label: 'Sötma',
		description: 'Hur söt är läsken? 0 = inte söt, 3 = perfekt, 5 = för söt.',
		weight: 0.15
	},
	{
		key: 'carbonation',
		label: 'Kolsyra',
		description: 'Hur väl passar kolsyran läsken?',
		weight: 0.15
	},
	{
		key: 'mouthfeel',
		label: 'Konsistens',
		description: 'Hur rinnig är läsken? 0 = tjock/trögflytande, 5 = mycket rinnig.',
		weight: 0
	},
	{
		key: 'mouthfeelMatch',
		label: 'Passande konsistens',
		description: 'Är konsistensen som förväntad och passar den läsken? 5 = passar perfekt.',
		weight: 0.1
	},
	{
		key: 'drinkability',
		label: 'Drickbarhet',
		description: 'Hur gärna dricker du hela glaset?',
		weight: 0.15
	},
	{
		key: 'matchesName',
		label: 'Matchar namnet',
		description: 'Hur väl motsvarar smaken namnet?',
		weight: 0.1
	},
	{ key: 'value', label: 'Pris', description: 'Hur prisvärd är läsken?', weight: 0.05 }
] as const;

export const VENUE_RATING_METRICS = REVIEW_RATING_METRICS.filter(
	(
		metric
	): metric is (typeof REVIEW_RATING_METRICS)[number] & {
		key: import('./types/bar-review').VenueRatingKey;
	} => ['atmosphere', 'service', 'selection', 'cleanliness', 'soundLevel'].includes(metric.key)
);

export const DRINK_CONTAINERS = [
	'Burk',
	'Flaska',
	'Glasflaska',
	'SodaStream smak',
	'Sprutmaskin',
	'Annan'
] as const;

export const DRINK_VOLUMES_ML = [
	200, 250, 300, 330, 355, 400, 500, 600, 750, 1000, 1250, 1500, 2000
] as const;

/** Separate personal assessment; never included in the overall soda score. */
export const REPURCHASE_POTENTIAL_LABELS = [
	'Aldrig igen',
	'Bara om inget annat finns',
	'Kanske någon gång',
	'Köper gärna ibland',
	'Köper gärna igen',
	'Given i kylen'
] as const;

export const DRINK_TYPE_FILTERS = [
	{ value: 'energy', label: 'Energidryck' },
	{ value: 'protein', label: 'Proteindryck' },
	{ value: 'electrolyte', label: 'Elektrolytdryck' },
	{ value: 'sugar-free', label: 'Sockerfri' },
	{ value: 'sugared', label: 'Sockrad' }
] as const;

export const SERVING_METHODS = ['Originalförpackning', 'Glas', 'Sugrör', 'Mugg'] as const;
export const SERVING_TEMPERATURES = ['Kylskåpskall', 'Rumstempererad', 'Varm'] as const;
