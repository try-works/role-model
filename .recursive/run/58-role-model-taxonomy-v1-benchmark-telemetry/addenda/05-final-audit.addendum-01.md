# Final Audit: Run 58 Implementation vs Proposal vs Run 57

**Date:** 2026-06-27 | **Auditor:** Session 260626-still-diamond

---

## 1. Proposal Phase 5 — Benchmark Deliverables

| # | Deliverable | Implemented | Evidence | Gaps |
|---|---|---|---|---|
| 1 | Benchmark suite/case/run/result/aggregate schemas | ✅ | 4 schema files under `schemas/role-model/taxonomy/`, AJV-validated | — |
| 2 | Tag benchmark cases with taxonomy IDs | ✅ | 15 cases tagged, all 4 minimums: coder.review ×2, researcher.compare_sources ×1, support.ticket.reply ×1, data.schema.review ×1 | — |
| 3 | Aggregate scores by 6 dimensions | ✅ | `computeTaxonomyAggregates` in `benchmark-summary.ts`, live-verified with all 6 dimensions populated | Scores are 0 because remote models can't execute without LiteLLM vendor (environment limitation) |
| 4 | Extend `/app/models/benchmark` with taxonomy filters | ✅ | SectionCard with role/task/capability dropdowns in `control-benchmark.tsx`, UI compiles | — |
| 5 | Expose recommendation state to `/app/models` as advisory | ⚠️ | Advisory score label on model cards ("Advisory: scores X% on routing capability benchmark") | NOT "This model scores 0.95 on coder.review benchmarks" — task-specific scores not shown because models scored 0 |

### Proposal Phase 5 Acceptance Criteria

| Criterion | Status | Detail |
|---|---|---|
| Rebuild runtime + Pi package | ⚠️ | Runtime rebuilt and deployed. Pi package rebuilt (tsc passes). Pi NOT updated to run 58 version — still uses run 57 extension |
| Send benchmark-covered requests | ⚠️ | 5 classified requests sent via curl, 5 via Pi. No taxonomy classification metadata in Pi requests |
| Benchmark results visible in UI | ✅ | Benchmark summary API serves taxonomy scores, UI compiles |
| Benchmark signals affect routing after hard filtering | ✅ | Router code: hard filter → benchmark scoring. Tested with 7 unit tests |
| No retroactive Phase 1-4 changes | ✅ | No role assignment semantics modified |

---

Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `5546885c03b2cb41a35f02a93ceff6cb6df99796478120a0a6af45a840653631`

## 2. Proposal Phase 6 — Telemetry Deliverables

| # | Deliverable | Implemented | Evidence | Gaps |
|---|---|---|---|---|
| 1 | Telemetry event schema | ✅ | `telemetry-taxonomy-event.schema.json`, AJV-validated | — |
| 2 | Record taxonomy dimensions on telemetry | ✅ | `extractTaxonomyDimensions` in protocol-types, `taxonomyDimensions` on `RuntimeObservationBundle`, `privacyReceipt` on bundle | Dimensions NOT populated in live telemetry because Pi (run 57) doesn't inject classification metadata |
| 3 | Add taxonomy analytics to Observe routes | ✅ | `taxonomyRoleId`/`taxonomyTaskType` in `BridgeTelemetryAnalyticsDimension`, filter inputs on `observe-routing.tsx`, URL-addressable filters | Observe-activity (requests page) not extended with taxonomy filters |
| 4 | Privacy/retention/sampling/redaction | ⚠️ | `privacyReceipt` struct with `samplingRate`, `retentionTtlHours`, `retainUntil`. `runRetentionCleanup()` with indexed DELETE. `retain_until_ms` column migration | Redaction level enforcement not tested, sampling enforcement not implemented, taxonomy dimensions NEVER redacted per R11 |
| 5 | Production performance rollups in UI | ⚠️ | Model cards: advisory score label. `fetchModelTelemetryRollup` API function. Per-task breakdown DisclosureSection in model inspect | Live rollup shows static requestCount/roleIds, not per-task success/latency from telemetry query (needs live telemetry data) |

### Proposal Phase 6 Acceptance Criteria

| Criterion | Status | Detail |
|---|---|---|
| Telemetry dimensions visible in dashboards | ⚠️ | API supports dimensions. UI has filter inputs. No live data to populate because Pi classification isn't running |
| Telemetry signals do not silently change eligibility | ✅ | Router: telemetry penalty applied after hard filters, advisory only. 3 unit tests verify |
| Privacy/retention/redaction | ⚠️ | Infrastructure in place, enforcement not tested live |

---

## 3. E2E Test Case Coverage

