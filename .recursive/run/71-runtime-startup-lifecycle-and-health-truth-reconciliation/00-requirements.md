Run: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-15T11:54:54Z`
LockHash: `38a9b9648a3df54176a5ed5f80195d005c205e7f08e83fcf1f4ba973f2d2911c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- Prior related runs:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
  - `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- Current audited code surfaces:
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
  - `role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
  - `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- User guidance:
  - the remote page must show configured endpoints plus models, not stray non-remote provider-account rows
  - the connected startup bugs appear to share one root cause
  - startup credential handling must be explicitly accounted for
  - the run must use strict TDD and rebuilt-runtime verification in Phase 5
  - user approved this requirements artifact in chat on `2026-07-15`
Outputs:
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/00-requirements.md`
Scope note: Define one startup and inventory truth contract so persisted credentials and accounts, configured endpoint intent, remote health, routing candidacy, benchmark eligibility, and all operator-visible inventories reconcile after restart and stay consistent across runtime UI surfaces.

## TODO

- [x] Ground the run in current startup, persistence, health, and UI evidence
- [x] Convert the connected failures into stable `R#` requirements
- [x] Define canonical inventory and bootstrap-authority expectations
- [x] Define strict TDD and rebuilt-runtime verification obligations
- [x] Record out-of-scope boundaries and constraints
- [x] User approval of this requirements artifact
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Problem Summary

The validated defect is one connected runtime truth problem expressed across several pages.

On startup, the standalone runtime can rehydrate persisted provider-account rows that are not backed by current configured remote endpoints, current operator intent, or current fixture mode. That allows stale or placeholder accounts such as `deepseek.capture.account` to survive and present as manual remote connections. In parallel, endpoint bootstrap currently treats a non-empty SQLite endpoint table as sufficient and does not fully reconcile durable configured intent against persisted endpoint state on every boot. Finally, the UI does not consume one canonical readiness contract: different pages read different inventories and different status fields, so the same configured model can appear healthy on Models while offline or ineligible on Router, Candidates, and Benchmark.

This run must repair the startup contract and the backend-owned inventory contract so all operator-facing readiness surfaces converge on one authoritative truth after restart.

## Fixed Decisions

1. The configured remote execution unit is an activated endpoint-plus-model, not a raw provider-account row.
2. Provider-account rows are credential and maintenance state. They are not, by themselves, operator-visible configured remote connections.
3. Startup is authoritative only after account reconciliation, endpoint reconciliation, and health publication complete. The backend must expose whether a view is provisional or authoritative.
4. Startup credential handling is backend-specific, not a generic “reload all configured models” step. Env-backed API-key accounts, persisted API-key accounts, OAuth accounts, pending device-auth sessions, and Codex subscription accounts each need explicit startup semantics.
5. Health, lifecycle, routing eligibility, and benchmark eligibility are distinct concepts and must not be collapsed into one page-local status label.
6. Runtime UI surfaces must consume canonical backend inventories and truth fields rather than re-deriving semantics from raw mixed rows such as `status` versus `healthStatus`.
7. The run is provider and model agnostic. It must not ship page-local special cases for DeepSeek, Moonshot, Kimi, OpenAI, or any single provider family.
8. Strict TDD in Phase 3 and rebuilt-runtime proof in Phase 5 are mandatory completion conditions for this run.

## Requirements

### `R1` Startup account reconciliation must suppress orphaned or placeholder provider-account state

Description:
On every boot, the runtime must reconcile persisted provider-account rows against current runtime mode, current fixture mode, current configured endpoint intent, and current source provenance so stale or placeholder accounts cannot surface as live configured remote connections.

Acceptance criteria:
- every persisted provider-account row is evaluated during startup against the current runtime posture before operator-facing summaries become authoritative
- fixture-shaped or placeholder rows persisted from a fixture-capable boot do not surface as manual configured remote connections on a later non-fixture boot
- a credential row that is not backed by an in-scope configured remote endpoint-model association is excluded from the configured remote inventory
- env-backed credential availability alone does not create or legitimize a configured remote connection row
- orphan handling is explicit and deterministic: archived, hidden, or otherwise excluded by policy rather than left to incidental UI filtering
- repeated restarts are idempotent and do not reintroduce the same orphaned account into the configured remote inventory

### `R2` Startup endpoint reconciliation must not stop at “SQLite already has endpoints”

