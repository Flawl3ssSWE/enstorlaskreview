import { describe, expect, it } from 'vitest';
import sodaFixture from '../../../tests/fixtures/content/testsoda.json';
import fixture from '../../../tests/fixtures/content/testbaren.json';
import { DRINK_CONTAINERS, SODA_RATING_METRICS, VENUE_RATING_METRICS } from '../review-metadata';
import { validateReview } from './validation';
import { projectPublishedReview, publicReviewFilter } from '../../../tools/migration/projection';

describe('repository content and migration boundary', () => {
	it('derives the weighted rating and retains public data', () => {
		expect(validateReview(fixture, 'testbaren.json')).toEqual({ ...fixture, rating: 2 });
	});
	it.each([
		{ publicationStatus: 'draft' },
		{ _id: 'secret' },
		{ password: 'secret' },
		{ rating: 3 },
		{ slug: 'about' },
		{ slug: '../testbaren' },
		{ image: '../secret.png' },
		{ image: 'https://example.com/image.png' },
		{ image: 'file.svg' },
		{ quality: 6 },
		{ quality: NaN },
		{ beerPriceKr: 0 },
		{ beerPriceKr: 65.55 },
		{ latitude: 91 },
		{ longitude: undefined },
		{ imageFocusX: 101 },
		{ coAuthors: ['test'] },
		{ createdAt: '2025-02-30T12:00:00Z' },
		{ updatedAt: '2020-01-01T00:00:00Z' }
	])('rejects invalid or private content: %j', (change) => {
		expect(() => validateReview({ ...fixture, ...change }, 'testbaren.json')).toThrow();
	});
	it.each([1, 1.5, 3])('retains valid zoom %s without changing the rating', (imageZoom) => {
		expect(validateReview({ ...fixture, imageZoom }, 'testbaren.json')).toMatchObject({
			imageZoom,
			rating: 2
		});
	});
	it.each([0, 0.99, 3.01, NaN, Infinity, '2', null])('rejects invalid zoom %j', (imageZoom) => {
		expect(() => validateReview({ ...fixture, imageZoom }, 'testbaren.json')).toThrow(
			'Bildens zoom måste vara ett tal mellan 1 och 3.'
		);
	});
	it('keeps legacy reviews without a zoom field valid', () => {
		expect(validateReview(fixture, 'testbaren.json')).not.toHaveProperty('imageZoom');
	});
	it('accepts prices with one decimal', () => {
		expect(validateReview({ ...fixture, beerPriceKr: 65.5 }, 'testbaren.json').beerPriceKr).toBe(
			65.5
		);
	});
	it('requires the file to match the slug', () => {
		expect(() => validateReview(fixture, 'other.json')).toThrow();
	});
	it('allows missing coordinates and beer information', () => {
		const {
			latitude: _lat,
			longitude: _lon,
			beerPriceKr: _price,
			isHappyHourPrice: _happy,
			...review
		} = fixture;
		expect(validateReview(review, 'testbaren.json').rating).toBe(2);
	});
	it('exports an allowlist rather than spreading the database document', () => {
		const original = {
			...fixture,
			publicationStatus: 'published',
			_id: 'mongo-id',
			changeLog: [{ secret: 'old private text' }],
			privateField: 'secret',
			rating: 1
		};
		const exported = projectPublishedReview(original, [
			{ status: 'resolved', addressKey: 'testgatan 1, göteborg', latitude: 57.7, longitude: 11.97 }
		]);
		expect(exported).toEqual(fixture);
		expect(validateReview(exported, 'testbaren.json').rating).toBe(2);
	});
	it.each(['draft', 'unknown', null])('refuses non-public status %s', (publicationStatus) => {
		expect(() => projectPublishedReview({ ...fixture, publicationStatus }, [])).toThrow();
	});
	it('includes legacy published records but never negative geocodes or invalid prices', () => {
		const exported = projectPublishedReview({ ...fixture, beerPriceKr: 0 }, [
			{ status: 'failed', addressKey: 'testgatan 1, göteborg', latitude: 57.7, longitude: 11.97 }
		]);
		expect(exported).not.toHaveProperty('latitude');
		expect(exported).not.toHaveProperty('beerPriceKr');
		expect(publicReviewFilter).toEqual({
			$or: [{ publicationStatus: 'published' }, { publicationStatus: { $exists: false } }]
		});
	});
});

