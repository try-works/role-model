Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `02 To-Be Plan`
Addendum: `01`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/00-requirements.md` (LOCKED — R1, R2, R4, R12)
- `/.recursive/run/43-benchmark-routing-display/02-to-be-plan.md` (LOCKED — SP43-H superseded for layout)
- `/.recursive/run/43-benchmark-routing-display/addenda/05-manual-qa.addendum-01.md` (DRAFT — F1–F3)
- `/.recursive/run/43-benchmark-routing-display/00-worktree.md` (LOCKED)
Outputs:
- `/.recursive/run/43-benchmark-routing-display/addenda/02-to-be-plan.addendum-01.md`
Scope note: Implementation plan for manual QA addendum F1–F3. Worktree-only run control plane. Supplements locked `02-to-be-plan.md` without editing it.

## TODO

- [x] Map F1–F3 to implementation slices with TDD mode
- [x] Define RED/GREEN evidence paths under worktree `evidence/logs/`
- [x] Define Phase 4 automated checks and Phase 5 re-verification (Q4, Q5, Q6)
- [ ] Execute slices in worktree (Phase 3 follow-up)
- [ ] Lock addendum after implementation + verification

## Effective Inputs Re-read

- `05-manual-qa.addendum-01.md`: F1 model-card dual-run, F2 run history order, F3 `hardBlend` on candidates
- Locked `02-to-be-plan.md` SP43-H placed standalone “Last runs by mode” — **superseded** by F1/F2 layout in this addendum
- Locked `00-requirements.md` R1 per-endpoint dual display, R4 blend, Q5 candidates JSON

## Problem statement

Packaged QA on `:3456` proved dual-run **data** (by-mode API) but operator feedback and R1 intent require:

1. Full + quick snapshots **inside each model card**, not a page-level “Last runs by mode” section (F1).
2. **Run history** after the run launcher, not above it (F2).
3. **`hardBlend`** on `GET /api/role-model/router/candidates` when full + quick hard sqlite samples exist (F3).

## Requirement delta

| ID | Finding | Maps to | Disposition |
| --- | --- | --- | --- |
| F1 | Standalone dual-run section | R1, Q4 | remediate |
| F2 | Run history above launcher | R1, R2, Q6 | remediate |
| F3 | `hardBlend` absent on candidates | R4, Q5 | remediate |

## Worktree execution context

| Field | Value |
| --- | --- |
| Worktree | `D:\DEV\role-model\.worktrees\43-benchmark-routing-display` |
| Branch | `recursive/43-benchmark-routing-display` |
| Run control plane | `/.recursive/run/43-benchmark-routing-display/` **in worktree only** |
| Product paths | `role-model-router/apps/runtime-ui/...`, `role-model-router/apps/runtime-host-bridge/...`, `role-model-router/packages/...` |

## Implementation slices

### SP43-R1 — Model-card dual-run display (F1)

**TDD mode:** pragmatic (layout refactor; API already green from SP43-A)

| Step | Action |
| --- | --- |
| Pragmatic | Remove `SectionCard` “Last runs by mode” block from `control-benchmark.tsx` |
| Pragmatic | For each `modelScoreRows` entry, resolve subject from `summariesByMode.full` and `summariesByMode.quick` by `endpointId` |
| Pragmatic | Render per-card blocks: **Last full run** (score, easy/medium/hard, judge, completed) and **Last quick run (12 hard)** with explicit empty state when mode missing |
| Pragmatic | Keep global “Last completed run” banner honest (mode + case count); do not imply other mode absent |
| Compensating | New `runtime-ui` test: fixture with both modes → rendered output contains per-endpoint full + quick labels and does **not** contain top-level “Last runs by mode” |
| Compensating | Phase 5 screenshot: model cards showing both modes for ≥1 endpoint |

**Primary files:**

- `apps/runtime-ui/app/routes/control-benchmark.tsx`
- `apps/runtime-ui/app/lib/benchmark-model-cards.ts` (new helper — optional if inline stays readable)
- `apps/runtime-ui/app/lib/benchmark-model-cards.test.ts` (new)

**Log:** `evidence/logs/green/sp43-r1-model-card-dual-run.green.log`

---

### SP43-R2 — Section order (F2)

**TDD mode:** pragmatic (DOM order only)

| Step | Action |
| --- | --- |
| Pragmatic | Reorder JSX in `control-benchmark.tsx`: (1) Model scores and routing profiles, (2) Run capability benchmark + Run button, (3) Run history + global clear |
| Pragmatic | Move “Clear all benchmark data” with run history section at page bottom |
| Compensating | Test asserts section order via exported `BENCHMARK_SECTION_ORDER` constant or snapshot of render order markers |
| Compensating | Phase 5 manual check: history visually below Run button |

**Primary files:**

- `apps/runtime-ui/app/routes/control-benchmark.tsx`
- `apps/runtime-ui/app/lib/benchmark-model-cards.test.ts` (extend order assertion)

**Log:** `evidence/logs/green/sp43-r2-section-order.green.log`

---

### SP43-R3 — `benchmark_mode` persist + live `hardBlend` (F3)

**TDD mode:** strict (Iron Law)

| Step | Action |
| --- | --- |
| RED | `sqlite-memory/test`: persist benchmark sample with `benchmark_mode: "quick"` → readback retains field — **fail** if missing on baseline |
| RED | `benchmark-runner` or bridge test: after simulated full + quick hard samples, `resolveRoutingBenchmarkQuality` / candidate enrichment exposes `hardBlend` — extend `benchmark-candidates-routing-quality.test.ts` with sqlite-backed or runner fixture if needed |
| GREEN | `benchmark-runner.ts` `toObservedSample`: set `benchmark_mode: input.benchmarkMode` (partial fix may exist — verify GREEN) |
| GREEN | Confirm `listRouterCandidateData` passes full `routingBenchmarkQuality` object including `hardBlend` (no stripping) |
| Log RED | `evidence/logs/red/sp43-r3-hardblend-persist.red.log` |
| Log GREEN | `evidence/logs/green/sp43-r3-hardblend-persist.green.log` |

**Primary files:**

- `apps/runtime-host-bridge/src/benchmark-runner.ts`
- `packages/sqlite-memory/src/index.ts` (read path if needed)
- `packages/sqlite-memory/test/index.test.ts`
- `apps/runtime-host-bridge/test/benchmark-candidates-routing-quality.test.ts`
- `packages/profile-aggregator/src/benchmark-routing-quality.ts` (verify-only unless bug found)

---

## TDD compliance summary

| Slice | TDD mode | RED required | GREEN / compensating |
| --- | --- | --- | --- |
| SP43-R1 | pragmatic | no | `benchmark-model-cards.test.ts` + Q4 screenshot |
| SP43-R2 | pragmatic | no | section-order test + Phase 5 layout check |
| SP43-R3 | strict | yes | sqlite + bridge tests + Q5 JSON on SEA |

## Phase 4 verification floor (addendum)

Run from worktree `role-model-router/`; logs under worktree `evidence/logs/green/`:

| Command | Slice | Pass criteria |
| --- | --- | --- |
| `corepack pnpm --filter @role-model-router/sqlite-memory test -- benchmark_mode` | SP43-R3 | readback retains `benchmark_mode` |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge test -- benchmark-candidates-routing-quality` | SP43-R3 | `hardBlend` object present in fixture |
| `corepack pnpm --filter @role-model-router/runtime-ui test -- benchmark-model-cards` | SP43-R1,R2 | no “Last runs by mode”; per-card dual-run; section order |
| `corepack pnpm --filter @role-model-router/runtime-ui test` | regression | existing 99 tests pass |

