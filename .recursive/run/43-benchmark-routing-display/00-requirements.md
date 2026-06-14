Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-14T11:36:11Z`
LockHash: `2625ab4a434b4e58a45bc4a3dcf321887498728097a50b08515accc81ac65bfd`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/BENCHMARK-WORKFLOW.md`
- `/.recursive/run/41/00-requirements.md` (dashboard latency R1–R3; UI-only scope — superseded in part by `R9`)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md` (`R4` measured latency, `R6` failure telemetry)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-routing-visibility.addendum-04.md` (Models → Benchmark visibility baseline)
- Conversation transcript: benchmark quick/full display, routing quality blend, clear-benchmark-data, dashboard latency `n/a` on Overview (`43bc0f89-dfe3-4319-bcc4-aa61b8317713`)
- **Post-run-42 product baseline (authoritative):**
  - `main` @ `9ca5e3b` (run 42 closeout)
  - Exploratory uncommitted benchmark-routing-quality work in working tree (optional carry-forward; reconcile in Phase 1 AS-IS)
Outputs:
- `/.recursive/run/43-benchmark-routing-display/00-requirements.md`
Scope note: Close the benchmark → observed profile → routing → operator UI loop: dual full/quick display, routing-quality semantics, dashboard latency repair (run 41 completion), benchmark latency visibility, and honest benchmark data reset. Does not change benchmark case content, judge rubrics, or provider catalog.

## TODO

- [x] Declare post-run-42 product baseline as implementation starting point
- [x] Document motivating gaps (display, routing quality, latency, clear semantics)
- [x] Define stable `R#` identifiers with observable acceptance
- [x] Record fixed decisions for scoring, latency, and clear semantics
- [x] Record TDD and verification discipline per requirement track
- [x] Define implementation slices with mandatory RED/GREEN log paths
- [x] Define automated verification floor and post-rebuild packaged-runtime QA matrix
- [x] Record out-of-scope boundaries
- [x] User approval of run creation and requirements draft (2026-06-14)
- [x] Complete Coverage Gate checklist (controller self-audit before lock)
- [x] Complete Approval Gate checklist (user lock approval 2026-06-14)

## Prerequisite — post-run-42 product baseline

Run 43 implementation **must branch from post-run-42 `main`**, which includes merged provider metadata merge, Craft ask-mode routing, and run 41 dashboard view-model latency strings.

| Field | Value |
| --- | --- |
| Baseline commit | `9ca5e3b` (post-run-42 `main`) |
| Packaged-runtime proof surface | `:3456` SEA with local peer + remote models + `mixed.local-remote` alias |
| Benchmark workflow | `/.recursive/BENCHMARK-WORKFLOW.md` + `validate-benchmark-run.py` |

### What exists after run 42 (starting truths)

**Benchmark execution and artifacts**

- Quick (12 hard) and full (55-case) modes persist run artifacts under `benchmark-runs/<runId>/`.
- Benchmark samples persist to SQLite with difficulty buckets and `judge_score`.
- `GET /api/role-model/benchmark/summary` returns **one** globally latest completed run by `gradingCompletedAtMs`.
- `DELETE /api/role-model/benchmark/endpoints/:endpointId/data` clears SQLite benchmark samples for **one** endpoint only.

**Routing quality (partial / exploratory)**

- Working-tree helpers in `packages/profile-aggregator/src/benchmark-routing-quality.ts` may exist unmerged: hard full+quick blend, case-weighted overall, `benchmark_mode` tagging.
- `listRouterCandidates` may expose `benchmarkCapability` and `routingBenchmarkQuality` when profiles and summary align.

**Dashboard telemetry (run 41 — incomplete in production UI)**

- `summarizeTelemetryStats()` formats Latency as `{avg} ms avg` (value) and `{p95} ms p95 / {avg} ms avg …` (detail).
- `dashboard.tsx` renders summary FactCards **without** passing `detail` → p95 never visible even when data exists.
- Failure telemetry rows (`persistRuntimeTelemetryFailure`) store `latency_ms: null` → failure-heavy windows show Latency **n/a** despite non-zero request counts.

**Models → Benchmark UI**

- Single “last completed run” headline; quick run can visually replace full run context.
- Per-case results omit execution `latencyMs` in UI; `result.json` persistence strips `latencyMs` on write.
- “Clear benchmark data” is per-model; does not remove artifact history; UI may still show artifact-based scores after profile clear.

### Post-run-42 gaps (motivation for run 43)

| Gap | Observed behavior | Impact |
| --- | --- | --- |
| **G1** Single latest run in UI/API | Quick after full hides full-run context | Operators lose full-suite scores |
| **G2** Conflated scores | Artifact overall vs routing profile quality blurred | Wrong expectations (~25%, n/a) |
| **G3** Hard blend undocumented / partial | Latest run or naive mean wins | Hard-path routing misaligned |
| **G4** Dashboard latency (run 41) | Overview shows `n/a`; detail not wired | Run 41 intent not delivered |
| **G5** Failure latency missing | 50/50 failure window → no latency values | Telemetry card useless in error storms |
| **G6** Benchmark latency invisible | Case + profile latency not shown | Cannot compare model speed from benchmark |
| **G7** Clear benchmark misleading | SQLite only; artifacts remain | “Clear” does not reset display/routing as expected |

