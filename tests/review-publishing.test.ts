import { openEditorTools } from './review-editor-helpers';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import fixture from './fixtures/content/testsoda.json' with { type: 'json' };

const token = 'fake-browser-test-token';
const prUrl = 'https://github.com/Flawl3ssSWE/enstorlaskreview/pull/123';

async function mockGitHub(
	page: Page,
	options: {
		rejectAuth?: boolean;
		failPr?: boolean;
		stale?: boolean;
		executable?: boolean;
		trusted?: boolean;
		failAutoMerge?: boolean;
	} = {}
) {
	const writes: { path: string; body: Record<string, unknown> }[] = [];
	let branchExists = false;
	let prExists = false;
	let failPr = options.failPr;
	let failAutoMerge = options.failAutoMerge;
	let reviewPath = '';
	let imagePath = '';
	await page.route('https://api.github.com/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		const headers = {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET, POST, OPTIONS',
			'access-control-allow-headers': 'authorization, content-type, accept, x-github-api-version'
		};
		if (request.method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers });
			return;
		}
		expect(request.headers().authorization).toBe(`Bearer ${token}`);
		const respond = (json: unknown, status = 200) => route.fulfill({ json, status, headers });
		const body = request.method() === 'POST' ? request.postDataJSON() : undefined;
		if (body) {
			expect(JSON.stringify(body)).not.toContain(token);
			writes.push({ path, body });
		}
		if (path === '/user')
			return respond(
				{ login: options.trusted ? 'Flawl3ssSWE' : 'TestReviewer' },
				options.rejectAuth ? 401 : 200
			);
		if (path.endsWith('/pulls/123'))
			return respond({
				number: 123,
				node_id: 'PR_node',
				state: 'open',
				draft: false,
				user: { login: 'Flawl3ssSWE' },
				base: { ref: 'main', repo: { full_name: 'Flawl3ssSWE/enstorlaskreview' } },
				head: { sha: 'new-commit', repo: { full_name: 'Flawl3ssSWE/enstorlaskreview' } },
				changed_files: 2,
				auto_merge: null
			});
		if (path.endsWith('/pulls/123/files'))
			return respond([
				{ filename: reviewPath, status: 'added' },
				{ filename: imagePath, status: 'added' }
			]);
		if (path.endsWith('/git/trees/new-commit'))
			return respond({
				truncated: false,
				tree: [
					{ path: reviewPath, mode: '100644', type: 'blob' },
					{ path: imagePath, mode: '100644', type: 'blob' }
				]
			});
		if (path === '/graphql') {
			if (failAutoMerge) {
				failAutoMerge = false;
				return respond({ errors: [{ message: 'Not enabled' }] });
			}
			return respond({
				data: {
					enablePullRequestAutoMerge: { pullRequest: { autoMergeRequest: { enabledAt: 'now' } } }
				}
			});
		}
		if (path.endsWith('/enstorlaskreview')) return respond({ permissions: { push: true } });
		if (path.endsWith('/branches/main'))
			return respond({
				protected: true,
				protection: {
					required_status_checks: {
						contexts: ['build', 'dependency-review', 'review-automerge-policy']
					}
				}
			});
		if (path.endsWith('/git/ref/heads/main')) return respond({ object: { sha: 'parent' } });
		if (path.endsWith('/git/commits/parent')) return respond({ tree: { sha: 'base-tree' } });
		if (path.endsWith('/git/trees/base-tree'))
			return respond({
				truncated: false,
				tree: [
					{
						path: 'content/reviews/testsoda.json',
						type: 'blob',
						mode: options.executable ? '100755' : '100644',
						sha: 'fixture'
					},
					{
						path: 'content/reviews/images/test-bar.png',
						type: 'blob',
						mode: options.executable ? '100755' : '100644',
						sha: 'image'
					}
				]
			});
		if (path.endsWith('/git/blobs/fixture'))
			return respond({
				encoding: 'base64',
				content: Buffer.from(
					JSON.stringify({
						...fixture,
						...(options.stale ? { description: 'Ändrat på GitHub' } : {})
					})
				).toString('base64')
			});
		if (path.endsWith('/git/blobs/image'))
			return respond({
				encoding: 'base64',
				content: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64')
			});
		if (path.endsWith('/git/blobs'))
			return respond({ sha: body.encoding === 'base64' ? 'new-image' : 'new-json' });
		if (path.endsWith('/git/trees')) {
			reviewPath = body.tree[0].path;
			imagePath = body.tree[1]?.path;
			return respond({ sha: 'new-tree' });
		}
		if (path.endsWith('/git/commits')) return respond({ sha: 'new-commit' });
		if (path.includes('/git/ref/heads/reviews/'))
			return respond(
				branchExists ? { object: { sha: 'new-commit' } } : {},
				branchExists ? 200 : 404
			);
		if (path.endsWith('/git/refs')) {
			branchExists = true;
			return respond({ ref: body.ref });
		}
		if (path.endsWith('/pulls') && !body)
			return respond(prExists ? [{ html_url: prUrl, number: 123 }] : []);
		if (path.endsWith('/pulls') && body) {
			if (failPr) {
				failPr = false;
				return respond({}, 403);
			}
			prExists = true;
			return respond({ html_url: prUrl, number: 123 });
		}
		throw new Error(`Unexpected GitHub request: ${path}`);
	});
	return writes;
}

