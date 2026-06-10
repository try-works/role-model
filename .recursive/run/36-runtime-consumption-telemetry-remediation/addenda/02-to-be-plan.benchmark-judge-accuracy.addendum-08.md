Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `02 To-Be Plan`
Status: `APPROVED`
Addendum: `08`
Type: `remediation`
TDD Mode (implementing phase): `strict` for SP14-A, SP14-B, SP14-C; `pragmatic` for SP14-D (compensating operator re-run + evidence log)
Inputs:
- Post–addendum-07 validation run `aa8cd041-e8d7-4ae5-b7f4-83352455b8ab` (LFM 35.4%, Kimi 16.7%; judge parse 22/78; compare 0/12)
- Broken run `2f5ab51b-23cc-4284-a9c5-0e067be7a125` (Kimi 0%, LFM 8.3%; mass empty judge responses)
- Good-baseline run `2be17a26-f4c4-47a8-9bcd-36eb87fb80ac` (Kimi 52.8%, LFM 52.5%; compare 12/12; judge parse 48/61)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-scoring-audit.addendum-06.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-reliability.addendum-07.md`
- Operator constraint: runtime is **model-agnostic** — no hardcoded judge/subject models; user configures endpoints via existing Benchmark UI dropdown
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-accuracy.addendum-08.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-judge-accuracy-validation.json`

## Problem

Addendum 07 stopped catastrophic hard-zero cascades (`[judge_unavailable]` heuristic fallback, throttle, compact judge I/O). Post-07 run `aa8cd041` still shows **unreliable judge grading**:

| Signal | Broken `2f5ab51b` | Post-07 `aa8cd041` | Good `2be17a26` |
| --- | --- | --- | --- |
| Judge parse success | 8/88 (~9%) | 22/78 (~28%) | 48/61 (~79%) |
| Empty `rawResponse` | 84/88 (~95%) | 67/78 (~86%) | 25/61 (~41%) |
| Compare artifacts | 0/12 | 0/12 | 12/12 |
| Heuristic fallback (judge enabled) | N/A (hard-zero) | 13/24 case grades | minimal |
| Control: Kimi vs LFM overall | 0% vs 8.3% | **16.7% vs 35.4%** (inverted) | 52.8% vs 52.5% |

**Primary failure:** judge process does not reliably produce parseable, auditable grades. Compare phase silently fails (`gradeCompareAcrossModels` returns `null` with no artifact). Progress UI stalls at 100% during compare/finalization.

**Not a product goal:** any specific model scoring higher than another. The runtime must grade whatever endpoints the user selects. **Control check only:** when the user benchmarks Kimi k2.6 against LFM 1.2B (their typical inventory), Kimi should rank higher on a healthy run; inversion (as in `aa8cd041`) indicates judge/run failure, not LFM superiority.

## Fixed Decisions

1. **Model-agnostic:** no code paths that assign, recommend, or default a model ID for judge, subject, or any role. User selects endpoints from configured inventory (Benchmark page dropdown).
2. **No dedicated-judge feature** — dropdown already satisfies endpoint choice; do not add parallel configuration surfaces.
3. **Success = grading accuracy and auditability**, not aggregate win rates for any model.
4. **Control check** is documented in validation evidence, not encoded as runtime behavior.

## Requirements (J18–J30)

