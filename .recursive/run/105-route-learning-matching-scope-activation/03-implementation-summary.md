Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `03 Implementation Summary`
Status: `LOCKED`
LockedAt: `2026-10-03T05:57:13.629Z`
LockHash: `133d72db6bcab23cc4ea9d64539a786148fab29a4471e33288709586bfa20fa6`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `02-to-be-plan.md` (LOCKED `52d2457c`) + `00-requirements.md` (LOCKED `f3b5c3fc`) + `00-requirements.addendum-01.md` (LOCKED `bea50dd7`) + `01-as-is.md` (LOCKED `9f16eb01`)
Outputs:
- `03-implementation-summary.md`

## TODO

- [x] Implement all five work packages A-E under strict TDD (RED-first evidence captured)
- [x] Verify every package's suite green independently (controller re-run)
- [x] Verify the named regression suites stay green unmodified
- [x] Record the TDD compliance log (RED -> GREEN per package)
- [x] Complete the Coverage Gate
- [x] Complete the Approval Gate

## TDD Mode: strict

Every package wrote its failing tests first and captured RED output, then implemented, then captured GREEN.
The Iron Law was observed: no production code landed before its failing test. Evidence lives under
`evidence/phase3/red/` and `evidence/phase3/green/`.

## Package results (controller-verified)

| Package | Requirements | Tests green | Regression (unmodified, green) |
| --- | --- | --- | --- |
| A - aggregation + replay record | R3, R6, R9-floor | 37 (5 suites) | run107-group-paging 4/4, run104-r9-effort-exclusion 5/5, run104-r8-finalization-boundary 3/3, run98-a34 3/3, run98-a30 7/7, run99-learning-visuals 8/8, run97-learning-summary 2/2 |
| B - ladder store + contract | R2, R7, R14, R1-storage | 19 (7 suites) | run98-r07 6/6, run107-rollout-top-of-ladder green, run99-r28 kill-switch green |
| C - advisory + router walk | R1-read, R4, R5 | 23 (4 files) | run98-r05 13 tests green, run99-r33 green |
| D - dispatch + activation + rollback | R8, R9-activation, R10, R11 | 39+ (core 32 + loader 7 + dispatch-side) | run107 + run98 activation suites |
| E - Packs page ladder index | R12, R14-UI, R10-UI | UI suites + readback (public + private) | learning.test.tsx + learning-api.test.ts 37/37 |

Controller final verification: **88 public run105 tests + 68 private run105 tests = 156, all green**; UI
regressions 37/37; core regressions (run98-r05 + run99-r33) 13/13.

## Deviations from the plan (recorded, approved)

1. **A: lazy `created_at_ms` column** (not ALTER-at-open). The eager ALTER broke `run107-group-paging`'s
   positional 4-value INSERTs; the PRAGMA-guarded ALTER now fires at the two write sites only. D5 (column, not
   body) holds.
2. **B: fixture schema hash re-pin** (approved). The private contract copy is hash-pinned in two manifests; both
   were re-pinned. A second, pre-existing `run87` failure (missing pinned public file) is NOT ours.
3. **B: four new capabilities**, not three (`read`/`write`/`set-rollback`/`state` route-ladder).
4. **C: two test bugs fixed by the controller** (a hardcoded `scoreGapBefore 0.02` float artifact; an over-broad
   `/no admitted rung/` reason). Production code was correct.
5. **C: role keys are conditional** on the advisory outcome (present only when a role is in play) to preserve the
   R5 byte-for-byte back-compat guarantee.
6. **E: raw role/task ids** rendered (addendum A3), no display-name plumbing.

## Effect-first compliance (R13)

- A: Schema, Data.TaggedEnum, Data.TaggedError, Chunk/HashMap, Option, pure Effect `foldLadder`.
- C: Schema (`RouteAdvisoryRung`), Data.TaggedEnum (`RungWalkOutcome`), Data.TaggedError (decode), Option.
- D: Schema + Schema.check (composite key, completeness), Data.taggedEnum (`RouteLadderState`), the four
  Data.TaggedError, Effect + Schedule + Duration + Clock (idle gate), Ref (focus holder); Queue NOT used (the
  existing replay-intent plane is reused - reason recorded); Layer/Context.Tag NOT used (persistence is the
  extension store, not an Effect service - reason recorded).
- B and E: plain `.mjs`/TypeScript with the reason recorded (extension code has zero Effect imports; runtime-ui
  has zero Effect imports and no Effect dependency).
- `packages/core/package.json` gained the `effect` workspace dependency (D11).

## Commits

- public: `6582fa44` (B), `04a1244f` (C), `ce3d03f1` (D+E), `ad110488` (probe cleanup) - on
  `recursive/105-route-learning-matching-scope-activation`.
- private: `f81d09d1` (B), `3d284383` (A), `4b4e719f` (D+E).

## Coverage Gate

- [x] Every in-scope R# has an implemented change and a passing test (R1-R14 all covered across A-E).
- [x] The TDD Compliance Log above records RED-GREEN per package with evidence paths.
- [x] The named regression suites stay green unmodified.
- [x] Deviations are recorded with reasons.
- [x] The Effect-first obligation is recorded with per-package primitive usage (or a recorded reason).

## Approval Gate

- The implementation is traceable to the locked plan and requirements; every R# is implemented and green.
- The implementation is ready for Phase 3.5 review (which must also audit against the requirements doc AND the
  design doc, per the operator).
