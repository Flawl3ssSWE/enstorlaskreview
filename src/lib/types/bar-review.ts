import type { DRINK_CONTAINERS, SERVING_METHODS, SERVING_TEMPERATURES } from '../review-metadata';

export type DrinkContainer = (typeof DRINK_CONTAINERS)[number];

export type ReviewRatingKey =
	| 'atmosphere'
	| 'service'
	| 'selection'
	| 'quality'
	| 'price'
	| 'cleanliness'
	| 'soundLevel'
	| 'barhopPotential';

export type ReviewRatingValues = Record<ReviewRatingKey, number>;

/** Public repository content. Never put private drafts or credentials here. */
export type SodaRatingKey =
	| 'taste'
	| 'sweetness'
	| 'carbonation'
	| 'mouthfeel'
	| 'drinkability'
	| 'matchesName'
	| 'value';
export type SodaRatingValues = Record<SodaRatingKey, number> & { mouthfeelMatch?: number };
export type VenueRatingKey = 'atmosphere' | 'service' | 'selection' | 'cleanliness' | 'soundLevel';
export type VenueRatingValues = Record<VenueRatingKey, number>;

export interface DrinkFacts {
	servingMethods?: (typeof SERVING_METHODS)[number][];
	servingTemperature?: (typeof SERVING_TEMPERATURES)[number];
	servedWithIce?: boolean;
	isEnergyDrink?: boolean;
	isProteinDrink?: boolean;
	isElectrolyteDrink?: boolean;
	sugarType?: 'sugar-free' | 'sugared';
	caffeineMgPer100Ml?: number;
	caffeineMgPerContainer?: number;
	carbohydrateGPer100Ml?: number;
	carbohydrateGPerContainer?: number;
	proteinGPer100Ml?: number;
	proteinGPerContainer?: number;
	container?: DrinkContainer;
	customContainer?: string;
	volumeMl?: number;
	beerPriceKr?: number;
}

export interface ReviewContent extends Partial<ReviewRatingValues>, DrinkFacts {
	sodaId?: string;
	/** Legacy recommendation; never treated as a favorite. */
	recommended?: boolean;
	favorite?: boolean;
	repurchasePotential?: number;
	sodaRatings?: SodaRatingValues;
	venueRatings?: VenueRatingValues;
	title: string;
	description: string;
	slug: string;
	image: string;
	imageFocusX?: number;
	imageFocusY?: number;
	imageZoom?: number;
	location: string;
	beerBrand?: string;
	isHappyHourPrice?: boolean;
	author: string;
	coAuthors?: string[];
	createdAt: string;
	updatedAt: string;
	latitude?: number;
	longitude?: number;
}

export interface PublicReview extends ReviewContent {
	author: string;
	description: string;
	rating: number;
}
