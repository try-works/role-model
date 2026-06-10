Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `02 To-Be Plan`
Status: `APPROVED`
Addendum: `04`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/02-to-be-plan.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/03-implementation-summary.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/addenda/02-to-be-plan.benchmark-judge-reliability.addendum-02.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/addenda/03-implementation-summary.benchmark-judge-reliability.addendum-02.md`
- Dual-model benchmark validation run `32750042` (Kimi k2.6 50%, LFM 2.5 33%, 0 parse failures)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-judge-remediation-result.json`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/profile-aggregator/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts` (`readAdvisoryMaxDifficultyRecommendation`)
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-routing-visibility.addendum-04.md`
Scope note: Post-closeout requirement addendum for benchmark discoverability under the Models pillar and operator visibility into how benchmark scores feed routing. Builds on judge-reliability remediation (run 35 addendum 02, implemented in worktree 36). Does not change grading rubrics, suite case definitions, or routing scoring algorithms.

## Problem Statement

Benchmark infrastructure now produces trustworthy judge scores and durable artifacts (run `32750042`: 0 judge parse failures vs baseline `311ebcd7` with 4/12 each). However operators cannot discover or reason about benchmark → routing without knowing a deep link:

1. **Benchmark is orphaned in navigation** — Route `/app/models/benchmark` exists (`routes.ts`) and `control-benchmark.tsx` implements the page, but `design-system.ts` Models section lists only **Models** and **Roles**. Benchmark has no section tab in the shell header, unlike peer pages in Router and Observe.
2. **Routing consumes benchmark scores invisibly** — `aggregateObservedPerformance()` maps `judge_score` → `quality_score` on benchmark-sourced profiles. `getQualityMetric()` in `router.ts` prefers `candidate.observed.judge_score`. `readAdvisoryMaxDifficultyRecommendation()` uses per-bucket `quality_score` thresholds. None of this is surfaced on Router → Candidates, Strategy, or Decisions.
3. **No persisted last-run summary API** — Completed benchmark results live in run artifacts and ephemeral UI state. Router surfaces cannot show staleness, judge used, or per-endpoint breakdown without re-running or manual filesystem inspection.
4. **Judge preference is session-only** — `control-benchmark.tsx` defaults judge to first healthy remote endpoint on each page load. Operator choice is not persisted; Kimi (or any model) is not a product default but the UI copy implies capability without recording preference.

Observed validation (dual quick suite, run `32750042`):

| Model | Overall | Parse failures | Judge artifacts |
| --- | --- | --- | --- |
| Kimi k2.6 | 50% (6/12) | 0 | 49 judge + 12 compare |
| LFM 2.5 1.2B | 33% (4/12) | 0 | (shared run) |

Remaining score gaps are real judge rationales, not infrastructure defects. The gap is **operator visibility and information architecture**, not grading reliability.

## Fixed Decisions

1. **Benchmark belongs under the Models pillar** as a peer tab to Models and Roles at `/app/models/benchmark`. Benchmark grades configured model inventory; it is not System, Control, or Router configuration.
2. **Shell section tabs for Models are Models | Roles | Benchmark** when the Models pillar is active, matching the Router pillar tab pattern.
3. **Judge endpoint is operator-selected per run** and may be persisted as preference. No model id (including Kimi k2.6) is hardcoded as judge default in product code or copy.
4. **Judge is grading-only** unless also explicitly selected as a benchmark subject. Manifest `judgeEndpointId` is the source of truth for which judge graded a run.
5. **Design-system docs and tests precede route/shell edits** (run-35 R0 pattern): update `DESIGN_SYSTEM.md` and `design-system.test.ts` before `design-system.ts` and page components.

## Requirement Delta

