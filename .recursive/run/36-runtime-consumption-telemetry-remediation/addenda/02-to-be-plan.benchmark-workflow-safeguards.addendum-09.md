Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `02 To-Be Plan`
Status: `APPROVED`
Addendum: `09`
Type: `workflow-safeguards`
TDD Mode (implementing phase): `strict` for SP15-A, SP15-B; `pragmatic` for SP15-C, SP15-D (operator scripts + evidence; UI warnings where feasible)
Inputs:
- Addendum 06 audit (`2be17a26` score parity / judge extraction failures)
- Addendum 07 judge reliability remediation (`2f5ab51b`, throttle, heuristic fallback)
- Addendum 08 judge accuracy remediation (`aa8cd041`, `05ca93bd`, compare persistence, circuit breaker)
- Post-08 code fixes: reasoning-channel judge extraction, reasoning follow-up, `JUDGE_UNAVAILABLE_HEURISTIC_CAP`
- Operator runs: `7bf720a0` (Kimi-only / stale endpoint id), `cd0c30a6` (in-flight validation with scoring fixes)
- Operator constraint: **model-agnostic** — no hardcoded judge/subject models; user configures endpoints via Benchmark UI dropdown
Outputs:
- This file
- `/.recursive/BENCHMARK-WORKFLOW.md` (canonical source of truth; referenced in `/.recursive/STATE.md`)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/scripts/validate-benchmark-run.py` (SP15-C)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-workflow-safeguards-validation.json` (SP15-D, after `cd0c30a6` completes)

## Problem

Addenda 06–08 fixed specific grading bugs (compare silent-null, circuit breaker, audit fields, brief persistence). Operator runs still fail or mislead for **process** reasons:

| Failure class | Example | Impact |
| --- | --- | --- |
| Environment drift | Runtime rebuild without re-activating endpoints | `endpoints: []`, benchmark abort |
| Stale automation | Hardcoded peer UUID in script | Kimi-only run (`7bf720a0`) |
| Judge I/O | Reasoning-only judge responses | `empty_judge_response`, mass fallback |
| Fallback inflation | Heuristic 0.5 when judge fails | LFM > Kimi on unhealthy runs |
| Judge exhaustion | Same endpoint judge + subject | Compare circuit open; inverted control |
| Incomplete judge context | (risk) Brief missing fields | Unfair or unrepeatable grades |
| No machine gate | Operator trusts rounded UI % | Invalid runs signed off |