Run 43 closes G1–G7 without re-implementing run 42 provider connect or run 40 catalog economics.

## Problem Summary

Operators run **full** capability benchmarks for baseline coverage and **quick** hard regressions between changes. Today the product treats benchmark history as a single “latest run” for display, merges artifact headlines with SQLite routing profiles inconsistently, and leaves dashboard latency (run 41) and benchmark execution latency invisible. The per-endpoint “Clear benchmark data” control clears routing samples but not run artifacts, so the UI continues to show benchmark scores from disk while profile quality reads `n/a`.

Run 43 makes three score **roles** explicit everywhere:

| Role | Meaning | Source |
| --- | --- | --- |
| **Last run snapshot** | Headline scores for one completed artifact run (mode + case count labeled) | `benchmark-runs/<runId>/result.json` |
| **Routing profile quality** | Blended bucket scores used by router/advisory | SQLite benchmark samples via `resolveRoutingBenchmarkQuality` |
| **Telemetry latency** | Live request timing on Observe → Overview | `runtime_telemetry_records` |

## Fixed decisions

### Dual run display (full + quick)

- **Full** = authoritative for easy, medium, and baseline hard coverage.
- **Quick** = hard-regression signal only; must not define easy/medium routing scores alone.
- UI and APIs expose **both** last full and last quick per endpoint; neither overwrites the other in the Models → Benchmark surface.

### Hard blend (routing)

When full and quick benchmark samples both exist for the **hard** bucket:

`hardRoutingScore = (fullHardMean + quickHardMean) / 2`

Expose optional `hardBlend: { full, quick, blended }` on routing-quality payloads and operator copy.

### Overall routing quality

Case-weighted mean of bucket scores (easy/medium/hard sample counts as weights), not naive mean of all samples and not “latest artifact overall only.”

### Legacy samples

Samples without `benchmark_mode` are treated as **`full`**. Operators re-run quick + full after upgrade for clean separation.

### Dashboard latency (supersedes run 41 OOS1 for this run only)

- Overview Latency card: **average primary**, **p95 secondary** (run 41 R1/R2).
- Measured elapsed time is persisted on **failure** telemetry rows when execution timing is available.
- Aggregation includes all rows with numeric `latencyMs` (success or failure), not successes only.
- `dashboard.tsx` must pass `detail` from `summarizeTelemetryStats()` into `FactCard`.

### Benchmark execution latency labels

- **Overview:** live telemetry avg + p95 (run 43 `R9`).
- **Models → Benchmark:** benchmark sample **p50 primary**, **p95 secondary** on model rows; per-case `latencyMs` in case drill-down.
- Copy must distinguish “structured telemetry” vs “benchmark execution latency.”

### Benchmark data reset semantics

| Action | Scope | Clears |
| --- | --- | --- |
| **Clear routing profile (per model)** | One `endpointId` | SQLite benchmark samples + rebuilt profiles for that endpoint |
| **Clear all benchmark data (global)** | Runtime scope | All SQLite benchmark samples + all `benchmark-runs/` artifacts + empty summary/history |

After global clear, routing must not use benchmark-derived quality until new runs complete. After per-model clear, UI must not imply that endpoint still contributes routing quality from stale artifact-only rows without an explicit “artifact only” state.

### TDD mode (Phase 3) — Iron Law

**Iron Law:** No production code changes on **strict** tracks until a targeted test fails (RED) for the same behavior, then passes (GREEN) after the change. Phase 3 artifact must include a **TDD Compliance Log** per slice with log file paths.

| Track | TDD Mode | Scope |
| --- | --- | --- |
| Dashboard latency (`R9`) | **strict** | RED failure-latency persist + dashboard `detail` wiring before backend/UI fix |
| Routing quality (`R3`, `R4`, `R5`, `R6`) | **strict** | RED blend/weight/version/legacy tests before aggregator + sqlite changes |
| Summary/list APIs (`R1`, `R2`) | **strict** | RED per-mode latest + run list before bridge helpers |
| Benchmark latency persist (`R10`) | **strict** | RED `result.json` round-trip + summary case latency before runner/summary changes |
| Benchmark latency UI (`R10`) | **pragmatic** | Layout/copy only; compensating: bridge fixture test + Phase 5 screenshot |
| Clear semantics (`R11`) | **strict** | RED global + per-endpoint clear integration before API/UI |
| Dual-run UI panels (`R1`) | **pragmatic** | Compensating: API tests for per-mode data + Phase 5 dual-panel screenshots |

**Pragmatic exception rule:** Each pragmatic slice requires explicit rationale + compensating evidence path in Phase 3; no pragmatic label for scoring, persistence, or clear APIs.

Phase 4 **automated verification floor** (all must PASS before Phase 5; logs under `evidence/logs/green/`):

