# Post-closeout addendum 17 — resume store dropped effortComparability in normalizeEntry (R9)

## Problem
The auto-replay handoff (addendum 16) recorded the resume entry with `effortComparability` (via
`classifyReplayArmEffort`), but the live resume store still showed no `effortComparability` on any entry.
Root cause: `normalizeEntry` (supervised-replay-evaluation-resume.ts) rebuilds each entry through an explicit
field whitelist and omitted `effortComparability`. The field existed in the `SupervisedReplayEvaluationResumeEntry`
type (R9) but was silently dropped on every `record`/reload, so the comparison could never receive it.

## Fix
- Added `boundedEffortComparability` (bounded non-empty list, validates the `comparability` union, nulls
  unspecified efforts).
- Added `effortComparability: boundedEffortComparability(entry.effortComparability)` to `normalizeEntry`'s
  returned entry, so the field now survives the store round-trip.

## Verification
- `tsc --noEmit` exit 0.