describe('soda reviews', () => {
	const soda = {
		title: 'Hallonsoda',
		slug: 'hallonsoda',
		image: 'test-bar.png',
		description: 'Frisk hallonsmak.',
		location: '',
		author: 'Test',
		createdAt: fixture.createdAt,
		updatedAt: fixture.updatedAt,
		sodaRatings: Object.fromEntries(SODA_RATING_METRICS.map(({ key }) => [key, 4]))
	};
	it('accepts soda reviews without a venue and derives the overall rating', () => {
		expect(validateReview(soda, 'hallonsoda.json')).toEqual({ ...soda, rating: 2 });
	});
	it.each(DRINK_CONTAINERS)('accepts the predefined container %s', (container) => {
		expect(
			validateReview(
				{ ...soda, container, ...(container === 'Annan' ? { customContainer: 'Pappmugg' } : {}) },
				'hallonsoda.json'
			).container
		).toBe(container);
	});
	it.each(['', 'Burk 25cl', 'burk 33cl', null, 33, {}, []])(
		'rejects unsupported containers: %j',
		(container) => {
			expect(() => validateReview({ ...soda, container }, 'hallonsoda.json')).toThrow(
				'Välj en giltig förpackning.'
			);
		}
	);
	it('preserves legacy soda scores without a consistency suitability rating', () => {
		for (const value of [0, 5]) {
			expect(
				validateReview(
					{
						...soda,
						sodaRatings: {
							...soda.sodaRatings,
							mouthfeelMatch: undefined,
							sweetness: value,
							mouthfeel: value
						}
					},
					'hallonsoda.json'
				).rating
			).toBe(2);
		}
	});
	it('keeps venue ratings out of the soda overall rating', () => {
		const venueRatings = Object.fromEntries(VENUE_RATING_METRICS.map(({ key }) => [key, 0]));
		expect(validateReview({ ...soda, venueRatings }, 'hallonsoda.json').rating).toBe(2);
	});
	it.each([
		{ sodaRatings: { ...soda.sodaRatings, taste: undefined } },
		{ sodaRatings: { ...soda.sodaRatings, taste: 6 } },
		{ sodaRatings: { ...soda.sodaRatings, taste: '4' } },
		{ sodaRatings: { ...soda.sodaRatings, privateNotes: 'secret' } },
		{ sodaRatings: null },
		{ venueRatings: { atmosphere: 4 } },
		{ venueRatings: [] },
		{ quality: 4 },
		{ slug: 'skapa' }
	])('rejects malformed or mixed soda content: %j', (change) => {
		expect(() => validateReview({ ...soda, ...change }, 'hallonsoda.json')).toThrow();
	});
});

