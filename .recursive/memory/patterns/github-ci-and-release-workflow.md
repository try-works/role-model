# GitHub CI, Deployment, and Release Workflow

Type: `pattern`
Status: `CURRENT`
Scope: `Long-lived-branch CI, docs validation/deployment, channel candidates, and tag-only releases.`
Owns-Paths:
- `/.github/workflows/ci.yml`
- `/.github/workflows/build-binaries.yml`
- `/.github/workflows/docs-site-deploy.yml`
- `/package.json`
- `/scripts/ci-workflow.test.mjs`
- `/scripts/build-binaries-workflow.test.mjs`
- `/apps/docs-site/scripts/docs-site-deploy-workflow.test.mjs`
- `/docs/operations/02-ci-and-release-flow.md`
- `/docs/operations/03-release-checklist.md`
Watch-Paths:
- `/role-model-router/apps/runtime-host-bridge/**`
- `/packages/pi-role-model/**`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Source-Runs:
- `78-dev-stage-main-cicd-runtime-channels`
Validated-At-Commit: `0db8a21efe943a902f7ae5a2004aff0fe2ceefea`
Last-Validated: `2026-07-19`
Tags: `github-actions`, `ci`, `deployment`, `release`, `attestation`, `runtime-channels`

## CI contract

- PRs into and pushes to `dev`, `stage`, and `main` use stable contexts: `promotion-guard`, `quality`, `build-test`, `runtime-critical`, `runtime-router`, `rust`, and `smoke`. `dev` also requires `cla`.
- Install with `pnpm install --frozen-lockfile`; keep least-privilege permissions, bounded timeouts, and cancellable concurrency groups.
- Preserve each named lane instead of hiding failures inside one opaque parity wrapper. Keep local `corepack pnpm run ci:check` available.
- The root full-test order is deliberate: ordinary workspaces in parallel, runtime-host integration tests alone, then Pi alone. Both latter suites start real processes and become flaky under monorepo-wide contention.
- Update repo-owned workflow contract tests whenever triggers, contexts, promotion rules, or sequencing change.

## Docs

- Docs are intentionally simpler than runtime delivery: build on relevant PRs and pushes, deploy only from `main` to the `role-model` production target.
- Missing Cloudflare credentials must emit a visible non-fatal skip after build validation. Never claim a deployment occurred when credentials are absent.

## Runtime artifacts and releases

- Trusted builds pass an explicit channel; do not infer it from mutable Git state at runtime.
- Production is `role-model:3456`, stage `role-model-stage:3457`, and development `role-model-dev:3458`, with isolated roots/scopes/process identity.
- Stage pushes build and attest the full candidate matrix with channel and commit identity. Dev builds are explicit/manual. Only production tags publish stable GitHub releases and installers.
- Preserve archive checks, checksums, attestations with bounded retry, packaging diagnostics, and channel-neutral core-payload verification.

## Operator guidance

- Inspect exact failed assertions before rerunning. A pass on retry is evidence of nondeterminism, not automatically a fix.
- If resource-bearing suites fail only under fan-out, reproduce them alone, add a sequencing contract, and serialize at the root rather than weakening assertions.