Description:
The runtime must reconcile durable configured endpoint intent against persisted endpoint rows on every boot instead of treating the presence of any SQLite endpoint row as sufficient.

Acceptance criteria:
- startup always compares durable configured endpoint intent with persisted endpoint state for the current standalone runtime
- a non-empty SQLite endpoint table does not short-circuit endpoint reconciliation
- drift between durable configured intent and persisted endpoint rows is repaired, archived, or explicitly reported by policy before the runtime view becomes authoritative
- missing configured endpoint activations are restored or surfaced as concrete startup diagnostics
- stale endpoint rows that no longer belong to configured intent are removed, archived, or excluded by explicit policy
- reconciliation is deterministic across repeated restarts and does not duplicate or resurrect endpoint rows

### `R3` The backend must publish one canonical inventory and bootstrap-authority contract

Description:
The runtime must expose one backend-owned contract that distinguishes configured inventory, maintenance inventory, health truth, routing eligibility, benchmark eligibility, and bootstrap authority so all UI surfaces consume the same semantics.

Acceptance criteria:
- the backend publishes canonical inventory classes for at least:
  - configured remote inventory
  - maintenance or credential inventory when such a view is intentionally supported
  - effective routable inventory
  - benchmark-runnable inventory
  - bootstrap authority state
- canonical records expose explicit fields for:
  - source provenance
  - activation or configuration state
  - health state
  - lifecycle or maintenance state
  - routing eligibility
  - benchmark eligibility
- once bootstrap is authoritative, the same configured endpoint-model record cannot report conflicting health across backend APIs
- if bootstrap is still provisional, the backend marks that state explicitly rather than leaving pages to infer it from partial data
- runtime UI surfaces stop inventing their own health semantics from raw mixed fields such as `status` and `healthStatus`

### `R4` The remote provider connections pane must show configured remote endpoints and models, not stray credential rows

Description:
The provider connections pane on the remote page must represent configured remote execution inventory, not every persisted provider-account row.

Acceptance criteria:
- the pane is backed by the canonical configured remote inventory from `R3`
- rows such as `deepseek.capture.account` and `local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0` do not appear there when they are not backing configured remote endpoint-model state for the current runtime posture
- credential-only or maintenance-only records are excluded from that pane unless Phase 2 intentionally defines a separate labeled maintenance section for them
- if a maintenance section exists, it is semantically separate from configured remote execution inventory and cannot be mistaken for an active configured remote provider connection
- counts, badges, and lifecycle labels on the pane use the same backend-owned semantics as the rest of the runtime UI

### `R5` Models, Router, Candidates, and Benchmark must agree on inventory, health, and eligibility truth

Description:
All runtime UI surfaces that expose configured remote model posture must consume the canonical backend contract and remain mutually consistent after bootstrap becomes authoritative.

Acceptance criteria:
- the Models page, Router page, Candidates page, and Benchmark page consume the same canonical inventory and truth fields from `R3`
- once bootstrap is authoritative, a configured model cannot appear healthy on Models while the same configured model appears offline elsewhere unless the backend explicitly reports a different canonical state for that same record
- benchmark selection UI either shows only benchmark-runnable records or explicitly distinguishes non-runnable records from the runnable checklist; page copy must remain truthful
- router overview limits and ordering operate on canonical eligible inventory and cannot silently hide the only eligible healthy candidate behind earlier offline entries
- candidate inventory badges for controller, candidate, offline, healthy, and similar posture markers derive from the same backend-owned record semantics used by routing and benchmark logic
- any page-level summarization or slicing rules remain truthful under the observed “one healthy, three offline” posture

### `R6` Startup credential rehydration and refresh semantics must be explicit per credential backend

Description:
Phase 2 must define one explicit startup credential contract so configured model readiness is not accidentally inferred from ambiguous account hydration side effects.

Acceptance criteria:
- startup semantics are defined explicitly for at least:
  - env-backed API-key accounts
  - locally persisted API-key accounts
  - refreshable OAuth accounts
  - pending device-authorization sessions
  - Codex subscription accounts
- startup diagnostics and canonical lifecycle records disclose whether a credential was refreshed, hydrated, unresolved, skipped, expired, or pending rather than collapsing those cases into a generic connected state
- configured model availability is not inferred from the raw presence of a credential reference without a valid endpoint-model association
- repeated restarts produce deterministic lifecycle results for the same persisted state and environment posture
- the Phase 1 and Phase 2 artifacts must make clear that startup is not a generic “reload all credentials for all configured models” step