| ID | Requirement |
| --- | --- |
| J18 | Compare artifacts persist `compareError` and `rawResponse` when compare judge call fails or parse fails |
| J19 | When compare parse fails, write fallback compare record ranking subjects by existing per-case scores (heuristic compare, tagged `[compare_unavailable]`) |
| J20 | Benchmark progress exposes `runPhase: "compare"` and increments steps during compare pass (no indefinite 100% stall) |
| J21 | Circuit breaker: after N consecutive judge/compare failures, open circuit, backoff, persist `judgeCircuitOpen` / `compareCircuitOpen` on artifacts |
| J22 | Adaptive throttle: interval derived from last successful judge latency (provider-agnostic), with floor `JUDGE_MIN_INTERVAL_MS` |
| J23 | Provider-agnostic response diagnostics: when gradable text is empty, persist `responseChannel` metadata (which message fields were present) on judge/compare artifacts |
| J24 | When `useJudge: true`, never silent hard-zero on judge failure — always heuristic fallback with explicit tag and error fields |
| J26 | Grading pipeline phases are distinct and resumable in progress: `execution` → `grading` → `compare` → `complete` |
| J27 | Subject execution system prompt (suite-level, all subjects): structured JSON deliverable only, no CoT preamble — independent of model identity |
| J28 | Summary API and UI expose per-case grading audit fields: `gradingMethod`, `judgeUnavailable`, `parseSuccess`, `judgeError`, `cappedByValidator` |
| J29 | Optional pre-flight probe: single judge JSON call against user-selected judge endpoint before full run; warn (not block) on failure |
| J30 | Validation evidence records post-remediation quick benchmark run id and accuracy metrics below |

**Removed:** J25 (dedicated judge endpoint / model suggestions) — superseded by existing UI.

## TDD Strategy

### Mode declaration

| Slice | TDD mode | Rationale |
| --- | --- | --- |
| SP14-A | **strict** | Compare artifact schema and fallback ranking are correctness-critical |
| SP14-B | **strict** | Circuit breaker, adaptive throttle, and response diagnostics affect all providers |
| SP14-C | **strict** | Phase boundaries and audit fields are API contracts |
| SP14-D | **pragmatic** | Pre-flight probe + operator re-run; unit tests for probe handler where feasible |

### New / extended test files

| File | Covers |
| --- | --- |
| `apps/runtime-host-bridge/test/benchmark-artifacts.test.ts` | `compareError`, `rawResponse`, `compareCircuitOpen`, fallback compare record (`J18`, `J19`, `J21`) |
| `apps/runtime-host-bridge/test/benchmark-runner-compare.test.ts` | `gradeCompareAcrossModels` parse-fail → fallback; compare phase progress (`J19`, `J20`) |
| `apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` | circuit breaker, adaptive throttle, `responseChannel` diagnostics (`J21`–`J23`) |
| `packages/bench-routing/test/index.test.ts` | heuristic compare ranking from per-case scores (`J19`) |
| `apps/runtime-host-bridge/test/benchmark-progress.test.ts` | `runPhase` transitions execution → grading → compare → complete (`J20`, `J26`) |
| `packages/bench-routing/test/subject-prompt.test.ts` | suite subject system prompt has JSON-only constraint, no model IDs (`J27`) |
| `apps/runtime-host-bridge/test/benchmark-summary.test.ts` | per-case audit fields in summary payload (`J28`) |
| `apps/runtime-host-bridge/test/benchmark-preflight.test.ts` | probe handler returns warn payload on mock failure (`J29`) |

Fixture sources: judge/compare artifacts from runs `aa8cd041`, `2be17a26` under `packages/bench-routing/test/fixtures/benchmark-runs/` (redacted).

### Per-slice RED → GREEN paths

**SP14-A (strict):** RED — `gradeCompareAcrossModels` returns `null` on parse fail; manifest `compareArtifactCount: 0` for `aa8cd041`. GREEN — fallback compare record written with `[compare_unavailable]` and score-derived ranking; `compareError` set when judge response empty.

**SP14-B (strict):** RED — third consecutive empty `rawResponse` still issues immediate next judge call; throttle fixed at 2s regardless of 128s latency. GREEN — circuit opens, backoff logged; throttle uses `max(JUDGE_MIN_INTERVAL_MS, lastLatency * 0.1)`; artifact includes `responseChannel`.

**SP14-C (strict):** RED — progress stuck at `grading` 48/48 during compare; summary omits `parseSuccess` / `judgeError`. GREEN — `runPhase: "compare"` with steps 49–60; summary includes audit fields per case.

