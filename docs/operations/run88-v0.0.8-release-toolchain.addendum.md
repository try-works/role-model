# Run 88 `v0.0.8` release-toolchain addendum

Status: active release recovery
Date: 2026-08-14

This addendum records a release-process correction for the existing Run 88 candidate. It does not create a new
repair package, soak epoch, or product candidate.

## Failure and root cause

Production workflow run `31759167117` failed its Windows complete-pair comparison before any GitHub Release was
published. The public source tree and paired private commit matched, but the SEA executable did not:

| Build | Node patch | Executable SHA-256 | Length |
| --- | --- | --- | --- |
| Earlier tested stage (`31757270477`) | `24.19.0` | `747fac49a4b272d4d0289e56b6e8b19815a56a42516a047c4d499c1aa3a42874` | `103273984` |
| Reconciled stage (`31758760193`) | `24.18.1` | `8de6bdb5aa472b040d96d75b4e276550e20b4a74b504bb16bccc3a87c6137dc8` | `102988800` |
| Failed production (`31759167117`) | `24.19.0` | `747fac49a4b272d4d0289e56b6e8b19815a56a42516a047c4d499c1aa3a42874` | `103273984` |

`.github/workflows/build-binaries.yml` requested only Node major `24`. `actions/setup-node` therefore selected
different available patch releases on different runners. `scripts/package-sea.ts` copies `process.execPath` into the
SEA package, so a Node patch difference necessarily changes the executable and `core_payload_sha256`.

## Decision

- Pin every release-workflow `actions/setup-node` use to exact Node `24.19.0`.
- Keep the existing Run 88 candidate, private revision, and release identity; do not send new runtime/LLM requests.
- Promote this workflow-only correction through the normal `dev -> stage -> main` chain.
- Require the rebuilt stage and production matrices to prove the complete public/private pair again.
- Treat the first `v0.0.8` tag as an unpublished failed release attempt. Do not publish it from mismatched artifacts;
  recover the same version only after the corrected candidate passes the guarded chain.

## Pull-request and branch audit

At the time of this correction both the public and private repositories had zero open pull requests. Run 88 PRs
were merged. Remaining remote feature-branch names are stale merged/squash sources, except for an unrelated old
public Run 03 branch with no PR and the intentionally closed private setup PR #2; neither is release input.
