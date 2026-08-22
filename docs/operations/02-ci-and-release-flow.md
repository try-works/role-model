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

CircleCI is the primary source of CI evidence for pull requests and promotions. The public
`.circleci/config.yml` runs two non-deploying jobs: `ci/circleci: router-contract` for the router contract and
`ci/circleci: full-contract` for the complete public verification contract. Both use the frozen pnpm lockfile; the
full contract runs `pnpm run ci:check`.

The private repository's CircleCI workflow is the companion Track B gate. It records one exact public source revision
at pipeline start (or accepts the release-provided `public_paired_sha`), checks out that revision, builds the Track B
distribution, verifies the paired manifests and external interoperability, runs the private suite, and exercises the
packaged-runtime browser gate. A stage or production promotion needs the successful public CircleCI checks **and** a
successful private `ci/circleci: track-b-conformance` run bound to the same public commit. CircleCI validation jobs
must never deploy, tag, publish, or alter a release.

`.github/workflows/ci.yml` may remain during the migration as a repository-protection compatibility signal, but it is
not the release-test authority. Do not accept a green GitHub Actions CI run in place of the required CircleCI
evidence. Before making CircleCI checks mandatory in branch protection, observe their exact names on a real PR and
then replace the duplicate GitHub Actions CI requirements one recoverable change at a time. GitHub Actions remains
the owner of promotion guards and release/build publication workflows.

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
node --test scripts/circleci-workflow.test.mjs
node --test scripts/ci-workflow.test.mjs scripts/build-binaries-workflow.test.mjs apps/docs-site/scripts/docs-site-deploy-workflow.test.mjs
corepack pnpm run ci:check
corepack pnpm run docs:build
ROLE_MODEL_BUILD_CHANNEL=development corepack pnpm run runtime:package-sea
```

Before changing branch protection, observe the successful CircleCI check names on a real PR. Capture current
settings, apply one recoverable change at a time, read them back, and keep `main` protected until the complete
CircleCI replacement policy is verified.
