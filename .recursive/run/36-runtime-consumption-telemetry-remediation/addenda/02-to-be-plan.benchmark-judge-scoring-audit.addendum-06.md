Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `02 To-Be Plan`
Status: `APPROVED`
Addendum: `06`
Type: `audit`
TDD Mode (implementing phase): `strict` for SP12-B, SP12-C, SP12-E; `pragmatic` for SP12-A, SP12-D (compensating manual QA + evidence log)
Inputs:
- Operator report: Kimi k2.6 and LFM 2.5 1.2B displayed identical 53% on Benchmark page (run completed 2026-06-09 ~4:50 PM local)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-reliability.addendum-02.md` (run 35)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-page-ux.addendum-05.md`
- Run `2be17a26-f4c4-47a8-9bcd-36eb87fb80ac` artifacts under `%LOCALAPPDATA%/Role Model Runtime/state/runtime-host-bridge/memory/benchmark-runs/`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-judge-scoring-audit.addendum-06.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-judge-scoring-audit-run-2be17a26.json`
Scope note: Root-cause audit for suspicious score parity between `moonshot/kimi-k2.6` and `lfm2.5-1.2b-instruct` on quick suite run `2be17a26`. Documents grading pipeline behavior and remediation requirements. Does not change suite rubrics in this artifact.

## Problem Statement

After run `2be17a26`, the Benchmark UI showed **53%** for both Kimi k2.6 (remote) and LFM 2.5 1.2B (local). Operator expectation: Kimi should materially outscore the 1.2B local model.

Audit finding: scores are **not identical at full precision** (52.5% vs 52.75%) but **round to the same integer** in the UI. More importantly, per-case outcomes diverge sharply; the aggregate tie is a **compensation artifact** combined with **judge and extraction failures that penalize the stronger model more than the weaker one**.

## Run Under Audit

| Field | Value |
| --- | --- |
| runId | `2be17a26-f4c4-47a8-9bcd-36eb87fb80ac` |
| mode | quick (12 hard cases) |
| judge | `moonshot/kimi-k2.6` (`moonshot.personal.kimi-code.global.kimi-k2.6`) |
| Kimi overall | **0.5275** (6.33 / 12) → UI **53%** |
| LFM overall | **0.5250** (6.30 / 12) → UI **53%** |
| artifactRoot | `%LOCALAPPDATA%/Role Model Runtime/state/runtime-host-bridge/memory/benchmark-runs/2be17a26-f4c4-47a8-9bcd-36eb87fb80ac` |

## Per-Case Score Matrix

| case_id | LFM | Kimi | Who won | Notes |
| --- | --- | --- | --- | --- |
| p17-tools-multi-hard | **1.00** | 0.00 | LFM | LFM faked `apply_patch` diff `"----/+++"`; Kimi only `read_file` after 110s reasoning |
| x01-max-signal | **0.30** | 0.00 | LFM | Both weak; LFM partial schema fill |
| h01-implement-two-sum | 1.00 | 1.00 | tie | Both correct |
| h02-fix-async-counter | **1.00** | 0.00 | LFM | Kimi extracted mutex-only snippet; judge accepted LFM `count++` as “atomic” |
| h04-tool-read-router | 0.00 | 0.00 | tie | Both failed answer extraction |
| h05-tool-grep-eligibility | 0.00 | **1.00** | Kimi | LFM hallucinated bullets with empty `tool_calls` |
| h06-tool-apply-patch | 0.00 | **1.00** | Kimi | LFM invalid diff placeholders |
| h07-multi-turn-sla-guard | **0.20** | 0.00 | LFM | Kimi deliverable was reasoning prose, not TypeScript |
| h08-multi-turn-tool-refine | 1.00 | 1.00 | tie | Both passed |
| h09-agent-metrics-chain | 0.00 | **1.00** | Kimi | LFM missing `get_metrics` |
| h10-agent-read-grep-patch | 1.00 | 1.00 | tie | Both passed tool chain |
| h15-max-signal-v3 | **0.80** | 0.33 | LFM | Kimi missing plan/summary fields |

**Case wins:** LFM 5 • Kimi 3 • tie 4. **Aggregate still nearly equal** because wins are on different cases with similar magnitudes.

## Fixed Decisions

1. **Judge may be any configured endpoint, including one also being benchmarked.** Operators with a small model inventory will routinely pick the strongest available endpoint as judge (as in run `2be17a26`, where Kimi judged Kimi + LFM). This is **supported product behavior**, not a configuration error.
2. **Do not warn, block, or require a separate judge-only endpoint.** Remediation focuses on grading brief quality, extraction fairness, validators, and display — not excluding the judge from the subject set.
3. **When judge ∈ subjects**, execution and grading phases must remain role-distinct: judge calls grade **other subjects'** stored deliverables (and self deliverable when included) using the same rubric; judge preference persistence from addendum 04 remains valid.

## Root Causes

### RC1 — UI integer rounding masks separation

`formatScore()` uses `Math.round(score * 100)`. **52.5%** and **52.75%** both render as **53%**, creating a false impression of identical judging.

### RC2 — Judge rewards structural checklist over semantic correctness (LFM uplift)

Example **p17** (`responses/.../lfm.../p17-tools-multi-hard.json`):

- LFM deliverable includes `read_file` + `apply_patch` with diff **`"----/+++"`** (invalid) and a templated answer string.
- Judge artifact `judge/.../lfm.../p17-tools-multi-hard.json` scored **1.0** with rationale citing “required tool calls” and answer length — **no validation that the diff is a real unified diff**.

Kimi deliverable for same case only includes `read_file`; judge scored **0.0** (correctly incomplete). Compare artifact `judge/compare/p17-tools-multi-hard.json` ranks **LFM above Kimi** for “completing both tool calls” — Kimi-as-judge agrees with per-case scores.

**Conclusion:** Small models that emit compact, schema-shaped JSON can score higher than a reasoning model that fails to finish the tool chain, even when the JSON content is nonsense.

### RC3 — Reasoning-model deliverable extraction penalizes Kimi (Kimi downlift)

Example **h07** (`responses/moonshot.../h07-multi-turn-sla-guard.json`):

- `rawResponse` contains full TypeScript in reasoning stream, but `formattedDeliverable` / `extractionMethod: code_fence` captured **meta-reasoning prose** as the `code` field.
- Judge scored **0.0**: “only reasoning and planning prose; no TypeScript implementation.”

Example **h02** (`responses/moonshot.../h02-fix-async-counter.json`):

- Reasoning stream contains complete mutex + counter program in fenced blocks.
- Extracted deliverable is **only** `createMutex()` helper → judge scored **0.0** for incomplete program.
- LFM deliverable (complete-looking but buggy snippet) scored **1.0**.

Compare artifact `judge/compare/h02-fix-async-counter.json` **ranks Kimi above LFM** and calls LFM “flawed” — but compare scores are **not used** in `summarizeEndpointGrade`; only per-case judge grades count.

**Conclusion:** Extraction pipeline (`extractFormattedAnswer`, `deliverableCompleteness`, multi-turn follow-ups) is asymmetric: reasoning models lose credit when the final serialized deliverable is incomplete, even when compare ranking shows better underlying work.

### RC4 — Judge/subject overlap is expected; unfair scoring is not inherent to overlap

Run `2be17a26` used Kimi as both judge and benchmark subject. That configuration is **normal** when only two models are available. The parity problem is **not** caused by overlap itself:

- Per-case judge calls receive only the **subject deliverable** and thin rubric text — not a role-separated briefing — so scoring variance comes from **RC2/RC3/RC6**, not from Kimi grading itself.
- Kimi-as-judge applied the same checklist to LFM (p17 **1.0**) and to Kimi (p17 **0.0**) in that run; inconsistency is **lenient structural checks**, not self-preference.
- Compare pass on h02 ranked Kimi above LFM while per-case scores favored LFM — again a **rubric/briefing** issue, not judge identity.

**Conclusion:** Do not block judge ∈ subjects. Fix grading brief, extraction, and validators so any chosen judge endpoint scores all subjects—including itself—against the same exemplar and checklist.

### RC5 — Compare pass is diagnostic-only

`gradeCompareAcrossModels` writes `judge/compare/*.json` with `relativeRanking` but **does not adjust** `perCaseScore` fed into `summarizeEndpointGrade`. Operator-visible score ignores head-to-head relative judgment.

### RC6 — Judge lacks sufficient grading context (primary scoring failure mode)

Current `buildJudgeGradingPrompt` (`packages/bench-judge/src/index.ts`) sends:

| Section today | Content | Gap |
| --- | --- | --- |
| `Prompt summary` | Last user message truncated to **240 chars** via `summarizePrompt()` | Multi-turn questions, system context, and scaffold turns are **omitted** |
| `Expected ideal response` | Suite `expected_response` string | Often **vague** (e.g. "read_file and apply_patch tool calls plus validation plan", "Concise correct answer following instructions.") — not a concrete exemplar |
| `Grading criteria` | Single `grading_criteria` line | No structured **key deliverables** checklist the judge can tick off |
| `Required answer format` | Derived instruction only | Schema fields listed in prose, not as pass/fail deliverable rows |
| Subject deliverable | `formattedDeliverable` only | Judge never sees what a **good answer looks like** vs placeholders |

Run `2be17a26` p17 illustrates the failure: judge scored LFM **1.0** because criteria say "Must call read_file and apply_patch" without an exemplar showing that diff `"----/+++"` is invalid. Kimi-as-judge checked tool **names present**, not tool **argument validity** or answer substance.

`buildCompareGradingPrompt` is worse: it receives only `caseId` and per-model deliverables — **no question, no expected answer, no deliverable checklist** — so compare ranking can contradict per-case scores (h02) without shared rubric context.

**Conclusion:** Judge infrastructure is structurally capable (parse success, artifacts persisted) but the **grading brief is under-specified**. Remediation must enrich the judge packet before post-score validators or extraction fixes can separate Kimi from LFM reliably.

## Requirement Delta (remediation)

| ID | Requirement | Disposition |
| --- | --- | --- |
| J1 | UI shows at least one decimal place (or exact fraction) for benchmark overall and per-case scores | new |
| J2 | Judge prompt/heuristics reject placeholder diffs (`----/+++`, `[file header]`, etc.) and empty tool argument stubs | new |
| J3 | Reasoning-model extraction must prefer last valid `typescript`/`json` fence from `turnRawContents` / reasoning stream before scoring | new |
| J4 | Judge endpoint may overlap benchmark subjects; product must **not** warn or block this configuration | new |
| J5 | Surface compare `relativeRanking` on Benchmark page per case (diagnostic panel) | new |
| J6 | Optional: blend or override per-case score with compare ranking when delta ≥ threshold | new (deferred) |
| J7 | Judge receives **full original question** (complete `messages[]` transcript, not 240-char summary) | new |
| J8 | Judge receives **example expected answer** — concrete exemplar deliverable per case | new |
| J9 | Judge receives **key deliverables checklist** — structured must-have / must-not-have items derived from case rubric | new |
| J10 | Compare grading uses the same case briefing as per-case judge (question + exemplar + checklist) | new |
| J11 | Judge artifacts persist the briefing sections sent (audit reproducibility) | new |

## Judge Grading Brief (target shape)

Every per-case judge call must receive a **structured briefing** before the subject deliverable. Proposed section order in `buildJudgeGradingPrompt`:

```
## Original question
<full messages[] transcript: role + content per turn, no truncation>

## Example expected answer
<concrete exemplar deliverable — see sources below>

## Key deliverables (grade against this checklist)
- [MUST] …
- [MUST] …
- [MUST NOT] … (placeholders, prose-only tool calls, invalid diffs, etc.)

## Answer format requirements
<buildAnswerFormatInstruction + schema required fields as bullet list>

## Grading criteria (authoritative)
<grading_criteria verbatim>

## Subject deliverable to grade
<formattedDeliverable only — unchanged>
```

### Exemplar answer sources (priority order)

1. **Suite field `example_deliverable`** (new, preferred) — literal JSON/code string showing a passing answer for that case
2. **Suite field `judge_guidance.exemplar`** (new optional object) — `{ "summary": "...", "deliverable": "..." }`
3. **Derived fallback** (interim) — synthesize from `expected_response` + `accept_patterns` + `answer_format.schema` required keys + `expected_tool_names`; mark as `exemplarQuality: "derived"` in artifacts so operators know it is weaker

### Key deliverables checklist sources

`buildJudgeDeliverablesChecklist(caseItem)` composes bullets from:

| Source field | Checklist output |
| --- | --- |
| `grading_criteria` | Split into MUST items (regex / manual map for quick cases) |
| `expected_tool_names` | `MUST emit API tool calls: read_file, apply_patch, …` |
| `answer_format.schema.required` | `MUST include JSON keys: answer, code, bullets, plan, …` |
| `accept_patterns` | `SHOULD match patterns: …` (soft signal, not auto-pass) |
| Global anti-patterns (`J2`) | `MUST NOT: diff placeholders (----/+++), [file header], empty tool_calls with summary only, reasoning prose as code` |
| Category rules | code-fix: `MUST fix race/logic`; tool: `MUST use API tool_calls not prose TOOL_CALL` |

Quick-suite cases used in run `2be17a26` (`p17`, `h01`–`h15`, `x01`) receive **authored `example_deliverable` and expanded checklists** in `routing-capability-suite.json` (suite version bump) before re-benchmark acceptance.

## TDD Strategy

The addendum-06 **implementation phase** (Phase 3) must follow recursive-mode TDD discipline (`recursive-tdd` skill). **Iron Law:** no production changes in judge brief, validators, extraction, or artifact persistence until a failing test exists for that behavior.

| Slice | TDD mode | Primary test target |
| --- | --- | --- |
| SP12-A | pragmatic | `formatScore` unit test or manual QA on run `2be17a26` scores |
| SP12-B | **strict** | `bench-judge` / `bench-routing` validator tests |
| SP12-C | **strict** | extraction fixture tests (h02, h07 artifacts) |
| SP12-D | pragmatic | bridge summary test extension + manual expando QA |
| SP12-E | **strict** | `buildJudgeGradingBrief` + prompt section tests |
| SP12-F | evidence | aggregated vitest log in validation JSON |

### New / extended test files

| File | Covers |
| --- | --- |
| `packages/bench-judge/src/index.test.ts` | `buildJudgeGradingPrompt`, `buildCompareGradingPrompt`, post-judge score cap (`J2`, `J7`–`J10`) |
| `packages/bench-routing/test/judge-brief.test.ts` | `buildJudgeDeliverablesChecklist`, `formatQuestionTranscript`, suite `example_deliverable` wiring (`J8`, `J9`) |
| `packages/bench-routing/test/diff-validator.test.ts` | `isPlaceholderUnifiedDiff`, `----/+++` rejection (`J2`) |
| `packages/bench-routing/test/reasoning-extraction.test.ts` | h02/h07 fixture deliverable selection (`J3`) |
| `apps/runtime-host-bridge/test/benchmark-artifacts.test.ts` | `gradingBrief` persisted on judge + compare records (`J11`) |
| `apps/runtime-ui/app/lib/format-score.test.ts` (optional) | decimal / fraction display (`J1`) |

Fixture sources: copy redacted deliverables from run `2be17a26` artifacts (`p17-tools-multi-hard`, `h02-fix-async-counter`, `h07-multi-turn-sla-guard`) into `packages/bench-routing/test/fixtures/benchmark-run-2be17a26/`.

### Per-slice RED → GREEN paths

**SP12-A (pragmatic):** RED — assert `formatScore(0.525)` and `formatScore(0.5275)` render distinct strings (today both `"53%"`). GREEN — one-decimal or `6.3/12` display. Evidence: test pass or screenshot in validation JSON.

**SP12-B (strict):** RED — `isPlaceholderUnifiedDiff("----/+++")` returns false (or absent); re-grade helper leaves p17 LFM fixture at **1.0**. GREEN — validator detects placeholder; `capScoreForInvalidDeliverable` forces **< 0.5** for p17 LFM JSON fixture.

**SP12-C (strict):** RED — extraction from h07 reasoning fixture yields prose `code` field; h02 yields mutex-only snippet. GREEN — last valid `typescript` fence selected; h02 full program extracted. Tests must fail before `answer-format.ts` / `benchmark-reasoning.ts` changes.

**SP12-D (pragmatic):** RED — summary API omits `compareRanking` per case (manual or bridge test assertion). GREEN — field present; Benchmark expando shows ranking. Compensating evidence: manual QA on `:8091` per-case panel.

**SP12-E (strict):** RED — prompt for p17 contains 240-char `Prompt summary` only; no `## Original question`, no exemplar, no checklist. GREEN — all briefing sections present; `summarizePrompt` not used on judge path; compare prompt shares same brief. Suite bump 3.1 → 3.2 with `example_deliverable` on 12 quick cases.

**SP12-F:** Record commands and pass counts in `evidence/logs/benchmark-judge-scoring-remediation-validation.json` (mirror addendum 04/05 pattern).

### Requirement → test traceability

| Req | Slice | Verification evidence |
| --- | --- | --- |
| J1 | SP12-A | `format-score.test.ts` or manual QA |
| J2 | SP12-B | `diff-validator.test.ts`, `index.test.ts` score-cap |
| J3 | SP12-C | `reasoning-extraction.test.ts` (h02, h07) |
| J4 | SP12-E | test: no guard throws when `judgeEndpointId ∈ endpointIds` |
| J5 | SP12-D | bridge test + manual expando |
| J6 | — | deferred; no TDD until scoped |
| J7–J11 | SP12-E | `judge-brief.test.ts`, `index.test.ts`, `benchmark-artifacts.test.ts` |

## Recommended Implementation Slices

Implement slices in **test-first order** within strict mode: **SP12-E briefing helpers → SP12-B validators → SP12-C extraction → SP12-A display → SP12-D compare UI → SP12-F evidence**. SP12-B validators may land in the same PR as SP12-E but each behavior still requires its own RED test before GREEN implementation.

### SP12-A — Display fidelity (`J1`)

TDD: pragmatic (optional unit test; mandatory validation JSON entry).

Files:

- `apps/runtime-ui/app/routes/control-benchmark.tsx` — one-decimal overall and per-case scores, or `earned/total` fraction
- `apps/runtime-ui/app/lib/format-score.ts` (extract if inline) + optional `format-score.test.ts`

Verification:

- RED → GREEN: `52.5%` ≠ `52.8%` (or `6.30/12` vs `6.33/12`) for run `2be17a26` subjects
- Manual: Benchmark page no longer shows identical integer for Kimi vs LFM

### SP12-B — Judge validation (`J2`)

TDD: **strict** — write failing validator tests before prompt or post-grade changes.

Files:

- `packages/bench-judge/src/index.ts` — MUST NOT checklist in prompt; `capScoreForInvalidDeliverable` after parse
- `packages/bench-routing/test/diff-validator.test.ts` — placeholder diff patterns
- `packages/bench-judge/src/index.test.ts` — p17 LFM fixture capped below 0.5

Verification:

- RED → GREEN: `----/+++` and `[file header]` fail structure check; p17 LFM re-grade **< 0.5**

### SP12-C — Reasoning extraction (`J3`)

TDD: **strict** — fixture tests from run `2be17a26` before extraction code changes.

Files:

- `packages/bench-routing/src/answer-format.ts` (or equivalent)
- `packages/bench-routing/src/benchmark-reasoning.ts` (or equivalent)
- `packages/bench-routing/test/reasoning-extraction.test.ts`
- `packages/bench-routing/test/fixtures/benchmark-run-2be17a26/h02-fix-async-counter.json`
- `packages/bench-routing/test/fixtures/benchmark-run-2be17a26/h07-multi-turn-sla-guard.json`

Verification:

- RED → GREEN: h07 selects TypeScript fence, not reasoning preamble; h02 selects full counter program

### SP12-D — Compare visibility (`J5`)

TDD: pragmatic — extend existing bridge tests where possible; manual QA required.

Files:

- `apps/runtime-host-bridge/src/benchmark-summary.ts` — include compare `relativeRanking` per case
- `apps/runtime-ui/app/routes/control-benchmark.tsx` — per-case expando diagnostic panel

Verification:

- Bridge test: summary payload includes compare ranking for completed run
- Manual: h02 shows Kimi ranked above LFM in UI while per-case scores visible

### SP12-E — Judge grading brief (`J7`–`J11`) **priority**

TDD: **strict** — briefing helpers and prompt assembly tests first; suite data second; runner persistence third.

Files:

- `packages/bench-judge/src/index.ts`
  - `buildJudgeGradingBrief(caseItem)` → `{ questionTranscript, exemplarAnswer, deliverablesChecklist, antiPatterns }`
  - Restructure `buildJudgeGradingPrompt` to emit sections above; deprecate 240-char `summarizePrompt` for judge path (keep for telemetry only)
  - Extend `buildCompareGradingPrompt` with same brief + model deliverables
- `packages/bench-routing/src/index.ts`
  - `buildJudgeRequestMessages` passes full case + briefing into judge input
  - Export `buildJudgeDeliverablesChecklist`, `formatQuestionTranscript`
- `packages/bench-routing/data/routing-capability-suite.json`
  - Add `example_deliverable` (and optional `judge_guidance`) for 12 quick_benchmark cases
  - Bump `suite_version` (e.g. 3.1 → 3.2)
- `apps/runtime-host-bridge/src/benchmark-runner.ts`
  - Persist briefing sections in `writeBenchmarkJudgeRecord` / compare artifacts (`J11`)
- `packages/bench-judge/src/index.test.ts`
  - Assert prompt contains all briefing sections for fixture cases p17, h02, h06
- `packages/bench-routing/test/judge-brief.test.ts`
  - Checklist includes `@@ hunk` for p17; full messages transcript not truncated

Verification:

- RED → GREEN: prompt for p17 includes full user message, exemplar with valid `---/+++` diff, checklist item "apply_patch diff must contain @@ hunk"
- RED → GREEN: compare prompt includes same `## Original question` and checklist as per-case judge
- RED → GREEN: `writeBenchmarkJudgeRecord` artifact includes `gradingBrief` object
- Regression: re-grade p17 LFM artifact `----/+++` deliverable → score **< 0.5** with enriched brief + SP12-B validator (combined GREEN)
- Manual: judge artifact JSON includes `gradingBrief` field for audit

### SP12-F — Validation evidence

Verification:

- `evidence/logs/benchmark-judge-scoring-remediation-validation.json` records:
  - `vitest run` commands and pass counts for each new test file
  - RED failure snippets (or commit refs) before GREEN for strict slices
  - Optional post-remediation quick benchmark run id showing Kimi overall > LFM (not required for lock)

## Out of Scope

- Re-running run `2be17a26` (audit uses persisted artifacts only)
- Requiring a dedicated non-subject judge endpoint or external judge service
- Warning or blocking runs where `judgeEndpointId ∈ endpointIds`
- LLM-generated exemplars at runtime (exemplars are **authored suite data**, not model-produced)

## Traceability (remediation)

| Requirement | Primary files |
| --- | --- |
| J1 | `control-benchmark.tsx` |
| J2, J4, J7–J11 | `bench-judge/index.ts`, `bench-routing/index.ts`, `routing-capability-suite.json`, `benchmark-runner.ts`, `control-benchmark.tsx` |
| J3 | `answer-format.ts`, `benchmark-reasoning.ts` |
| J5–J6 | `benchmark-summary.ts`, `control-benchmark.tsx` |

## Coverage Gate

- [x] Run id, scores, and artifact paths recorded
- [x] Per-case matrix documents all 12 quick cases
- [x] Six root causes traced to concrete artifacts (including RC6 judge context gap)
- [x] Remediation requirements J1–J11 proposed with judge brief spec
- [x] TDD strategy declared: strict mode for SP12-B, SP12-C, SP12-E; pragmatic for SP12-A, SP12-D
- [x] RED → GREEN paths and test file inventory documented per slice

Coverage: PASS

## Approval Gate

- [x] Audit explains parity without claiming identical judge output
- [x] Operator concern (Kimi should beat LFM) addressed with evidence
- [x] Operator requires judge receive full question, exemplar answer, and key deliverables checklist
- [x] Judge may be a benchmarked endpoint; overlap must remain allowed
- [x] Implementing phase must follow declared TDD mode and Iron Law for strict slices

Approval: PASS
