Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `02 To-Be Plan`
Status: `APPROVED`
Addendum: `07`
Type: `remediation`
Inputs:
- Run `2f5ab51b-23cc-4284-a9c5-0e067be7a125` audit (judge exhaustion → Kimi 0/12, LFM 1/12)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-scoring-audit.addendum-06.md`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-reliability.addendum-07.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-judge-reliability-validation.json`

## Problem

Addendum 06 enriched judge briefs fixed rubric quality but caused Kimi judge to emit multi-kB reasoning. After ~4 judge calls the Moonshot endpoint returned empty responses; `requireJudge` hard-zeroed all remaining cases. Run `2f5ab51b`: Kimi **0/12**, LFM **1/12**, compare **0** artifacts.

## Requirements (J12–J17)

| ID | Requirement |
| --- | --- |
| J12 | Judge requests use `max_tokens: 512` and compact system prompt (JSON only, no CoT) |
| J13 | Judge parser uses `readJudgeGradingText` (content channel first; ignore reasoning preambles) |
| J14 | Minimum 2s spacing between judge/compare API calls with exponential retry backoff |
| J15 | Judge artifacts persist `judgeError` when API returns empty or throws |
| J16 | On judge parse failure, fall back to heuristic with `[judge_unavailable]` (not hard 0) |
| J17 | When judge ∈ subjects, grade judge endpoint before other subjects |

## Implementation Slices

### SP13-A — Compact judge I/O (`J12`, `J13`)
- `JUDGE_GRADING_SYSTEM_PROMPT`, `COMPARE_GRADING_SYSTEM_PROMPT` in `bench-routing/index.ts`
- `readJudgeGradingText` in `benchmark-reasoning.ts`
- `max_tokens: 512` on judge/compare chat completions

### SP13-B — Throttle and errors (`J14`, `J15`)
- `throttleJudgeRequest`, `JUDGE_RETRY_BASE_MS` in `benchmark-runner.ts`
- `judgeError` on `BenchmarkJudgeRecord`

### SP13-C — Graceful degradation (`J16`)
- `gradeBenchmarkCase({ judgeUnavailable })` heuristic fallback

### SP13-D — Grading order (`J17`)
- `orderEndpointsForGrading` — judge subject first

## TDD

| Slice | Tests |
| --- | --- |
| SP13-A | `benchmark-runner-judge.test.ts` readJudgeGradingText; max_tokens assertion |
| SP13-B | judge artifact `judgeError` field in `benchmark-artifacts.test.ts` |
| SP13-C | `bench-routing/index.test.ts` judgeUnavailable fallback |
| SP13-D | `benchmark-runner-judge.test.ts` orderEndpointsForGrading |

Coverage: PASS
Approval: PASS
