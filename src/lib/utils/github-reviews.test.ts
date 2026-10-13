import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/content/testsoda.json';
import { validateReview } from '../content/validation';
import { prepareReviewSubmission } from '../content/submission';
import {
	createGitHubClient,
	createReviewPublication,
	publishReview,
	loadCurrentGitHubReview,
	publicationCompareUrl
} from './github-reviews';

const { rating: _rating, ...review } = validateReview(fixture, 'testsoda.json');
const image = new Blob(['RIFF0000WEBPpayload'], { type: 'image/webp' });
const token = 'fake-unit-test-token';

function mockGitHub(
	options: {
		reviews?: (typeof review)[];
		truncated?: boolean;
		failPr?: boolean;
		loseBranchResponse?: boolean;
		losePrResponse?: boolean;
		imageCollision?: boolean;
		symlink?: boolean;
		executable?: boolean;
	} = {}
) {
	const writes: { path: string; body: Record<string, unknown> }[] = [];
	let branchExists = false;
	let prExists = false;
	let failPr = options.failPr;
	let loseBranch = options.loseBranchResponse;
	let losePr = options.losePrResponse;
	const records = options.reviews ?? [];
	const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
		expect(init.headers).toMatchObject({ Authorization: `Bearer ${token}` });
		expect(init.credentials).toBe('omit');
		const path = new URL(url).pathname;
		const body = init.body ? JSON.parse(init.body as string) : undefined;
		if (body) {
			expect(JSON.stringify(body)).not.toContain(token);
			writes.push({ path, body });
		}
		const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
		if (path === '/user') return ok({ login: 'Reviewer' });
		if (path.endsWith('/enstorlaskreview')) return ok({ permissions: { push: true } });
		if (path.endsWith('/git/ref/heads/main')) return ok({ object: { sha: 'parent' } });
		if (path.endsWith('/git/commits/parent')) return ok({ tree: { sha: 'base-tree' } });
		if (path.endsWith('/git/trees/base-tree')) {
			const tree = records.map((item, index) => ({
				path: `content/reviews/${item.slug}.json`,
				type: 'blob',
				mode: options.symlink ? '120000' : options.executable ? '100755' : '100644',
				sha: `review-${index}`
			}));
			for (const name of new Set(records.map((item) => item.image)))
				tree.push({
					path: `content/reviews/images/${name}`,
					type: 'blob',
					mode: options.executable ? '100755' : '100644',
					sha: 'existing-image'
				});
			if (options.imageCollision)
				tree.push({
					path: 'content/reviews/images/new.webp',
					type: 'blob',
					mode: '100644',
					sha: 'collision'
				});
			return ok({ tree, truncated: options.truncated ?? false });
		}
		if (path.includes('/git/blobs/review-')) {
			const index = Number(path.split('review-')[1]);
			return ok({
				encoding: 'base64',
				content: Buffer.from(JSON.stringify(records[index])).toString('base64')
			});
		}
		if (path.endsWith('/git/blobs/existing-image'))
			return ok({
				encoding: 'base64',
				content: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64')
			});
		if (path.endsWith('/git/blobs'))
			return ok({ sha: body?.encoding === 'base64' ? 'image-blob' : 'json-blob' });
		if (path.endsWith('/git/trees')) return ok({ sha: 'new-tree' });
		if (path.endsWith('/git/commits')) return ok({ sha: 'new-commit' });
		if (path.includes('/git/ref/heads/reviews/'))
			return branchExists
				? ok({ object: { sha: 'new-commit' } })
				: new Response('{}', { status: 404 });
		if (path.endsWith('/git/refs')) {
			branchExists = true;
			if (loseBranch) {
				loseBranch = false;
				throw new Error('lost response');
			}
			return ok({ ref: body.ref });
		}
		if (path.endsWith('/pulls') && !body)
			return ok(
				prExists ? [{ html_url: 'https://github.com/Flawl3ssSWE/enstorlaskreview/pull/42' }] : []
			);
		if (path.endsWith('/pulls') && body) {
			if (failPr) {
				failPr = false;
				return new Response('{}', { status: 403 });
			}
			prExists = true;
			if (losePr) {
				losePr = false;
				throw new Error('lost response');
			}
			return ok({ html_url: 'https://github.com/Flawl3ssSWE/enstorlaskreview/pull/42' });
		}
		throw new Error(`Unexpected request: ${path}`);
	});
	vi.stubGlobal('fetch', fetchMock);
	return { writes, fetchMock };
}

afterEach(() => vi.unstubAllGlobals());