describe('drink facts on independent reviews', () => {
	it('retains volume, price and caffeine without changing the score', () => {
		const content = {
			...sodaFixture,
			volumeMl: 500,
			beerPriceKr: 20,
			isEnergyDrink: true,
			caffeineMgPer100Ml: 32
		};
		const review = validateReview(content, 'testsoda.json');
		expect(review).toMatchObject(content);
		expect(review.rating).toBe(validateReview(sodaFixture, 'testsoda.json').rating);
		expect(
			validateReview({ ...content, caffeineMgPer100Ml: 0 }, 'testsoda.json').caffeineMgPer100Ml
		).toBe(0);
	});
	it.each([
		{ isEnergyDrink: 'true' },
		{ isEnergyDrink: true, caffeineMgPer100Ml: undefined },
		{ caffeineMgPer100Ml: -1 },
		{ caffeineMgPer100Ml: NaN },
		{ caffeineMgPer100Ml: Infinity },
		{ caffeineMgPer100Ml: '32' },
		{ reviews: [sodaFixture] },
		{ volumeMl: 0 },
		{ volumeMl: -1 },
		{ volumeMl: NaN },
		{ volumeMl: Infinity },
		{ volumeMl: '330' },
		{ volumeMl: null },
		{ beerPriceKr: 0 }
	])('rejects invalid facts or nested reviews: %j', (change) => {
		expect(() => validateReview({ ...sodaFixture, ...change }, 'testsoda.json')).toThrow();
	});
	it.each(['Burk 33cl', 'Burk 50cl', 'Flaska 0,5l', 'Flaska 1,5l', 'Flaska 2l', 'Glasflaska 33cl'])(
		'rejects combined container values: %s',
		(container) => {
			expect(() => validateReview({ ...sodaFixture, container }, 'testsoda.json')).toThrow(
				'Välj en giltig förpackning.'
			);
		}
	);
	it('retains separate volume and container without inferring missing volumes', () => {
		const content = { ...sodaFixture, container: 'Burk', volumeMl: 275 };
		expect(validateReview(content, 'testsoda.json')).toMatchObject(content);
		const { volumeMl: _volume, ...withoutVolume } = content;
		expect(validateReview(withoutVolume, 'testsoda.json')).not.toHaveProperty('volumeMl');
	});
	it('retains custom packaging and fractional volumes', () => {
		const content = {
			...sodaFixture,
			container: 'Annan',
			customContainer: 'Pappmugg',
			volumeMl: 275.5
		};
		expect(validateReview(content, 'testsoda.json')).toMatchObject(content);
	});
	it.each([
		undefined,
		'',
		'  ',
		' Pappmugg',
		'Pappmugg ',
		'a'.repeat(81),
		'Papp\u0000mugg',
		42,
		null
	])('rejects invalid custom packaging: %j', (customContainer) => {
		expect(() =>
			validateReview({ ...sodaFixture, container: 'Annan', customContainer }, 'testsoda.json')
		).toThrow();
	});
	it.each(['Burk', undefined])('requires Annan for custom packaging: %s', (container) => {
		expect(() =>
			validateReview({ ...sodaFixture, container, customContainer: 'Pappmugg' }, 'testsoda.json')
		).toThrow('Egen förpackning');
	});
});

describe('shared soda identifiers on independent reviews', () => {
	it('retains a shared soda ID without changing the review slug or author', () => {
		expect(
			validateReview({ ...sodaFixture, sodaId: 'same-soda-2' }, 'testsoda.json')
		).toMatchObject({ sodaId: 'same-soda-2', slug: 'testsoda', author: 'Alex' });
	});
	it.each([
		'',
		' testlask',
		'Testlask',
		'test_lask',
		'../testlask',
		'test--lask',
		'läsk',
		'a'.repeat(101),
		null,
		123,
		[],
		{}
	])('rejects invalid soda ID %j', (sodaId) => {
		expect(() => validateReview({ ...sodaFixture, sodaId }, 'testsoda.json')).toThrow();
	});
	it('allows reviews without a soda ID and restricts links to soda reviews', () => {
		const { sodaId: _id, ...unlinked } = sodaFixture;
		expect(validateReview(unlinked, 'testsoda.json')).not.toHaveProperty('sodaId');
		expect(() => validateReview({ ...fixture, sodaId: 'testlask' }, 'testbaren.json')).toThrow(
			'Läsk-ID kräver läskbetyg.'
		);
	});
});

describe('favorites and repurchase potential', () => {
	it.each([0, 1, 2, 3, 4, 5])(
		'accepts repurchase potential %s without changing the score',
		(repurchasePotential) => {
			const original = validateReview(sodaFixture, 'testsoda.json');
			const review = validateReview(
				{ ...sodaFixture, favorite: true, repurchasePotential },
				'testsoda.json'
			);
			expect(review.repurchasePotential).toBe(repurchasePotential);
			expect(review.favorite).toBe(true);
			expect(review.rating).toBe(original.rating);
		}
	);
	it.each([-1, 6, 2.5, '5', null, NaN, Infinity])(
		'rejects invalid repurchase potential %j',
		(repurchasePotential) => {
			expect(() =>
				validateReview({ ...sodaFixture, repurchasePotential }, 'testsoda.json')
			).toThrow('Återköpspotential måste vara ett heltal mellan 0 och 5.');
		}
	);
	it.each(['true', 1, null])('rejects invalid favorite %j', (favorite) => {
		expect(() => validateReview({ ...sodaFixture, favorite }, 'testsoda.json')).toThrow(
			'Läskfavorit måste vara true eller false.'
		);
	});
	it('preserves missing assessments and never converts legacy recommendations to favorites', () => {
		const legacy: Record<string, unknown> = { ...sodaFixture };
		delete legacy.favorite;
		delete legacy.repurchasePotential;
		const review = validateReview({ ...legacy, recommended: true }, 'testsoda.json');
		expect(review.favorite).toBeUndefined();
		expect(review.repurchasePotential).toBeUndefined();
	});
	it.each([{ favorite: true }, { repurchasePotential: 3 }])(
		'rejects soda assessments on legacy venue reviews',
		(assessment) => {
			expect(() => validateReview({ ...fixture, ...assessment }, 'testbaren.json')).toThrow(
				'kräver läskbetyg'
			);
		}
	);
});