| ID | Requirement | Disposition |
| --- | --- | --- |
| R-IA1 | Benchmark is a Models section tab at `/app/models/benchmark` | new |
| R-IA2 | `DESIGN_SYSTEM.md`, `design-system.ts`, and tests encode three Models tabs before page edits | new |
| R-IA3 | Shell section header shows **Models \| Roles \| Benchmark** when Models pillar is active | new |
| R-IA4 | Optional legacy redirect `/app/control/benchmark` → `/app/models/benchmark` | new |
| B1 | Persisted last completed benchmark summary API | new |
| B2 | Benchmark preferences API for judge endpoint selection | new |
| B3 | `router/candidates` exposes `benchmarkCapability` per endpoint | new |
| B4 | Models → Benchmark explains benchmark → routing data flow | new |
| B5 | Models → Benchmark shows last-run summary (scores, judge, artifacts) | new |
| B6 | Judge preference persistence; no hardcoded judge model ids | new |
| B7 | Router → Candidates shows capability column with staleness | new |
| B8 | Router → Strategy shows benchmark-informed difficulty advisory | new |
| B9 | Router → Decisions cites benchmark-sourced `judge_score` when used | new |
| B10 | Cross-links among Models → Benchmark, Candidates, Strategy, Models inventory | new |

## Requirements

### `R-IA1` Benchmark under Models pillar

Description:
Benchmark must be a first-class Models section destination, not a hidden route.

Acceptance criteria:
- Canonical path is `/app/models/benchmark` (already registered in `routes.ts`; must remain)
- Page eyebrow / section context reads **Models**, not System, Control, or Router
- Left-rail Models pillar selection highlights when operator is on `/app/models/benchmark`
- `getRuntimeRouteDefinition("/app/models/benchmark")` returns a route with `section: "Models"`

### `R-IA2` Design-system-first Models tab registration

Description:
Navigation contract is documented and tested before shell implementation.

Acceptance criteria:
- `DESIGN_SYSTEM.md` documents Models pillar tabs: **Models**, **Roles**, **Benchmark** with paths `/app/models`, `/app/models/roles`, `/app/models/benchmark`
- `design-system.ts` defines `controlBenchmarkRoute` (or equivalent id) with:
  - `section: "Models"`
  - `label: "Benchmark"`
  - `to: "/app/models/benchmark"`
  - appropriate `template`, `title`, `description`, and `icon`
- `runtimeNavigationSections` Models `items` array order: Models, Roles, Benchmark
- `design-system.test.ts` asserts three Models section items and resolves benchmark route definition
- RED → GREEN: tests fail before route registration, pass after

### `R-IA3` Shell section header tabs

Description:
When Models pillar is active, section header shows all three peer tabs like Router shows Overview / Strategy / Candidates.

Acceptance criteria:
- Shell section tab strip renders **Models**, **Roles**, **Benchmark** links when current route `section === "Models"`
- Active tab styling matches existing Router section tab behavior
- Navigating between the three tabs preserves Models pillar context in left rail

### `R-IA4` Legacy benchmark path redirect (optional)

Description:
If any legacy or bookmarked path pointed at Control-era benchmark URLs, redirect to Models canonical path.

Acceptance criteria:
- If `/app/control/benchmark` route existed or is added for compatibility, it 302/redirects to `/app/models/benchmark`
- `design-system.test.ts` or route test covers redirect when implemented
- If no legacy path ever shipped, implement redirect anyway for forward-compatible bookmarks (low cost)

### `B1` Last completed benchmark summary API

Description:
Expose a stable read model for the most recent completed benchmark run so UI and router surfaces do not depend on in-memory poll state or filesystem paths.

Acceptance criteria:
- `GET /api/role-model/benchmark/summary` returns HTTP 200 with:
  - `runId`, `completedAtMs`, `mode`, `suiteId`, `suiteVersion`
  - `judgeEndpointId`, `judgeModelId` (resolved from registry at read time)
  - `artifactRoot` relative path or URI scheme consistent with existing benchmark artifact layout
  - `subjects[]` each with `endpointId`, `modelId`, `overallScore`, `scoresByBucket` (easy/medium/hard when available), `passingCaseIds`, `caseCount`
  - `manifest` grading fields: `executionCompletedAtMs`, `gradingCompletedAtMs`, `judgeArtifactCount`, `compareArtifactCount`