Aggregate log: `evidence/logs/green/phase4-addendum-verification-floor.green.log`

## Phase 5 re-verification (addendum, R12)

**Prerequisite:** `corepack pnpm run runtime:package-sea` from worktree; restart on `:3456` with `scope-id run43-verify`.

| ID | Scenario | Pass criteria | Evidence |
| --- | --- | --- | --- |
| Q4′ | Dual-run in model cards | Each endpoint card shows full + quick snapshots; no standalone “Last runs by mode” section | `evidence/screenshots/phase5-addendum-model-cards-dual-run.png` |
| Q5′ | `hardBlend` on candidates | After **re-run quick** (full may remain), `GET .../router/candidates` includes `routingBenchmarkQuality.hardBlend` with `full`, `quick`, `blended` | `evidence/logs/phase5-addendum-q5-hardblend.log` |
| Q6′ | Run history order | Run history section appears below Run benchmark control in UI | screenshot or DOM note in same log |

**Note:** Pre-fix quick sqlite samples lack `benchmark_mode`; Q5′ requires quick re-run on rebuilt SEA after SP43-R3 GREEN.

Script: `evidence/scripts/phase5-addendum-verify.ps1` (to create during Phase 5 re-run).

## Implementation order

1. SP43-R3 strict RED → GREEN (unblocks Q5′)
2. SP43-R1 + SP43-R2 pragmatic UI (can parallelize after R3 GREEN if no shared file conflicts)
3. Phase 4 addendum floor log
4. SEA rebuild + Q4′/Q5′/Q6′
5. Update `05-manual-qa.addendum-01.md` disposition; lock addenda

## Traceability

| R# | Slice | Verification |
| --- | --- | --- |
| R1 | SP43-R1, SP43-R2 | model-card test + Q4′ screenshot |
| R2 | SP43-R2 | section order test + Q6′ |
| R4 | SP43-R3 | strict tests + Q5′ |
| R12 | Phase 5 re-run | Q4′, Q5′, Q6′ on SEA |

## Out of scope

- Re-running full 55-case suite (optional; not required for addendum closure)
- Editing locked `02-to-be-plan.md`, `05-manual-qa.md`, or main-repo `.recursive/run/` copies

## Coverage Gate

- [x] F1–F3 mapped to slices SP43-R1–R3
- [x] TDD mode declared per slice with RED/GREEN paths
- [x] Phase 4 and Phase 5 re-verification matrix defined
- [ ] Slices executed in worktree

Coverage: PASS

## Approval Gate

- [x] Supplements locked plan via addendum only (worktree path)
- [ ] Operator approves plan before implementation lock (superseded by run 43 Phase 6–8 closeout)

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: operator-requested addendum implementation plan; self-authored
- Delegation Override Reason: n/a

Audit: PASS
