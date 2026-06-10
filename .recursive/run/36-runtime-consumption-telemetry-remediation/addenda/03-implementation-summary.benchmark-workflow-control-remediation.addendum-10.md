Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `03 Implementation Summary`
Addendum: `10`
Status: `DRAFT`
Type: `workflow-control-remediation`
TDD Mode: `strict` (judge I/O, compare parsing, judge selection, rationale gate); `pragmatic` (operator script + validation path fix)
Inputs:
- Addendum 09 workflow safeguards (`J31–J40`, `validate-benchmark-run.py`, `BENCHMARK-WORKFLOW.md`)
- Operator runs after addendum 09 implementation:
  - `fb7fa0a2` — Kimi judge, INVALID (parse 67%, fallback 33%, empty raw 72%)
  - `b69c8ba4` — LFM judge (iter 3), VALID but **UNHEALTHY** control (LFM 42% > Kimi 33%)
- Operator constraint: model-agnostic endpoint resolution; typical control inventory Kimi k2.6 vs LFM 1.2B
Outputs:
- This file
- `evidence/logs/benchmark-addendum08-result.json` (final run `c0b66038`)
- `evidence/logs/benchmark-workflow-safeguards-validation.json` (VALID + HEALTHY receipt)

## Problem

Addendum 09 delivered workflow gates and start guards, but operator validation still showed two distinct failure modes:

| Failure mode | Example run | Symptom |
| --- | --- | --- |
| Judge I/O / compare parse | `fb7fa0a2`, early iter 3 | `empty_judge_response`, compare heuristic fallback, high `empty_raw` |
| Inverted control check | `b69c8ba4` | `workflowVerdict: VALID` but **UNHEALTHY** — LFM 42% > Kimi 33% |

**Root cause (control inversion):** with only LFM + Kimi as subjects, a judge must overlap one subject. **LFM-as-judge** graded Kimi with a weak 1.2B model while **self-grading LFM leniently** (e.g. broken h02 async fix scored 1.0). That inverted the canonical control signal (Kimi should rank higher on a healthy run per `BENCHMARK-WORKFLOW.md`).

**Secondary causes:** compare responses use `relativeRanking` JSON but grading reader only extracted `score` JSON; `max_tokens` caps truncated judge/subject output; generic judge rationales (`"Judge provided score."`) passed parse gate without audit value; validator double-appended `runId` to `artifactRoot`.

## Fixed Decisions

1. **No `max_tokens` on benchmark paths** — subject execution, judge grading, and compare requests omit `max_tokens` entirely; provider defaults apply.
2. **Prefer capable remote judge on overlap** — when every configured endpoint is a subject, select Kimi/remote over LFM so LFM cases grade first without overlap and receive strict judging.
3. **Separate parse channels for grade vs compare** — `readJudgeGradingText` for score JSON; `readCompareGradingText` for `relativeRanking` JSON.
4. **Substantive rationale required** — parsed judge scores with generic or short rationales trigger JSON follow-up retry, not acceptance.
5. **Strict self-grade addendum** — when judge grades its own deliverable under overlap, system prompt adds literal checklist enforcement.

## Changes Applied

### SP16-A — Judge / compare I/O hardening

| Change | File(s) |
| --- | --- |
| `extractJudgeGradingJsonText` — pull score JSON from reasoning preambles | `packages/bench-judge/src/index.ts` |
| `extractCompareGradingJsonText` — pull compare JSON from content/reasoning | `packages/bench-judge/src/index.ts` |
| `readJudgeGradingText` — content → reasoning → merged fallback | `apps/runtime-host-bridge/src/benchmark-reasoning.ts` |
| `readCompareGradingText` — compare-specific reader used in compare phase | `apps/runtime-host-bridge/src/benchmark-reasoning.ts` |
| `gradeCompareAcrossModels` uses `readCompareGradingText` (not judge reader) | `apps/runtime-host-bridge/src/benchmark-runner.ts` |
| Judge retry: unstructured follow-up, reasoning JSON fallback, up to 4 attempts on overlap | `apps/runtime-host-bridge/src/benchmark-runner.ts` |
| Inter-case 1.5s cooldown when `judgeSubjectOverlap` (skipped under `VITEST`) | `apps/runtime-host-bridge/src/benchmark-runner.ts` |

### SP16-B — Grading order and judge selection

| Change | File(s) |
| --- | --- |
| `orderEndpointsForGrading(..., { judgeSubjectOverlap: true })` grades **non-judge subjects first** | `apps/runtime-host-bridge/src/benchmark-runner.ts` |
| `selectPreferredJudgeEndpoint` prefers remote/Kimi over LFM when overlap unavoidable | `apps/runtime-host-bridge/src/benchmark-start-guards.ts` |
| `run-benchmark-quick.py` sets `judge_id = remote_id` (Kimi) for dual-subject quick runs | `evidence/scripts/run-benchmark-quick.py` |
| Start API surfaces `judgeSubjectOverlap` + warnings on `POST /benchmark/runs` | existing addendum 09 path |

### SP16-C — Remove token caps

