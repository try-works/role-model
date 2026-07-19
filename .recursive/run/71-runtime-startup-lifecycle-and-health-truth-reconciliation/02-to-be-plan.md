Run: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-15T12:31:09Z`
LockHash: `f90a2c31740c535691a68722df6461a7e09b58964924f23dce32d449da0a44e4`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/00-requirements.md` (LOCKED)
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/00-worktree.md` (LOCKED)
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/01-as-is.md` (LOCKED)
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/01.5-root-cause.md` (LOCKED)
Outputs:
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/02-to-be-plan.md`
Scope note: Define the narrow implementation plan for repairing startup endpoint reconciliation, canonical readiness publication, and cross-page consumption so configured remote inventory, Models, Router, Candidates, and Benchmark all converge on one authoritative truth after restart.

## TODO

- [x] Map `R1` through `R8` to concrete backend, UI, verification, and QA surfaces
- [x] Keep the planned bridge and runtime-ui changes constrained to the locked root causes
- [x] Define strict RED-first test slices before any production edits
- [x] Define the rebuilt-runtime cold-start and restart verification loop for Phase 5
- [x] Audit the plan against the locked requirements, AS-IS baseline, and root-cause findings

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: the worktree-local recursive router still resolves `analyst`, `planner`, `code-reviewer`, and `tester` to `Decision=ask-user`, so there is no canonical delegated planning path for this worktree.
Delegation Decision Basis: the defect family, owning files, test seams, and live runtime payloads are directly inspectable from the locked artifacts plus current code, so Phase 2 planning proceeds as a local audited artifact.
Audit Inputs Provided:
- locked requirements, worktree, AS-IS, and root-cause artifacts
- current startup reconciliation, endpoint publication, and router-candidate code
- current runtime-ui models, providers, router, candidates, and benchmark consumers
- current restart, readiness, endpoint, and view-model test seams

## Effective Inputs Re-read

- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/00-requirements.md`
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/00-worktree.md`
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/01-as-is.md`
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/01.5-root-cause.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
- `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.ts`
- `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.ts`
- `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

## Planned Changes by File

### `/role-model-router/apps/runtime-host-bridge/src/index.ts`

- Replace the current endpoint-bootstrap early return with a startup reconciliation pass that always compares persisted `runtime_endpoints` against durable remote activation intent before bootstrap becomes authoritative.
- Treat current remote activations as the configured execution unit. Restore missing endpoint rows when the account still exists and still allows the model; defer or diagnose stale intent that no longer has a valid backing account instead of silently trusting SQLite.
- Publish explicit canonical eligibility on the existing endpoint and router-candidate contracts:
  - `routingEligible`
  - `benchmarkEligible`
  - a stable health-vs-lifecycle split that leaves `healthStatus` authoritative for readiness while keeping `status` as lifecycle/activation state
- Keep `credentialLifecycle` as the maintenance/account view, but stop forcing page consumers to infer configured remote inventory from it.
- Keep the remote-health probe behavior itself narrow unless RED evidence proves a probe-contract defect rather than a publication defect.

### `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`

- Add RED coverage proving restart startup does not stop at "SQLite already has endpoints" when durable remote activation intent and persisted rows drift.
- Add RED coverage proving missing valid activations are restored on restart without manual re-activation.
- Add RED coverage proving stale activations that no longer have a valid account are explicitly excluded or surfaced by policy instead of being restored blindly.

### `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`

- Add RED restart coverage for the connected boot posture:
  - persisted remote endpoints present before restart
  - remote-health later marks a subset offline
  - effective inventory falls to the healthy subset
  - startup authority still publishes truthful configured inventory after restart
- Add RED coverage proving local-peer maintenance rows can coexist with remote configured inventory without being counted as configured remote connections.

### `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`

- Add RED assertions proving runtime summary authority and readiness counts remain internally consistent while endpoint and candidate payloads expose explicit routing and benchmark eligibility.
- Add RED assertions that the authoritative summary no longer requires UI consumers to guess configured remote inventory from connected-no-endpoint maintenance rows.

### `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