| Command | Purpose |
| --- | --- |
| `corepack pnpm --filter @role-model-router/profile-aggregator test` | Routing quality unit tests |
| `corepack pnpm --filter @role-model-router/sqlite-memory test` | Telemetry failure latency + clear helpers |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge test` | Benchmark summary/list/clear/candidate integration |
| `corepack pnpm --filter @role-model-router/runtime-ui test` | Dashboard + benchmark view-model/route tests |
| `corepack pnpm run runtime:validate-ui` | UI seed/readback against live bridge |
| `corepack pnpm run runtime:validate-host` | Host regression guard |
| `corepack pnpm run schemas:validate` | Protocol/schema guard |

Phase 5 **QA Execution Mode:** `agent-operated` on **rebuilt packaged runtime** (`:3456`); hybrid if operator signs off Overview latency screenshots.

**Disposition rule:** No requirement may be marked `verified` from unit tests alone when `R12` lists packaged-runtime evidence for that requirement.

## Implementation slices (Phase 2/3 ownership)

Each slice owns RED → GREEN logs. Phase 3 must not merge slices without their GREEN logs.

### SP43-A — Per-mode summary + run list (`R1`, `R2`)

| Step | Action |
| --- | --- |
| RED | `benchmark-summary.test.ts`: multi-run fixture — latest-by-mode + list API **fail** on baseline |
| GREEN | Helpers `readLatestBenchmarkSummaryByMode`, `listBenchmarkRuns` — tests pass |
| Log | `evidence/logs/red/sp43-a-per-mode-summary.red.log`, `evidence/logs/green/sp43-a-per-mode-summary.green.log` |

### SP43-B — Routing quality aggregator (`R3`, `R4`, `R5`, `R6`)

| Step | Action |
| --- | --- |
| RED | `benchmark-routing-quality.test.ts`: blend, case-weighted overall, legacy `full`, version normalize — **fail** where baseline wrong |
| GREEN | `profile-aggregator` + sqlite persist path — all tests pass |
| Log | `evidence/logs/red/sp43-b-routing-quality.red.log`, `evidence/logs/green/sp43-b-routing-quality.green.log` |

### SP43-C — Candidate API + diagnostics (`R3`, `R4`)

| Step | Action |
| --- | --- |
| RED | Bridge test: full samples → quick samples → `routingBenchmarkQuality.hardBlend` + distinct `routingQualityScore` vs artifact overall **fail** on baseline |
| GREEN | `listRouterCandidates` enrichment — test passes |
| Log | `evidence/logs/red/sp43-c-candidates.red.log`, `evidence/logs/green/sp43-c-candidates.green.log` |

### SP43-D — Dashboard latency (`R9`)

| Step | Action |
| --- | --- |
| RED | `sqlite-memory`: failure row with `latencyMs` increases summary avg/p95 — **fail** today |
| RED | `runtime-ui`: dashboard/summary test — `FactCard` receives `detail` for Latency — **fail** today |
| GREEN | `persistRuntimeTelemetryFailure` + bridge failure timing + `dashboard.tsx` wiring |
| Log | `evidence/logs/red/sp43-d-dashboard-latency.red.log`, `evidence/logs/green/sp43-d-dashboard-latency.green.log` |

### SP43-E — Benchmark latency persist + API (`R10`)

| Step | Action |
| --- | --- |
| RED | Test: `result.json` written by runner includes `latencyMs` per case; summary readback exposes it — **fail** (stripped today) |
| GREEN | Runner persist + `benchmark-summary` types/read path |
| Log | `evidence/logs/red/sp43-e-benchmark-latency-persist.red.log`, `evidence/logs/green/sp43-e-benchmark-latency-persist.green.log` |

### SP43-F — Benchmark + candidates UI latency (`R10`)

| Step | Action |
| --- | --- |
| Pragmatic | UI renders p50/p95 on model rows + per-case `latencyMs`; `router-candidates.tsx` uses `latency_ms_p50`/`latency_ms_p95` |
| Compensating | `runtime-ui` test for candidate latency labels + Phase 5 screenshot |
| Log | `evidence/logs/green/sp43-f-benchmark-latency-ui.green.log` |

### SP43-G — Clear semantics (`R11`)

| Step | Action |
| --- | --- |
| RED | `clearAllBenchmarkData` integration: artifacts + all sqlite benchmark samples removed — **fail** (missing API) |
| RED | Per-endpoint clear: UI state must not show routing profile score from sqlite after clear — **fail** if artifact-only masquerades as profile |
| GREEN | sqlite + bridge DELETE routes + UI refresh/honest labels |
| Log | `evidence/logs/red/sp43-g-clear.red.log`, `evidence/logs/green/sp43-g-clear.green.log` |

### SP43-H — Dual-run Benchmark UI (`R1`)

| Step | Action |
| --- | --- |
| Pragmatic | Panels wired to SP43-A APIs |
| Compensating | Phase 5 screenshots: full panel + quick panel both populated |
| Log | `evidence/screenshots/phase5-dual-run-panels.png` (or equivalent) |

### SP43-I — Regression guard (`R7`)

| Step | Action |
| --- | --- |
| Required | Fix or document `routes hard requests using bucketed observed profiles` in Phase 1.5 |
| GREEN | Full Phase 4 floor log: `evidence/logs/green/phase4-verification-floor.green.log` |

## Post-rebuild packaged-runtime verification (`R12`)

**Mandatory:** Phase 5 QA runs only against a **fresh SEA build** that includes run 43 changes. Worktree dev-server results do **not** satisfy `verified`.

### Rebuild protocol (record in `05-manual-qa.md`)

| Step | Action | Evidence field |
| --- | --- | --- |
| P0.1 | `corepack pnpm run runtime:package-sea` (or repo-documented SEA build command) | `seaBuildCommand`, exit code |
| P0.2 | Record SHA256 of packaged binary / `runtimeSha256` from `GET /api/role-model/runtime/summary` or health payload | `runtimeSha256` |
| P0.3 | Restart packaged runtime on `:3456` with quoted `--runtime-state-root` if path contains spaces | `restartCommand`, pid/port |
| P0.4 | `GET /healthz` + `GET /api/role-model/runtime/summary` — `endpointCount ≥ 2` | log snippet |
| P0.5 | Record `scopeId`, state root, artifact root paths | `scopeId`, `runtimeStateRoot`, `benchmarkArtifactRoot` |

### Phase 5 scenario matrix (all required for `R12 verified`)

| ID | Scenario | Requirements | Pass criteria | Evidence |
| --- | --- | --- | --- | --- |
| Q1 | Overview latency (success path) | R9 | After ≥1 successful chat, Overview Latency headline `{avg} ms avg`, detail includes p95 | `evidence/screenshots/phase5-overview-latency-success.png` + API `GET .../telemetry/summary` JSON in log |
| Q2 | Overview latency (failure path) | R9 | After ≥1 failed chat with measurable elapsed time, Latency not bare `n/a` without explanatory detail | `evidence/logs/phase5-dashboard-latency-qa.log` |
| Q3 | Full benchmark | R1,R3,R5,R10 | Full run completes; `validate-benchmark-run.py` **VALID**; profile quality numeric on candidates | run id + validation JSON |
| Q4 | Quick benchmark after full | R1,R3,R4,R5 | Quick completes; **both** full and quick panels populated; `hardBlend` on candidates when both exist | `evidence/screenshots/phase5-dual-run-panels.png` + candidates API JSON |
| Q5 | Routing quality readback | R3,R4 | `GET /api/role-model/router/candidates`: `routingQualityScore` ≠ quick-only artifact when full samples exist; hard bucket matches blend formula ± rounding | log excerpt with endpoint ids + scores |
| Q6 | Run history | R2 | `GET /api/role-model/benchmark/runs` lists ≥2 runs; drill-down returns case grades with `latencyMs` | log excerpt |
| Q7 | Benchmark UI latency | R10 | Model row shows p50/p95; per-case drill-down shows `latencyMs` | screenshot |
| Q8 | Per-model clear | R11 | Clear routing profile for one model → profile quality n/a or honest empty; no false “routing profile” from stale sqlite | before/after candidates JSON |
| Q9 | Global clear | R11 | Clear all → empty summary, empty history, no benchmark capability on candidates | before/after summary + candidates JSON |
| Q10 | Post-clear re-run | R11,R1 | Quick re-run restores scores **only** from new run id | new run id + summary |
| Q11 | Run 42 regression spot-check | R0 | Overlap provider list + Craft ask easy probe still pass (sample from run 42 table) | `evidence/logs/phase5-run42-spotcheck.log` |

### Machine checks after live benchmarks (Q3/Q4)

Run from repo root against completed run artifacts:

```bash
python .recursive/run/36-runtime-consumption-telemetry-remediation/evidence/scripts/validate-benchmark-run.py \
  --artifact-root "<benchmarkArtifactRoot>" --run-id "<fullRunId>"
