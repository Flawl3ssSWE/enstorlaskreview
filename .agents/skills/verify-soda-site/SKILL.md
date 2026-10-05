---
name: verify-soda-site
description: Verify changes in En Stor Läsk Review with the established pnpm and Playwright setup, avoiding repeated setup and redundant checks.
---

# Verify soda site

Follow current repository requirements in `AGENTS.md`. Complete the requested edit before verification unless an early check resolves a concrete uncertainty.

- Reuse installed dependencies; install with the frozen lockfile only when dependencies changed, are missing, or a dependency error requires it. Preserve supply-chain controls.
- Run relevant unit tests, `pnpm check`, and `pnpm lint` once after final edits. Run independent checks concurrently. Add tests for meaningful behavior, not simple copy or styling changes.
- For UI, route, or content workflow changes, run integration tests with `BASE_PATH=/enstorlaskreview`. The integration command already builds fixtures and starts preview; avoid separate dev/preview servers for the same check.
- Run `pnpm build` after integration tests to restore production output. Never build concurrently with integration tests.
- Start dev or a separate preview only to investigate something tests do not cover. Avoid extra probes/screenshots after passing checks without an unresolved concern.
- Documentation and skill-only edits need focused formatting/skill validation, not application tests or builds.
- Rerun only affected checks after fixes; repeat successful suites only when later edits invalidate them. Summarize outcomes instead of full logs.

## Browser setup

Use the Node and pnpm versions pinned by the repository. Check versions only in an unfamiliar environment or when diagnosing version errors.

Use Playwright's managed Chromium in its persistent OS user cache. After a Playwright update or when browsers are missing, install the matching binaries once:

```bash
pnpm exec playwright install chromium
```

On a supported Linux host with missing system libraries, use `pnpm exec playwright install --with-deps chromium`; system package installation may require administrator privileges. Preserve explicitly configured `PLAYWRIGHT_BROWSERS_PATH` or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` overrides. Do not assume a machine-specific browser path or use OS-detection overrides to hide unsupported platforms. Diagnose setup failures from the actual error and resolve them once.

## Approvals

Reuse existing approvals. Skills do not grant execution permissions. If the current session has already demonstrated that the sandbox blocks the local server or browser, request required integration-test escalation directly. Use narrowly scoped reusable prefixes when supported. Environment assignments may still require approval despite a pnpm prefix.

Use one integration command for its build, server, and browser; avoid separate approval requests for probes and redundant server starts. On a necessary sandbox/network failure, use the required escalation mechanism. Never add wrappers or permission rules to evade approval.
