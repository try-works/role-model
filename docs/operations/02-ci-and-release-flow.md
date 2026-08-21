# CI, promotion, and release flow

`role-model` uses three long-lived branches:

1. Ordinary `feature/*`, `fix/*`, dependency, and `recursive/*` pull requests target `dev` and normally squash merge.
2. A maintainer promotes a tested integration with a merge-commit PR from `dev` to `stage`.
3. The `stage` push publishes a GitHub prerelease named `stage-rc-<12-character-stage-sha>`. A human installs and
   tests that exact package on the isolated stage channel, then explicitly accepts it with the
   `accept-release-candidate` workflow.
4. Only after that acceptance does a maintainer promote the exact stage candidate with a merge-commit PR from
   `stage` to `main` and create the stable version tag.

`main` is production truth. A production-only emergency starts as `hotfix/*` from `main`, requires review, and is
forwarded to `stage` and `dev` after merge. Never force-push a promotion branch to resynchronize it; use reviewed
merge commits and resolve conflicts in the promotion PR.

## Paired private repository

`role-model` remains the release orchestrator and the only repository that publishes runtime archives and version
tags. `role-model-internal` is nevertheless part of every stage and production package: its exact commit supplies
the private runtime distribution and all 13 canonical extensions.

Promote the paired private change first. Before a public stage build, the recorded private commit must be reachable
from `role-model-internal/stage`; before a public production tag, that same tested commit must be reachable from
`role-model-internal/main`. Set `ROLE_MODEL_PAIRED_PRIVATE_SHA` to the exact reviewed private stage commit before
promoting public `dev -> stage`. The public workflow checks ancestry itself and fails closed; a raw commit SHA,
feature branch, or current private branch tip is not sufficient. The private repository does not publish a second
binary release or an independent version tag.

## Required CI lanes

`.github/workflows/ci.yml` runs on pull requests and post-merge pushes for `dev`, `stage`, and `main`. Stable check
names are `promotion-guard`, `quality`, `build-test`, `runtime-critical`, `runtime-router`, `rust`, and `smoke`.
Superseded runs cancel, permissions default to read-only, jobs use bounded timeouts, and dependencies install with a
frozen lockfile.

The promotion guard accepts ordinary work into `dev`, only `dev` into `stage`, and only `stage` into `main`.
Reviewed `hotfix/* -> main` is the explicit emergency exception.

## Runtime build channels

`.github/workflows/build-binaries.yml` builds the full matrix for stage candidates and production tags. Development
packages are available by explicit manual dispatch. Every successful `stage` push publishes a GitHub prerelease with
all four stage-channel archives and `SHA256SUMS.txt`; prereleases are never selected by the stable installers.

After testing, a maintainer runs `.github/workflows/accept-release-candidate.yml` with the exact prerelease tag and
checks the explicit acceptance input. That workflow re-downloads the candidate, validates all checksums and stage
manifests, and creates the immutable `rc-approved/<full-stage-sha>` receipt. Do not approve a candidate based only on
green CI: install it, exercise the intended user paths on port `3457`, restart it against its stage state, and inspect
the behavior that motivated the release.

Only an exact stable SemVer tag (`vMAJOR.MINOR.PATCH`) publishes a production GitHub Release. Production packaging
fails closed unless its matching successful stage artifact also has both the published stage prerelease and the
explicit acceptance receipt. The stable tag must point to a commit promoted through `main`.

| Channel | Identity | Endpoint | State root | Scope |
| --- | --- | --- | --- | --- |
| Production | `role-model` | `http://127.0.0.1:3456` | `role-model-runtime` | `standalone-runtime` |
| Stage | `role-model-stage` | `http://127.0.0.1:3457` | `role-model-runtime-stage` | `standalone-runtime-stage` |
| Development | `role-model-dev` | `http://127.0.0.1:3458` | `role-model-runtime-dev` | `standalone-runtime-dev` |

Manifests report channel, endpoint, commit, source tree, executable SHA-256, channel-neutral core payload SHA-256,
the exact private source commit, Run 88 release identity, private distribution manifest and sidecar digests, and the
canonical extension count. A production tag must find the matching successful and explicitly accepted stage
candidate, rebuild its exact private commit, verify that the artifact came from a successful push build of public
`stage`, verify that the private commit has subsequently passed through private `main`, and prove the complete
public/private pair is identical.
Source-tree or core-payload equality alone is insufficient.

Run 88's `v0.0.8` release-toolchain recovery and the exact stage/production payload diagnosis are recorded in
[`run88-v0.0.8-release-toolchain.addendum.md`](run88-v0.0.8-release-toolchain.addendum.md).

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