```

Both full and quick runs (when executed in Q3/Q4) must produce `VALID` or documented `INVALID` with remediation before `verified`.

### Phase 5 artifact requirements

`05-manual-qa.md` must include:

- `QA Execution Mode: agent-operated`
- `runtimeSha256`, `scopeId`, `seaBuildCommand`, restart metadata
- Scenario table Q1–Q11 with **Pass/Fail** and evidence paths
- Requirement Completion Status: every in-scope `R#` marked `verified` only with **distinct** evidence from unit tests (Phase 4) **and** packaged-runtime row(s) above where applicable

## Requirements

### `R0` Branch from post-run-42 `main` and reconcile exploratory benchmark work

Description:
Phase 0 worktree records baseline `9ca5e3b` (or later `main`). Any uncommitted `benchmark-routing-quality` / UI exploratory changes are inventoried in Phase 1 AS-IS and either merged intentionally or re-landed under strict TDD in Phase 3.

Acceptance criteria:
- `00-worktree.md` cites baseline commit before Phase 3.
- Run 42 overlap connect tests and Craft ask-mode tests remain green after run 43.
- Phase 1 AS-IS documents current behavior for: summary API, clear endpoint, dashboard latency with failures, quick→full sequence.

Verification evidence:
- `00-worktree.md`
- `evidence/logs/green/run42-regression.green.log` (or equivalent targeted replay)

---

### `R1` Dual-run display (full + quick coexist)