async function fillReview(page: Page, wizard: boolean) {
	await page.goto(wizard ? 'skapa/wizard/' : 'skapa/');
	await openEditorTools(page);
	if (!wizard)
		await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page
		.getByLabel('Bild till recensionen')
		.setInputFiles('tests/fixtures/images/test-bar.png');
	await expect(page.getByText('Komprimerad bild:')).toBeVisible();
	if (wizard) await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await page.getByLabel('Fri text').fill('Frisk läsk med **tydlig smak**.');
	await page.locator('#repurchase-potential').selectOption('3');
	if (wizard) await page.getByRole('button', { name: 'Nästa', exact: true }).click();
	await page.getByLabel('Läskens namn / rubrik').fill('Publicerad testläsk');
	await page.getByLabel('Författare', { exact: true }).fill('Test');
	await page.locator('#review-1-volume').selectOption('330');
	await page.locator('#review-1-price').fill('20');
	if (wizard) await page.getByRole('button', { name: 'Nästa', exact: true }).click();
}

async function connect(page: Page, account = 'TestReviewer') {
	await page.getByLabel('GitHub-token', { exact: true }).fill(token);
	await page.getByRole('button', { name: 'Anslut till GitHub', exact: true }).click();
	await expect(page.getByText('Ansluten som')).toContainText(account);
}