it('accepts total caffeine and independent nutritional facts without changing ratings', () => {
	const content = {
		...sodaFixture,
		caffeineMgPer100Ml: undefined,
		caffeineMgPerContainer: 160,
		isEnergyDrink: true,
		isProteinDrink: true,
		sugarType: 'sugar-free',
		carbohydrateGPer100Ml: undefined,
		carbohydrateGPerContainer: 0,
		proteinGPerContainer: undefined,
		proteinGPer100Ml: 5
	};
	expect(validateReview(content, 'testsoda.json')).toMatchObject(content);
	expect(validateReview(content, 'testsoda.json').rating).toBe(
		validateReview(sodaFixture, 'testsoda.json').rating
	);
});
it.each([
	{ caffeineMgPerContainer: 100, caffeineMgPer100Ml: 32 },
	{ carbohydrateGPer100Ml: 1, carbohydrateGPerContainer: 5 },
	{ proteinGPer100Ml: 1, proteinGPerContainer: 5 },
	{ proteinGPerContainer: -1 },
	{ carbohydrateGPer100Ml: Infinity },
	{ carbohydrateGPerContainer: '5' },
	{ proteinGPer100Ml: null },
	{ caffeineMgPerContainer: NaN },
	{ sugarType: 'unknown' },
	{ isProteinDrink: 'true' }
])('rejects invalid or ambiguous nutrition: %j', (change) => {
	expect(() => validateReview({ ...sodaFixture, ...change }, 'testsoda.json')).toThrow();
});

it('retains combined serving methods and known temperature/ice without changing the score', () => {
	const content = {
		...sodaFixture,
		servingMethods: ['Glas', 'Sugrör'],
		servingTemperature: 'Kylskåpskall',
		servedWithIce: false
	};
	const review = validateReview(content, 'testsoda.json');
	expect(review).toMatchObject(content);
	expect(review.rating).toBe(validateReview(sodaFixture, 'testsoda.json').rating);
	expect(
		validateReview(
			{ ...content, servingMethods: [], servingTemperature: undefined, servedWithIce: undefined },
			'testsoda.json'
		).servingMethods
	).toEqual([]);
});
it.each([
	{ servingMethods: 'Glas' },
	{ servingMethods: ['Glas', 'Glas'] },
	{ servingMethods: ['Okänd'] },
	{ servingMethods: [null] },
	{ servingMethods: null },
	{ servingTemperature: 'Okänd' },
	{ servingTemperature: null },
	{ servedWithIce: 'false' }
])('rejects invalid serving details: %j', (change) => {
	expect(() => validateReview({ ...sodaFixture, ...change }, 'testsoda.json')).toThrow();
});

it('accepts electrolyte classification without changing scores and rejects non-booleans', () => {
	const original = validateReview(sodaFixture, 'testsoda.json');
	for (const isElectrolyteDrink of [true, false]) {
		const drink = validateReview({ ...sodaFixture, isElectrolyteDrink }, 'testsoda.json');
		expect(drink.isElectrolyteDrink).toBe(isElectrolyteDrink);
		expect(drink.rating).toBe(original.rating);
	}
	for (const isElectrolyteDrink of ['true', 1, null])
		expect(() => validateReview({ ...sodaFixture, isElectrolyteDrink }, 'testsoda.json')).toThrow(
			'Elektrolytdryck'
		);
});