Description:
Models → Benchmark shows **both** last completed full run and last completed quick run per endpoint. Neither overwrites the other.

Acceptance criteria:
- UI panels: **Last full run (N cases)** and **Last quick run (12 hard)** with scores, bucket breakdown, judge, completed timestamp.
- If only one mode exists, the other panel shows an explicit empty state (not silent reuse of the wrong mode).
- In-session active run progress remains separate from persisted snapshots.
- Global “last completed run” banner labels mode + case count; does not imply the other mode is absent.

Changed files (expected):
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`

TDD acceptance criteria:
- **Strict (API):** SP43-A RED/GREEN logs required before UI panels.
- **Pragmatic (UI):** SP43-H compensating screenshots in Phase 5.

Verification evidence (distinct layers):
- **Unit/integration:** SP43-A GREEN log + test names in `04-test-summary.md`
- **Packaged runtime:** Q4 + Q6 + dual-panel screenshot (`R12`)
- **Not sufficient alone:** UI code review without API tests or screenshots

Disposition rule: `verified` requires Q4 screenshot **and** SP43-A GREEN log.

---

### `R2` Run history and drill-down

Description:
Operators browse recent completed benchmark runs and open per-case results.

Acceptance criteria:
- New list API (e.g. `GET /api/role-model/benchmark/runs`) returns completed runs: `runId`, `mode`, `suiteId`, `completedAtMs`, endpoint count, artifact path; sort descending by completion time; optional `mode` filter.
- Existing `GET /api/role-model/benchmark/runs/:runId` unchanged; UI adds history list linking to case grades.
- Drill-down shows case scores; after `R10`, includes per-case latency.

Changed files (expected):
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `control-benchmark.tsx`, `runtime-api.ts`

TDD acceptance criteria (strict — SP43-A):
- **RED:** List API returns empty/wrong order with multi-run fixture; per-mode latest returns wrong mode.
- **GREEN:** Both behaviors pass with ≥3 run fixture (2 quick, 1 full or permutations).

Verification evidence:
- SP43-A GREEN log
- Packaged: Q6 log excerpt (`R12`)

---

### `R3` Routing quality semantics (API contract)

Description:
Router candidates and profiles expose routing quality distinct from last-run artifact snapshot.

Acceptance criteria:
- `listRouterCandidates` / profile reads include `routingBenchmarkQuality` (overall + `scoresByBucket` + optional `hardBlend`).
- `benchmarkCapability.overallScore` = last artifact headline for that endpoint/mode policy (documented); `routingQualityScore` = blended routing score from samples.
- When full samples exist, quick-only artifact must not set routing overall alone.
- Routing diagnostics cite bucket score used for hard-path selection when benchmark-derived.

Changed files (expected):
- `packages/profile-aggregator/src/benchmark-routing-quality.ts`
- `apps/runtime-host-bridge/src/index.ts`
- `apps/runtime-host-bridge/src/benchmark-summary.ts`
- `packages/runtime-observability/src/index.ts` (if diagnostics fields needed)

TDD acceptance criteria (strict — SP43-B, SP43-C):
- **RED:** Blend/weight/legacy/version tests fail on baseline.
- **RED:** Candidate API test fails when quick-only would win over blended full+quick profile.
- **GREEN:** SP43-B + SP43-C logs.

Verification evidence:
- SP43-B + SP43-C GREEN logs
- Packaged: Q5 candidates JSON (`R12`)
- Diagnostics spot-check: hard-path request observation cites benchmark bucket when applicable

---

### `R4` Hard blend in routing path

Description:
When full and quick hard benchmark samples both exist, hard-bucket ranking and advisory inputs use blended hard score.

Acceptance criteria:
- `applyRoutingBenchmarkQualityToProfiles` hard bucket uses blend rule from Fixed decisions.
- `describeRoutingImpact` / UI shows blend breakdown when `hardBlend` present.
- Hard-path routing test or fixture proves blended score affects candidate ordering vs quick-only or full-only baselines.

Verification evidence:
- Included in SP43-B unit tests (hard blend cases)
- Bridge test: hard-bucket profile score equals `(fullHard + quickHard) / 2` within 0.001
- Packaged: Q5 `hardBlend` object on candidates API

---

### `R5` Persist reliability (no spurious profile `n/a`)

Description:
Successful benchmark completion updates observed profiles; version skew must not drop profile quality to missing.

Acceptance criteria:
- Version normalization on persist/read (`normalizeBenchmarkSampleVersions` or equivalent) prevents mixed `endpoint_version` from blocking aggregation.
- After successful full + quick on same endpoint, `latestProfile.judge_score` / `quality_score` numeric on candidates API.
- Persist failures surface existing run-36 guard behavior (no silent drop).

TDD acceptance criteria (strict — SP43-B):
- **RED:** Mixed `endpoint_version` fixture → profile quality null incorrectly.
- **GREEN:** Normalized samples → numeric `judge_score` on read path.

Verification evidence:
- SP43-B test case names in `04-test-summary.md`
- Packaged: Q3/Q4 post-run candidates API — no `n/a` profile quality after successful dual runs

---

### `R6` Legacy sample migration

Description:
Pre-`benchmark_mode` samples behave predictably; operators know when re-benchmark is needed.

Acceptance criteria:
- Samples without `benchmark_mode` counted as `full`.
- Operator note (Phase 6 pointer + run-local QA doc): re-run quick + full for clean quick/full separation after upgrade.
- No destructive migration of old artifacts required.

Verification evidence:
- Unit test: legacy samples participate in full hard mean, not quick

---

### `R7` Automated verification floor and regression isolation

Description:
Phase 4 proves the full test matrix and repo validation commands before any packaged-runtime QA. No Phase 5 lock without GREEN Phase 4 floor log.

Acceptance criteria:
- All SP43-A through SP43-G strict slices have RED then GREEN logs on disk under `evidence/logs/`.
- Phase 4 floor commands (see **automated verification floor** table) captured in single log `evidence/logs/green/phase4-verification-floor.green.log` with exit codes.
- New tests minimum set:
  - `benchmark-summary.test.ts`: per-mode latest, run list, case latency in summary
  - `benchmark-routing-quality.test.ts`: blend, weights, legacy, version normalize
  - `benchmark-clear.test.ts` (or sqlite-memory equivalent): global + per-endpoint clear
  - `dashboard-latency.test.ts` or `view-models.test.ts` + sqlite failure latency test
  - Bridge: candidate enrichment integration test (SP43-C)
- `routes hard requests using bucketed observed profiles`: **fix** if failing due to run 43 enrichment; else Phase 1.5 documents baseline failure with test name + skip rationale — **no silent ignore**.
- `04-test-summary.md` maps **every** `R1`–`R11` to ≥1 test name + log path; marks which rows also require `R12` packaged evidence.

Verification evidence:
- `evidence/logs/green/phase4-verification-floor.green.log`
- Locked `04-test-summary.md` with Requirement Completion Status table complete

Disposition rule: Phase 5 cannot start until Phase 4 floor log exists and is GREEN.

---

### `R8` Operator documentation

Description:
Control-plane note: when to run full vs quick, what routing uses, what clear actions do.

Acceptance criteria:
- `05-manual-qa.md` documents full vs quick, routing vs snapshot scores, clear semantics.
- Phase 6 `DECISIONS.md` entry points to durable operator guidance (not duplicate full spec).
- References `/.recursive/BENCHMARK-WORKFLOW.md` where workflow gates apply.

Verification evidence:
- Locked Phase 6 receipt cites decision entry

---

### `R9` Dashboard overview latency (run 41 completion / repair)

Description:
Observe → Overview (`/app`) Latency card delivers locked run 41 intent with real telemetry, including failure-heavy windows. **Supersedes run 41 `OOS1` (no backend changes) for this requirement only.**

Acceptance criteria:
- Overview Latency **headline**: `{averageLatencyMs} ms avg` when any row in window has measured latency.
- Overview Latency **detail**: `{p95LatencyMs} ms p95 / {averageLatencyMs} ms avg across structured telemetry` when both exist (run 41 R1/R2).
- `dashboard.tsx` passes `detail={card.detail}` for summary FactCards (minimum Latency card; prefer all four cards).
- Failed chat/responses attempts with measurable wall time persist non-null `latencyMs` on failure telemetry rows (`persistRuntimeTelemetryFailure` + failure record paths in bridge).
- `readRuntimeTelemetrySummary` and bridge `summarizeTelemetryRequestRecords` compute avg + p95 from all rows with numeric `latencyMs`.
- When `requestCount > 0` but no latency samples: detail explains absence (not bare `n/a` without context).
- Phase 5 screenshot on packaged `:3456` Overview with non-`n/a` latency; second screenshot or log for failure-only window after failure-latency persist.

TDD acceptance criteria (strict — SP43-D):
- **RED:** `sqlite-memory/test`: `persistRuntimeTelemetryFailure` with `latencyMs` → summary avg/p95 non-null — **must fail on baseline**.
- **RED:** `runtime-ui` test: rendered dashboard passes `detail` for Latency card — **must fail on baseline** (missing prop).
- **GREEN:** SP43-D logs; both tests pass.

Verification evidence:
- SP43-D RED + GREEN logs (mandatory)
- Packaged: Q1 screenshot + Q2 log (`R12`)
- API cross-check: `GET /api/role-model/telemetry/summary` values match UI headline/detail within rounding

Disposition rule: `verified` **requires** Q1 or Q2 packaged evidence; unit tests alone insufficient.

Changed files (expected):
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts` (copy only if needed)
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- Tests: `sqlite-memory/test`, `runtime-ui` dashboard or view-models test