### `R7` Phase 3 must use strict TDD for every production change in this run

Description:
Implementation must follow strict RED-GREEN discipline rather than pragmatic or mixed-mode testing.

Acceptance criteria:
- `03-implementation-summary.md` declares `TDD Mode: strict`
- every production change satisfying `R1` through `R6` is preceded by a failing owning automated test recorded in the Phase 3 TDD evidence
- RED and GREEN evidence is traceable by requirement rather than recorded as one undifferentiated test batch
- automated coverage includes at minimum:
  - orphan or fixture-shaped account persistence surviving into a non-fixture boot
  - endpoint reconciliation when SQLite already contains endpoint rows
  - divergence between activation-style status and health-style status
  - router overview behavior when only one candidate is healthy and eligible
  - benchmark checklist truthfulness for runnable versus offline or ineligible records
- Phase 4 records the final green evidence for every changed requirement-owned behavior

### `R8` Phase 5 verification must prove the repaired behavior on the rebuilt standalone runtime

Description:
Closeout is not complete until the rebuilt runtime from the implementation commit reproduces the repaired startup and cross-page truth behavior end to end.

Acceptance criteria:
- `05-manual-qa.md` verifies the rebuilt standalone runtime from the implementation commit rather than only unit tests, isolated dev servers, mocked data, or source inspection
- verification includes at least one cold start and one restart against a representative persisted runtime-state root that exercises persisted accounts and endpoints
- verification covers the remote provider connections pane, Models page, Router overview, Candidates page, and Benchmark page
- verification records the startup command, runtime-state path, authoritative endpoint used, and evidence artifact locations
- verification proves both of the following:
  - orphaned or placeholder provider-account rows do not surface as configured remote connections
  - all affected UI surfaces agree on canonical health and eligibility truth after startup becomes authoritative
- the run cannot close with only automated proof; rebuilt-runtime Phase 5 evidence is mandatory

## Out of Scope

- `OOS1`: making a timed-out provider become healthy when the underlying provider or network path is actually unavailable
- `OOS2`: redesigning unrelated runtime UI beyond what is required to align inventory and truth semantics
- `OOS3`: shipping provider-specific one-off UI filters instead of fixing backend-owned truth and canonical inventory semantics
- `OOS4`: requiring manual SQLite or filesystem cleanup as part of the normal operator workflow
- `OOS5`: changing unrelated routing policy, benchmark scoring policy, or provider capability ranking beyond what is required for truth alignment
- `OOS6`: broad remote-health performance tuning or retry-strategy optimization unrelated to the correctness of canonical health truth

## Constraints

- preserve provider and model agnosticism
- backend owns startup reconciliation, lifecycle semantics, inventory semantics, and authority state; pages consume that truth
- preserve backward-read compatibility for persisted state where feasible while normalizing operator-visible truth
- do not rely on page-local heuristics over mixed raw fields to derive health or eligibility
- if maintenance-only credential inventory is supported, keep it semantically separate from configured remote execution inventory
- do not rely on manual DB cleanup to hide stale rows
- Phase 3 must use strict TDD with explicit RED then GREEN evidence
- Phase 5 must include rebuilt-runtime restart proof before the run can be considered complete

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/RECURSIVE.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - prior related requirements artifacts and current audited code surfaces listed above
- Requirement coverage check:
  - `R1`: startup account reconciliation and orphan suppression
  - `R2`: startup endpoint and intent reconciliation
  - `R3`: canonical backend inventory and bootstrap-authority contract
  - `R4`: remote provider connections pane semantics
  - `R5`: cross-surface inventory, health, and eligibility consistency
  - `R6`: explicit startup credential semantics by backend
  - `R7`: strict TDD discipline
  - `R8`: rebuilt-runtime Phase 5 proof
- Out-of-scope confirmation:
  - `OOS1` through `OOS6`: excluded explicitly and consistently

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the run is framed as one connected startup and truth-reconciliation bugfix rather than four page-local patches
  - the canonical source-of-truth boundaries are explicit
  - acceptance criteria are observable and testable
  - startup credential semantics are no longer ambiguous
  - strict TDD and rebuilt-runtime verification are mandatory and separately enforceable
- Remaining blockers:
  - none

Approval: PASS