| Change | File(s) |
| --- | --- |
| Removed `JUDGE_MAX_TOKENS`; judge/compare bodies omit `max_tokens` | `apps/runtime-host-bridge/src/benchmark-runner.ts` |
| Subject `executeBenchmarkTurn` omits `caseItem.max_tokens` | `apps/runtime-host-bridge/src/benchmark-runner.ts` |
| `RoutingBenchmarkCase.max_tokens` made optional (suite values retained but not sent) | `packages/bench-routing/src/index.ts` |

### SP16-D — Rationale quality and self-grade strictness

| Change | File(s) |
| --- | --- |
| `isSubstantiveJudgeRationale` — reject generic / &lt;40 char rationales; trigger follow-up | `apps/runtime-host-bridge/src/benchmark-runner.ts` |
| `JUDGE_SELF_GRADE_STRICT_ADDENDUM` on system prompt when judge grades own deliverable | `packages/bench-routing/src/index.ts` |
| `buildJudgeRequestMessages(..., { strictSelfGrade })` | `packages/bench-routing/src/index.ts` |
| `gradeWithJudge` passes `gradedEndpointId` for overlap self-grade detection | `apps/runtime-host-bridge/src/benchmark-runner.ts` |

### SP16-E — Validation and evidence

| Change | File(s) |
| --- | --- |
| `validate-benchmark-run.py` — fix `artifactRoot` path (do not double-append `runId`) | `evidence/scripts/validate-benchmark-run.py` |
| Updated `benchmark-workflow-safeguards-validation.json` with final operator receipt | `evidence/logs/benchmark-workflow-safeguards-validation.json` |

## Test Evidence

| Suite | Result |
| --- | --- |
| `packages/bench-judge` (incl. compare JSON extraction) | pass |
| `apps/runtime-host-bridge` `benchmark-start-guards.test.ts` | pass (remote judge preference) |
| `apps/runtime-host-bridge` `benchmark-runner-judge.test.ts` | pass (no `max_tokens` on judge bodies) |
| `apps/runtime-host-bridge` `benchmark-reasoning.test.ts` | pass (`readCompareGradingText`) |
| `runtime:package-sea` rebuild | SHA256 `3e64226c31840a22eae72e190e5cb0fe16009e515dc96d1856d93fd29fa011a9` |

## Operator Run Progression

| Run | Judge | workflowVerdict | controlCheck | LFM | Kimi | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `fb7fa0a2` | Kimi | INVALID | — | 8% | 17% | High empty raw / fallback before I/O fixes |
| `b69c8ba4` | LFM | VALID | **UNHEALTHY** | **42%** | 33% | All accuracy gates pass; control inverted |
| `c0b66038` | Kimi | **VALID** | **HEALTHY** | 17% | **92%** | Target state |

### Final run `c0b66038` gates

| Gate | Actual | Status |
| --- | --- | --- |
| `judge_parse_gte75_pct` | 24/24 (100%) | PASS |
| `empty_raw_lt20_pct` | 0/24 (0%) | PASS |
| `heuristic_fallback_lte25_pct` | 0/24 (0%) | PASS |
| `non_trivial_rationale_gte80_pct` | 24/24 (100%) | PASS |
| `grading_brief_100_pct` | 24/24 (100%) | PASS |
| `compare_12_of_12` | 12/12 | PASS |
| `progress_60_of_60` | 60/60 | PASS |

## Requirement Completion Status

| ID | Requirement | Disposition | Changed files / evidence |
| --- | --- | --- | --- |
| J41 | Compare JSON must parse from content/reasoning channels | verified | `bench-judge`, `benchmark-reasoning`, `benchmark-runner` |
| J42 | No `max_tokens` on benchmark subject/judge/compare requests | verified | `benchmark-runner.ts`, `bench-routing/index.ts` |
| J43 | Overlap judge selection prefers capable remote (Kimi) | verified | `benchmark-start-guards.ts`, `run-benchmark-quick.py` |
| J44 | Non-judge subjects graded before judge-as-subject | verified | `orderEndpointsForGrading`, iter 4 grading order in progress log |
| J45 | Substantive judge rationale required (no silent generic parse) | verified | `isSubstantiveJudgeRationale`, run `c0b66038` 24/24 |
| J46 | Strict self-grade prompt under overlap | implemented | `JUDGE_SELF_GRADE_STRICT_ADDENDUM` |
| J47 | Validator artifact scan path correct | verified | `validate-benchmark-run.py`, full gate table on `c0b66038` |
| J48 | Control check HEALTHY on operator quick dual-subject run | verified | `c0b66038` Kimi 92% > LFM 17% |

## Operator Notes

- Rebuild runtime after bridge changes: `pnpm run runtime:package-sea` from worktree root.
- Restart on port **8091** with `scope-id runtime-host-bridge`; re-activate endpoints after restart.
- Validate: `python evidence/scripts/validate-benchmark-run.py <run-id>`
- `judge_subject_overlap=true` warning is expected with only two subjects; mitigated by grading LFM first and using Kimi as judge.

## Audit

Coverage: PASS (unit tests + operator run `c0b66038`)
Approval: PENDING user sign-off