for (const wizard of [false, true]) {
	test(`${wizard ? 'wizard' : 'editor'} submits a PR and keeps credentials transient`, async ({
		page
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const writes = await mockGitHub(page);
		await fillReview(page, wizard);
		await connect(page);
		await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
		await expect(page.getByRole('link', { name: 'Öppna PR', exact: true })).toHaveAttribute(
			'href',
			prUrl
		);
		const tree = writes.find((item) => item.path.endsWith('/git/trees'))!.body;
		expect(tree.base_tree).toBe('base-tree');
		expect(tree.tree).toHaveLength(2);
		const exported = JSON.parse(
			writes.find((item) => item.body.encoding === 'utf-8')!.body.content as string
		);
		expect(exported).toMatchObject({ title: 'Publicerad testläsk', author: 'Test' });
		expect(JSON.stringify(exported)).not.toContain(token);
		await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
		expect(writes.filter((item) => item.path.endsWith('/pulls'))).toHaveLength(1);
		expect(
			await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
		).not.toContain(token);
		await page.getByRole('button', { name: 'Koppla från', exact: true }).click();
		await expect(page.getByLabel('GitHub-token', { exact: true })).toHaveValue('');
		const downloaded = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
		expect(await readFile((await (await downloaded).path())!, 'utf8')).not.toContain(token);
		await page.reload();
		await page.getByRole('button', { name: '4. Skicka recension', exact: true }).click();
		await expect(page.getByLabel('GitHub-token', { exact: true })).toHaveValue('');
		expect(errors).toEqual([]);
	});
}

test('failed PR submission preserves form and retries the same branch', async ({ page }) => {
	const writes = await mockGitHub(page, { failPr: true });
	await fillReview(page, false);
	await connect(page);
	await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('behörigheter');
	await expect(
		page.getByRole('link', { name: 'Öppna grenen på GitHub', exact: true })
	).toBeVisible();
	await expect(page.getByLabel('Läskens namn / rubrik')).toHaveValue('Publicerad testläsk');
	await page.getByLabel('Fri text').fill('Ändrat efter försöket');
	await expect(page.getByRole('link', { name: 'Öppna grenen på GitHub', exact: true })).toHaveCount(
		0
	);
	await page.getByLabel('Fri text').fill('Frisk läsk med **tydlig smak**.');
	await expect(
		page.getByRole('link', { name: 'Öppna grenen på GitHub', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
	await expect(page.getByRole('link', { name: 'Öppna PR', exact: true })).toBeVisible();
	expect(writes.filter((item) => item.path.endsWith('/git/refs'))).toHaveLength(1);
	expect(writes.filter((item) => item.path.endsWith('/git/commits'))).toHaveLength(1);
});

test('invalid credentials leave downloads available', async ({ page }) => {
	const writes = await mockGitHub(page, { rejectAuth: true });
	await fillReview(page, false);
	await page.getByLabel('GitHub-token', { exact: true }).fill(token);
	await page.getByRole('button', { name: 'Anslut till GitHub', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('ogiltig');
	const downloaded = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ladda ner JSON', exact: true }).click();
	await downloaded;
	await expect(page.getByRole('button', { name: 'Skicka som PR', exact: true })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Ladda ner bild', exact: true })).toBeEnabled();
	await expect(page.getByRole('alert')).not.toContainText(token);
	await expect(page.getByLabel('GitHub-token')).toHaveAttribute('type', 'password');
	await expect(page.getByLabel('GitHub-token')).toHaveAttribute('autocomplete', 'off');
	await expect(page.getByRole('status').filter({ hasText: 'JSON-filen är klar' })).toBeVisible();
	await expect(page.getByLabel('Läskens namn / rubrik')).toHaveValue('Publicerad testläsk');
	expect(writes).toHaveLength(0);
});

test('published edits retain images and stale edits are blocked', async ({ page }) => {
	const writes = await mockGitHub(page, { stale: true, executable: true });
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
	await page.getByLabel('Fri text').fill('Min ändring');
	await connect(page);
	await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('ändrats eller tagits bort');
	expect(writes).toHaveLength(0);
	await mockGitHub(page, { executable: true });
	await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
	await expect(page.getByRole('link', { name: 'Öppna PR', exact: true })).toBeVisible();
});

for (const wizard of [false, true]) {
	test(`${wizard ? 'wizard' : 'editor'} hides publication status for changed and switched reviews`, async ({
		page
	}) => {
		await mockGitHub(page);
		await fillReview(page, wizard);
		await connect(page);
		await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
		const link = page.getByRole('link', { name: 'Öppna PR', exact: true });
		await expect(link).toBeVisible();
		if (wizard) await page.getByRole('button', { name: '3. Data', exact: true }).click();
		await page.getByLabel('Läskens namn / rubrik').fill('Annan läsk');
		if (wizard)
			await page.getByRole('button', { name: '4. Skicka recension', exact: true }).click();
		await expect(link).toHaveCount(0);
		await expect(page.getByText('Din PR är klar.', { exact: false })).toHaveCount(0);
		await page.getByLabel('Redigera en befintlig recension').selectOption('testsoda');
		await expect(link).toHaveCount(0);
		await expect(page.getByText('Din PR är klar.', { exact: false })).toHaveCount(0);
	});
}

test('imports and reloads a current GitHub review before deployment without losing conflict protection', async ({
	page
}) => {
	const writes = await mockGitHub(page, { stale: true });
	await page.goto('skapa/');
	await openEditorTools(page);
	await page.getByRole('button', { name: 'Visa hela formuläret', exact: true }).click();
	await page.getByText('Stället (valfritt)', { exact: true }).click();
	await page.getByText('Avancerade inställningar', { exact: true }).click();
	await page.getByLabel('Recensionens JSON-fil').setInputFiles({
		name: 'testsoda.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify({ ...fixture, description: 'Ändrat på GitHub' }))
	});
	await connect(page);
	await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('ändrats eller tagits bort');
	await page
		.getByRole('button', { name: 'Ladda aktuell recension från GitHub', exact: true })
		.click();
	await expect(
		page.getByText('Den aktuella recensionen från GitHub är inläst.', { exact: false })
	).toBeVisible();
	await expect(page.getByLabel('Fri text')).toHaveValue('Ändrat på GitHub');
	await page.getByLabel('Fri text').fill('Min ändring efter inläsningen');
	await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
	await expect(page.getByRole('link', { name: 'Öppna PR', exact: true })).toBeVisible();
	const exported = JSON.parse(
		writes.find((item) => item.body.encoding === 'utf-8')!.body.content as string
	);
	expect(exported).toMatchObject({
		description: 'Min ändring efter inläsningen',
		createdAt: fixture.createdAt,
		image: fixture.image
	});
});

for (const wizard of [false, true]) {
	test(`${wizard ? 'wizard' : 'full form'} blocks PR writes without repurchase potential`, async ({
		page
	}) => {
		const writes = await mockGitHub(page);
		await fillReview(page, wizard);
		if (wizard) await page.getByRole('button', { name: '2. Smak', exact: true }).click();
		await page.locator('#repurchase-potential').selectOption('');
		if (wizard)
			await page.getByRole('button', { name: '4. Skicka recension', exact: true }).click();
		await connect(page);
		await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
		await expect(page.locator('#repurchase-potential')).toBeFocused();
		expect(writes).toHaveLength(0);
		await page.locator('#repurchase-potential').selectOption('5');
		if (wizard)
			await page.getByRole('button', { name: '4. Skicka recension', exact: true }).click();
		await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
		await expect(page.getByRole('link', { name: 'Öppna PR', exact: true })).toBeVisible();
	});
}

for (const failAutoMerge of [false, true]) {
	test(`trusted new-review automerge preserves the PR and retries: ${failAutoMerge}`, async ({
		page
	}) => {
		const writes = await mockGitHub(page, { trusted: true, failAutoMerge });
		await fillReview(page, false);
		await connect(page, 'Flawl3ssSWE');
		await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
		await expect(page.getByRole('link', { name: 'Öppna PR', exact: true })).toHaveAttribute(
			'href',
			prUrl
		);
		if (failAutoMerge) {
			await expect(
				page.getByText('automatisk merge kunde inte aktiveras.', { exact: false })
			).toBeVisible();
			await page.getByRole('button', { name: 'Skicka som PR', exact: true }).click();
		}
		await expect(page.getByText('Automatisk merge är aktiverad', { exact: false })).toBeVisible();
		expect(writes.filter((item) => item.path.endsWith('/pulls'))).toHaveLength(1);
		expect(writes.filter((item) => item.path.endsWith('/git/commits'))).toHaveLength(1);
		expect(writes.filter((item) => item.path === '/graphql').at(-1)?.body.variables).toEqual({
			id: 'PR_node',
			head: 'new-commit'
		});
	});
}
