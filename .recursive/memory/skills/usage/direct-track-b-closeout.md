# Direct Track B closeout skill usage

Type: pattern
Status: CURRENT
Scope: recursive-mode closeout for Direct Track B evidence-heavy runs
Owns-Paths:
Watch-Paths: .recursive/run/; evidence/; scripts/track-b/
Source-Runs: 00-direct-track-b-v1-1-implementation
Validated-At-Commit: d044e5ead3c3251c4a5605a47e0abe7ac3c43eb2
Last-Validated: 2026-07-21
Tags: recursive-mode, closeout, agent-operated-qa, release-validation

## Guidance

- Keep product evidence under repo-root `evidence/` and copy key closeout receipts into `/.recursive/run/<run-id>/evidence/closeout/` for agent-operated QA path checks.
- Prefer Phase 4 ownership of late evidence files such as `evidence/release-validation.json` rather than reopening locked Phase 3.
- For agent-operated QA, record executor/tools/evidence under run-scoped evidence paths; do not invent human sign-off.
- Self-audit is appropriate for late-phase receipt binding when product work is already locked and evidence is deterministic on disk.
