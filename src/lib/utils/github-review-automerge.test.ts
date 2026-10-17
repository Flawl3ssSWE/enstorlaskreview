import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/content/testsoda.json';
import { validateReview } from '../content/validation';
import { createGitHubClient, createReviewPublication, publishReview } from './github-reviews';
import { publicationMessage } from './github-review-automerge';

const { rating: _rating, ...review } = validateReview(fixture, 'testsoda.json');
const repository = 'Flawl3ssSWE/enstorlaskreview';
const files = [
	{ filename: 'content/reviews/new.json', status: 'added' },
	{ filename: 'content/reviews/images/new.webp', status: 'added' }
];

function setup(
	options: {
		account?: string;
		author?: string;
		base?: string;
		head?: string;
		files?: typeof files;
		mode?: string;
		truncated?: boolean;
		changedFiles?: number;
		graphqlError?: boolean;
		loseResponse?: boolean;
		editing?: boolean;
		unprotected?: boolean;
		missingChecks?: boolean;
		ruleset?: boolean;
	} = {}
) {
	const job = createReviewPublication({ review, json: '{}', editing: options.editing ?? false });
	job.prUrl = `https://github.com/${repository}/pull/42`;
	job.prNumber = 42;
	job.commitSha = 'a'.repeat(40);
	let enabled = false;
	let failGraphql = options.graphqlError;
	const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
		const path = new URL(url).pathname;
		const ok = (body: unknown) => new Response(JSON.stringify(body));
		if (path === '/user') return ok({ login: options.account ?? 'Flawl3ssSWE' });
		if (path.endsWith('/branches/main') && !path.includes('/rules/'))
			return ok({
				protected: !options.unprotected,
				protection: {
					required_status_checks: {
						contexts:
							options.ruleset || options.missingChecks
								? []
								: ['build', 'dependency-review', 'review-automerge-policy']
					}
				}
			});
		if (path.endsWith('/rules/branches/main'))
			return ok(
				options.ruleset
					? [
							{
								type: 'required_status_checks',
								parameters: {
									required_status_checks: [
										'build',
										'dependency-review',
										'review-automerge-policy'
									].map((context) => ({ context }))
								}
							}
						]
					: []
			);
		if (path.endsWith('/pulls/42'))
			return ok({
				number: 42,
				node_id: 'PR_node',
				state: 'open',
				draft: false,
				user: { login: options.author ?? 'Flawl3ssSWE' },
				base: { ref: options.base ?? 'main', repo: { full_name: repository } },
				head: { sha: options.head ?? job.commitSha, repo: { full_name: repository } },
				changed_files: options.changedFiles ?? 2,
				auto_merge: enabled ? {} : null
			});
		if (path.endsWith('/files')) {
			const page = Number(new URL(url).searchParams.get('page'));
			return ok((options.files ?? files).slice((page - 1) * 100, page * 100));
		}
		if (path.includes('/git/trees/'))
			return ok({
				truncated: options.truncated ?? false,
				tree: (options.files ?? files).map((file) => ({
					path: file.filename,
					type: 'blob',
					mode: options.mode ?? '100644'
				}))
			});
		if (path === '/graphql') {
			const body = JSON.parse(init.body as string);
			expect(body.variables).toEqual({ id: 'PR_node', head: job.commitSha });
			expect(body.query).toContain('expectedHeadOid: $head');
			expect(body.query).toContain('mergeMethod: SQUASH');
			if (failGraphql) {
				failGraphql = false;
				return ok({ errors: [{ message: 'Private server details' }] });
			}
			enabled = true;
			if (options.loseResponse) throw new Error('lost response');
			return ok({
				data: {
					enablePullRequestAutoMerge: { pullRequest: { autoMergeRequest: { enabledAt: 'now' } } }
				}
			});
		}
		throw new Error(`Unexpected request ${path}`);
	});
	vi.stubGlobal('fetch', fetchMock);
	const client = createGitHubClient('fake-token');
	return {
		job,
		fetchMock,
		publish: (account = 'Flawl3ssSWE') => publishReview(client, job, () => {}, account)
	};
}

afterEach(() => vi.unstubAllGlobals());

describe('editor review automerge', () => {
	it('enables squash automerge with the inspected head and keeps retries idempotent', async () => {
		const { job, fetchMock, publish } = setup();
		await expect(publish()).resolves.toBe(job.prUrl);
		expect(job.prNodeId).toBe('PR_node');
		expect(job.autoMerge).toBe('enabled');
		expect(publicationMessage(job)).toContain('inväntar obligatoriska kontroller');
		const calls = fetchMock.mock.calls.length;
		await publish();
		expect(fetchMock).toHaveBeenCalledTimes(calls);
	});
	it.each([
		{ account: 'Other' },
		{ author: 'Other' },
		{ base: 'other' },
		{ head: 'stale' },
		{ editing: true },
		{ files: [files[0], { filename: 'src/app.html', status: 'added' }] },
		{ files: [files[0], { ...files[1], status: 'modified' }] },
		{ mode: '120000' },
		{ mode: '100755' }
	])('does not enable automerge for an ineligible PR: %j', async (options) => {
		const { job, fetchMock, publish } = setup(options);
		await publish();
		expect(job.autoMerge).toBe('manual');
		expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/graphql'))).toBe(false);
	});
	it('does not request automerge for accounts outside the allowlist', async () => {
		const { job, fetchMock, publish } = setup();
		await publish('Other');
		expect(job.autoMerge).toBe('manual');
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it.each([{ unprotected: true }, { missingChecks: true }])(
		'requires enforced CI checks before requesting automerge: %j',
		async (options) => {
			const { job, fetchMock, publish } = setup(options);
			await publish();
			expect(job.autoMerge).toBe('failed');
			expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/graphql'))).toBe(false);
		}
	);
	it('recognizes required checks enforced through active repository rulesets', async () => {
		const { job, publish } = setup({ ruleset: true });
		await publish();
		expect(job.autoMerge).toBe('enabled');
	});
	it('inspects every page of changed files before enabling auto-merge', async () => {
		const additions = Array.from({ length: 101 }, (_, index) => ({
			filename: `content/reviews/review-${index}.json`,
			status: 'added'
		}));
		const { job, fetchMock, publish } = setup({ files: additions, changedFiles: additions.length });
		await publish();
		expect(job.autoMerge).toBe('enabled');
		expect(fetchMock.mock.calls.some(([url]) => url.includes('page=2'))).toBe(true);
	});
	it.each([{ truncated: true }, { changedFiles: 1 }, { files: [] }, { changedFiles: 3001 }])(
		'fails safely on incomplete file inspection: %j',
		async (options) => {
			const { job, fetchMock, publish } = setup(options);
			await publish();
			expect(job.autoMerge).not.toBe('enabled');
			expect(job.prUrl).toContain('/pull/42');
			expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/graphql'))).toBe(false);
		}
	);
	it.each([{ graphqlError: true }, { loseResponse: true }])(
		'preserves the PR on failure and retries without creating another PR: %j',
		async (options) => {
			const { job, fetchMock, publish } = setup(options);
			await expect(publish()).resolves.toBe(job.prUrl);
			expect(job.autoMerge).toBe('failed');
			expect(publicationMessage(job)).toContain('slå ihop den manuellt');
			expect(publicationMessage(job)).not.toContain('Private server details');
			await publish();
			expect(job.autoMerge).toBe('enabled');
			expect(
				fetchMock.mock.calls
					.filter(([, init]) => init.method === 'POST')
					.every(([url]) => url.endsWith('/graphql'))
			).toBe(true);
		}
	);
});
