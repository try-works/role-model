# Changelog

## v0.0.1-alpha.1 - 2026-06-22

First alpha release of `role-model`.

This release publishes the Role-Model router runtime together with the public Pi integration package. It is an
early release intended for installation testing, Pi integration validation, and feedback on the runtime routing
workflow.

Highlights:

- Released the packaged Role-Model router runtime for Windows, macOS, and Linux through GitHub Releases.
- Added installer assets and checksums for the standalone runtime distribution.
- Published the public `@try-works/pi-role-model` package for installing Role-Model support into Pi.
- Added the Pi Role-Model skill and commands for setup, doctor checks, alias discovery, alias selection, and
  routing through the Role-Model runtime.
- Documented Pi installation from npm, local checkout installation, endpoint configuration with
  `ROLE_MODEL_ENDPOINT`, and remote/authentication safety behavior.
- Verified the Pi package can connect Pi to an externally running Role-Model runtime and route OpenAI-compatible
  requests through the Role-Model downstream endpoint.

## Release Notes

The generated per-release changelog is also published in GitHub Releases.

For tagged releases, the repo-authored release body is generated from recursive artifacts in the release commit
range, especially:

- `/.recursive/run/**/03-implementation-summary.md`
- `/.recursive/run/**/06-decisions-update.md`
- `/.recursive/run/**/07-state-update.md`
- fallback deltas from `/.recursive/DECISIONS.md` and `/.recursive/STATE.md` when the structured receipts are not
  present in the same commit

GitHub's generated release notes are still included alongside that recursive changelog so merged PRs,
contributors, and uncategorized changes remain visible.

This project uses release tags of the form `vX.Y.Z` and follows Semantic Versioning for its public release
surface.

## Operator Notes

- Do not hand-maintain per-version sections in this file.
- Instead, make sure the recursive implementation, decisions, and state receipts are present and locked in the
  commits you intend to ship.
- The release workflow reads those artifacts directly when the tag is published.