**Product success** remains **grading accuracy and auditability**, not any model winning. **Control check** (Kimi > LFM on operator's typical inventory) is a **run-health signal only** — inversion means investigate the pipeline.

This addendum defines the **end-to-end benchmark workflow**, **phase gates**, **judge context contract**, and **engineering safeguards** so failures are caught before, during, and after a run.

## Fixed Decisions

1. **Model-agnostic:** safeguards apply to any user-selected endpoints; no code paths recommending specific models.
2. **Judge context is mandatory:** every judge/compare call must carry the full brief defined in §Judge Context Contract.
3. **Heuristic fallback is never silent:** tagged `[judge_unavailable]` / `[compare_unavailable]`, capped partial credit, audit fields on summary.
4. **Invalid runs are labeled invalid:** failing accuracy gates disqualifies the run for accuracy claims even if it completes.
5. **Activation ≠ configuration:** healthy provider accounts plus local peers are insufficient until models are activated via `POST /endpoints`.

## End-to-End Workflow

```
Phase 0 Environment gate
  → Phase 1 Endpoint inventory (configure + activate)
  → Phase 2 Preflight probes
  → Phase 3 Run configuration
  → Phase 4 Execution (subjects)
  → Phase 5 Grading (judge per case)
  → Phase 6 Compare (cross-subject per case)
  → Phase 7 Post-run validation
  → Phase 8 Evidence record
```

### Phase 0 — Environment gate

| Step | Action | Gate |
| --- | --- | --- |
| 0.1 | `GET /api/role-model/health` → 200 | Abort if down |
| 0.2 | Record `runtimeSha256`, `scopeId`, state root path | Mismatch vs last good run → re-check endpoints |
| 0.3 | Local peer `GET :1234/v1/models` includes subject model | Abort if LM Studio unreachable |
| 0.4 | `GET /accounts` — OAuth account `active` + `healthy` | Refresh before long runs |
| 0.5 | `GET /runtime/summary` — `endpointCount ≥ 2` for multi-subject | Else Phase 1 |

### Phase 1 — Endpoint inventory

| Step | Action | Gate |
| --- | --- | --- |
| 1.1 | `PUT /local/peers` — URL, auth (if needed) | Peer health check passes |
| 1.2 | Provider accounts present (local + remote) | `connectedWithoutEndpointCount = 0` after activation |
| 1.3 | `POST /endpoints` activate each subject model | `GET /endpoints` lists N healthy |
| 1.4 | Select judge endpoint (user choice; prefer not in `endpointIds`) | Document in run config |
| 1.5 | Smoke chat per endpoint (short prompt, non-empty deliverable) | Abort if subject or judge unusable |

**Script safeguard:** resolve endpoint ids from live `GET /endpoints` by `sourceType` + `modelId` substring — never hardcoded UUIDs.

### Phase 2 — Preflight probes

| Step | Action | Gate |
| --- | --- | --- |
| 2.1 | `POST /benchmark/runs` with `preflightProbe: true` (J29) | Warn on `judge_probe_failed` |
| 2.2 | Probe returns parseable `{"score":…,"rationale":…}` | Recommend abort if probe fails twice |
| 2.3 | Spot-check `gradingBrief` for 1–2 suite cases (unit test or dry-run builder) | All brief fields populated |

### Phase 3 — Run configuration

| Field | Requirement |
| --- | --- |
| `mode` | `quick` (12 cases) or `full` |
| `endpointIds` | ≥ 2 when compare expected |
| `judgeEndpointId` | User-selected; recorded in evidence |
| `useJudge` | `true` for accuracy validation |
| `preflightProbe` | `true` for operator validation runs |

### Phase 4 — Execution (`runPhase: execution`)

| Safeguard | Requirement |
| --- | --- |
| Subject prompt (J27) | Model-agnostic JSON/code deliverable rules |
| Multi-turn follow-up | `needsFinalAnswerFollowUp` when reasoning-only |
| Tool capture | `structuredToolNames` from API `tool_calls` |
| Artifacts | `responses/<endpoint>/<case>.json` with `formattedDeliverable` |
| Progress | Steps 1…(endpoints × cases); stall > 5 min → investigate |

**Gate:** `manifest.responseCount === endpoints × cases` before grading.

### Phase 5 — Grading (`runPhase: grading`)

**Grading order:** judge-as-subject endpoint first (`orderEndpointsForGrading`).

| Safeguard | Requirement |
| --- | --- |
| Full judge brief on every attempt | See §Judge Context Contract |
| Adaptive throttle (J22) | `max(JUDGE_MIN_INTERVAL_MS, 0.1 × last_latency)` |
| Circuit breaker (J21) | 3 failures → backoff; `judgeCircuitOpen` on artifact |
| Response channels (J23) | `responseChannel` when empty |
| Reasoning extraction | Parse JSON from reasoning; reasoning follow-up if content empty |
| Parse retry | Up to 3 attempts + JSON follow-up |
| Validator cap | `capJudgeScoreForInvalidDeliverable` |
| Fallback (J24) | `[judge_unavailable]`; cap partial heuristic at `JUDGE_UNAVAILABLE_HEURISTIC_CAP` (0.25) |
| Audit (J28) | `parseSuccess`, `judgeError`, `judgeUnavailable`, `gradingMethod` on case results |

### Phase 6 — Compare (`runPhase: compare`)

| Safeguard | Requirement |
| --- | --- |
| Preconditions | ≥ 2 subjects; `compareCaseCount = cases.length` in progress |
| Compare brief | Same briefing as judge + per-model deliverables + per-case scores |
| Fallback (J19) | `[compare_unavailable]` rank by per-case scores; never silent null |
| Artifacts (J18) | `compareError`, `rawResponse`, `compareFallback`, `compareCircuitOpen` |
| Progress (J20) | Steps through compare; no indefinite 100% stall |

**Gate:** `manifest.compareArtifactCount === caseCount` (12 for quick).

### Phase 7 — Post-run validation

Machine checks (see SP15-C `validate-benchmark-run.py`):

| Metric | Healthy target |
| --- | --- |
| Judge parse success (case grades) | ≥ **75%** |
| Empty `rawResponse` (attempts) | < **20%** |
| Compare artifacts | **12/12** (quick) |
| Heuristic fallback (case grades) | ≤ **25%** |
| `gradingBrief` on judge attempts | **100%** |
| Non-trivial judge rationale | ≥ **80%** of judge-graded cases |
| Progress | `complete`, 60/60 (quick, 2 subjects) |

**Control check (observational):** record subject overall scores; if Kimi ≤ LFM on operator's Kimi+LFM inventory, flag `controlCheck: UNHEALTHY` — do not treat as capability result.

**Verdict:** `VALID` / `INVALID` for accuracy claims.

### Phase 8 — Evidence record

Append to `benchmark-workflow-safeguards-validation.json`:

- `runId`, endpoints, judge, `runtimeSha256`, phase timings
- Phase 7 metric table and gate verdict
- Control check outcome
- Known caveats (e.g. all compare fallback, judge overlap)

## Judge Context Contract

Every judge and compare call **must** include the following. Persisted as `gradingBrief` on artifacts (100% target).

| Field | Source | Purpose |
| --- | --- | --- |
| `questionTranscript` | Full multi-turn `messages` | Phase boundaries, tool context |
| `exemplarAnswer` | `expected_response` / `example_deliverable` / `judge_guidance` | What good looks like |
| `exemplarQuality` | `authored` or `derived` | Trust level |
| `deliverablesChecklist` | `grading_criteria` + tools + schema keys | MUST/SHOULD items |
| `antiPatterns` | Global + case-specific | Placeholders, prose-as-code |
| `answerFormatInstruction` | `answer_format` | JSON/code fence rules |
| `gradingCriteria` | Authoritative rubric line | Final standard |
| Subject deliverable | `formattedDeliverable` only | Grade extracted output, not CoT |

**Human spot-check** (2–3 cases per validation run):

1. Transcript matches suite case messages.
2. Rationale cites checklist / criteria, not generic filler.
3. Subject block matches `responses/` artifact.

## Requirements (J31–J40)

| ID | Requirement |
| --- | --- |
| J31 | Documented operator workflow Phases 0–8 with explicit gates (this addendum) |
| J32 | `validate-benchmark-run.py` computes Phase 7 metrics and emits `VALID`/`INVALID` |
| J33 | Benchmark start rejects or warns when `endpointIds.length < 2` and compare expected |
| J34 | Warn when `judgeEndpointId` is also in `endpointIds` (overlap risk); record in manifest |
| J35 | Runtime UI or API exposes `scopeId`, state root, `endpointCount` (environment visibility) |
| J36 | `gradingBrief` completeness enforced in tests: all contract fields for fixture cases |
| J37 | Golden-run regression tolerances vs `2be17a26` metrics in validation JSON |
| J38 | Operator script `run-benchmark-quick.py` always resolves endpoints dynamically |
| J39 | Post-run evidence schema includes `workflowVerdict`, `controlCheck`, `accuracyGates` |
| J40 | Compare/judge artifacts remain required for INVALID runs (never delete on gate fail) |

## TDD Strategy

### Mode declaration

| Slice | TDD mode | Rationale |
| --- | --- | --- |
| SP15-A | **strict** | Start-run guards and brief completeness are contracts |
| SP15-B | **strict** | `validate-benchmark-run.py` metric logic must match gates |
| SP15-C | **pragmatic** | Operator script + evidence; no production change for JSON schema only |
| SP15-D | **pragmatic** | UI warning for judge overlap (SP15-A partial); compensating operator doc |

### New / extended test files

| File | Covers |
| --- | --- |
| `packages/bench-routing/test/judge-brief.test.ts` | J36 — all contract fields for representative cases |
| `apps/runtime-host-bridge/test/benchmark-start-guards.test.ts` | J33, J34 — start-run warnings/rejections |
| `evidence/scripts/validate-benchmark-run.py` | J32 — metric computation (with fixture manifest/artifacts) |
| `apps/runtime-host-bridge/test/benchmark-validation-metrics.test.ts` | J32 — shared metric helpers if lifted into bridge |

### Per-slice RED → GREEN paths

**SP15-A (strict):** RED — benchmark starts with 1 endpoint, no warning; brief missing field undetected. GREEN — start returns warning/error; brief test fails if checklist empty for tool case.

**SP15-B (strict):** RED — no validation script; operator manually reads UI %. GREEN — script prints gate table and exit code 1 on INVALID.

**SP15-C (pragmatic):** RED — `run-benchmark-quick.py` can use stale ids. GREEN — dynamic resolve only (already fixed); document in J38.

**SP15-D (pragmatic):** RED — no `workflowVerdict` in evidence. GREEN — `cd0c30a6` recorded in validation JSON with full gate table.

### Requirement → verification traceability

| Req | Verification |
| --- | --- |
| J31 | This addendum §End-to-End Workflow |
| J32 | `validate-benchmark-run.py` + test fixtures |
| J33 | `benchmark-start-guards.test.ts` |
| J34 | manifest `judgeSubjectOverlap: true` + start warning |
| J35 | API field or UI banner (SP15-D) |
| J36 | `judge-brief.test.ts` |
| J37 | validation JSON golden tolerances |
| J38 | `run-benchmark-quick.py` review |
| J39 | `benchmark-workflow-safeguards-validation.json` |
| J40 | Artifact retention policy in runner (no delete on invalid) |

### Implement order

**SP15-B (validation script) → SP15-A (start guards) → SP15-C (evidence) → SP15-D (UI overlap warn).** Record `cd0c30a6` outcome under SP15-C regardless of verdict.

## Operational Workflows

### Workflow A — Standard operator benchmark

1. Phase 0–2 gates  
2. `run-benchmark-quick.py` (or UI with `preflightProbe`)  
3. Poll to `complete`  
4. `validate-benchmark-run.py <runId>`  
5. Append evidence JSON  
6. If `INVALID` or control unhealthy → diagnose artifacts; do not publish scores  

### Workflow B — After runtime rebuild

1. Confirm same `scopeId` / state root  
2. `GET /endpoints` — re-activate if empty  
3. Preflight probe  
4. Run benchmark  

### Workflow C — Investigate unhealthy run

1. Filter `judgeUnavailable: true` cases  
2. Inspect `responseChannel`, `judgeCircuitOpen`  
3. Check judge ∈ subjects overlap  
4. Fix code/config; re-run  

## Success Criteria

| Criterion | Target |
| --- | --- |
| Workflow documented Phases 0–8 | This addendum approved |
| Validation script exists | `validate-benchmark-run.py` |
| Post-08 operator run recorded | `cd0c30a6` in evidence JSON |
| At least one `VALID` run after SP15-A/B fixes | Future run; optional for addendum approval |

## Out of Scope

- Hardcoding judge/subject model IDs  
- Changing suite rubrics or case difficulty  
- Requiring a specific model to win  
- Dedicated judge endpoint feature (dropdown sufficient)  

## Traceability

| Requirement | Primary files |
| --- | --- |
| J31–J34 | `benchmark-runner.ts`, `index.ts`, this addendum |
| J32, J39 | `evidence/scripts/validate-benchmark-run.py`, validation JSON |
| J36 | `judge-brief.ts`, `judge-brief.test.ts` |
| J38 | `evidence/scripts/run-benchmark-quick.py` |
| J35 | `control-benchmark.tsx`, `index.ts` (summary API) |

## Coverage Gate

- [x] End-to-end workflow Phases 0–8 defined
- [x] Judge context contract specified
- [x] Phase 7 accuracy gates aligned with addendum 08
- [x] Requirements J31–J40 with traceability
- [x] TDD slices and implement order declared
- [x] Model-agnostic and control-check rules preserved

Coverage: PASS

## Approval Gate

- [x] Safeguards target process failures observed in runs 05ca93bd, 7bf720a0, aa8cd041
- [x] Judge full context explicitly required
- [x] Invalid runs can be machine-labeled
- [ ] Operator sign-off pending `cd0c30a6` validation

Approval: PENDING (operator sign-off after `cd0c30a6` evidence)