---

### `R10` Benchmark execution latency (p50 / p95)

Description:
Models → Benchmark and related surfaces show benchmark-measured execution latency alongside quality scores.

Acceptance criteria:
- Model score rows: **p50 primary**, **p95 detail** from observed profile when `benchmark_samples > 0` (aggregated from benchmark samples).
- Per-case drill-down shows `latencyMs` for each case (live session + persisted runs).
- Persist `latencyMs` (and `gradingMethod`/`rationale` as today) in `result.json`; summary APIs expose case latency.
- Router → Candidates reads `latency_ms_p50` / `latency_ms_p95` (and `tokens_per_sec`) with correct field names; label benchmark-sourced vs live profile when both exist.
- Copy distinguishes benchmark execution latency from Overview telemetry latency (`R9`).

Changed files (expected):
- `benchmark-runner.ts`, `benchmark-summary.ts`, `control-benchmark.tsx`, `router-candidates.tsx`, `runtime-api.ts`

TDD acceptance criteria:
- **Strict (SP43-E):** RED/GREEN for `result.json` + summary API latency fields before runner changes merge.
- **Pragmatic (SP43-F):** UI + candidates field-name fix; compensating runtime-ui test + Q7 screenshot.

Verification evidence:
- SP43-E RED + GREEN logs
- SP43-F GREEN log or runtime-ui test output
- Packaged: Q7 screenshot + Q6 case latency in run drill-down JSON

