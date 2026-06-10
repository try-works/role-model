Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `03 Implementation Summary`
Addendum: `06`
Status: `DRAFT`
TDD Mode: `strict` (SP12-B, SP12-C, SP12-E); `pragmatic` (SP12-A, SP12-D)
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-scoring-audit.addendum-06.md`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/03-implementation-summary.benchmark-judge-scoring-audit.addendum-06.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-judge-scoring-remediation-validation.json`

## Changes Applied

### SP12-E — Judge grading brief (`J7`–`J11`)

- `bench-routing/src/judge-brief.ts`: `formatQuestionTranscript`, `buildJudgeDeliverablesChecklist`, `buildJudgeGradingBrief`, `resolveExemplarAnswer`
- `bench-judge/src/index.ts`: structured briefing sections in `buildJudgeGradingPrompt` / `buildCompareGradingPrompt`
- `bench-routing/src/index.ts`: `buildJudgeRequestMessages`, `buildCompareRequestMessages` use full brief (no 240-char summary on judge path)
- `bench-routing/data/routing-capability-suite.json`: `example_deliverable` on 12 quick cases; `suite_version` 3.1 → 3.2
- `benchmark-runner.ts`: persists `gradingBrief` on judge + compare artifacts

### SP12-B — Judge validation (`J2`)

- `bench-routing/src/diff-validator.ts`: `isPlaceholderUnifiedDiff`, `deliverableHasInvalidPatch`, `capJudgeScoreForInvalidDeliverable`
- `benchmark-runner.ts`: caps parsed judge scores when placeholder diffs detected

### SP12-C — Reasoning extraction (`J3`)

- `bench-routing/src/answer-format.ts`: best-code-fence selection across all turns; rejects reasoning prose masquerading as code

### SP12-A — Display fidelity (`J1`)

- `runtime-ui/app/lib/format-score.ts`: one-decimal percent + optional `earned/total` fraction
- `control-benchmark.tsx`: uses `formatScoreFraction` for overall; decimal per-case scores

### SP12-D — Compare visibility (`J5`)

- `benchmark-summary.ts`: `readBenchmarkCaseComparisons`, `caseComparisons` on summary API
- `runtime-api.ts`: `BenchmarkCaseComparison` type
- `control-benchmark.tsx`: head-to-head ranking in per-case expando

## Requirement Completion Status

| ID | Disposition | Changed Files | Verification |
| --- | --- | --- | --- |
| J1 | verified | `format-score.ts`, `control-benchmark.tsx` | `format-score.test.ts` |
| J2 | verified | `diff-validator.ts`, `bench-judge/index.ts`, `benchmark-runner.ts` | `diff-validator.test.ts`, `index.test.ts` |
| J3 | verified | `answer-format.ts` | `reasoning-extraction.test.ts` |
| J4 | verified | `index.ts` (no overlap guard) | `index.test.ts` |
| J5 | verified | `benchmark-summary.ts`, `control-benchmark.tsx`, `runtime-api.ts` | `benchmark-summary.test.ts` |
| J6 | deferred | — | out of scope |
| J7 | verified | `judge-brief.ts`, `bench-judge/index.ts` | `judge-brief.test.ts`, `index.test.ts` |
| J8 | verified | `routing-capability-suite.json`, `judge-brief.ts` | `judge-brief.test.ts` suite 3.2 |
| J9 | verified | `judge-brief.ts` | checklist `@@ hunk` test |
| J10 | verified | `bench-judge/index.ts`, `index.ts` | `index.test.ts` compare prompt |
| J11 | verified | `benchmark-artifacts.ts`, `benchmark-runner.ts` | `benchmark-artifacts.test.ts` |

## Evidence

- `evidence/logs/benchmark-judge-scoring-remediation-validation.json`
- bench packages: 20/20 pass
- bridge + UI: 12/12 pass (includes `benchmark-runner-judge.test.ts`)

## Coverage Gate

- [x] J1–J5 and J7–J11 mapped to changes and verification
- [x] TDD RED/GREEN paths exercised for strict slices
- [x] Suite bumped to 3.2 with authored exemplars

Coverage: PASS

## Approval Gate

- [ ] Operator sign-off after quick benchmark re-run on live `:8091`

Approval: PENDING