- Returns empty/null summary shape (not 404) when no completed run exists
- Summary is derived from persisted manifest + result records under `benchmark-runs/<runId>/`, not live execution handles
- Bridge unit or integration test covers summary serialization for fixture run `32750042` layout

### `B2` Benchmark preferences API

Description:
Operators can persist judge endpoint preference across sessions.

Acceptance criteria:
- `GET /api/role-model/benchmark/preferences` returns `{ judgeEndpointId?: string }`
- `PUT /api/role-model/benchmark/preferences` accepts `{ judgeEndpointId: string }` and validates endpoint exists and is healthy enough for judge role (same validation as benchmark start)
- Preference stored in runtime config or sqlite preference store (match existing config patterns in `unified-runtime-config.ts`)
- Invalid or offline endpoint id returns 400 with actionable error
- Preference is optional: absence falls through to B6 default resolution

### `B3` Router candidates benchmark capability block

Description:
Extend candidate inventory API with structured benchmark scores for routing surfaces.

Acceptance criteria:
- `GET /api/role-model/router/candidates` (or existing `fetchRouterCandidates` payload) includes per-candidate `benchmarkCapability` when benchmark profiles exist:
  - `overallScore` (0–1)
  - `scoresByBucket` when derivable from last run or aggregated profiles
  - `sampleCount` / `benchmarkSamples` from observed profile `sources`
  - `measuredAtMs`, `freshnessScore` from profile
  - `lastRunId`, `lastRunCompletedAtMs` when summary available
  - `judgeEndpointId` from last run that contributed scores
- Field omitted or null when endpoint has no benchmark observations
- Type exported to `runtime-api.ts` as `RouterCandidate.benchmarkCapability`
- Test fixture covers endpoint with and without benchmark profile

### `B4` Routing impact explainer on Models → Benchmark

Description:
Benchmark page teaches operators how scores influence routing without reading source code.

Acceptance criteria:
- `control-benchmark.tsx` includes a **How this affects routing** panel describing:
  - `Models → Benchmark → observed profiles (judge_score / quality_score)`
  - `Router quality metric` uses `judge_score` when present (`getQualityMetric`)
  - `Difficulty strategy` uses per-bucket `quality_score` via `readAdvisoryMaxDifficultyRecommendation`
  - Two-phase benchmark flow (execution then grading on artifacts only)
- Panel links to Router → Candidates and Router → Strategy using canonical app paths
- Copy uses **Models → Benchmark**, not Control → Benchmark

### `B5` Last-run summary on Models → Benchmark

Description:
Benchmark page shows persisted last completed run without requiring an active poll session.

Acceptance criteria:
- On load, page fetches `GET /api/role-model/benchmark/summary` and renders:
  - Run metadata (id, completed time, mode, suite version)
  - **Judge used** row from `judgeEndpointId` + resolved `modelId` (never assumes Kimi)
  - Per-subject score table with overall % and bucket breakdown
  - Links to artifact root and compare artifacts when `compareArtifactCount > 0`
- Active in-progress run UI (existing poll flow) remains; last-run panel shows below or beside progress
- Empty state explains no completed run yet and points to run controls

### `B6` Judge preference without hardcoded defaults

Description:
Judge selection respects operator preference and registry health; no product-default model id.

Acceptance criteria:
- Page load resolution order:
  1. `GET /api/role-model/benchmark/preferences` saved `judgeEndpointId` if still healthy
  2. First healthy remote endpoint (current behavior, kept as fallback only)
  3. First healthy endpoint of any source