- Expand the HTTP contract regression for `/api/role-model/endpoints` and `/api/role-model/router/candidates` so the backend publishes the canonical fields the UI must consume.
- Add RED assertions proving:
  - endpoints can be `status: "active"` yet not `routingEligible`
  - candidates expose `routingEligible` and `benchmarkEligible` consistently with `healthStatus`
  - candidate ordering or selection semantics do not bury the only healthy eligible endpoint behind earlier offline entries

### `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

- Extend `RuntimeEndpoint` and `RouterCandidate` to carry the new backend-owned eligibility fields.
- Keep the fetch helpers stable; avoid adding a parallel page-local contract when the existing endpoints and candidates APIs can be extended.

### `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`

- Add a canonical configured-remote provider-connections builder that groups remote endpoint-model records by provider account instead of starting from maintenance accounts.
- Keep `buildProviderMaintenanceRows(...)` for maintenance-only presentation, but make it explicit that it is not the configured remote inventory.
- Change `buildConfiguredModelCards(...)` to summarize model readiness from endpoint `healthStatus` rather than lifecycle `status`.
- If route logic needs a stable helper for eligible overview ordering, place that helper in a testable shared lib instead of burying semantics in JSX.

### `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`

- Add RED coverage proving configured provider-connection rows exclude maintenance-only entries such as connected-no-endpoint credentials and local peers when they are not backing configured remote endpoints.
- Add RED coverage proving configured model cards become `offline` or equivalent when endpoint health is offline even if lifecycle `status` remains `active`.
- Keep the maintenance-row tests intact so maintenance UI remains separately supported.

### `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.ts`

- Replace the current execution-mode-only runnable filter with the canonical backend `benchmarkEligible` field.
- Preserve the helper shape so the benchmark route can keep one clear notion of runnable versus excluded candidates.

### `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.test.ts`

- Add RED coverage proving offline or otherwise benchmark-ineligible candidates are excluded from the runnable checklist even when `executionModeEligible` is still true.
- Keep a control proving unspecified legacy fields default conservatively only where the new contract deliberately allows it.

### `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.ts`

- Add a small shared helper if needed to select or order router overview candidates from the canonical backend eligibility fields.
- Keep candidate labeling and latency formatting narrow; avoid turning this file into another page-local truth source.

### `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.test.ts`

- Add RED coverage proving the only healthy eligible candidate is kept in the overview set even when offline entries are also present.
- Add RED coverage proving the helper prefers canonical eligible ordering over raw registry order.

### `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`

- Back the "Configured provider connections" pane with the configured remote endpoint-model inventory, not maintenance rows.
- If maintenance rows remain visible on the page, render them in a separate, explicitly labeled maintenance section that cannot be mistaken for configured remote execution inventory.

### `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`

- Update route copy and counts so the page reflects health-based readiness rather than treating all `status: "active"` endpoints as healthy.
- Keep controller selection and request-evidence flows intact unless the RED phase proves a dependency on the old status semantics.

### `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`

- Add RED helper coverage for the health-based card posture, count language, and default-selection behavior when only one configured model is healthy.

### `/role-model-router/apps/runtime-ui/app/routes/router.tsx`

- Change the overview selection to consume the canonical eligible subset or shared helper instead of slicing the first three raw candidates.
- Preserve the existing page structure; do not widen into router-strategy redesign.

### `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`

- Use the canonical backend `benchmarkEligible` field to define the active checklist.
- Keep offline or otherwise excluded candidates visible only in a truthful excluded section or explanatory state, not in a checklist labeled "Only benchmark-runnable endpoints".

### `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

- Update source-level guardrails so they enforce the repaired contract:
  - providers route no longer treats maintenance rows as the configured pane
  - router overview no longer relies on a raw `candidates.slice(0, 3)` truth model

## Requirement Mapping

