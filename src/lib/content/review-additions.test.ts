import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { classifyReviewChanges, checkAutomergePolicy } from '../../../scripts/review-changes';
import { isReviewAdditionsOnly, reviewAutomergeAllowed } from './review-additions';

const json = { path: 'content/reviews/new.json', status: 'added', mode: '100644' };
const image = { path: 'content/reviews/images/new.webp', status: 'added', mode: '100644' };
const directories: string[] = [];
afterEach(() =>
	directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }))
);

describe('new review classification', () => {
	it('requires at least one JSON and allows added regular raster images', () => {
		expect(isReviewAdditionsOnly([json, image])).toBe(true);
		expect(isReviewAdditionsOnly([json])).toBe(true);
		expect(isReviewAdditionsOnly([{ ...json, path: 'content/reviews/Årets-Läsk.json' }])).toBe(
			true
		);
		expect(isReviewAdditionsOnly([image])).toBe(false);
		expect(isReviewAdditionsOnly([])).toBe(false);
	});
	it.each([
		{ ...json, status: 'modified' },
		{ ...json, status: 'removed' },
		{ ...json, status: 'renamed' },
		{ ...json, mode: '120000' },
		{ ...json, mode: '100755' },
		{ ...json, path: 'package.json' },
		{ ...json, path: 'content/reviews/README.md' },
		{ ...image, path: 'content/reviews/images/new.svg' },
		{ ...image, path: 'content/reviews/images/nested/new.webp' }
	])('rejects mixed or unsafe changes: %j', (change) => {
		expect(isReviewAdditionsOnly([json, change])).toBe(false);
	});
	it('restricts automatic merging to the trusted PR author and main', () => {
		expect(reviewAutomergeAllowed('Flawl3ssSWE', 'main', true)).toBe(true);
		expect(reviewAutomergeAllowed('Other', 'main', true)).toBe(false);
		expect(reviewAutomergeAllowed('Flawl3ssSWE', 'other', true)).toBe(false);
		expect(reviewAutomergeAllowed('Flawl3ssSWE', 'main', false)).toBe(false);
	});
	it('uses complete Git ranges, checks modes, and fails closed on unavailable history', async () => {
		const cwd = mkdtempSync(join(tmpdir(), 'soda-changes-'));
		directories.push(cwd);
		const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
		git('init', '-q');
		git('config', 'user.name', 'Test');
		git('config', 'user.email', 'test@example.invalid');
		mkdirSync(join(cwd, 'content/reviews/images'), { recursive: true });
		writeFileSync(join(cwd, 'README.md'), 'Initial');
		git('add', '.');
		git('commit', '-qm', 'Initial');
		const base = git('rev-parse', 'HEAD');
		const commit = () => {
			git('add', '.');
			git('commit', '-qm', 'Change');
			return git('rev-parse', 'HEAD');
		};
		const classify = (before: string, after: string) =>
			classifyReviewChanges('push', { before, after }, cwd);
		writeFileSync(join(cwd, json.path), '{}');
		const addition = commit();
		expect(classify(base, addition)).toBe(true);
		const pr = {
			number: 1,
			user: { login: 'Flawl3ssSWE' },
			base: { sha: base, ref: 'main' },
			head: { sha: addition },
			auto_merge: {}
		};
		expect(classifyReviewChanges('pull_request', { pull_request: pr }, cwd)).toBe(true);
		await expect(
			checkAutomergePolicy({ pull_request: pr }, async () => pr, cwd)
		).resolves.toBeUndefined();
		expect(classify(base, base)).toBe(false);
		expect(classify('a'.repeat(40), addition)).toBe(false);
		expect(classify('0'.repeat(40), addition)).toBe(false);
		expect(classifyReviewChanges('workflow_dispatch', {}, cwd)).toBe(false);
		writeFileSync(join(cwd, 'README.md'), 'Code/config change');
		const mixed = commit();
		const editedPr = { ...pr, head: { sha: mixed } };
		await expect(
			checkAutomergePolicy({ pull_request: editedPr }, async () => editedPr, cwd)
		).rejects.toThrow('Stäng av');
		writeFileSync(join(cwd, 'content/reviews/second.json'), '{}');
		const second = commit();
		expect(classify(mixed, second)).toBe(true);
		expect(classify(addition, second)).toBe(false);
		symlinkSync('new.webp', join(cwd, 'content/reviews/images/link.webp'));
		expect(classify(second, commit())).toBe(false);
		git('mv', json.path, 'content/reviews/renamed.json');
		expect(classify(second, commit())).toBe(false);
		const previous = git('rev-parse', 'HEAD');
		git('rm', 'content/reviews/renamed.json');
		expect(classify(previous, commit())).toBe(false);
		git('checkout', '-qb', 'advanced-main', base);
		writeFileSync(join(cwd, 'README.md'), 'Main advanced independently');
		const advancedMain = commit();
		expect(
			classifyReviewChanges(
				'pull_request',
				{ pull_request: { ...pr, base: { sha: advancedMain, ref: 'main' } } },
				cwd
			)
		).toBe(true);
	});
	it('rejects stale policy runs and disqualifying changes after auto-merge was enabled', async () => {
		const pr = {
			number: 1,
			user: { login: 'Flawl3ssSWE' },
			base: { sha: 'a'.repeat(40), ref: 'main' },
			head: { sha: 'b'.repeat(40) },
			auto_merge: null
		};
		await expect(
			checkAutomergePolicy({ pull_request: pr }, async () => pr)
		).resolves.toBeUndefined();
		await expect(
			checkAutomergePolicy({ pull_request: pr }, async () => ({ ...pr, head: { sha: 'changed' } }))
		).rejects.toThrow('ändrats');
		await expect(
			checkAutomergePolicy({ pull_request: pr }, async () => ({ ...pr, auto_merge: {} }))
		).rejects.toThrow('Stäng av');
		await expect(
			checkAutomergePolicy({ pull_request: pr }, async () => {
				throw new Error('API unavailable');
			})
		).rejects.toThrow('API unavailable');
	});
});