---

### `R11` Benchmark data reset (operator clear semantics)

Description:
Clear actions match operator intent: reset routing influence and historical run display with explicit scope.

Acceptance criteria:
- **Per-model control** renamed/labeled: **Clear routing profile for this model** (or equivalent unambiguous copy).
- Clears SQLite benchmark samples for that endpoint; UI must not show artifact-only scores as if still in routing profile without explicit **artifact-only** labeling OR clears that endpoint’s grades from displayed last-run panels per Fixed decisions.
- **New global control:** **Clear all benchmark data** with confirmation dialog.
- Global API clears: all SQLite benchmark samples (all endpoints), difficulty-bucket benchmark samples, rebuilt profiles (live samples retained), **all** completed run artifacts under runtime `benchmark-runs/`.
- Response includes counts: `{ clearedSampleCount, clearedRunCount }` (optional byte estimate).
- After global clear: empty summary, empty run history, no `benchmarkCapability` / routing quality from benchmarks on candidates until new runs.
- Tests: per-endpoint clear + global clear integration; UI refresh shows empty/honest states.

Changed files (expected):
- `sqlite-memory/src/index.ts`, `runtime-host-bridge/src/index.ts`, `control-benchmark.tsx`, `runtime-api.ts`

TDD acceptance criteria (strict — SP43-G):
- **RED:** Global clear API missing or leaves artifacts/sqlite samples — test fails.
- **RED:** Per-endpoint clear leaves candidate `routingBenchmarkQuality` populated from sqlite — test fails.
- **GREEN:** SP43-G logs; integration tests pass.

Verification evidence:
- SP43-G RED + GREEN logs
- Packaged: Q8 before/after JSON, Q9 empty summary/history, Q10 new run id (`R12`)

Disposition rule: `verified` requires Q8 **and** Q9 **and** Q10 in Phase 5 log.

---

### `R12` Packaged-runtime verification on `:3456` (mandatory gate)

Description:
**Single acceptance gate for operator-visible behavior.** All product requirements marked `verified` must cite rows from the Phase 5 scenario matrix (Q1–Q11) where applicable, executed only after **post-merge SEA rebuild** documented in rebuild protocol.

Acceptance criteria:
- Phase 3 complete and Phase 4 floor log GREEN before starting Phase 5.
- Rebuild protocol P0.1–P0.5 recorded in `05-manual-qa.md`.
- Scenarios Q1–Q11 executed in order (Q8–Q10 sequential; Q11 spot-check anytime after restart).
- `validate-benchmark-run.py` **VALID** for full run (Q3) and quick run (Q4) when those scenarios execute.
- Evidence paths exist on disk under `evidence/logs/` and `evidence/screenshots/` (create dirs in Phase 5).
- `05-manual-qa.md` Requirement Completion Status: no `verified` without matching Q-row + Phase 4 test citation.

Disposition rules:
| Requirement | Minimum packaged evidence |
| --- | --- |
| R9 | Q1 + Q2 |
| R1 | Q4 screenshot |
| R2 | Q6 |
| R3, R4, R5 | Q3 + Q4 + Q5 |
| R10 | Q7 (+ Q6 case latency JSON) |
| R11 | Q8 + Q9 + Q10 |
| R0 | Q11 |
| R7 | Phase 4 floor log (not Q-row) |
| R8 | Phase 6 decision entry (not Q-row) |

Failure handling:
- Any Q-row **Fail** blocks Phase 5 lock until fixed and re-run on **new rebuild** if bridge/UI changed.
- Flaky benchmark runs: one retry allowed with reason logged; third failure requires Phase 1.5 addendum.

Primary logs:
- `evidence/logs/phase5-benchmark-routing-display-qa.log` (Q3–Q10 API transcripts)
- `evidence/logs/phase5-dashboard-latency-qa.log` (Q1–Q2)
- `evidence/logs/phase5-run42-spotcheck.log` (Q11)

---

## Requirement Completion Status (template — fill in Phase 3+)