**SP14-D (pragmatic):** RED — full run starts without probe. GREEN — `POST /benchmark/runs` accepts `preflightProbe: true`; failed probe returns warning in start response. Compensating evidence: operator re-run meeting accuracy gates in validation JSON.

### Requirement → test traceability

| Req | Slice | Verification evidence |
| --- | --- | --- |
| J18 | SP14-A | `benchmark-artifacts.test.ts` compareError + rawResponse |
| J19 | SP14-A | `benchmark-runner-compare.test.ts` + `index.test.ts` fallback ranking |
| J20 | SP14-A | `benchmark-progress.test.ts` compare phase steps |
| J21 | SP14-B | `benchmark-runner-judge.test.ts` circuit breaker |
| J22 | SP14-B | `benchmark-runner-judge.test.ts` adaptive throttle |
| J23 | SP14-B | `benchmark-artifacts.test.ts` responseChannel |
| J24 | SP14-B | `index.test.ts` no hard-zero when judge enabled (extends J16) |
| J26 | SP14-C | `benchmark-progress.test.ts` phase transitions |
| J27 | SP14-C | `subject-prompt.test.ts` |
| J28 | SP14-C | `benchmark-summary.test.ts` |
| J29 | SP14-D | `benchmark-preflight.test.ts` + validation JSON |
| J30 | SP14-D | `benchmark-judge-accuracy-validation.json` |

### Implement order (test-first)

**SP14-A → SP14-B → SP14-C → SP14-D → SP14-F evidence.** Each strict slice: failing test committed or recorded in validation JSON before production change.

## Recommended Implementation Slices

### SP14-A — Compare phase repair (`J18`–`J20`)

TDD: **strict**

Files:

- `apps/runtime-host-bridge/src/benchmark-runner.ts` — `gradeCompareAcrossModels` never silent-null; fallback path
- `apps/runtime-host-bridge/src/benchmark-artifacts.ts` — `BenchmarkCompareRecord` + `compareError`, `rawResponse`, `compareFallback`
- `packages/bench-routing/src/index.ts` — `buildHeuristicCompareRanking(perCaseScores)`
- `apps/runtime-host-bridge/src/benchmark-progress.ts` — compare phase step accounting

Verification:

- RED → GREEN: re-run fixture for `aa8cd041` compare path yields 12 compare records (judge or fallback)
- `compareArtifactCount: 12` in manifest for completed quick run

### SP14-B — Judge process hardening (`J21`–`J24`)

TDD: **strict**

Files:

- `apps/runtime-host-bridge/src/benchmark-runner.ts` — `JudgeCircuitState`, adaptive throttle, apply to judge + compare calls
- `apps/runtime-host-bridge/src/benchmark-reasoning.ts` — `describeResponseChannels(result)` for diagnostics
- `apps/runtime-host-bridge/src/benchmark-artifacts.ts` — `responseChannel`, `judgeCircuitOpen` fields

Verification:

- RED → GREEN: simulated 3 empty responses open circuit; next call delayed
- Empty response artifact includes `responseChannel` object (not blank diagnosis)

### SP14-C — Pipeline structure and audit transparency (`J26`–`J28`)

TDD: **strict**

Files:

- `apps/runtime-host-bridge/src/benchmark-progress.ts` — phase enum includes `compare`
- `apps/runtime-host-bridge/src/benchmark-summary.ts` — per-case audit fields
- `packages/bench-routing/src/index.ts` — `BENCHMARK_SUBJECT_SYSTEM_PROMPT` (model-agnostic)
- `apps/runtime-ui/app/routes/control-benchmark.tsx` — display audit badges (method, unavailable, parse fail)

Verification:

- RED → GREEN: progress API returns `runPhase: "compare"` during compare pass
- Summary includes `parseSuccess` and `judgeError` for each case result