- UI label reads **Judge endpoint (grading only)**; help text states judge is not implied to be a routing subject
- `startCapabilityBenchmark` continues to send explicit `judgeEndpointId`; manifest records it
- No string literal model id (e.g. `kimi-k2.6`, `moonshot.personal...`) in default resolution code
- Changing judge persists via `PUT` preferences on run start or explicit save control

### `B7` Capability column on Router → Candidates

Description:
Candidate inventory shows benchmark-derived capability alongside latency/throughput/failure.

Acceptance criteria:
- `router-candidates.tsx` renders capability line per candidate when `benchmarkCapability` present:
  - Overall % (formatted like benchmark page)
  - Bucket scores when available
  - Staleness indicator from `measuredAtMs` / `freshnessScore`
  - `n benchmark samples` or equivalent sample count
- Link **View in Models → Benchmark** to `/app/models/benchmark` (optionally with endpoint query/hash when supported)
- Candidates without benchmark data show **Capability: n/a** with link to run benchmark
- Section description mentions scores come from Models → Benchmark

### `B8` Benchmark-informed difficulty advisory on Router → Strategy

Description:
Strategy page surfaces how benchmark `quality_score` thresholds affect difficulty ceiling recommendations.

Acceptance criteria:
- `control-routing-strategy.tsx` (or strategy sub-panel) shows per-endpoint advisory breakdown when `readAdvisoryMaxDifficultyRecommendation` data is available:
  - Recommended max difficulty per endpoint
  - `quality_score` vs configured `min_quality_score` threshold
  - Whether recommendation is benchmark-sourced vs live-request-only
- Copy cites Models → Benchmark as score source when `benchmark_samples > 0` in profile
- Link to Models → Benchmark for operators without recent benchmark run

### `B9` Benchmark provenance on routing decisions

Description:
When routing quality metric used benchmark `judge_score`, decision diagnostics show provenance.

Acceptance criteria:
- Router decision detail (and list row when space allows) includes benchmark provenance when `observed.judge_score` or diagnostics cite quality from benchmark profiles:
  - Score value and `measuredAtMs`
  - `lastRunId` when available from summary linkage
  - Link to Models → Benchmark
- No new scoring logic; display-only augmentation of existing diagnostics payload

### `B10` Cross-links across surfaces

Description:
Operators can navigate the benchmark ↔ routing loop without memorizing URLs.

Acceptance criteria:
- Models → Benchmark → **View candidate profiles** → `/app/router/candidates` (existing link retained)
- Models → Benchmark → **View difficulty advisory** → `/app/router/strategy`
- Router → Candidates capability cells → Models → Benchmark
- Models inventory (`control-models.tsx`) row or inspect modal shows **Capability: NN%** when `benchmarkCapability.overallScore` exists, linking to Benchmark last-run context for that endpoint
- All user-visible path copy uses **Models → Benchmark** naming

## Implementation Slices

### SP10-A — Information architecture (`R-IA1`–`R-IA4`)

Files:

- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - document Models pillar three-tab layout
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `controlBenchmarkRoute`; extend `runtimeNavigationSections` Models items
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - three Models tabs; benchmark route resolution
- `/role-model-router/apps/runtime-ui/app/routes.ts`
  - optional `control/benchmark` legacy redirect route
- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
  - ensure page metadata uses Models section route definition (eyebrow via shell)

Verification:

- `design-system.test.ts` RED then GREEN
- Manual: Models pillar shows three section tabs; Benchmark tab navigates to `/app/models/benchmark`

### SP10-B — Summary and preferences APIs (`B1`, `B2`, `B3`)

