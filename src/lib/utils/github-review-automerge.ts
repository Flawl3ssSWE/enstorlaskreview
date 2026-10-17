import {
	AUTOMERGE_REVIEW_AUTHOR,
	REVIEW_REQUIRED_CHECKS,
	isReviewAdditionsOnly,
	reviewAutomergeAllowed
} from '../content/review-additions';
import { REVIEW_BASE_BRANCH, REVIEW_REPOSITORY_NAME, REVIEW_REPOSITORY_OWNER } from '../site';
import type { GitHubClient, ReviewPublication } from './github-reviews';

const repositoryPath = `/repos/${REVIEW_REPOSITORY_OWNER}/${REVIEW_REPOSITORY_NAME}`;

interface PullRequest {
	number: number;
	node_id: string;
	state: string;
	draft: boolean;
	user: { login: string };
	base: { ref: string; repo: { full_name: string } };
	head: { sha: string; repo: { full_name: string } };
	changed_files: number;
	auto_merge: unknown;
}

/** Failure to request auto-merge must never hide an already-created PR. */
export async function requestReviewAutomerge(
	client: GitHubClient,
	job: ReviewPublication,
	account: string
): Promise<void> {
	if (job.autoMerge === 'enabled') return;
	job.autoMerge = 'manual';
	if (account !== AUTOMERGE_REVIEW_AUTHOR || job.input.editing || job.input.baseline) return;
	try {
		if (!job.prNumber || !job.commitSha) throw new Error('PR-underlaget saknas.');
		const viewer = await client.request<{ login: string }>('/user');
		if (viewer.login !== AUTOMERGE_REVIEW_AUTHOR) return;
		// Refuse unattended merging until administrators enforce the CI gates.
		const branch = await client.request<{
			protected: boolean;
			protection?: {
				required_status_checks?: { contexts?: string[]; checks?: { context: string }[] };
			};
		}>(`${repositoryPath}/branches/${REVIEW_BASE_BRANCH}`);
		const required = new Set(branch.protection?.required_status_checks?.contexts ?? []);
		for (const check of branch.protection?.required_status_checks?.checks ?? [])
			required.add(check.context);
		if (!branch.protected) throw new Error('Obligatoriska kontroller saknas.');
		if (!REVIEW_REQUIRED_CHECKS.every((name) => required.has(name))) {
			const rules = await client.request<
				{
					type: string;
					parameters?: { required_status_checks?: { context: string }[] };
				}[]
			>(`${repositoryPath}/rules/branches/${REVIEW_BASE_BRANCH}`);
			for (const rule of rules)
				if (rule.type === 'required_status_checks')
					for (const check of rule.parameters?.required_status_checks ?? [])
						required.add(check.context);
		}
		if (!REVIEW_REQUIRED_CHECKS.every((name) => required.has(name)))
			throw new Error('Obligatoriska kontroller saknas.');
		const pr = await client.request<PullRequest>(`${repositoryPath}/pulls/${job.prNumber}`);
		const repository = `${REVIEW_REPOSITORY_OWNER}/${REVIEW_REPOSITORY_NAME}`;
		if (
			pr.number !== job.prNumber ||
			pr.state !== 'open' ||
			pr.draft ||
			pr.head.sha !== job.commitSha ||
			pr.base.repo.full_name !== repository ||
			pr.head.repo.full_name !== repository ||
			!reviewAutomergeAllowed(pr.user.login, pr.base.ref, true) ||
			!Number.isInteger(pr.changed_files) ||
			pr.changed_files < 1 ||
			pr.changed_files > 3000
		)
			return;
		job.prNodeId = pr.node_id;
		const files: { filename: string; status: string }[] = [];
		for (let page = 1; files.length < pr.changed_files; page++) {
			const batch = await client.request<typeof files>(
				`${repositoryPath}/pulls/${job.prNumber}/files?per_page=100&page=${page}`
			);
			if (!batch.length) throw new Error('Filförteckningen är ofullständig.');
			files.push(...batch);
		}
		if (
			files.length !== pr.changed_files ||
			new Set(files.map((file) => file.filename)).size !== files.length
		)
			throw new Error('Filförteckningen är ofullständig.');
		const tree = await client.request<{
			truncated: boolean;
			tree: { path: string; mode: string; type: string }[];
		}>(`${repositoryPath}/git/trees/${job.commitSha}?recursive=1`);
		if (tree.truncated !== false) throw new Error('Filträdet är ofullständigt.');
		const entries = new Map(tree.tree.map((entry) => [entry.path, entry]));
		if (
			!isReviewAdditionsOnly(
				files.map((file) => {
					const entry = entries.get(file.filename);
					return {
						path: file.filename,
						status: file.status,
						mode: entry?.type === 'blob' ? entry.mode : ''
					};
				})
			)
		)
			return;
		// The mutation also protects against a branch update while files were being inspected.
		if (!pr.auto_merge) {
			const result = await client.request<{
				errors?: unknown[];
				data?: { enablePullRequestAutoMerge?: { pullRequest?: { autoMergeRequest?: unknown } } };
			}>('/graphql', {
				query: `mutation EnableReviewAutoMerge($id: ID!, $head: GitObjectID!) {
					enablePullRequestAutoMerge(input: {
						pullRequestId: $id, expectedHeadOid: $head, mergeMethod: SQUASH
					}) { pullRequest { autoMergeRequest { enabledAt } } }
				}`,
				variables: { id: job.prNodeId, head: job.commitSha }
			});
			if (
				result.errors?.length ||
				!result.data?.enablePullRequestAutoMerge?.pullRequest?.autoMergeRequest
			)
				throw new Error('Automatisk merge kunde inte aktiveras.');
		}
		job.autoMerge = 'enabled';
	} catch {
		job.autoMerge = 'failed';
	}
}

export function publicationMessage(job: ReviewPublication): string {
	if (job.autoMerge === 'enabled')
		return 'Din PR är klar. Automatisk merge är aktiverad och inväntar obligatoriska kontroller och eventuella godkännanden. Recensionen visas efter merge och publicering.';
	if (job.autoMerge === 'failed')
		return 'Din PR är klar, men automatisk merge kunde inte aktiveras. Öppna PR:en och slå ihop den manuellt när kontrollerna är klara, eller försök skicka igen. Recensionen visas efter merge och publicering.';
	return `Din PR är klar. Öppna PR:en och slå ihop den manuellt när kontrollerna är klara. Recensionen visas efter merge till ${REVIEW_BASE_BRANCH} och publicering.`;
}
