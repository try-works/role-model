# Episode: 00-direct-track-b-v1-1-implementation

Type: episode
Status: CURRENT
Scope: Closeout lessons from first full Direct Track B recursive run
Owns-Paths:
Watch-Paths: .recursive/run/00-direct-track-b-v1-1-implementation/
Source-Runs: 00-direct-track-b-v1-1-implementation
Validated-At-Commit: 80f2dc824950fdb19871cc5c7bba17ee3d52928d
Last-Validated: 2026-07-24
Tags: recursive-closeout, dual-worktree, release-validation, cloud-e2e, extensions-ui

## Lessons

- Prefer Phase 4 ownership for late evidence files such as `evidence/release-validation.json` when Phase 3 is already locked.
- Agent-operated QA is valid when evidence lives under `.recursive/run/<run-id>/evidence/` and execution metadata is complete.
- Dual-platform interop requires both Windows and Ubuntu distribution receipts before system proof rebuild.
- Cloud product deltas after Phase 3 lock should land as locked Phase-3 addenda, then reopen/re-lock 03→08 Worktree Diff Audit inventories (Phase 5 can stay locked).
- Live Cloudflare E2E policy: **dev + stage only**; keep default CI/`pnpm test` offline-only and point operators at `docs/testing.md`.
- Public UI follow-ons (e.g. Extensions diagnostics) can land as locked Phase-3 addenda with Phases 6–8 reopened to absorb DECISIONS/STATE/memory + inventory notes; do not treat “Extensions UI missing” briefings as authoritative when `/app/system/extensions` already exists.
- Knowledge boundary: enabling knowledge-worker/store in UI diagnostics must never be narrated as production prompt injection / `productionActivation`.