- `R1` | Coverage: `direct` | Source Quote: `On every boot, the runtime must reconcile persisted provider-account rows against current runtime mode, current fixture mode, current configured endpoint intent, and current source provenance so stale or placeholder accounts cannot surface as live configured remote connections.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
- `R2` | Coverage: `direct` | Source Quote: `The runtime must reconcile durable configured endpoint intent against persisted endpoint rows on every boot instead of treating the presence of any SQLite endpoint row as sufficient.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | QA Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
- `R3` | Coverage: `direct` | Source Quote: `The runtime must expose one backend-owned contract that distinguishes configured inventory, maintenance inventory, health truth, routing eligibility, benchmark eligibility, and bootstrap authority so all UI surfaces consume the same semantics.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `/role-model-router/apps/runtime-ui/app/routes/router.tsx`, `/role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`, `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `R4` | Coverage: `direct` | Source Quote: `The provider connections pane on the remote page must represent configured remote execution inventory, not every persisted provider-account row.` | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
- `R5` | Coverage: `direct` | Source Quote: `All runtime UI surfaces that expose configured remote model posture must consume the canonical backend contract and remain mutually consistent after bootstrap becomes authoritative.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.ts`, `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.ts`, `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `/role-model-router/apps/runtime-ui/app/routes/router.tsx`, `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `/role-model-router/apps/runtime-ui/app/routes/router.tsx`, `/role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`, `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `R6` | Coverage: `direct` | Source Quote: `Phase 2 must define one explicit startup credential contract so configured model readiness is not accidentally inferred from ambiguous account hydration side effects.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
- `R7` | Coverage: `direct` | Source Quote: `Implementation must follow strict RED-GREEN discipline rather than pragmatic or mixed-mode testing.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/03-implementation-summary.md` | Verification Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/logs/red/`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/logs/green/`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/04-test-summary.md` | QA Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/03-implementation-summary.md`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/04-test-summary.md`
- `R8` | Coverage: `direct` | Source Quote: `Closeout is not complete until the rebuilt runtime from the implementation commit reproduces the repaired startup and cross-page truth behavior end to end.` | Implementation Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md` | Verification Surface: rebuilt standalone runtime cold start and restart against a representative persisted runtime-state root | QA Surface: `/api/role-model/runtime/summary`, `/api/role-model/endpoints`, `/api/role-model/router/candidates`, `/app/providers`, `/app/models`, `/app/router`, `/app/router/candidates`, `/app/models/benchmark`

## Implementation Steps

1. Write failing bridge restart tests that expose the current endpoint-bootstrap short-circuit when SQLite already contains stale or incomplete remote endpoint rows.
2. Write failing bridge API tests that demand canonical endpoint and candidate eligibility fields and startup-authority-consistent publication.
3. Write failing runtime-ui tests that expose:
   - configured provider connections built from maintenance rows
   - model cards using lifecycle `status` instead of `healthStatus`
   - benchmark runnable filtering that still admits offline candidates
   - router overview selection that can hide the only healthy eligible candidate
4. Implement the backend restart reconciliation path in `index.ts` so endpoint intent is reconciled before authoritative publication.
5. Extend endpoint and candidate payloads with the canonical eligibility fields the UI must consume.
6. Implement the runtime-ui consumption changes:
   - providers route grouped from configured remote endpoints
   - maintenance rows separated semantically
   - models route posture driven by health
   - benchmark runnable filter driven by canonical eligibility
   - router overview driven by canonical eligible ordering
7. Rerun the focused bridge and runtime-ui regressions until the RED tests turn GREEN.
8. Rerun the broader critical suites already validated in Phase 0 if the changes widen beyond the initial focused seams.
9. Rebuild the runtime and capture cold-start plus restart proof against the representative persisted runtime-state root in Phase 5.

## Testing Strategy

TDD Mode: `strict`

### RED tests

- `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`
  - restart reconciliation restores a missing valid remote activation even when SQLite already has endpoint rows
  - stale invalid remote activation is excluded or diagnosed instead of silently restored
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
  - authoritative restart summary reflects the reconciled remote endpoint set and distinguishes maintenance rows from configured remote connections
- `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`
  - summary authority, readiness counts, and canonical endpoint or candidate eligibility fields remain consistent
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/api/role-model/endpoints` and `/api/role-model/router/candidates` expose the canonical fields the UI will consume
- `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - configured provider-connection rows exclude maintenance-only connected-no-endpoint accounts
  - configured model cards reduce health from `healthStatus`, not lifecycle `status`
- `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.test.ts`
  - benchmark runnable candidates require canonical `benchmarkEligible`
- `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.test.ts`
  - router overview selection preserves the only healthy eligible candidate