Files:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `GET /api/role-model/benchmark/summary`
  - `GET|PUT /api/role-model/benchmark/preferences`
  - extend router candidates handler with `benchmarkCapability`
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-artifacts.ts`
  - helper to read latest completed manifest + aggregate subject scores
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - preference field for `benchmark.judgeEndpointId` (or equivalent namespace)
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - types and fetchers for summary, preferences, extended candidates
- Bridge tests under `apps/runtime-host-bridge/test/`

Verification:

- Fixture-based test for summary from `benchmark-runs/<runId>/manifest.json`
- Candidates API test includes `benchmarkCapability` when profile has `judge_score`

### SP10-C — Models → Benchmark page (`B4`, `B5`, `B6`, `B10`)

Files:

- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
  - routing explainer panel
  - last-run summary from B1 API
  - preference load/save via B2 API
  - judge label/copy updates; link to Strategy
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - capability badge/link per model row when B3 data present

Verification:

- UI test or component test for summary empty vs populated states
- Manual: reload page retains judge preference; last run `32750042` scores visible without re-running

### SP10-D — Router surfaces (`B7`, `B8`, `B9`, `B10`)

Files:

- `/role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
  - capability column
- `/role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
  - advisory breakdown panel
- `/role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx` (and list if applicable)
  - benchmark provenance display

Verification:

- Manual QA on `:8091` or packaged `:3456`: Candidates show Kimi 50% / LFM 33% after run `32750042` profiles persisted
- Strategy page shows quality threshold context for difficulty mode

### SP10-E — Validation evidence

Verification:

- Record evidence under `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-routing-visibility-validation.json`
- Screenshot or manual QA addendum reference for Models three-tab nav + Candidates capability column
- Reuse existing dual-run `32750042` artifacts as baseline; no new benchmark run required for IA/API slice acceptance unless profiles were cleared

## Out of Scope

- `OOS-B1`: Changing routing-capability suite prompts, rubrics, or case definitions
- `OOS-B2`: Replacing difficulty routing algorithm or `getQualityMetric` weighting
- `OOS-B3`: Hardcoding Kimi k2.6 or any vendor model as default judge
- `OOS-B4`: Overview dashboard endpoint comparison cards (deferred v2)
- `OOS-B5`: Editing locked run-36 Phase 0–5 artifacts for R1–R6; this addendum supplements only
- `OOS-B6`: Scaffold iteration to raise Kimi/LFM benchmark scores (separate improvement track)

## Traceability (planned)

| Requirement | Primary files |
| --- | --- |
| R-IA1–R-IA4 | `design-system.ts`, `DESIGN_SYSTEM.md`, `routes.ts`, `control-benchmark.tsx` |
| B1, B2 | `runtime-host-bridge/index.ts`, `benchmark-artifacts.ts`, `unified-runtime-config.ts` |
| B3 | `runtime-host-bridge/index.ts`, `runtime-api.ts`, `profile-aggregator` (read path) |
| B4–B6, B10 | `control-benchmark.tsx`, `control-models.tsx` |
| B7–B9, B10 | `router-candidates.tsx`, `control-routing-strategy.tsx`, `router-decision-detail.tsx` |

## Dependency Notes

- Judge artifact layout and manifest fields from run 35 addendum 02 (A5–A12) are prerequisites for B1 summary accuracy.
- Run `32750042` evidence demonstrates scores are trustworthy enough to surface in routing UI without misleading parse-failure zeros.
- Implementation may proceed SP10-A immediately (IA-only); SP10-B–D require runtime restart after bridge changes.

## Coverage Gate

- [x] R-IA1–R-IA4 and B1–B10 each have observable acceptance criteria
- [x] Requirements mapped to implementation slices SP10-A–SP10-E
- [x] Fixed decisions record Models pillar placement and no hardcoded judge
- [x] Out-of-scope boundaries prevent rubric and algorithm drift
- [x] Inputs include judge remediation evidence and current AS-IS file references
- [x] User approval of this addendum artifact

Coverage: PASS

## Approval Gate

- [x] User confirms addendum scope and Models \| Roles \| Benchmark IA
- [x] User confirms judge preference persistence approach (sidecar `benchmark-preferences.json` in runtime state dir)
- [x] Implementing phase declares TDD mode for SP10-A (strict) and SP10-B (strict)

Approval: PASS
