# Benchmark Workflow (Canonical)

This document is the **source of truth** for routing-capability benchmark operations: environment setup, execution, grading, compare, validation gates, and evidence recording.

Run-local remediation plans and requirement IDs live under `/.recursive/run/<run-id>/addenda/`. When this document and a run addendum disagree on **process**, this document wins. When an addendum defines **code requirements** not yet reflected here, implement per addendum and update this document in Phase 7/8.

**Related docs**

- Protocol role of benchmarks: `/docs/protocol/benchmarks.md`
- Operator hardening playbook: `/docs/operations/01-router-runtime-hardening-playbook.md`
- Run 36 addenda chain: judge scoring audit (06), reliability (07), accuracy (08), workflow safeguards (09)

---

## Purpose and success criteria

**Product goal:** grading **accuracy and auditability** for user-selected endpoints — not any model winning.

**Control check (run health only):** when the operator benchmarks Kimi k2.6 vs LFM 1.2B (typical inventory), Kimi should rank higher on a *healthy* run. **Kimi ≤ LFM** means investigate judge exhaustion, fallback inflation, parse failures, or setup errors — **not** LFM superiority.

**Model-agnostic rule:** no hardcoded judge or subject model IDs in code or automation. Users select endpoints via the Benchmark UI dropdown. Scripts resolve endpoints dynamically from `GET /api/role-model/endpoints`.

---

## Pipeline overview

```
Phase 0  Environment gate
Phase 1  Endpoint inventory (configure + activate)
Phase 2  Preflight probes
Phase 3  Run configuration
Phase 4  Execution (subjects)
Phase 5  Grading (judge per case)
Phase 6  Compare (cross-subject per case)
Phase 7  Post-run validation
Phase 8  Evidence record
```

Progress phases exposed by the API: `execution` → `grading` → `compare` → `complete`.

Quick mode with two subjects and judge enabled: **60 steps** (24 execution + 24 grading + 12 compare).

---

## Phase 0 — Environment gate

| Step | Action | Gate |
| --- | --- | --- |
| 0.1 | `GET /api/role-model/health` → 200 | Abort if down |
| 0.2 | Record `runtimeSha256`, `scopeId`, state root | Rebuild with wrong scope → empty endpoints |
| 0.3 | Local peer models reachable (`GET :1234/v1/models` or configured peer URL) | Subject execution fails |
| 0.4 | `GET /api/role-model/accounts` — OAuth `active` + `healthy` | Refresh token before long runs |
| 0.5 | `GET /api/role-model/runtime/summary` — `endpointCount ≥ 2` | Else Phase 1 |

**Activation ≠ configuration:** healthy accounts and saved peers are insufficient until models are activated via `POST /api/role-model/endpoints`.

---

## Phase 1 — Endpoint inventory

| Step | Action | Gate |
| --- | --- | --- |
| 1.1 | `PUT /api/role-model/local/peers` | Peer health passes |
| 1.2 | Provider accounts present | `connectedWithoutEndpointCount = 0` after activation |
| 1.3 | `POST /api/role-model/endpoints` per subject model | `GET /endpoints` lists healthy rows |
| 1.4 | Select judge endpoint (prefer **not** in subject list) | Document in run config |
| 1.5 | Smoke chat per endpoint | Non-empty deliverable |

**Script rule:** resolve endpoint IDs from live `GET /endpoints` by `sourceType` + `modelId` substring. Never hardcode peer UUIDs.

---

## Phase 2 — Preflight probes

| Step | Action | Gate |
| --- | --- | --- |
| 2.1 | `POST /benchmark/runs` with `preflightProbe: true` | Warn on probe failure |
| 2.2 | Probe returns parseable `{"score":…,"rationale":…}` | Recommend abort if fails twice |
| 2.3 | Spot-check `gradingBrief` for representative cases | All contract fields present |

---

## Phase 3 — Run configuration

| Field | Requirement |
| --- | --- |
| `mode` | `quick` (12 cases) or `full` |
| `endpointIds` | ≥ 2 when compare expected |
| `judgeEndpointId` | User-selected; recorded in evidence |
| `useJudge` | `true` for accuracy validation |
| `preflightProbe` | `true` for operator validation runs |

---

## Phase 4 — Execution

| Safeguard | Requirement |
| --- | --- |
| Subject system prompt | Model-agnostic structured JSON/code deliverable (suite-level) |
| Multi-turn follow-up | When subject returns reasoning-only |
| Tool capture | `structuredToolNames` from API `tool_calls` |
| Artifacts | `responses/<endpoint>/<case>.json` with `formattedDeliverable` |

**Gate:** `manifest.responseCount === endpoints × cases`.

---

## Phase 5 — Grading

**Order:** judge-as-subject endpoint graded first (`orderEndpointsForGrading`).

### Judge context contract (mandatory every judge/compare call)

Persisted as `gradingBrief` on judge attempt artifacts (**100%** target).

