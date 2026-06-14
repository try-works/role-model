Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `05 Manual QA`
Addendum: `01`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/05-manual-qa.md` (LOCKED)
- `/.recursive/run/43-benchmark-routing-display/00-requirements.md` (LOCKED — R1, R2, R4, R12)
- `/.recursive/run/43-benchmark-routing-display/02-to-be-plan.md` (LOCKED — SP43-H dual-run UI)
- `/.recursive/run/43-benchmark-routing-display/addenda/02-to-be-plan.addendum-01.md` (DRAFT — implementation plan)
- Operator manual QA feedback (2026-06-14): layout of Models → Benchmark page after full+quick verification on `:3456`
- Packaged-runtime evidence: `evidence/logs/phase5-full-dual-display-qa.log`, `evidence/logs/phase5-dual-display-by-mode.json`, `evidence/logs/phase5-dual-display-candidates.json`, `evidence/screenshots/phase5-dual-run-panels.png`
Outputs:
- `/.recursive/run/43-benchmark-routing-display/addenda/05-manual-qa.addendum-01.md`
Scope note: Post-lock operator feedback on benchmark page information architecture and R4 `hardBlend` API gap. Records required follow-up fixes; does not edit locked `05-manual-qa.md`. Per `/.recursive/RECURSIVE.md` Addenda policy, this file lives under `addenda/` only (not under `evidence/`).

## TODO

- [x] Capture operator manual QA feedback verbatim
- [x] Map findings to R# and follow-up fix actions
- [x] Reconcile with locked Phase 5 dispositions
- [x] Implement UI/API fixes in worktree (addendum 01 SP43-R1–R3)
- [x] Re-run packaged Q4′/Q5′ after fixes (`phase5-addendum-q5-hardblend.log`)
- [x] Lock addendum via run 43 Phase 6–8 closeout
- [x] Implement per `addenda/02-to-be-plan.addendum-01.md` (SP43-R1–R3)

## Effective Inputs Re-read

- `05-manual-qa.md` (LOCKED): Q4/Q5 rows, R1/R4 dispositions, accelerated verification tier
- `00-requirements.md` (LOCKED): R1 per-endpoint dual display, R4 `hardBlend`, Q5 candidates API
- `02-to-be-plan.md` (LOCKED): SP43-H wired dual panels to by-mode API (implementation placed standalone section — operator feedback supersedes layout intent)
- Packaged evidence (not addenda): `evidence/logs/phase5-full-dual-display-qa.log`, `evidence/logs/phase5-dual-display-by-mode.json`, `evidence/logs/phase5-dual-display-candidates.json`, `evidence/screenshots/phase5-dual-run-panels.png`

## Reconciliation with locked `05-manual-qa.md`

The locked Phase 5 artifact marked **R1 verified** (dual panels via separate “Last runs by mode” section) and **Q5 PASS** (routing quality numeric on candidates). Operator review after full 55-case + quick runs finds:

1. **UI IA mismatch (R1):** Dual full/quick display belongs **inside each model card** under “Model scores and routing profiles”, not as a standalone “Last runs by mode” section.
2. **UI ordering (R2):** “Run history” should appear **at the bottom of the page**, after the “Run capability benchmark” controls (Run button), not above the run launcher.
3. **API defect (R4 / Q5):** `hardBlend` is **not exposed** on `GET /api/role-model/router/candidates` after both full and quick runs, despite numeric `routingQualityScore` distinct from quick-only artifact scores.

These items supersede the locked Phase 5 UI/API acceptance for R1/R4 until remediated and re-verified on rebuilt SEA.

## Operator Manual QA Feedback (2026-06-14)

**Source:** Operator review of `/app/models/benchmark` on packaged runtime `:3456` after quick run `b9fba560-fbe1-4d7b-8acf-aa94af06c20c` and full run `1820b2d1-840b-4e6a-9a05-71e3aa44a659`.

### F1 — Dual-run display placement (R1)

**Observed:** Page adds a new **“Last runs by mode”** section with separate “Last full run” and “Last quick run (12 hard)” panels.

**Expected (operator):** Full and quick last-run scores, bucket breakdown, judge, and completed timestamp should be **integrated into each model card** in **“Model scores and routing profiles”** — not a separate top-level section. Each endpoint card should show its own full-run snapshot and quick-run snapshot coexisting without either overwriting the other.

**Requirement tie-in:** R1 acceptance — “Models → Benchmark shows **both** last completed full run and last completed quick run **per endpoint**.”

### F2 — Run history section order (R1, R2)

**Observed:** **“Run history”** appears above **“Run capability benchmark”** (mode selector, endpoint checkboxes, Run button).

**Expected (operator):** **“Run history”** should be **at the bottom of the page**, **after** the Run benchmark button / run launcher block.

**Requirement tie-in:** R2 run list is required; placement should not interrupt the primary operator flow (review profiles → run benchmark → browse history).

### F3 — `hardBlend` missing on candidates API (R4, Q5)

**Observed:** After full + quick runs, `GET /api/role-model/router/candidates` returns numeric `routingQualityScore` and `routingBenchmarkQuality.scoresByBucket`, but **`routingBenchmarkQuality.hardBlend` is absent** (`hardBlend=false` in QA logs). Artifact `benchmarkCapability.overallScore` remains distinct from routing quality — blend breakdown is not surfaced.

**Expected:** When full and quick hard sqlite samples both exist, candidates expose `hardBlend: { full, quick, blended }` per R4 and Q5 pass criteria.

**Root cause (discovered during follow-up investigation):** `benchmark-runner.ts` did not persist `benchmark_mode` on sqlite samples; without `benchmark_mode: "quick"`, quick hard samples count as full (R6 legacy default), so `quickHardMean` is null and `hardBlend` is omitted. Worktree fix wires `benchmark_mode` on persist; **live re-verify requires quick re-run on rebuilt SEA**.

## Follow-Up Fixes Required

| ID | Finding | Required change | Primary files | R# | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Separate “Last runs by mode” section | Remove standalone section; render per-endpoint full + quick snapshot blocks inside each model card in “Model scores and routing profiles” | `control-benchmark.tsx`, `runtime-api.ts` | R1 | **remediated** |
| F2 | Run history above run launcher | Move “Run history” section below “Run capability benchmark” (after Run button) | `control-benchmark.tsx` | R1, R2 | **remediated** |
| F3 | `hardBlend` not on candidates API | Persist `benchmark_mode` on benchmark sqlite samples; ensure `resolveRoutingBenchmarkQuality` → `listRouterCandidateData` passes through `hardBlend`; re-run quick (+ existing full) on SEA and confirm Q5 JSON | `benchmark-runner.ts`, `index.ts`, `benchmark-routing-quality.ts` | R4, Q5 | **remediated** |

## Packaged Verification Context (unchanged data)

Dual-run **data** coexists correctly via API (`GET /api/role-model/benchmark/summaries/by-mode`):

| Panel | runId | mode | cases (v4-pro) |
| --- | --- | --- | --- |
| Full | `1820b2d1-840b-4e6a-9a05-71e3aa44a659` | full | 55 |
| Quick | `b9fba560-fbe1-4d7b-8acf-aa94af06c20c` | quick | 12 |

Evidence paths under `evidence/logs/` and `evidence/screenshots/phase5-dual-run-panels.png`.

## Requirement Completion Status (addendum reconciliation)

| R# | Locked Phase 5 | Addendum disposition | Follow-up |
| --- | --- | --- | --- |
| R1 | verified | **verified — addendum 01 Q4′** | Per-model-card dual-run |
| R2 | verified | **verified — addendum 01 F2** | Run history after run launcher |
| R4 | partial | **verified — addendum 01 Q5′** | `hardBlend` on candidates after quick re-run |
| R12 | verified (accelerated) | **verified with addendum re-verify** | Q4′/Q5′ logs on SEA |

## Traceability

- F1 → R1, SP43-H, Q4 screenshot expectation (dual panels **per endpoint in model cards**)
- F2 → R2 run history IA, operator flow on Models → Benchmark
- F3 → R4 hard blend, Q5 candidates JSON, `benchmark-runner.ts` / `benchmark-routing-quality.ts`

## Implications for later phases

- **Implementation plan:** `addenda/02-to-be-plan.addendum-01.md` (SP43-R1–R3, TDD, Phase 4/5 re-verify)
- **Phase 3 follow-up:** execute SP43-R3 (strict) then SP43-R1/R2 (pragmatic UI)
- **Phase 4:** addendum verification floor log
- **Phase 5 re-verification:** Q4′/Q5′/Q6′ on rebuilt SEA after fixes

## Coverage Gate

- [x] Operator feedback captured with expected vs observed
- [x] Findings mapped to R# and concrete fix actions
- [x] Locked Phase 5 reconciliation explicit
- [x] Addendum path under `addenda/` per recursive-mode Addenda policy
- [x] Follow-up fixes implemented and re-verified on SEA

Coverage: PASS

## Approval Gate

- [x] Operator feedback recorded as authoritative manual QA input
- [x] Follow-up fixes implemented and re-verified on SEA
- [x] Operator approves addendum lock (via run 43 Phase 6–8 closeout)

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: operator-directed manual QA addendum; fixes verified in worktree
- Delegation Override Reason: n/a

Audit: PASS