- `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
  - health-based card posture and default selection remain truthful
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - providers and router route sources no longer encode the broken maintenance-row and raw-slice truth models

### GREEN verification floor

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/endpoint-rehydration.test.ts test/restart-rehydration.test.ts test/session-readiness-api.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "api/role-model/endpoints|api/role-model/router/candidates"`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/view-models.test.ts app/lib/benchmark-model-cards.test.ts app/lib/router-candidate-labels.test.ts app/routes/control-models.test.ts app/lib/design-system.test.ts`
- if the bridge change escapes the planned startup and publication seams, escalate to `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- if the runtime-ui change escapes the planned helpers and affected routes, escalate to `corepack pnpm --filter @role-model-router/runtime-ui test`

### Evidence capture

- store RED logs under `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/logs/red/`
- store GREEN logs under `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/logs/green/`
- record the exact failing and passing commands by requirement in `03-implementation-summary.md`

## Playwright Plan (if applicable)

Optional only. Browser automation may help capture Phase 5 screenshots across Providers, Models, Router, Candidates, and Benchmark after the rebuilt runtime is running, but it is not the primary acceptance gate.

## Manual QA Scenarios

QA Execution Mode: `hybrid`

Planned scenarios:

1. Rebuild the standalone runtime from the implementation commit and launch it against a representative persisted runtime-state root that reproduces:
   - one healthy GPT-5.4 remote activation
   - three offline remote activations after remote-health authority
   - the DeepSeek capture maintenance row
   - the local-peer maintenance row
2. Record one cold start and one full restart of that rebuilt runtime, including the exact build and startup commands.
3. Query:
   - `/api/role-model/runtime/summary`
   - `/api/role-model/endpoints`
   - `/api/role-model/router/candidates`
   before and after restart to prove:
   - configured remote inventory is authoritative
   - endpoint reconciliation ran instead of trusting stale SQLite blindly
   - health, routing eligibility, and benchmark eligibility agree across the published backend surfaces
4. Capture the remote providers page and prove the configured-connections pane excludes `deepseek.capture.account` and `local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0`.
5. Capture the Models, Router, Candidates, and Benchmark pages and prove they agree on the one-healthy-three-offline posture after authority is reached.
6. If maintenance rows remain visible on Providers, capture the separate maintenance section and show it is labeled distinctly from configured remote connections.
7. Record evidence paths for API snapshots, screenshots, bootstrap receipts, and any copied runtime-state fixture artifacts used for verification.

## Idempotence and Recovery

- The focused RED and GREEN test commands are deterministic and safe to rerun after each edit.
- Restart reconciliation must remain idempotent across repeated backend starts against the same state root.
- Phase 5 should run against an isolated representative runtime-state root or a safe copy of the current persisted state so rebuilt-runtime validation does not mutate the user's live runtime unexpectedly.
- If Phase 3 reveals that the fix requires schema changes or a new backend API beyond the planned extensions, stop widening scope silently and record a current-phase addendum before editing the wider contract.

## Implementation Sub-phases

1. RED: startup endpoint-reconciliation regressions
2. GREEN: backend reconciliation and canonical eligibility publication
3. RED: runtime-ui configured-connections, model-health, benchmark-eligibility, and router-overview regressions
4. GREEN: runtime-ui consumers switched to the canonical backend contract
5. GREEN verification: focused bridge and runtime-ui suites plus any escalated broader suites
6. REFACTOR: local readability cleanup only if it does not widen behavior or file scope
7. Phase 5 prep: rebuilt-runtime cold-start and restart proof across API and page surfaces

## Plan Drift Check

- No provider-specific DeepSeek, Moonshot, Kimi, or OpenAI one-off UI filters are planned
- No benchmark scoring, provider capability ranking, or unrelated routing policy redesign is planned
- No manual DB cleanup step is planned as part of the operator workflow
- No broad remote-health timeout tuning is planned unless RED evidence disproves the locked root-cause findings
- No page-local shadow truth model is planned; UI changes must consume backend-owned fields

## Known Unknowns Carried Forward

- Whether the cleanest bridge publication seam is to extend the existing endpoints contract only, or to extend both endpoints and router-candidate contracts symmetrically, provided the UI truth remains backend-owned and non-duplicative.
- Whether the providers page should keep a separate maintenance section on the same route or move maintenance-only rows elsewhere, provided configured remote execution inventory stays semantically separate.
- Whether the router overview is best repaired by shared helper selection, backend candidate ordering, or both, provided the only healthy eligible candidate can never be hidden behind earlier offline entries.
- Whether the representative Phase 5 state root should be a purpose-built repro fixture or an isolated copy of the current standalone runtime root.

