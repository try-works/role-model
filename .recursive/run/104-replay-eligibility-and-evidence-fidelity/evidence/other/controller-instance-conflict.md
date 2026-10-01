# Controller instance conflict — two live controls of run 104 (2026-10-01 19:5x local)

Status: informational. Written by root rollout `01a0f74a-7533-7021-a985-a70a4519bf02`
(started `2026-10-01T19:47:28+08:00`) after it observed a **second, still-live instance of the same
root thread** driving this run.

## What is going on

Two rollouts of the same thread are alive against the same worktree:

| rollout | started | state at 19:56 |
| --- | --- | --- |
| `01a0eef8-7c8e-7e22-bd61-fbfc3d7f1621` | 2026-09-29T21:01:42Z | **live** — appended ~1.9 KB in the 20 s observed at 19:56; its last tool calls are `apply_patch` writes to `src/finalized-group-listing-cache.ts`, its test and `cli.ts` (the SP7 remaining `evaluation:list-groups` sweep load) |
| `01a0f74a-7533-7021-a985-a70a4519bf02` | 2026-10-01T19:47:28Z | this instance; resumed with a compacted context window (the pre-19:47 portion of the turn is not in its context) |

Both resolve to the same conversation history and the same shared worktrees, so both act as controller.
The older rollout holds the full run context and is further along; this newer one resumed without it and
only reconstructed state from disk.

## Commits this instance made before the conflict was detected (verified, do not redo)

The two remaining uncommitted hunks of `sp104_integration_followups` were re-verified by this instance
(bridge 3/3, runtime-ui 9/9, `@role-model/ui` 6/6 focused tests green; `runtime-host-bridge` and
`runtime-ui` builds exit 0) and committed:

| commit | subject | files |
| --- | --- | --- |
| `e68a0f89` | `recursive/104 R6: carry the task variant through the advisory classification normalizer` | `src/track-b-runtime.ts`, `test/run104-advisory-classification-variant.test.ts` |
| `1b60f5cf` | `recursive/104 R14: sample the sidebar footer from the newest live request` | `app/components/app-shell.tsx` + test, `packages/ui/src/sidebar.tsx` + test |

These are the same two seams the `sp104_integration_followups` brief defines (Seam A taskVariant
passthrough, Seam B live-only footer sample); the agent's RED/GREEN logs are
`E:\tmp\run104-evidence\followups-*.txt`.

## What this instance did not touch

`cli.ts`, `finalized-group-listing-cache.ts` and its test (the other instance's in-flight writes), the
private worktree, `:3457`/`:3458`, and every run artifact other than this file. No further writes are
planned from this instance — it stands down so the two controllers cannot race on the same tree.

## Recommendation

Treat `01a0eef8-…` as the controller of record for Phase 3 closeout and Phase 3.5. If this instance is the
one the operator wants to keep, the older process must be stopped first, and the Phase 3 acceptance set
should be re-derived from `git log` rather than from either instance's memory.
