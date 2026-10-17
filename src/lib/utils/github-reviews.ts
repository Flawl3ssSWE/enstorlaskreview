import {
	REVIEW_REPOSITORY_OWNER,
	REVIEW_REPOSITORY_NAME,
	REVIEW_BASE_BRANCH,
	REVIEW_REPOSITORY
} from '../site';
import { validateReview } from '../content/validation';
import { contentKey, type ReviewSubmission } from '../content/submission';
import type { ReviewContent } from '../types/bar-review';
import { requestReviewAutomerge } from './github-review-automerge';

const repositoryPath = `/repos/${REVIEW_REPOSITORY_OWNER}/${REVIEW_REPOSITORY_NAME}`;

export interface ReviewPublication {
	input: ReviewSubmission;
	branch: string;
	commitSha?: string;
	branchCreated: boolean;
	prUrl?: string;
	prNumber?: number;
	prNodeId?: string;
	autoMerge?: 'manual' | 'enabled' | 'failed';
}

interface TreeEntry {
	path: string;
	mode: string;
	type: string;
	sha: string;
}

function isRegularBlob(entry: TreeEntry): boolean {
	return entry.type === 'blob' && (entry.mode === '100644' || entry.mode === '100755');
}

export class GitHubError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

export function createGitHubClient(token: string, signal?: AbortSignal) {
	async function request<T>(path: string, body?: unknown): Promise<T> {
		let response: Response;
		try {
			response = await fetch(`https://api.github.com${path}`, {
				method: body === undefined ? 'GET' : 'POST',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`,
					'X-GitHub-Api-Version': '2026-03-10',
					...(body === undefined ? {} : { 'Content-Type': 'application/json' })
				},
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
				credentials: 'omit',
				redirect: 'error',
				signal
			});
		} catch (_cause) {
			throw new GitHubError(0, 'GitHub kunde inte nås. Kontrollera anslutningen och försök igen.');
		}
		if (!response.ok) {
			const rateLimited =
				response.status === 429 ||
				response.headers.get('x-ratelimit-remaining') === '0' ||
				response.headers.has('retry-after');
			const message = rateLimited
				? 'GitHubs anropsgräns har nåtts. Vänta en stund och försök igen.'
				: response.status === 401
					? 'GitHub-token är ogiltig eller har gått ut. Anslut med en giltig token.'
					: response.status === 403 || response.status === 404
						? 'Kontrollera åtkomsten till repositoryt och tokenens Contents- och Pull requests-behörigheter.'
						: response.status === 409 || response.status === 422
							? 'GitHub kunde inte skapa ändringen. Kontrollera grenen och försök igen.'
							: 'GitHub kunde inte slutföra anropet. Försök igen.';
			throw new GitHubError(response.status, message);
		}
		try {
			return (await response.json()) as T;
		} catch (_cause) {
			throw new GitHubError(0, 'Svaret från GitHub kunde inte läsas. Försök igen.');
		}
	}
	return {
		request,
		async connect() {
			const user = await request<{ login: string }>('/user');
			const repo = await request<{ permissions?: { push?: boolean }; archived?: boolean }>(
				repositoryPath
			);
			if (!user.login || !repo.permissions?.push || repo.archived)
				throw new Error('Kontot behöver skrivåtkomst till repositoryt för att skicka recensioner.');
			return user.login;
		}
	};
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;

export function createReviewPublication(input: ReviewSubmission): ReviewPublication {
	return {
		input,
		branch: `reviews/${input.review.slug}-${crypto.randomUUID()}`,
		branchCreated: false
	};
}

export function publicationCompareUrl(job: ReviewPublication): string {
	return `${REVIEW_REPOSITORY}/compare/${REVIEW_BASE_BRANCH}...${encodeURIComponent(job.branch)}?expand=1`;
}

function decodeBase64(content: string): Uint8Array {
	try {
		return Uint8Array.from(atob(content.replace(/\s/g, '')), (char) => char.charCodeAt(0));
	} catch (_cause) {
		throw new Error('Filens innehåll kunde inte läsas från GitHub.');
	}
}

function encodeBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

async function readRepositoryReviews(client: GitHubClient) {
	const ref = await client.request<{ object: { sha: string } }>(
		`${repositoryPath}/git/ref/heads/${REVIEW_BASE_BRANCH}`
	);
	const commit = await client.request<{ tree: { sha: string } }>(
		`${repositoryPath}/git/commits/${ref.object.sha}`
	);
	const tree = await client.request<{ tree: TreeEntry[]; truncated: boolean }>(
		`${repositoryPath}/git/trees/${commit.tree.sha}?recursive=1`
	);
	if (tree.truncated !== false || !Array.isArray(tree.tree))
		throw new Error(
			'Repositoryts innehåll kunde inte läsas fullständigt. Ingen recension skickades.'
		);
	const reviews: ReviewContent[] = [];
	const slugs = new Set<string>();
	if (
		tree.tree.some(
			(entry) =>
				(entry.path === 'content' ||
					entry.path === 'content/reviews' ||
					entry.path.startsWith('content/reviews/')) &&
				(entry.mode === '120000' || entry.mode === '160000')
		)
	)
		throw new Error('Repositoryt innehåller en osäker filtyp i recensionsinnehållet.');
	for (const entry of tree.tree) {
		if (!/^content\/reviews\/[^/]+\.json$/.test(entry.path)) continue;
		if (!isRegularBlob(entry))
			throw new Error('Repositoryt innehåller en recension med osäker filtyp.');
		const blob = await client.request<{ encoding: string; content: string }>(
			`${repositoryPath}/git/blobs/${entry.sha}`
		);
		if (blob.encoding !== 'base64') throw new Error('En recension kunde inte läsas från GitHub.');
		const filename = entry.path.slice('content/reviews/'.length);
		let parsed: unknown;
		try {
			parsed = JSON.parse(
				new TextDecoder('utf-8', { fatal: true }).decode(decodeBase64(blob.content))
			);
		} catch (_cause) {
			throw new Error(`Recensionen ${filename} kunde inte läsas som giltig JSON från GitHub.`);
		}
		const { rating: _rating, ...current } = validateReview(parsed, filename);
		if (slugs.has(current.slug.toLowerCase()))
			throw new Error('Repositoryt innehåller recensioner med samma slug.');
		slugs.add(current.slug.toLowerCase());
		reviews.push(current);
	}
	return { ref, commit, tree, reviews };
}

export async function loadCurrentGitHubReview(
	client: GitHubClient,
	slug: string
): Promise<ReviewContent> {
	const { reviews } = await readRepositoryReviews(client);
	const review = reviews.find((item) => item.slug === slug);
	if (!review) throw new Error('Recensionen saknas på GitHub. Ingen recension laddades in.');
	if (!review.sodaRatings)
		throw new Error('Formuläret kan bara redigera läskrecensioner med läskbetyg.');
	return review;
}

async function inspectSubmission(client: GitHubClient, input: ReviewSubmission) {
	const { review, baseline, image, editing } = input;
	validateReview(review, `${review.slug}.json`);
	validateReview(JSON.parse(input.json), `${review.slug}.json`);
	if (contentKey(JSON.parse(input.json)) !== contentKey(review))
		throw new Error('JSON och recensionens innehåll stämmer inte överens.');
	if (baseline && baseline.slug !== review.slug)
		throw new Error('Recensionens slug måste behållas vid ändringar.');
	if (baseline && review.createdAt !== baseline.createdAt)
		throw new Error('Recensionens skapandedatum måste behållas vid ändringar.');
	const { ref, commit, tree, reviews } = await readRepositoryReviews(client);
	const current = reviews.find((item) => item.slug.toLowerCase() === review.slug.toLowerCase());
	if (baseline) {
		if (!current || contentKey(current) !== contentKey(baseline))
			throw new Error(
				'Recensionen har ändrats eller tagits bort på GitHub. Ladda ner dina ändringar och ladda sedan den aktuella recensionen.'
			);
	} else if (current) {
		if (editing)
			throw new Error('Ladda den aktuella publicerade recensionen innan du skickar en ändring.');
		throw new Error(
			'Denna slug används redan på GitHub. Välj en annan eller ladda recensionen för redigering.'
		);
	}
	const imagePath = `content/reviews/images/${review.image}`;
	const imageEntry = tree.tree.find((entry) => entry.path === imagePath);
	if (image && imageEntry)
		throw new Error(
			'Bildens filnamn används redan på GitHub. Välj bilden igen för att skapa ett nytt filnamn.'
		);
	if (image) {
		const bytes = new Uint8Array(await image.arrayBuffer());
		if (
			image.size > 500 * 1024 ||
			new TextDecoder().decode(bytes.slice(0, 4)) !== 'RIFF' ||
			new TextDecoder().decode(bytes.slice(8, 12)) !== 'WEBP'
		)
			throw new Error('Bilden måste vara en bearbetad WebP på högst 500 KiB.');
	} else {
		if (!imageEntry || !isRegularBlob(imageEntry))
			throw new Error(
				'Välj en bild. Den befintliga bilden saknas eller har osäker filtyp på GitHub.'
			);
		const blob = await client.request<{ encoding: string; content: string }>(
			`${repositoryPath}/git/blobs/${imageEntry.sha}`
		);
		if (blob.encoding !== 'base64') throw new Error('Bilden kunde inte läsas från GitHub.');
		const bytes = decodeBase64(blob.content);
		const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
		const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
		const webp =
			new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
			new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
		const matches = review.image.endsWith('.png')
			? png
			: review.image.endsWith('.webp')
				? webp
				: jpeg;
		if (!matches || bytes.length > 10 * 1024 * 1024)
			throw new Error('Den befintliga bilden har ogiltigt innehåll. Välj en ny bild.');
	}
	const oldImage = current?.image;
	const removeImage =
		oldImage &&
		oldImage !== review.image &&
		!reviews.some((item) => item.slug !== review.slug && item.image === oldImage)
			? `content/reviews/images/${oldImage}`
			: undefined;
	if (removeImage && !tree.tree.some((entry) => entry.path === removeImage))
		throw new Error('Den tidigare bilden saknas på GitHub. Kontrollera repositoryts innehåll.');
	return { parentSha: ref.object.sha, treeSha: commit.tree.sha, imagePath, removeImage };
}

export async function publishReview(
	client: GitHubClient,
	job: ReviewPublication,
	progress: (message: string) => void = () => {},
	account = ''
): Promise<string> {
	if (job.prUrl) {
		await requestReviewAutomerge(client, job, account);
		return job.prUrl;
	}
	const { input } = job;
	if (!job.commitSha) {
		progress('Kontrollerar recensioner och bilder på GitHub…');
		const snapshot = await inspectSubmission(client, input);
		progress('Skapar recensionens commit…');
		const entries: { path: string; mode: string; type: string; sha: string | null }[] = [];
		const jsonBlob = await client.request<{ sha: string }>(`${repositoryPath}/git/blobs`, {
			content: input.json,
			encoding: 'utf-8'
		});
		entries.push({
			path: `content/reviews/${input.review.slug}.json`,
			mode: '100644',
			type: 'blob',
			sha: jsonBlob.sha
		});
		if (input.image) {
			const imageBlob = await client.request<{ sha: string }>(`${repositoryPath}/git/blobs`, {
				content: encodeBase64(new Uint8Array(await input.image.arrayBuffer())),
				encoding: 'base64'
			});
			entries.push({ path: snapshot.imagePath, mode: '100644', type: 'blob', sha: imageBlob.sha });
		}
		if (snapshot.removeImage)
			entries.push({ path: snapshot.removeImage, mode: '100644', type: 'blob', sha: null });
		const tree = await client.request<{ sha: string }>(`${repositoryPath}/git/trees`, {
			base_tree: snapshot.treeSha,
			tree: entries
		});
		const commit = await client.request<{ sha: string }>(`${repositoryPath}/git/commits`, {
			message: `${input.baseline ? 'Uppdatera' : 'Lägg till'} recension: ${input.review.title}`,
			tree: tree.sha,
			parents: [snapshot.parentSha]
		});
		job.commitSha = commit.sha;
	}
	progress('Skapar recensionens gren…');
	if (!job.branchCreated) {
		// Reconcile a previous POST whose response may have been lost.
		try {
			const ref = await client.request<{ object: { sha: string } }>(
				`${repositoryPath}/git/ref/heads/${job.branch}`
			);
			if (ref.object.sha !== job.commitSha)
				throw new Error(
					'Recensionsgrenen har ändrats på GitHub. Kontrollera grenen innan du fortsätter.'
				);
			job.branchCreated = true;
		} catch (cause) {
			if (!(cause instanceof GitHubError) || cause.status !== 404) throw cause;
			await client.request(`${repositoryPath}/git/refs`, {
				ref: `refs/heads/${job.branch}`,
				sha: job.commitSha
			});
			job.branchCreated = true;
		}
	}
	progress('Öppnar pull request…');
	const existing = await client.request<{ html_url: string; number: number }[]>(
		`${repositoryPath}/pulls?state=all&head=${encodeURIComponent(`${REVIEW_REPOSITORY_OWNER}:${job.branch}`)}&base=${REVIEW_BASE_BRANCH}`
	);
	if (existing.length) {
		job.prUrl = existing[0].html_url;
		job.prNumber = existing[0].number;
		await requestReviewAutomerge(client, job, account);
		return job.prUrl;
	}
	const paths = [`content/reviews/${input.review.slug}.json`];
	if (input.image) paths.push(`content/reviews/images/${input.review.image}`);
	if (input.baseline && input.baseline.image !== input.review.image)
		paths.push(
			`Tidigare bild: content/reviews/images/${input.baseline.image} (behålls om den delas)`
		);
	const pr = await client.request<{ html_url: string; number: number }>(`${repositoryPath}/pulls`, {
		title: `${input.baseline ? 'Uppdatera' : 'Lägg till'} recension: ${input.review.title}`,
		body: `Recension av ${input.review.author}.\n\n${paths.map((path) => `- ${path}`).join('\n')}\n\nSkickad från recensionsformuläret. Granska ändringarna och invänta kontrollerna före merge.`,
		head: job.branch,
		base: REVIEW_BASE_BRANCH,
		draft: false
	});
	job.prUrl = pr.html_url;
	job.prNumber = pr.number;
	await requestReviewAutomerge(client, job, account);
	return job.prUrl;
}