| Field | Purpose |
| --- | --- |
| `questionTranscript` | Full multi-turn messages |
| `exemplarAnswer` | Expected / example deliverable |
| `exemplarQuality` | `authored` or `derived` |
| `deliverablesChecklist` | MUST/SHOULD from criteria + tools + schema |
| `antiPatterns` | Placeholders, prose-as-code, fake tools |
| `answerFormatInstruction` | JSON/code fence rules |
| `gradingCriteria` | Authoritative rubric |
| Subject deliverable | `formattedDeliverable` only — not CoT |

### Runtime safeguards

| Safeguard | Behavior |
| --- | --- |
| Adaptive throttle | `max(2s, 0.1 × last_success_latency)` |
| Circuit breaker | 3 consecutive failures → backoff; `judgeCircuitOpen` on artifact |
| Response channels | `responseChannel` when gradable text empty |
| Reasoning extraction | Parse JSON from reasoning channel when content empty |
| Reasoning follow-up | JSON-only follow-up when content empty but reasoning present |
| Parse retry | Up to 3 attempts + JSON follow-up |
| Validator cap | Invalid patches / placeholder diffs capped to 0 |
| Fallback | `[judge_unavailable]`; partial heuristic capped at **0.25** (`JUDGE_UNAVAILABLE_HEURISTIC_CAP`) |
| Audit fields | `parseSuccess`, `judgeError`, `judgeUnavailable`, `gradingMethod` on case results |

---

## Phase 6 — Compare

| Safeguard | Requirement |
| --- | --- |
| Preconditions | ≥ 2 subjects |
| Compare brief | Same briefing as judge + per-model deliverables + per-case scores |
| Fallback | `[compare_unavailable]` rank by per-case scores; never silent null |
| Artifacts | `compareError`, `rawResponse`, `compareFallback`, `compareCircuitOpen` |
| Progress | Steps through compare; no indefinite 100% stall |

**Gate:** `manifest.compareArtifactCount === caseCount` (12 for quick).

---

## Phase 7 — Post-run validation

Run `evidence/scripts/validate-benchmark-run.py` (or equivalent) against artifact root or API result.

### Accuracy gates

| Metric | Healthy target |
| --- | --- |
| Judge parse success (case grades) | ≥ **75%** |
| Empty `rawResponse` (attempts) | < **20%** |
| Compare artifacts (quick) | **12/12** |
| Heuristic fallback (case grades) | ≤ **25%** |
| `gradingBrief` on judge attempts | **100%** |
| Non-trivial judge rationale | ≥ **80%** of judge-graded cases |
| Progress | `complete`, **60/60** (quick, 2 subjects) |

**Verdict:** `VALID` or `INVALID` for accuracy claims. INVALID runs retain all artifacts for diagnosis.

### Control check

Record subject overall scores. Flag `UNHEALTHY` when Kimi ≤ LFM on operator Kimi+LFM inventory.

---

## Phase 8 — Evidence record

Append to run evidence JSON:

- `runId`, endpoints, judge, `runtimeSha256`, scope/state path
- Phase 7 metric table and `workflowVerdict`
- `controlCheck` outcome
- Caveats (e.g. all compare fallback, judge/subject overlap)

Canonical validation log for run 36:  
`/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-workflow-safeguards-validation.json`

---

## Operator workflows

### A — Standard benchmark

1. Phases 0–2  
2. `evidence/scripts/run-benchmark-quick.py` or UI with `preflightProbe`  
3. Poll to `complete`  
4. `evidence/scripts/validate-benchmark-run.py <artifact-root-or-run-id>`  
5. Append evidence JSON  
6. If `INVALID` or control unhealthy → diagnose; do not publish scores  

### B — After runtime rebuild

1. Confirm same `scopeId` / state root  
2. `GET /endpoints` — re-activate if empty  
3. Preflight probe  
4. Run benchmark  

### C — Investigate unhealthy run

1. Filter `judgeUnavailable: true`  
2. Inspect `responseChannel`, `judgeCircuitOpen`, `compareCircuitOpen`  
3. Check judge ∈ subjects overlap  
4. Fix; re-run  

---

## Engineering safeguards backlog (addendum 09)

| ID | Safeguard | Status |
| --- | --- | --- |
| J31 | This document as canonical workflow | **done** |
| J32 | `validate-benchmark-run.py` | **done** |
| J33 | Warn/reject start when &lt; 2 subjects + compare expected | pending |
| J34 | Warn when judge overlaps subjects; manifest flag | pending |
| J35 | UI/API scope + endpoint count visibility | pending |
| J36 | `gradingBrief` completeness tests | pending |
| J37 | Golden-run regression tolerances | pending |
| J38 | Dynamic endpoint resolution in scripts | **done** |
| J39 | Evidence schema `workflowVerdict` | **done** (`benchmark-workflow-safeguards-validation.json`) |
| J40 | Never delete artifacts on INVALID | policy (verify in runner) |

---

## Human spot-check (2–3 cases per validation run)

1. Judge `questionTranscript` matches suite case messages.  
2. Rationale cites checklist/criteria.  
3. Subject block matches `responses/` artifact.  

---

## Revision history

| Date | Change |
| --- | --- |
| 2026-06-10 | Initial canonical workflow (addendum 09) |
