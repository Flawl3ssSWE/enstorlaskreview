import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
interface Step {
	uses?: string;
	run?: string;
	with?: Record<string, unknown>;
	if?: string;
}
interface Workflow {
	on: Record<string, unknown> | string;
	permissions: Record<string, string>;
	jobs: Record<
		string,
		{
			permissions?: Record<string, string>;
			steps: Step[];
			if?: string;
			needs?: string;
			environment?: { name: string };
		}
	>;
}
const workflows = readdirSync('.github/workflows')
	.filter((name) => name.endsWith('.yml'))
	.map((name) => parse(readFileSync(`.github/workflows/${name}`, 'utf8')) as Workflow);
describe('CI trust boundary', () => {
	it('pins all direct dependencies and fails on unreviewed install scripts', () => {
		const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
			dependencies: Record<string, string>;
			devDependencies: Record<string, string>;
			packageManager: string;
		};
		for (const version of Object.values({
			...manifest.dependencies,
			...manifest.devDependencies
		})) {
			expect(version).toMatch(/^\d+\.\d+\.\d+$/);
		}
		expect(manifest.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
		const settings = parse(readFileSync('pnpm-workspace.yaml', 'utf8'));
		expect(settings.minimumReleaseAge).toBeGreaterThanOrEqual(10080);
		expect(settings.strictDepBuilds).toBe(true);
		expect(settings.verifyStoreIntegrity).toBe(true);
		expect(settings.dangerouslyAllowAllBuilds).not.toBe(true);
	});
	it('pins action code and gives normal jobs read-only permissions', () => {
		for (const workflow of workflows) {
			expect(workflow.permissions).toEqual({ contents: 'read' });
			expect(workflow.on).not.toHaveProperty('pull_request_target');
			expect(workflow.on).not.toHaveProperty('workflow_run');
			for (const [name, job] of Object.entries(workflow.jobs)) {
				if (name !== 'deploy')
					expect(job.permissions ?? workflow.permissions).toEqual({ contents: 'read' });
				for (const step of job.steps) {
					if (step.uses) expect(step.uses).toMatch(/^[\w-]+\/[\w-]+@[a-f0-9]{40}$/);
					if (step.uses?.startsWith('actions/checkout@'))
						expect(step.with?.['persist-credentials']).toBe(false);
					if (step.run) expect(step.run).not.toMatch(/\$\{\{\s*github\.event\./);
				}
			}
		}
	});
	it('does not execute source code inside the privileged deployment job', () => {
		const workflow = workflows.find((workflow) => workflow.jobs.deploy)!;
		const deploy = workflow.jobs.deploy;
		expect(deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' });
		expect(deploy.needs).toBe('build');
		expect(deploy.if).toContain("github.ref == 'refs/heads/main'");
		expect(deploy.if).toContain("github.event_name != 'pull_request'");
		expect(deploy.environment?.name).toBe('github-pages');
		expect(deploy.steps).toHaveLength(1);
		expect(deploy.steps[0].uses).toMatch(/^actions\/deploy-pages@[a-f0-9]{40}$/);
		expect(deploy.steps[0]).not.toHaveProperty('run');
		const steps = workflow.jobs.build.steps;
		expect(steps.some((step) => step.run === 'pnpm install --frozen-lockfile')).toBe(true);
		const rebuild = steps.findIndex((step) => step.run === 'pnpm build');
		const integration = steps.findIndex((step) => step.run === 'pnpm test:integration');
		const upload = steps.findIndex((step) =>
			step.uses?.startsWith('actions/upload-pages-artifact@')
		);
		expect(rebuild).toBeGreaterThan(integration);
		expect(upload).toBeGreaterThan(rebuild);
		expect(steps[upload].if).toBe(deploy.if);
	});
});