### SP14-D — Subject prompt and pre-flight (`J27`, `J29`, `J30`)

TDD: **pragmatic** for probe; **strict** for subject prompt (SP14-C overlap)

Files:

- `apps/runtime-host-bridge/src/benchmark-runner.ts` — optional preflight probe before execution loop
- `apps/runtime-host-bridge/src/index.ts` — expose probe in `POST /benchmark/runs` body

Verification:

- Unit test: probe failure returns `{ warning: "judge_probe_failed", ... }` without aborting when `preflightProbe` false
- Operator re-run: validation JSON records run id + accuracy metrics

### SP14-F — Validation evidence

Record in `evidence/logs/benchmark-judge-accuracy-validation.json`:

- `vitest run` commands and pass counts per new test file
- RED snippets (or commit refs) before GREEN for strict slices
- Post-remediation quick benchmark `runId` with accuracy metrics table
- Control check note: Kimi vs LFM ranking on user-selected endpoints (observational only)

## Success Criteria (grading accuracy)

Measured on a completed quick run with `useJudge: true` and user-selected endpoints. **No requirement that any model outscores another.**

| Metric | Post-07 `aa8cd041` | Target |
| --- | --- | --- |
| Judge parse success (when judge enabled) | ~28% | **≥75%** |
| Empty `rawResponse` rate | ~86% | **<20%** |
| Compare artifacts | 0/12 | **12/12** (judge or documented fallback) |
| Heuristic fallback rate (case grades) | 13/24 (~54%) | **≤25%** |
| Mass hard-zero cascade | No | **No subject at 0%** unless all deliverables empty |
| Non-trivial judge rationale | Mixed | **≥80%** of judge-graded cases |
| `gradingBrief` on judge artifacts | Yes | **100%** |

## Control Check (run health — not a success target)

When the operator benchmarks **Kimi k2.6** and **LFM 1.2B** as subjects with any user-selected judge:

- **Healthy signal:** Kimi overall > LFM (consistent with `2be17a26`).
- **Unhealthy signal:** Kimi ≤ LFM (as in `aa8cd041`: 16.7% vs 35.4%) → investigate judge exhaustion, heuristic over-fallback, parse failures, subject prompt issues — **do not** treat as LFM capability proof.

Record control outcome in validation JSON; do not encode in runtime logic.

## Out of Scope

- Hardcoding or recommending model IDs for any role
- Dedicated judge endpoint feature (UI dropdown sufficient)
- Requiring a specific model to win or lose
- External judge service or non-user-configured endpoints
- Changing suite rubrics or case difficulty (accuracy of applying existing rubric only)

## Traceability

| Requirement | Primary files |
| --- | --- |
| J18–J20 | `benchmark-runner.ts`, `benchmark-artifacts.ts`, `benchmark-progress.ts` |
| J21–J24 | `benchmark-runner.ts`, `benchmark-reasoning.ts`, `benchmark-artifacts.ts` |
| J26–J28 | `benchmark-progress.ts`, `benchmark-summary.ts`, `control-benchmark.tsx` |
| J27, J29 | `bench-routing/index.ts`, `benchmark-runner.ts`, `index.ts` |

## Coverage Gate

- [x] Post-07 validation run and metrics recorded
- [x] Model-agnostic constraint documented; J25 explicitly removed
- [x] Success criteria target grading accuracy, not model win rates
- [x] Control check documented as diagnostic only
- [x] TDD mode declared per slice with RED → GREEN paths and test inventory
- [x] Requirement → test traceability table complete for J18–J30

Coverage: PASS

## Approval Gate

- [x] No hardcoded judge/subject models in requirements or slices
- [x] User-configured endpoint selection respected (existing dropdown)
- [x] Compare silent-failure root cause addressed
- [x] Operator inversion control check (Kimi ≤ LFM) explained as run-health signal

Approval: PENDING (operator sign-off)
