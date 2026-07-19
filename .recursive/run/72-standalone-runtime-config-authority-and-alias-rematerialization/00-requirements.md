Run: `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-16T00:28:12Z`
LockHash: `f7f24094e05ea3b6eb26b2349f380142b9ec2274e20935577af2054ca15d9dae`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/00-requirements.md`
- `C:\Users\erikb\.codex\attachments\0fe10a36-5c84-481d-809c-e28c97f60296\pasted-text.txt`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/launcher/main.go`
- `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/session-bootstrap-health.test.ts`
- user-approved spec guidance in chat on `2026-07-16`
Outputs:
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
Scope note: Repair the standalone runtime authority and canonical alias-rematerialization contract so alias-based requests on `http://127.0.0.1:3456` perform real multi-endpoint routing after cold start and restart, with strict TDD, durable regression coverage, and rebuilt-runtime proof.

## TODO

- [x] Ground the run in current standalone-runtime, alias-matrix, and startup-reconciliation evidence
- [x] Convert the validated defect into stable backend-owned `R#` requirements
- [x] Define the proper fix boundary so the run repairs authority and rematerialization rather than adding a request-time bypass
- [x] Define strict TDD, regression, and rebuilt-runtime verification obligations
- [x] Record out-of-scope boundaries and constraints
- [x] User approval of this requirements artifact on `2026-07-16`
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `backend bugfix`
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/apps/launcher/**`
- Secondary subsystems:
  - `role-model-router/apps/runtime-ui/**`
  - `role-model-router/packages/sqlite-memory/**`
- User-visible outcome:
  - canonical aliases such as `baseline.remote-only` expose the real healthy remote candidate set on the standalone runtime instead of collapsing to `chatgpt/gpt-5.4`

## Relevant Prior Runs

- `50-openai-codex-subscription`
  - established the canonical strategy x execution-mode alias matrix and the runtime-owned alias-materialization baseline
- `51-runtime-testing-architecture-and-regression-matrix`
  - established the current runtime testing layers and rebuilt-runtime verification expectations
- `71-runtime-startup-lifecycle-and-health-truth-reconciliation`
  - repaired endpoint-intent reconciliation and cross-surface readiness truth, but left a follow-up gap around standalone config authority and rebuilt standalone launch proof

## Problem Summary

The validated `:3456` defect is not a router scoring bug. It is a runtime-authority and alias-truth bug. The standalone runtime reports four healthy, routing-eligible remote endpoints, but canonical aliases such as `baseline.remote-only` resolve only to `chatgpt/gpt-5.4`, which reduces `allowEndpoints` to one endpoint before route scoring begins.

The investigation found two connected root causes that must be repaired together:

1. the standalone runtime can read or preserve stale unified runtime config authority for the same operator state
2. canonical primary aliases are materialized too early and can remain stale after startup reconciliation changes the routable inventory

The fix must therefore repair backend-owned config authority and canonical alias rematerialization. A request-time exception, page-local filter, or provider-specific routing hack is not acceptable.

## Fixed Decisions

1. Canonical primary routing aliases are derived backend state, not durable operator-authored truth.
2. The standalone runtime that owns `http://127.0.0.1:3456` must expose one authoritative unified runtime config path for the active runtime-state root.
3. Request-time alias policy may continue to derive `allowEndpoints` from alias membership; the run must repair alias truth rather than bypass that policy.
4. Canonical aliases must be re-materialized after startup reconciliation and after any routable-inventory change that affects canonical membership.
5. Provider and model agnosticism remain mandatory. The run must not special-case OpenAI, DeepSeek, Moonshot, Kimi, or GPT-5.4 to force the desired result.
6. Phase 3 strict TDD and Phase 5 rebuilt-runtime proof are mandatory completion conditions.

## Requirements

### `R1` Standalone runtime config authority must be canonical and restart-stable

Description:
The standalone runtime must not silently diverge across competing `runtime-config.yaml` authorities for the same operator state. The backend and launcher surfaces must converge on one canonical config authority for the runtime that owns `:3456`.

Acceptance criteria:
- the standalone runtime applies one canonical unified runtime config path for its runtime-state root
- `/api/role-model/runtime/config` and `/api/role-model/runtime/summary` expose the authoritative applied config path truthfully
- if legacy-path migration or authority normalization is needed, it is deterministic, idempotent, and preserves valid user-authored settings
- repeated cold starts and restarts do not recreate a stale single-model canonical alias matrix from an obsolete config source
- if authoritative config loading cannot be completed, the runtime surfaces an explicit degraded diagnostic instead of quietly serving stale alias truth

### `R2` Canonical primary aliases must be rematerialized from current routable inventory after startup reconciliation

Description:
Canonical primary aliases for the runtime-owned strategy x execution-mode matrix must be refreshed from the current canonical routable inventory after startup reconciliation changes endpoint or model truth.

Acceptance criteria:
- canonical aliases for `default`, `baseline`, `controller`, `difficulty`, and `hybrid` across supported execution modes are re-materialized after startup reconciliation completes
- in `remote_only`, when multiple healthy routing-eligible remote models exist, canonical remote-only aliases expand to the applicable multi-model set instead of retaining a stale singleton
- if canonical membership changes because account, endpoint, or remote-health reconciliation changed the routable inventory, alias truth is updated in the authoritative config/state surface
- if no applicable models exist, aliases degrade explicitly rather than preserving stale prior members
- non-primary custom aliases remain preserved unless an explicit migration rule is defined and tested in this run

### `R3` Alias-based requests on the standalone runtime must permit real multi-endpoint routing

Description:
Once the canonical alias matrix is truthful, alias-based requests must allow the router to consider the full healthy candidate set instead of hard-pinning through stale alias membership.

Acceptance criteria:
- for the reproduced standalone posture with multiple healthy routing-eligible remote endpoints, requests to canonical aliases such as `baseline.remote-only` produce multi-model `resolvedModelIds` and multi-endpoint `allowEndpoints`
- healthy eligible endpoints are not excluded with `POLICY_DENY_ENDPOINT` solely because canonical alias membership remained stale
- the router may still select GPT-5.4 or any other endpoint, but only after real multi-candidate competition and normal policy/scoring logic
- no request-time bypass, endpoint allowlist override, or provider-specific fallback hack is introduced to fake multi-endpoint routing

### `R4` The runtime must expose authoritative alias-truth diagnostics and stale-truth regression controls

Description:
The backend must make it observable when alias truth and routable inventory are authoritative versus stale so operators and later runs do not have to infer this class of bug indirectly from request receipts.

Acceptance criteria:
- the runtime exposes enough backend-owned diagnostics to distinguish authoritative alias truth from provisional startup state
- if canonical aliases are empty, stale, or underpopulated relative to the current routable inventory, the runtime records explicit drift or warning diagnostics rather than silently serving the narrowed pool
- diagnostics remain provider-agnostic and derived from backend state, not from page-local heuristics
- automated regression coverage proves the stale-authority or stale-alias condition is detected or repaired deterministically

### `R5` Phase 3 must use strict TDD with focused regression coverage for both root causes

Description:
Implementation must follow strict RED-GREEN discipline and add regression coverage that protects config authority, alias rematerialization, and alias-request routing on the standalone surface.

Acceptance criteria:
- `03-implementation-summary.md` declares `TDD Mode: strict`
- every production change satisfying `R1` through `R4` is preceded by a failing owning automated test recorded in the Phase 3 TDD evidence
- minimum RED/GREEN coverage includes:
  - standalone config-authority divergence or legacy-authority reuse
  - restart/bootstrap where persisted endpoints already exist but canonical aliases must expand after reconciliation
  - request-level alias resolution proving multi-endpoint `allowEndpoints`
  - stale or underpopulated canonical alias diagnostics or repair behavior
  - negative controls proving custom aliases and existing exact-model routing still behave correctly
- regression coverage extends the owning runtime-host suites instead of relying only on one-off manual probes

### `R6` Phase 5 must verify the repaired behavior on the rebuilt standalone runtime

Description:
Closeout is not complete until the rebuilt standalone runtime surface that owns `http://127.0.0.1:3456` proves the repaired authority and multi-endpoint alias behavior end to end.

Acceptance criteria:
- `05-manual-qa.md` verifies the rebuilt standalone runtime from the implementation commit rather than only unit tests, `tsx` development helpers, or source inspection
- verification includes at least one cold start and one restart against representative persisted runtime state
- verification records the startup command, runtime-state root, authoritative applied config path, and evidence artifact paths
- verification proves both of the following:
  - canonical remote-only aliases expose the expected multi-model set after startup becomes authoritative
  - a request to `baseline.remote-only` or equivalent no longer hard-pins through singleton `allowEndpoints`
- if the current rebuilt-runtime launch path cannot exercise the authoritative standalone surface directly, repairing that rebuilt-runtime launch or packaging gap is in scope for this run

## Out of Scope

- `OOS1`: changing benchmark scoring weights, difficulty policy, or route-ranking math after the candidate set has already been established
- `OOS2`: redesigning runtime UI pages beyond the minimal diagnostic or contract changes required to expose truthful backend state
- `OOS3`: adding provider-specific routing hacks, forced endpoint preferences, or request-time alias bypasses
- `OOS4`: requiring manual cleanup of user runtime files or SQLite state as the normal fix path
- `OOS5`: broad startup-performance tuning or unrelated runtime packaging cleanup beyond what is required to validate the rebuilt standalone runtime

## Constraints

- backend owns config authority and canonical alias truth; UI surfaces consume that truth
- preserve user-authored non-primary aliases unless an explicit tested migration rule is required
- preserve provider and model agnosticism
- prefer one canonical fix across launcher, backend, and rebuilt-runtime behavior rather than separate dev-only and standalone-only semantics
- do not treat request-time routing bypasses as acceptable substitutes for repairing config authority or alias truth
- Phase 3 must use `TDD Mode: strict`
- Phase 5 rebuilt-runtime proof on the standalone surface is mandatory before the run can be considered complete

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/RECURSIVE.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - the reproduced issue summary and the current owning code and test surfaces listed above
- Requirement coverage check:
  - `R1`: standalone config authority and applied-path truth
  - `R2`: post-reconciliation canonical alias rematerialization
  - `R3`: real multi-endpoint alias routing on the standalone runtime
  - `R4`: authoritative alias-truth diagnostics and stale-truth regression controls
  - `R5`: strict TDD and automated regression coverage
  - `R6`: rebuilt standalone runtime verification
- Out-of-scope confirmation:
  - `OOS1` through `OOS5`: excluded explicitly and consistently

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the run is scoped to the validated standalone authority and alias-rematerialization defect rather than a generic routing rewrite
  - the proper-fix boundary is explicit: repair authority and rematerialization, not request-time bypasses
  - acceptance criteria are observable and testable
  - strict TDD, regression coverage, and rebuilt-runtime verification are mandatory and independently enforceable
- Remaining blockers:
  - none

Approval: PASS
