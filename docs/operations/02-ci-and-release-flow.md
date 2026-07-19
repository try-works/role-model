# CI, promotion, and release flow

`role-model` uses three long-lived branches:

1. Ordinary `feature/*`, `fix/*`, dependency, and `recursive/*` pull requests target `dev` and normally squash merge.
2. A maintainer promotes a tested integration with a merge-commit PR from `dev` to `stage`.
3. A maintainer promotes a tested stage candidate with a merge-commit PR from `stage` to `main`.

`main` is production truth. A production-only emergency starts as `hotfix/*` from `main`, requires review, and is
forwarded to `stage` and `dev` after merge. Never force-push a promotion branch to resynchronize it; use reviewed
merge commits and resolve conflicts in the promotion PR.

## Required CI lanes

`.github/workflows/ci.yml` runs on pull requests and post-merge pushes for `dev`, `stage`, and `main`. Stable check
names are `promotion-guard`, `quality`, `build-test`, `runtime-critical`, `runtime-router`, `rust`, and `smoke`.
Superseded runs cancel, permissions default to read-only, jobs use bounded timeouts, and dependencies install with a
frozen lockfile.

The promotion guard accepts ordinary work into `dev`, only `dev` into `stage`, and only `stage` into `main`.
Reviewed `hotfix/* -> main` is the explicit emergency exception.

## Runtime build channels

`.github/workflows/build-binaries.yml` builds the full matrix for stage candidates and production tags. Development
packages are available by explicit manual dispatch. Only a `v*` tag publishes a stable GitHub Release.

| Channel | Identity | Endpoint | State root | Scope |
| --- | --- | --- | --- | --- |
| Production | `role-model` | `http://127.0.0.1:3456` | `role-model-runtime` | `standalone-runtime` |
| Stage | `role-model-stage` | `http://127.0.0.1:3457` | `role-model-runtime-stage` | `standalone-runtime-stage` |
| Development | `role-model-dev` | `http://127.0.0.1:3458` | `role-model-runtime-dev` | `standalone-runtime-dev` |

Manifests report channel, endpoint, commit, source tree, executable SHA-256, and channel-neutral core payload
SHA-256. A production tag must find the matching successful stage candidate and prove the core payload digest is
identical; source-tree equality alone is insufficient.

## Docs site exception

The docs site is intentionally simpler than the runtime pipeline. Relevant pull requests build it without deploy
credentials. Only `main` deploys the single site to Cloudflare Pages project `role-model-dev`; manual runs from other
refs cannot deploy. There are no dev/stage docs projects in this topology.

If credentials are missing, the deploy step reports a non-fatal skip. After deployment, verify the public URL. To
roll back, use the Cloudflare Pages deployment history for the same project; do not move `role-model.dev` between
projects during an incident.

## Local verification

```bash
corepack pnpm install --frozen-lockfile
node --test scripts/ci-workflow.test.mjs scripts/build-binaries-workflow.test.mjs apps/docs-site/scripts/docs-site-deploy-workflow.test.mjs
corepack pnpm run ci:check
corepack pnpm run docs:build
ROLE_MODEL_BUILD_CHANNEL=development corepack pnpm run runtime:package-sea
```

Before changing GitHub protections, observe the successful check names on a real PR. Capture current settings, apply
one recoverable change at a time, read it back, and keep `main` protected until the complete replacement policy is
verified.