describe('GitHub review publishing', () => {
	it('loads the current GitHub baseline and still rejects later conflicting edits', async () => {
		const current = { ...review, description: 'Nyare GitHub-version' };
		const { writes } = mockGitHub({ reviews: [current] });
		const client = createGitHubClient(token);
		const baseline = await loadCurrentGitHubReview(client, review.slug);
		expect(baseline).toEqual(current);
		expect(writes).toHaveLength(0);
		const input = await prepareReviewSubmission(
			{ ...baseline, description: 'Min nya ändring' },
			{ baseline, editing: true }
		);
		mockGitHub({ reviews: [{ ...current, description: 'Ändrat igen' }] });
		await expect(publishReview(client, createReviewPublication(input))).rejects.toThrow(
			'ändrats eller tagits bort'
		);
	});

	it.each(['missing', 'symlink', 'truncated'])(
		'does not load an unsafe or missing baseline: %s',
		async (scenario) => {
			mockGitHub({
				reviews: scenario === 'missing' ? [] : [review],
				symlink: scenario === 'symlink',
				truncated: scenario === 'truncated'
			});
			await expect(
				loadCurrentGitHubReview(createGitHubClient(token), review.slug)
			).rejects.toThrow();
		}
	);

	it('connects and creates one atomic content commit on a new branch', async () => {
		const { writes } = mockGitHub();
		const client = createGitHubClient(token);
		expect(await client.connect()).toBe('Reviewer');
		const input = await prepareReviewSubmission(
			{ ...review, slug: 'ny-lask', image: 'new.webp' },
			{ image, editing: false }
		);
		const job = createReviewPublication(input);
		expect(await publishReview(client, job)).toContain('/pull/42');
		const tree = writes.find((item) => item.path.endsWith('/git/trees'))!.body;
		expect(tree).toEqual({
			base_tree: 'base-tree',
			tree: [
				{ path: 'content/reviews/ny-lask.json', mode: '100644', type: 'blob', sha: 'json-blob' },
				{ path: 'content/reviews/images/new.webp', mode: '100644', type: 'blob', sha: 'image-blob' }
			]
		});
		expect(writes.find((item) => item.body.encoding === 'base64')?.body.content).toBe(
			Buffer.from(await image.arrayBuffer()).toString('base64')
		);
		expect(writes.find((item) => item.path.endsWith('/git/commits'))?.body.parents).toEqual([
			'parent'
		]);
		expect(writes.find((item) => item.path.endsWith('/git/refs'))?.body.ref).toMatch(
			/^refs\/heads\/reviews\/ny-lask-/
		);
		expect(writes.find((item) => item.path.endsWith('/pulls'))?.body).toMatchObject({
			base: 'main',
			draft: false
		});
		const before = writes.length;
		await publishReview(client, job);
		expect(writes).toHaveLength(before);
	});

	it.each([false, true])('replaces an image, preserving shared images: %s', async (shared) => {
		const { writes } = mockGitHub({
			reviews: shared ? [review, { ...review, slug: 'annan' }] : [review]
		});
		const input = await prepareReviewSubmission(
			{ ...review, image: 'new.webp', description: 'Ny text' },
			{ image, baseline: review, editing: true }
		);
		await publishReview(createGitHubClient(token), createReviewPublication(input));
		const tree = writes.find((item) => item.path.endsWith('/git/trees'))!.body.tree as {
			sha: string | null;
		}[];
		expect(tree.filter((item) => item.sha === null)).toHaveLength(shared ? 0 : 1);
	});

	it.each([false, true])(
		'edits regular JSON and retained image blobs with executable flag: %s',
		async (executable) => {
			const { writes } = mockGitHub({ reviews: [review], executable });
			const input = await prepareReviewSubmission(
				{ ...review, description: 'Ändrad text' },
				{ baseline: review, editing: true }
			);
			await publishReview(createGitHubClient(token), createReviewPublication(input));
			expect(writes.filter((item) => item.path.endsWith('/git/blobs'))).toHaveLength(1);
		}
	);

	it.each([
		'stale',
		'deleted',
		'collision',
		'image collision',
		'truncated',
		'symlink',
		'missing baseline'
	])('blocks %s before any write', async (scenario) => {
		const records =
			scenario === 'deleted'
				? []
				: [{ ...review, ...(scenario === 'stale' ? { description: 'Nyare GitHub-version' } : {}) }];
		const { writes } = mockGitHub({
			reviews: records,
			imageCollision: scenario === 'image collision',
			truncated: scenario === 'truncated',
			symlink: scenario === 'symlink'
		});
		const adding = scenario === 'collision';
		const input = await prepareReviewSubmission(
			{ ...review, image: 'new.webp' },
			{
				image,
				editing: !adding,
				baseline: adding || scenario === 'missing baseline' ? undefined : review
			}
		);
		await expect(
			publishReview(createGitHubClient(token), createReviewPublication(input))
		).rejects.toThrow();
		expect(writes).toHaveLength(0);
	});

	it('allows imported additions with an existing valid image', async () => {
		mockGitHub({ reviews: [review] });
		const input = await prepareReviewSubmission(
			{ ...review, slug: 'importerad' },
			{ editing: true }
		);
		await expect(
			publishReview(createGitHubClient(token), createReviewPublication(input))
		).resolves.toContain('/pull/42');
	});

	it.each(['pr failure', 'lost branch', 'lost pr'])(
		'recovers %s without duplicating branches or PRs',
		async (scenario) => {
			const { writes } = mockGitHub({
				failPr: scenario === 'pr failure',
				loseBranchResponse: scenario === 'lost branch',
				losePrResponse: scenario === 'lost pr'
			});
			const input = await prepareReviewSubmission(
				{ ...review, slug: 'ny', image: 'new.webp' },
				{ image, editing: false }
			);
			const job = createReviewPublication(input);
			const client = createGitHubClient(token);
			await expect(publishReview(client, job)).rejects.toThrow();
			expect(publicationCompareUrl(job)).toContain('main...reviews%2Fny-');
			await expect(publishReview(client, job)).resolves.toContain('/pull/42');
			expect(writes.filter((item) => item.path.endsWith('/git/refs'))).toHaveLength(1);
			expect(writes.filter((item) => item.path.endsWith('/git/commits'))).toHaveLength(1);
			expect(writes.filter((item) => item.path.endsWith('/pulls'))).toHaveLength(
				scenario === 'pr failure' ? 2 : 1
			);
		}
	);

	it.each([401, 403, 429])(
		'reports authentication, permission and rate-limit errors safely: %s',
		async (status) => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ message: token }), { status }))
			);
			await expect(createGitHubClient(token).connect()).rejects.toThrow(
				/token|behörigheter|anropsgräns/
			);
			await createGitHubClient(token)
				.connect()
				.catch((cause: Error) => expect(cause.message).not.toContain(token));
		}
	);
});
