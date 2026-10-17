import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
	isReviewAdditionsOnly,
	reviewAutomergeAllowed
} from '../src/lib/content/review-additions.ts';

interface PullRequest {
	number: number;
	user: { login: string };
	base: { sha: string; ref: string };
	head: { sha: string };
	auto_merge: unknown;
}

interface ChangeEvent {
	before?: string;
	after?: string;
	pull_request?: PullRequest;
}

/** Any absent history, invalid range, or unsupported diff falls back to full verification. */
export function classifyReviewChanges(
	eventName: string,
	event: ChangeEvent,
	cwd = process.cwd()
): boolean {
	function git(...args: string[]): string {
		return execFileSync('git', args, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
			maxBuffer: 16 * 1024 * 1024
		});
	}
	try {
		let base = eventName === 'push' ? event.before : event.pull_request?.base.sha;
		const head = eventName === 'push' ? event.after : event.pull_request?.head.sha;
		if (!['push', 'pull_request'].includes(eventName)) return false;
		if (![base, head].every((sha) => sha && /^[a-f0-9]{40}$/.test(sha) && !/^0+$/.test(sha)))
			return false;
		git('cat-file', '-e', `${base}^{commit}`);
		git('cat-file', '-e', `${head}^{commit}`);
		if (eventName === 'pull_request') base = git('merge-base', base!, head!).trim();
		else git('merge-base', '--is-ancestor', base!, head!);
		const raw = git('diff', '--raw', '--no-abbrev', '--no-renames', '-z', base!, head!, '--');
		const parts = raw.split('\0');
		if (parts.pop() !== '' || parts.length % 2 !== 0) return false;
		const changes = [];
		for (let index = 0; index < parts.length; index += 2) {
			const match = /^:000000 (100644) 0{40} [a-f0-9]{40} A$/.exec(parts[index]);
			if (!match) return false;
			changes.push({ path: parts[index + 1], status: 'added', mode: match[1] });
		}
		return isReviewAdditionsOnly(changes);
	} catch {
		return false;
	}
}

export async function checkAutomergePolicy(
	event: ChangeEvent,
	request: () => Promise<PullRequest>,
	cwd = process.cwd()
): Promise<void> {
	const previous = event.pull_request;
	if (!previous) throw new Error('PR-underlaget saknas.');
	const current = await request();
	if (
		current.head.sha !== previous.head.sha ||
		current.base.sha !== previous.base.sha ||
		current.base.ref !== previous.base.ref
	)
		throw new Error('PR har ändrats. Kör kontrollerna igen.');
	if (current.auto_merge === undefined) throw new Error('Status för automatisk merge saknas.');
	if (
		current.auto_merge &&
		!reviewAutomergeAllowed(
			current.user.login,
			current.base.ref,
			classifyReviewChanges('pull_request', { pull_request: current }, cwd)
		)
	)
		throw new Error(
			'Automatisk merge tillåts bara för nya recensioner från Flawl3ssSWE. Stäng av automatisk merge för att fortsätta manuellt.'
		);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, 'utf8')) as ChangeEvent;
	if (process.argv.includes('--policy')) {
		await checkAutomergePolicy(event, async () => {
			const response = await fetch(
				`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pulls/${event.pull_request!.number}`,
				{
					headers: {
						Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
						Accept: 'application/vnd.github+json',
						'X-GitHub-Api-Version': '2026-03-10'
					}
				}
			);
			if (!response.ok) throw new Error('PR-status kunde inte verifieras.');
			return response.json() as Promise<PullRequest>;
		});
	} else {
		const fast = classifyReviewChanges(process.env.GITHUB_EVENT_NAME!, event);
		appendFileSync(process.env.GITHUB_OUTPUT!, `review_additions=${fast}\n`);
		console.log(fast ? 'Nya recensioner: validering och produktionsbygge.' : 'Full verifiering.');
	}
}
