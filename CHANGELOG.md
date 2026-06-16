# Changelog

The canonical per-release changelog is published in GitHub Releases.

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
