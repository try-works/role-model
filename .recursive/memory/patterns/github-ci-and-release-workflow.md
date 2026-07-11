Type: `pattern`
Status: `CURRENT`
Scope: `GitHub Actions validation, docs deploy separation, binary release publication, and recursive-artifact release-note generation`
Owns-Paths:
- `/.github/workflows/ci.yml`
- `/.github/workflows/build-binaries.yml`
- `/.github/workflows/docs-site-deploy.yml`
- `/.github/release.yml`
- `/CHANGELOG.md`
- `/docs/operations/02-ci-and-release-flow.md`
- `/docs/operations/03-release-checklist.md`
- `/scripts/generate-recursive-release-changelog.mjs`
Watch-Paths:
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Source-Runs:
- `maintenance-ci-release-automation-2026-06-16`
- `63-router-backend-regression-and-telemetry-surface-hardening`
Validated-At-Commit: `WORKTREE-UNCOMMITTED`
Last-Validated: `2026-07-11T00:00:00Z`
Tags:
- `github-actions`
- `ci`
- `release`
- `changelog`
- `attestation`

# GitHub CI And Release Workflow

Trust: current repo-local baseline; validate again after workflow topology or release-asset changes

## CI workflow pattern

- Keep `/.github/workflows/ci.yml` phase-attributed. GitHub-only failures are easier to diagnose when install, lint, typecheck, test, docs build, and workspace validation fail as separate steps instead of one parity wrapper.
- Preserve the repo-level parity command (`corepack pnpm run ci:check`) for local validation, but do not hide the failing phase inside GitHub behind that single wrapper.
- When router-affecting backend coverage gains a dedicated lane such as `pnpm run runtime:test-router`, keep it as its own workflow step instead of folding it back into `pnpm run test` or `runtime:test-critical`; router regressions should fail the router phase directly.
- When a workflow step can fail for packaging or environment reasons, emit phase-local diagnostics or artifacts instead of forcing operators to reconstruct the failure from raw logs.

## Docs deploy pattern

- `/.github/workflows/docs-site-deploy.yml` should always prove that the docs site builds on pull requests and pushes, even when deploy credentials are unavailable.
- Deployment must remain a non-PR concern. Gate the Cloudflare publish path behind explicit secret and account checks so content validation and deployment authorization stay separable.
- When those secrets are absent, the workflow should emit an explicit skip notice and stay green rather than failing the merged commit. Missing deploy credentials are environment posture, not a product regression.
- Keep the built static artifact available from the workflow so GitHub-only docs failures can be inspected without rerunning locally.

## Release publication pattern

- `/.github/workflows/build-binaries.yml` should keep matrix jobs limited to build, archive, upload, and attest responsibilities.
- Artifact attestation stays mandatory, but the workflow should retry transient Sigstore/Rekor failures before failing the matrix job. External transparency-log timeouts are infrastructure flakes, not immediate evidence of a bad archive.
- Publish the actual GitHub release from one final tag-gated job after all archives are available. That job is the right place to assemble `install.sh`, `install.ps1`, `SHA256SUMS.txt`, and the final release asset bundle.
- Treat attestations and checksums as part of the shipped release, not optional side outputs.

## Release note pattern

- `/CHANGELOG.md` is a process document for how release notes are derived, not a hand-edited ledger of version sections.
- Repo-authored release notes should be generated from recursive artifacts in the tagged commit range:
  - `03-implementation-summary`
  - `06-decisions-update.md`
  - `07-state-update.md`
- `/scripts/generate-recursive-release-changelog.mjs` should prefer those structured receipts and only fall back to added bullet diffs from `/.recursive/STATE.md` and `/.recursive/DECISIONS.md` when structured receipts are absent.
- `/.github/release.yml` should remain the source for GitHub-generated note categories so the final release combines platform-generated PR metadata with repo-authored implementation receipts.

## Operator guidance

- If CI changes, update this memory shard and the operations docs in the same change so future agents do not reverse-engineer the workflow from YAML alone.
- If the release asset set changes, keep the publish job, checklist, and changelog generator aligned; drift between those three surfaces causes the next GitHub-only release failure.
