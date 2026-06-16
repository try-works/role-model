# CI and Release Flow

This is the canonical operator-facing reference for the GitHub automation that validates, packages, and
publishes `role-model`.

Use it when you need to:

- understand which workflow owns which responsibility,
- diagnose a GitHub-only failure,
- verify what should happen before a merge or release tag,
- onboard another agent or contributor to the automation surface.

## Workflow inventory

### `ci.yml`

Purpose: fast merge gate for the whole monorepo.

Triggers:

- every `push`
- every `pull_request`

What it runs, in order:

1. dependency install
2. `pnpm run lint`
3. `pnpm run schemas:validate`
4. `pnpm run build`
5. `pnpm run test`
6. `pnpm run test:rust`
7. `pnpm run smoke`

Notes:

- this workflow should stay close to the local contributor command surface.
- each phase is split into its own GitHub Actions step so failures are attributable without expanding a
  single umbrella command.

### `build-binaries.yml`

Purpose: produce tagged release archives and manual-download artifacts for the standalone router runtime.

Triggers:

- `workflow_dispatch`
- pushes to `main`
- tags matching `v*`

Outputs:

- `role-model-router-linux-x64.tar.gz`
- `role-model-router-darwin-x64.tar.gz`
- `role-model-router-darwin-arm64.tar.gz`
- `role-model-router-win32-x64.zip`
- `SHA256SUMS.txt`
- installer scripts `install.sh` and `install.ps1` on tagged releases

Notes:

- the workflow packages one matrix target per OS/architecture.
- tagged runs now publish through one final release job so notes, checksums, and assets stay coherent.
- release notes are synthesized from recursive implementation, decisions, and state-update artifacts in the
  tagged commit range, then combined with GitHub's generated notes.
- the final publish job targets a `release` environment so repository settings can require approvals.
- failed runs now upload partial packaging outputs from `role-model-router/dist/**` and
  `role-model-router/vendor/llama-swap/dist-assets/**` so Windows-only packaging failures are inspectable after
  the runner is gone.

### `docs-site-deploy.yml`

Purpose: build the docs site on every relevant PR and deploy it only when deployment credentials are expected
to exist.

Triggers:

- pushes to `main` that touch the docs site or shared build inputs
- matching `pull_request` changes
- `workflow_dispatch`

Job model:

1. `build`: installs dependencies, builds `apps/docs-site`, and uploads the built client bundle as an artifact
2. `deploy`: downloads that artifact and deploys to Cloudflare Pages, but only for non-PR events

Notes:

- PRs validate the docs build without requiring Cloudflare secrets.
- non-PR deploys fail early with a clear secret-missing message instead of a later `wrangler` error.

### `cla.yml`

Purpose: enforce the contributor license agreement on pull requests.

Triggers:

- `pull_request_target`
- matching `issue_comment` events

Audit result:

- the workflow is operationally healthy and already has a dedicated self-test history on GitHub.
- no release-flow changes are currently required there.

## Canonical local verification

Run these from the repo root before pushing workflow-affecting changes:

```bash
corepack pnpm install
corepack pnpm run ci:check
corepack pnpm run docs:build
corepack pnpm run runtime:package-sea
```

Use narrower commands only when you are intentionally iterating on one workflow surface.

## Release sequence

The expected release path is:

1. merge validated changes into `main`
2. confirm the recursive implementation, decisions, and state receipts for the release commits are present and locked
3. confirm `ci.yml` is green on the target commit
4. update `apps/docs-site/content/docs/` for any user-visible install, setup, routing, benchmark, UI, or release-flow changes
5. confirm the docs site build is green and the public docs still match the release assets and operator flow
6. create and push a `v*` tag
7. let `build-binaries.yml` publish the release archives, checksums, and installer scripts
8. verify the release assets match the filenames referenced in [install.md](../public/install.md)

Packaged installs are the default user path. Source builds remain a contributor/developer path.

## GitHub-only diagnostics

When a failure reproduces only on GitHub:

1. inspect the failing workflow run, job, and step first
2. prefer the GitHub plugin plus `gh` job logs over guessing from local state
3. compare the failing phase to the local command listed above
4. download any uploaded workflow artifact before rerunning a transient failure away

Current workflow-specific diagnostics:

- `ci.yml`: failing phase is visible directly from the step list
- `build-binaries.yml`: package subprocesses now emit their exact command, working directory, stdout, and stderr
- `build-binaries.yml`: release notes are derived from commit-range recursive receipts instead of a manual release block
- `docs-site-deploy.yml`: build and deploy are separate jobs, so credential failures cannot masquerade as build failures

For the operator-facing checklist, see [03-release-checklist.md](03-release-checklist.md).

## Toolchain contract

Current automation assumptions:

- Node.js 24
- pnpm 10.6.5
- Go 1.24.2 for binary packaging
- stable Rust toolchain for repo validation

Keep workflow versions aligned with the contributor-facing setup in [README.md](../../README.md).

## Repository hygiene notes

- `.agents/**` and `.recursive/**` are intentionally excluded from normal formatting and lint enforcement.
- routine CI/release automation work should not rewrite those artifacts unless the task explicitly targets them.