| E2E Case | Code | Test | Live | Gap |
|---|---|---|---|---|
| P5-001 (tags) | ✅ | ✅ | ✅ Live: 15 tagged cases | — |
| P5-002 (run) | ✅ | ✅ | ✅ Live: benchmark executed | Scores 0 (no remote execution) |
| P5-003 (dashboard) | ✅ | ✅ | ⚠️ | UI compiles, not inspected via browser |
| P5-004 (routing) | ✅ | ✅ | ❌ | Needs non-zero benchmark scores |
| P5-005 (hard constraints) | ✅ | ✅ | ❌ | Needs non-zero benchmark scores |
| P5-006 (Pi guidance) | ✅ | ✅ | ❌ | Pi extension not updated to run 58 |
| P6-001 (telemetry dims) | ✅ | ✅ | ❌ | Pi not injecting classification |
| P6-002 (failure) | ✅ | ✅ | ❌ | Not tested live |
| P6-003 (dashboards) | ✅ | ✅ | ⚠️ | API supports, UI has filters, no live data |
| P6-004 (model rollup) | ⚠️ | ⚠️ | ❌ | Static rollup, not live per-task |
| P6-005 (privacy) | ⚠️ | ⚠️ | ❌ | Infrastructure exists, not tested live |
| P6-006 (advisory) | ✅ | ✅ | ❌ | Needs telemetry data |
| P6-007 (Pi diagnostics) | ✅ | ✅ | ❌ | Pi extension not updated |

**Summary: 13/13 code-ready, 11/13 test-verified, 2/13 live-verified, 0/13 fully live-verified with Pi**

---

## 4. Systematicity Gaps

| # | Gap | Severity | Detail |
|---|---|---|---|
| S1 | Duplicate extraction functions | Medium | `extractTaxonomyDimensions` in protocol-types AND `extractTaxonomyFields` in observability. Cross-referenced via `@see` but still two implementations |
| S2 | No centralized dimension registry | Medium | Adding a 7th dimension requires touching 12+ files. No compiler-enforced coverage |
| S3 | Extraction not re-exported from public API | Low | Both `benchmark-linkage.ts` and `telemetry-linkage.ts` re-exported from `taxonomy/index.ts` (SP-A1) |
| S4 | Hardcoded blend weights (was) | Low | Now configurable via `ObservedDataConfigRecord` (SP-A3) |
| S5 | `retain_until_ms` migration | Low | Column added with backward-compatible `ALTER TABLE ADD COLUMN`. Cleanup uses indexed DELETE (SP-B3) |
| S6 | R10 telemetry rollup static | Medium | Model detail shows static data (requestCount, roleIds), not live per-task telemetry query |

---

## 5. Future-Proofing Gaps

| # | Gap | Severity | Detail |
|---|---|---|---|
| F1 | Taxonomy V2 upgrade | Medium | Adding a new dimension requires touching schemas, types, router, UI, telemetry, and bootstrap — 12+ files. No registry to reduce this |
| F2 | Benchmark suite extensibility | Low | All schemas have `additionalProperties: true`. Custom benchmark suites can add fields |
| F3 | Telemetry version upgrade | Low | `taxonomy_version` and `classification_contract_version` preserved in extraction and telemetry records |
| F4 | LiteLLM vendor dependency | High | Remote model execution requires the `litellm` Python binary. Not available in QA environment. No fallback direct adapter for OpenAI-compatible providers |
| F5 | Pi extension not updated | Medium | Pi uses run 57 pi-role-model. Run 58's taxonomy classification won't take effect until Pi is updated to the run 58 extension |

---

## 6. Run 57 Requirements Compliance

| Constraint | Status |
|---|---|
| No modifying run 57 role assignment semantics | ✅ |
| No new top-level UI routes | ✅ |
| No hidden model calls | ✅ |
| No Pi runtime ownership | ✅ |
| Benchmark/telemetry affect routing only after hard eligibility | ✅ Verified in 7 unit tests |
| No credential reads/copies | ✅ |
| No changing canonical taxonomy V1 | ✅ |

---

## 7. Summary

### Strengths
- 257+ tests across 7 packages, all green
- All 4 taxonomy schemas validated with AJV
- 6-dimension taxonomy aggregation proven live
- Telemetry API taxonomy dimensions supported
- Router blend weights configurable
- Retention cleanup with indexed DELETE
- Difficulty classifier fallback fix (SP-C1)

### Critical Gaps
1. **F4: No remote execution without LiteLLM** — benchmark scores always 0, chat fails. Core deliverable (scored benchmarks) blocked by environment
2. **F5: Pi extension not updated** — taxonomy classification metadata not injected, telemetry dimensions empty
3. **P6-004: Model rollup incomplete** — shows static data, not live per-task telemetry

### Systemic Weaknesses
1. **S1+S2: 12 files to touch per new dimension** — no centralized registry with compiler enforcement
2. **F4: LiteLLM vendor dependency** — single point of failure for all remote execution
3. **E2E coverage: 2/13 live-verified** — code is ready, deployment/integration is not