| R# | Disposition | Changed Files | Implementation Evidence | Verification Evidence |
| --- | --- | --- | --- | --- |
| R0 | pending | — | worktree baseline | run42 regression + Q11 |
| R1 | pending | — | SP43-A + SP43-H | SP43-A GREEN + Q4 screenshot |
| R2 | pending | — | SP43-A | SP43-A GREEN + Q6 |
| R3 | pending | — | SP43-B/C | SP43-B/C GREEN + Q3/Q4/Q5 |
| R4 | pending | — | SP43-B/C | SP43-B/C GREEN + Q5 hardBlend |
| R5 | pending | — | SP43-B | SP43-B GREEN + Q3/Q4 candidates |
| R6 | pending | — | SP43-B unit | legacy test in SP43-B GREEN |
| R7 | pending | — | all SP43 logs | phase4-verification-floor.green.log |
| R8 | pending | — | Phase 6 doc | decision receipt |
| R9 | pending | — | SP43-D RED/GREEN | Q1 + Q2 |
| R10 | pending | — | SP43-E/F | SP43-E GREEN + Q6/Q7 |
| R11 | pending | — | SP43-G RED/GREEN | Q8 + Q9 + Q10 |
| R12 | pending | SEA rebuild | Q1–Q11 execution | all phase5 logs + screenshots |

## Out of Scope

- `OOS1` New benchmark providers, judge models, or suite case content changes
- `OOS2` LiteLLM vendor catalog refresh or models.dev export (unless required for unrelated regression)
- `OOS3` Difficulty rubric or Craft ask-mode changes (run 42)
- `OOS4` Provider metadata merge (run 42)
- `OOS5` Auto-scheduling benchmarks or CI benchmark gates
- `OOS6` Changing `RuntimeTelemetrySummary` TypeScript field names (extend behavior only)
- `OOS7` Re-implementing run 36 judge pipeline addenda beyond preserve/regression

## Assumptions

- Runtime artifact root remains `{runtimeStateRoot}/memory/benchmark-runs` (or bridge-equivalent).
- Operators may have existing artifact directories from pre-`benchmark_mode` runs; `R6` covers semantics.
- Packaged `:3456` state root path may contain spaces; restart uses quoted `--runtime-state-root`.
- Active endpoints for Phase 5 include at least one local and one remote model (same baseline as prior benchmark QA).

## Constraints

- Do not weaken run 36 benchmark workflow validation gates or skip `validate-benchmark-run.py` on Q3/Q4.
- Separate **snapshot**, **routing quality**, and **telemetry latency** labels in all user-visible copy touched by this run.
- **Strict TDD:** no production code on strict slices without prior RED log; Phase 3 artifact lists every slice’s RED/GREEN paths.
- **Two-layer verification:** Phase 4 automated floor GREEN **before** Phase 5; Phase 5 on **rebuilt SEA only**.
- `implemented` / `verified` dispositions must cite concrete changed files and **distinct** verification evidence (unit log ≠ packaged Q-row).
- No requirement marked `verified` from dev-server or unstaged worktree alone when `R12` applies.
- Branch from `main` @ `9ca5e3b` in isolated worktree.

## Dependencies

| Prior run | Relationship |
| --- | --- |
| **41** | Dashboard latency intent; `R9` completes and supersedes UI-only/backend OOS |
| **36** | Failure telemetry rows, measured success latency, benchmark workflow, Models → Benchmark IA |
| **27** | Segmented easy/medium/hard profiles fed by benchmark bucket scores |
| **42** | Baseline branch; no overlap except regression guard |
| **40** | Catalog economics unchanged |

## Targeted package and file inventory

- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts` (diagnostics, if needed)
- `role-model-router/packages/core/src/router.ts` (verify-only consumption)

## Open unknowns (resolve in Phase 1 AS-IS)

1. Whether uncommitted `benchmark-routing-quality` worktree changes merge as-is or are re-landed under strict TDD.
2. Global clear: delete artifact dirs vs move to `benchmark-runs/.trash/` — recommend delete with counts in API response; lock in Phase 2 plan.
3. Per-model clear vs artifact grades: prefer hide endpoint from artifact panels until re-run OR strip endpoint from displayed summary — lock in Phase 2 plan.
4. Status of `routes hard requests using bucketed observed profiles` test on baseline — document in Phase 1.5 if still failing.

## Coverage Gate

- [x] Post-run-42 baseline (`R0`)
- [x] G1–G7 mapped to `R1`–`R12`
- [x] Run 41 dashboard latency repair explicit (`R9`) with OOS override documented
- [x] Benchmark latency (`R10`) and clear semantics (`R11`) defined
- [x] Fixed decisions for dual run, blend, reset, and latency labels
- [x] Strict/pragmatic TDD per track with Iron Law and SP43-A–I slices
- [x] Mandatory RED/GREEN log paths for every strict slice
- [x] Phase 4 automated verification floor defined (`R7`)
- [x] Post-rebuild packaged-runtime Q1–Q11 matrix defined (`R12`)
- [x] Disposition rules: unit tests alone insufficient where `R12` applies
- [ ] User lock approval recorded

Coverage: PASS

## Approval Gate

- [x] Requirements bounded; run 42/40 not re-implemented
- [x] Acceptance criteria observable via parameterized tests, RED/GREEN logs, Phase 4 floor, and Phase 5 Q1–Q11 matrix on rebuilt SEA
- [x] User approves run creation and requirement set (2026-06-14)

Approval: PASS