## Traceability

- `R1`: startup account classification and configured-provider-pane separation planned
- `R2`: endpoint bootstrap reconciliation planned
- `R3`: canonical backend endpoint and candidate contract planned
- `R4`: configured remote provider-connections pane planned
- `R5`: consistent Models, Router, Candidates, and Benchmark truth planned
- `R6`: explicit credential-versus-connection startup semantics planned
- `R7`: strict TDD test floor planned
- `R8`: rebuilt-runtime cold-start and restart proof planned

## Gaps Found

None. The plan stays inside the locked startup-reconciliation and canonical-truth scope.

## Repair Work Performed

None. This artifact defines the implementation plan only.

## Audit Verdict

Audit: PASS

The plan is specific enough to begin strict-TDD implementation, names concrete bridge and runtime-ui seams, and keeps the repair centered on canonical backend truth instead of page-local heuristics.

## Earlier Phase Reconciliation

- `01-as-is.md` established the persisted-state mismatch and the relevant source/code/runtime evidence.
- `01.5-root-cause.md` reduced that evidence to four connected failures: startup account publication, startup endpoint reconciliation, canonical truth publication, and page-local summarization.
- This plan addresses those failures directly without widening into provider-specific patches or unrelated routing policy changes.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/02-to-be-plan.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct reconciliation of the locked requirements and root-cause findings against the current bridge and runtime-ui source plus the current test seams
- Acceptance Decision: `not applicable`
- Refresh Handling: no delegated artifacts to refresh
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3b297884987d4149d2d3c10f86847cbc790aa255`
- Comparison reference: `working-tree`
- Normalized baseline: `3b297884987d4149d2d3c10f86847cbc790aa255`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3b297884987d4149d2d3c10f86847cbc790aa255`
- Base branch: `main`
- Worktree branch: `recursive/71-runtime-startup-lifecycle-and-health-truth-reconciliation`
- Active worktree path: `D:\DEV\role-model\.worktrees\71-runtime-startup-lifecycle-and-health-truth-reconciliation\`
- Planned or claimed changed files:
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/02-to-be-plan.md`
- Unexplained drift:
  - none

## Requirement Completion Status

- `R1` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
- `R2` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/endpoint-rehydration.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | QA Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
- `R3` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | QA Surface: `/api/role-model/runtime/summary`, `/api/role-model/endpoints`, `/api/role-model/router/candidates`
- `R4` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `R5` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.ts`, `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.ts`, `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `/role-model-router/apps/runtime-ui/app/routes/router.tsx`, `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/benchmark-model-cards.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/router-candidate-labels.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | QA Surface: `/app/models`, `/app/router`, `/app/router/candidates`, `/app/models/benchmark`
- `R6` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts` | QA Surface: `/app/providers`, `/app/session-readiness`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
- `R7` | Status: `planned` | Implementation Surface: test files and `03-implementation-summary.md` listed above | Verification Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/logs/red/`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/logs/green/`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/04-test-summary.md` | QA Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/03-implementation-summary.md`, `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/04-test-summary.md`
- `R8` | Status: `planned` | Implementation Surface: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md` | Verification Surface: rebuilt-runtime cold start and restart against the representative runtime-state root | QA Surface: `/api/role-model/runtime/summary`, `/api/role-model/endpoints`, `/api/role-model/router/candidates`, `/app/providers`, `/app/models`, `/app/router`, `/app/router/candidates`, `/app/models/benchmark`

## Coverage Gate

- [x] `R1` through `R8` are mapped to concrete implementation, verification, and QA surfaces
- [x] Strict RED-first backend and runtime-ui coverage is defined before any production edit
- [x] The rebuilt-runtime proof path covers both backend APIs and all affected UI routes

Coverage: PASS

## Approval Gate

- [x] The plan is concrete enough to begin Phase 3 strict TDD
- [x] The plan stays inside the locked startup-reconciliation and canonical-truth scope
- [x] The artifact is ready for lock and Phase 3 handoff

Approval: PASS
