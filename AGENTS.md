# AGENTS.md

Guidance for coding agents in this repository.

## Project

En Stor Läsk Review is a static Swedish soda review guide: SvelteKit 2, TypeScript, Tailwind CSS v4, MapLibre, and GitHub Pages. Keep all user-facing copy and validation messages in Swedish. Preserve the current design and Svelte 5 rune patterns.

## Commands and verification

Use Node 24.16.0 and pnpm 12.8.1. Use `.agents/skills/verify-soda-site/SKILL.md` for the established local verification workflow. Install with `pnpm install --frozen-lockfile` when dependencies changed or are missing. Use `pnpm dev` and `pnpm preview` when interactive inspection is needed; integration tests already start their own preview. No database or `.env` is required.

Before completing code work, run relevant unit tests (`pnpm test:unit --run`), `pnpm check`, and `pnpm lint`. Run `pnpm test:integration` for UI, route, or content workflow changes. Playwright uses separate labelled fixtures and a temporary asset directory; run `pnpm build` afterward to restore production output. Test repository-path behavior with `BASE_PATH=/enstorlaskreview`.

## Architecture

Published JSON lives in `content/reviews/<slug>.json`; images live in `content/reviews/images`. `lib/content/validation.ts` owns the public content contract; `lib/server/content.ts` reads and validates it during development/build. Browser types belong in `lib/types`. Routes stay thin and prerender all review entries. `lib/content/derived.ts` owns statistics and markers. Rating metadata remains the single source of truth in `lib/review-metadata.ts`. Never add MongoDB/authentication dependencies to the application.

Every committed review and static asset may be public. Never commit drafts, passwords, backups, database dumps, or old change logs. Unknown review fields, reserved/duplicate slugs, remote images, unsafe filenames, symlinks, unsupported raster signatures, and unreferenced static images are rejected. Keep public slugs stable. Raw review HTML/links/images remain disabled in the Markdown renderer. All internal routes and assets must respect `$app/paths` and trailing slashes.

Map markers use manually saved coordinates only. Preserve bundled worker URL and CSS, OpenFreeMap CSP allowances, Göteborg camera default (zoom 12.5), inner-button transforms, price labels, and stacking behavior. Keep browser location watch options, one-time centering unless interacted, nonblocking Swedish errors, and watcher/marker/listener cleanup. Never send visitor coordinates to servers, logs, analytics, storage, or cookies.

Migration-only MongoDB tooling lives in `tools/migration`, with a separate package and lockfile. Its filter must match exactly published or missing status. Export only an allowlist of public fields and referenced images; normal installation/build must not depend on this tool.

## Supply chain and deployment

Keep pnpm and direct packages pinned, frozen CI installs, seven-day release delay, strict install-script decisions, and integrity verification. Put pnpm settings in `pnpm-workspace.yaml`; `.npmrc` holds registry configuration. Never globally allow lifecycle scripts or bypass security controls to fix installation. Review policy changes and narrowly justify any exception.

Actions must use full verified commit SHAs. PR jobs have read-only tokens/no deployment secrets. The Pages deployment job has only Pages/OIDC permissions and must not check out source, install dependencies, or run repository code. Deploy only checked default-branch artifacts. Keep Dependabot proposals reviewed and disable automatic merges. CODEOWNERS requires repository rules for enforcement.

Retain hash CSP for static output. Pages cannot set the former server's custom headers. The site has no analytics or consent banner. Do not add tracking or third-party scripts without a concrete need.

## Conventions

Prettier uses tabs, single quotes, no trailing commas, print width 100, LF. Unit tests live beside their code; browser tests in `tests/`. See `docs/architecture.md` and README for content editing, migration, and deployment.
