Run: `/.recursive/run/59-observe-taxonomy-analytics-completion/`
Phase: `02 TO-BE Plan`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-worktree.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/04-test-summary.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/05-manual-qa.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/06-decisions-update.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/addenda/05-final-audit.addendum-01.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/59-observe-taxonomy-analytics-completion/02-to-be-plan.md`
Scope note: This artifact defines the execution plan for closing the richer-taxonomy telemetry/operator-surface gap in the clean run-59 worktree, including the backend telemetry contract, Observe graphs, model rollups, request-detail visibility, privacy policy closure, Pi runtime-diagnostic parity, and the carried-forward Phase 5 dependency disposition required by run 59.
TDD Mode: `strict`
Status: `LOCKED`
LockedAt: `2026-06-28T06:17:17Z`
LockHash: `7b176fd14e439808e5eea2ab80dff163c1d402a423c80005f8cc25af1a59dc2e`

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed `multi_agent_v1` sub-agent tools in the current environment, confirming delegation capability exists.
Delegation Decision Basis: Phase 2 is an audited planning phase, but the current controller can assemble and audit the plan directly and the active session instructions do not authorize spawning sub-agents unless the user explicitly asks for delegation or parallel agent work.
Delegation Override Reason: Sub-agent tooling is available, but the user asked to continue the run rather than delegate it; per current tool-use constraints, the controller kept Phase 2 as a self-audit.
Audit Inputs Provided:
- locked run-59 requirements, worktree, and AS-IS artifacts
- relevant upstream run-57 and run-58 requirement and evidence artifacts
- current runtime UI design-system and telemetry graph-matrix docs
- current clean worktree code inventory from the locked Phase 1 audit
- diff basis from `00-worktree.md`

## TODO

- [x] Convert the Phase 1 inventory into an implementation sequence
- [x] Resolve the major architecture decisions left open by the AS-IS audit
- [x] Build the upstream disposition matrix required by `R14`
- [x] Map `R1` through `R17` to concrete file ownership and verification
- [x] Define strict TDD slices, verification commands, and manual QA scenarios
- [x] Define UI authority, shared primitive ownership, and graph-matrix update rules
- [x] Audit the plan for recursive-mode compliance and lock readiness

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed `multi_agent_v1` sub-agent tools in the current environment, confirming delegation capability exists.
- Delegation Decision Basis: Phase 2 is an audited planning phase, but the current controller can assemble and audit the plan directly and the active session instructions do not authorize spawning sub-agents unless the user explicitly asks for delegation or parallel agent work.
- Delegation Override Reason: Sub-agent tooling is available, but the user asked to continue the run rather than delegate it; per current tool-use constraints, the controller kept Phase 2 as a self-audit.
- Audit Inputs Provided:
  - locked run-59 requirements, worktree, and AS-IS artifacts
  - relevant upstream run-57 and run-58 requirement and evidence artifacts
  - current runtime UI design-system and telemetry graph-matrix docs
  - current clean worktree code inventory from the locked Phase 1 audit
  - diff basis from `00-worktree.md`
- Phase purpose: turn the locked requirements and AS-IS baseline into a file-by-file, testable, authority-aware implementation plan before any product code changes start
- Audit method:
  - reread effective upstream artifacts from disk
  - reconcile each planned change against the Phase 1 code baseline
  - ensure every in-scope requirement maps to files, tests, and QA evidence
  - repair workflow or traceability gaps before lock

## Effective Inputs Re-read

- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-worktree.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/04-test-summary.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/05-manual-qa.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/06-decisions-update.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/addenda/05-final-audit.addendum-01.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`

## Planned Outcome

Run 59 will:

1. Expand the canonical telemetry taxonomy contract so the runtime can distinguish original classified metadata, normalized routing metadata, and derived analytics metadata without breaking old telemetry rows.
2. Replace the current benchmark-only dimension authority with one telemetry-aware analytics-dimension contract used across extraction, persistence, backend filters/breakdowns, frontend controls, and chart builders.
3. Extend runtime persistence and analytics so richer taxonomy dimensions are queryable, mixed-version-aware, and explicit about sparse, partial, and truncated coverage.
4. Upgrade `/app/observe/requests` and `/app/observe/routing` from generic role/task-only telemetry into richer taxonomy exploration surfaces built on the existing shared telemetry primitives and chart-state contract.
5. Upgrade `/app/models` inspect rollups and `/app/observe/requests/:requestId` request detail so operators can explain the new graphs from concrete per-request and per-model evidence.
6. Close the remaining privacy, sampling, retention, and advisory-boundary ambiguity for the richer taxonomy layer.
7. Bring the clean `pi-role-model` baseline up to runtime request/explain parity without widening its safety boundary or making Pi claim ownership of runtime-generated reason codes.
8. Verify the full richer-taxonomy slice through focused tests, rebuilt-runtime browser proof, and Phase 5 Pi-driven QA on `:3456` using `hybrid.remote-only` unless Phase 1 proved the alias contract changed.

All implementation work executes from worktree `D:/DEV/role-model/.worktrees/59-observe-taxonomy-analytics-completion` on branch `recursive/59-observe-taxonomy-analytics-completion`.

## Phase 1 Decisions (resolved)

| Unknown | Decision |
| --- | --- |
| Telemetry dimension authority | Replace the current benchmark-only registry with a single telemetry-aware taxonomy analytics dimension authority under `packages/protocol-types/`, then flow that authority through backend and UI consumers. |
| Richer taxonomy persistence shape | Persist richer dimensions in first-class analytics-readable form while preserving `normalizedIntent` as the full-fidelity blob and keeping old role/task rows readable. |
| Model-rollup ownership | Keep rollup derivation backend-query-driven, but make the authority explicit in Phase 3: either a backend-owned rollup response or a documented frontend composition with tested formulas and provenance. |
| Request-detail UX | Add a first-class structured taxonomy section; keep raw observation JSON as an evidence adjunct, not the only presentation. |
| Dashboard/Observe shared primitive ownership | Treat the shared telemetry chart/controls/view-model files as first-class implementation surfaces. If they change, dashboard regression verification becomes mandatory even if `/app/dashboard` is not functionally redesigned. |
| Pi parity baseline | Plan against the clean worktree baseline, not the dirty main checkout; the missing request/explain support is therefore part of run 59 scope, not pre-existing completed work. |

## Traceability And Disposition Matrix

This matrix is the durable Phase 2 answer to the run 59 narrowing contract.

| Upstream source id | Upstream source type | Disposition | Owning run 59 requirements | Verification artifact owner | Rationale |
| --- | --- | --- | --- | --- | --- |
| Proposal Phase 5 deliverables (`2650-2656`) | `proposal-phase5` | `assumed-complete` + `regression-only` | `R7`, `R11`, `R14` | `01-as-is`, `04-test-summary`, `05-manual-qa` | Run 59 does not re-author benchmark schemas or `/app/models/benchmark`, but model rollups and Pi/runtime reasons still rely on carried-forward benchmark surfaces being intact. |
| Proposal Phase 5 acceptance (`2658-2664`) | `proposal-phase5` | `regression-only` | `R11`, `R12`, `R13`, `R14` | `04-test-summary`, `05-manual-qa` | Benchmark signals must remain advisory and visible where already implemented; Phase 5 QA must confirm the dependency still behaves. |
| Proposal Phase 6 deliverables (`2668-2674`) | `proposal-phase6` | `implemented-in-run59` | `R2`-`R10`, `R15`-`R17` | `01-as-is`, `02-to-be-plan`, `04-test-summary`, `05-manual-qa` | This is the primary scope of run 59. |
| Proposal Phase 6 acceptance (`2676-2682`) | `proposal-phase6` | `implemented-in-run59` | `R9`, `R11`, `R12`, `R15`, `R16`, `R17` | `04-test-summary`, `05-manual-qa` | Run 59 must prove dashboard visibility, advisory-only boundaries, and Pi-driven QA receipts. |
| Run 58 `R1` AS-IS benchmark and telemetry audit | `run58` | `assumed-complete and relied upon` | `R14` | `01-as-is`, `02-to-be-plan` | Run 59 reuses the run-58 audit trail rather than repeating its full benchmark inventory. |
| Run 58 `R2` benchmark schemas | `run58` | `assumed-complete and relied upon` | `R14` | `01-as-is`, `04-test-summary` | Out of scope except regression-only if telemetry/model-rollup dependencies surface a break. |
| Run 58 `R3` taxonomy-tagged benchmark cases | `run58` | `assumed-complete and relied upon` | `R14` | `04-test-summary`, `05-manual-qa` | Needed only insofar as benchmark signals remain visible and runtime-owned reasons still surface them. |
| Run 58 `R4` benchmark score aggregation | `run58` | `assumed-complete and relied upon` | `R7`, `R14` | `04-test-summary`, `05-manual-qa` | Consumed by carried-forward model/diagnostic surfaces, not re-authored here. |
| Run 58 `R5` benchmark UI filters | `run58` | `regression-only` | `R14` | `04-test-summary`, `05-manual-qa` | `/app/models/benchmark` is not redesigned in run 59. |
| Run 58 `R6` benchmark-informed routing reasons | `run58` | `carried-forward dependency` | `R11`, `R13`, `R14` | `04-test-summary`, `05-manual-qa` | Pi explanation must surface runtime-owned benchmark reasons when they exist. |
| Run 58 `R7` telemetry schema and dimensions | `run58` | `implemented-in-run59` | `R2`, `R3`, `R4`, `R15`, `R16` | `01-as-is`, `02-to-be-plan`, `04-test-summary` | Run 58 only landed a partial role/task slice. |
| Run 58 `R8` record taxonomy dimensions on telemetry | `run58` | `implemented-in-run59` | `R2`, `R4`, `R8`, `R15` | `04-test-summary`, `05-manual-qa` | Original-vs-normalized and richer dimensions still need to land. |
| Run 58 `R9` extend Observe dashboards | `run58` | `implemented-in-run59` | `R5`, `R6`, `R10`, `R16`, `R17` | `04-test-summary`, `05-manual-qa` | This is the user-reported gap that triggered run 59. |
| Run 58 `R10` model detail telemetry rollup | `run58` | `implemented-in-run59` | `R7`, `R10`, `R17` | `04-test-summary`, `05-manual-qa` | The current task-only advisory rollup is incomplete. |
| Run 58 `R11` privacy, retention, redaction | `run58` | `implemented-in-run59` | `R9`, `R12`, `R15` | `04-test-summary`, `05-manual-qa` | Scaffolding exists, but closure is incomplete. |
| Run 58 `R12` telemetry advisory boundary | `run58` | `implemented-in-run59` | `R9`, `R11`, `R12` | `04-test-summary`, `05-manual-qa` | Must remain explicit as richer signals are added. |
| Run 58 `R13` safety boundaries | `run58` | `assumed-complete and relied upon` | `R9`, `R12`, `R13`, `R14` | `01-as-is`, `05-manual-qa` | No widening of runtime or credential ownership is allowed. |
| Run 58 `R14` strict TDD and verification discipline | `run58` | `implemented-in-run59` | `R11` | `03-implementation-summary`, `04-test-summary` | Run 59 keeps strict TDD. |
| Run 58 `R15` Pi-driven rebuilt-runtime manual QA | `run58` | `implemented-in-run59` | `R11`, `R12`, `R13` | `05-manual-qa` | Run 59 keeps Pi as a P0 acceptance surface and tightens the required receipts. |
| Run 58 `R16` execute proposal E2E cases | `run58` | `implemented-in-run59` | `R11`, `R14` | `05-manual-qa` | Run 59 focuses on the relevant Phase 6 and carried-forward Phase 5 dependency evidence. |

## Requirement Mapping

- `R1` | Coverage: `direct` | Implementation Surface: `01-as-is.md`, all inventory sections below, and the current code/doc authority set | Verification Surface: Phase 1 lock plus later downstream traceability citations | QA Surface: none; Phase 1 is read-only audit
- `R2` | Coverage: `direct` | Implementation Surface: `packages/protocol-types/src/taxonomy-extraction.ts`, `schemas/role-model/taxonomy/telemetry-taxonomy-event.schema.json`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: schema validation plus focused runtime-observability/sqlite-memory tests | QA Surface: request detail and persisted telemetry evidence
- `R3` | Coverage: `direct` | Implementation Surface: `packages/protocol-types/src/taxonomy-dimensions.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, shared telemetry controls/charts | Verification Surface: protocol-types tests plus runtime-ui tests proving shared-dimension coverage | QA Surface: Observe controls and graph cards
- `R4` | Coverage: `direct` | Implementation Surface: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, analytics API types in `runtime-api.ts` | Verification Surface: sqlite migration tests, host-bridge analytics tests, mixed-version fixtures | QA Surface: persisted telemetry and analytics readback
- `R5` | Coverage: `direct` | Implementation Surface: `app/routes/requests.tsx`, `app/lib/runtime-api.ts`, `app/lib/telemetry-route-models.ts`, `app/components/telemetry-controls.tsx`, `app/components/telemetry-charts.tsx`, `app/lib/view-models.ts`, `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` | Verification Surface: runtime-ui route-model tests, component tests, possible Playwright/browser receipts | QA Surface: `/app/observe/requests`
- `R6` | Coverage: `direct` | Implementation Surface: `app/routes/observe-routing.tsx`, shared telemetry primitives, `runtime-api.ts`, `telemetry-route-models.ts`, graph matrix doc | Verification Surface: runtime-ui tests and host analytics query tests | QA Surface: `/app/observe/routing`
- `R7` | Coverage: `direct` | Implementation Surface: `app/routes/control-models.tsx`, `app/lib/runtime-api.ts`, possible host-bridge rollup helpers if backend-owned, shared design-system tests | Verification Surface: runtime-ui tests for inspect modal/rollup visibility plus analytics tests | QA Surface: `/app/models`
- `R8` | Coverage: `direct` | Implementation Surface: `app/routes/requests.tsx`, `app/routes/request-detail.tsx`, telemetry request/observation API types, possible host-bridge request-detail payload shaping | Verification Surface: runtime-ui tests for ledger/detail visibility and mixed old/new request states | QA Surface: request detail drill-in
- `R9` | Coverage: `direct` | Implementation Surface: `runtime-observability`, `sqlite-memory`, host-bridge analytics semantics, request-detail wording, possibly config/readme docs if operator-visible semantics need clarification | Verification Surface: focused backend tests, mixed-version tests, retention cleanup checks | QA Surface: request detail, Observe states, Pi-driven QA receipts
- `R10` | Coverage: `direct` | Implementation Surface: `DESIGN_SYSTEM.md`, `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`, shared telemetry components/tests, changed UI routes | Verification Surface: runtime-ui tests plus manual QA route-specific evidence | QA Surface: desktop/mobile Observe/models/request-detail proof
- `R11` | Coverage: `direct` | Implementation Surface: all targeted test files, Phase 3 TDD evidence, Phase 4 command matrix, Phase 5 manual QA | Verification Surface: `03-implementation-summary.md`, `04-test-summary.md`, `05-manual-qa.md` | QA Surface: Pi-driven runtime on `:3456`
- `R12` | Coverage: `direct` | Implementation Surface: Phase 5 procedures, Pi docs/commands, runtime config usage notes in artifacts only | Verification Surface: Phase 5 receipts prove no secret leakage and no widened runtime ownership | QA Surface: local credential-backed QA flow
- `R13` | Coverage: `direct` | Implementation Surface: `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/src/runtime-inspection.ts`, `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts`, `README.md`, `skills/role-model/SKILL.md`, tests | Verification Surface: Pi package tests/build plus Phase 5 command verification | QA Surface: `/role-model status`, `/role-model doctor`, `/role-model requests`, `/role-model explain latest`
- `R14` | Coverage: `direct` | Implementation Surface: this plan plus downstream audited artifacts citing the matrix | Verification Surface: Phase 2 lock, Phase 4 citations, Phase 5 citations | QA Surface: none directly
- `R15` | Coverage: `direct` | Implementation Surface: backend mixed-version behavior, UI wording, test fixtures, request-detail empty/partial states | Verification Surface: backend and UI tests plus migration fixture coverage | QA Surface: old/new telemetry windows
- `R16` | Coverage: `direct` | Implementation Surface: backend ordering/limit/truncation logic, response metadata, frontend chart-state handling, shared graph primitives | Verification Surface: high-cardinality analytics tests plus UI state tests | QA Surface: truncated/sparse state screenshots and receipts
- `R17` | Coverage: `direct` | Implementation Surface: `DESIGN_SYSTEM.md`, `11-runtime-ui-telemetry-graph-matrix.md`, route/component ownership notes, Phase 5 evidence plan | Verification Surface: Phase 4/5 route-level evidence and doc-update verification | QA Surface: desktop/mobile/keyboard evidence

## Planned Changes by File

| Path | Planned change |
| --- | --- |
| `packages/protocol-types/src/taxonomy-extraction.ts` | Extend extraction from role/task-only metadata to richer telemetry-aware original/normalized/derived taxonomy fields. |
| `packages/protocol-types/src/taxonomy-dimensions.ts` | Replace or refactor the misleading benchmark-only registry into a shared telemetry-aware analytics dimension authority. |
| `schemas/role-model/taxonomy/telemetry-taxonomy-event.schema.json` | Define or extend the schema so richer taxonomy telemetry fields and mixed-version semantics are explicit. |
| `role-model-router/packages/runtime-observability/src/index.ts` | Persist richer taxonomy dimensions on observation bundles; keep privacy receipt semantics explicit and remove misleading duplicate authority where appropriate. |
| `role-model-router/packages/sqlite-memory/src/index.ts` | Add richer taxonomy persistence, migration logic, and readback semantics for analytics and request detail. |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | Extend telemetry analytics backend filters, breakdowns, rankings, support metadata, and request-detail payload shaping. |
| `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Extend analytics dimensions, filters, model rollup contract or composition, and request-detail typing for richer taxonomy fields. |
| `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts` | Update semantic view models if backend support or truncation semantics need richer handling. |
| `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts` | Extend labels/control metadata for richer taxonomy dimensions if shared chart config owns part of the surface. |
| `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts` | Add first-class richer-taxonomy request and routing chart cards. |
| `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | Extend any shared request/model/telemetry summary helpers impacted by richer states or rollup semantics. |
| `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx` | Add shared control-band support for richer taxonomy filters and breakdowns. |
| `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Preserve semantic state handling while supporting new taxonomy chart cards and truncation/sparse states. |
| `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx` | Regression-only touch if shared telemetry chart primitives or view-model helpers change. |
| `role-model-router/apps/runtime-ui/app/routes/requests.tsx` | Add URL-backed taxonomy filters, richer breakdown/ranking options, and richer taxonomy graph cards. |
| `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx` | Add richer taxonomy filters and graph cards while preserving existing routing mix graphs. |
| `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Expand inspect modal production rollups with recent group/role/task usage, strengths/warnings, and provenance. |
| `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Add structured richer taxonomy presentation while preserving raw evidence drill-ins. |
| `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | Update only if route behavior, shell/header ownership, or semantic state guidance must change. |
| `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` | Update the authoritative graph inventory and route/shared-primitive ownership if any chart responsibilities change. |
| `packages/pi-role-model/src/extension.ts` | Refresh runtime taxonomy/classification state at the correct setup/alias refresh points and integrate runtime-owned request-inspection flows. |
| `packages/pi-role-model/src/commands.ts` | Add first-class request-list and explain commands and update alias/runtime diagnostics wording. |
| `packages/pi-role-model/src/runtime-inspection.ts` | NEW — encapsulate runtime-owned request list/detail/explain fetches and formatting. |
| `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts` | Refresh effective taxonomy/runtime state after successful setup and alias refresh rather than startup only. |
| `packages/pi-role-model/README.md` | Document runtime-owned request/explain boundaries, default runtime behavior, and new command surface. |
| `packages/pi-role-model/skills/role-model/SKILL.md` | Keep Pi skill guidance aligned with the runtime-owned diagnostic boundary and updated commands. |
| `packages/pi-role-model/test/commands.test.ts` | Add RED/GREEN coverage for new requests/explain command behavior and alias/runtime refresh flows. |
| `packages/pi-role-model/test/extension.test.ts` | Add RED/GREEN coverage for runtime refresh behavior and loopback-runtime defaults. |
| `packages/pi-role-model/test/runtime-inspection.test.ts` | NEW — cover request listing, latest selection, detail/explain fetches, and runtime-owned reason formatting. |
| `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts` | Update chart inventory tests for richer Observe request/routing cards. |
| `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | Extend if the changed UI surfaces require explicit contract assertions. |
| `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | Extend semantic chart-state coverage for richer taxonomy cards. |
| `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts` | Extend filters/dimensions/rollup typing behavior if that suite already owns the API contract. |
| `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` | Extend if summary/model state helpers change. |

## Implementation Steps

1. Start Phase 3 with failing tests for the smallest contract slice: richer telemetry extraction and dimension authority.
2. Land backend storage/query semantics before frontend controls so the UI has a stable analytics contract to target.
3. Add richer request and routing chart definitions plus shared telemetry control support before route-specific polish.
4. Add structured request-detail and model-rollup surfaces once the richer backend/query contract exists.
5. Close privacy/mixed-version/truncation semantics at the backend and UI-state layers before Pi QA begins.
6. Add Pi runtime-inspection and explain command support only after the runtime request-detail/explain surfaces are stable enough to consume.
7. Finish with focused Phase 4 verification and then the Phase 5 rebuilt-runtime Pi-driven QA slice.

## Testing Strategy

- Phase 3 uses `TDD Mode: strict`.
- Every production code slice must record RED and GREEN evidence under:
  - `/.recursive/run/59-observe-taxonomy-analytics-completion/evidence/logs/red/`
  - `/.recursive/run/59-observe-taxonomy-analytics-completion/evidence/logs/green/`
- Initial RED-first slices:
  1. richer taxonomy extraction and shared dimension authority
  2. sqlite/runtime-observability persistence and migration
  3. host-bridge analytics filters/breakdowns/support metadata for richer dimensions
  4. Observe request/routing UI graph inventories and filter controls
  5. model rollup and request-detail richer taxonomy presentation
  6. Pi requests/explain command support and runtime refresh behavior
- Required Phase 4 command floor:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm --filter @role-model-router/runtime-observability test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
  - `corepack pnpm --filter @try-works/pi-role-model build`
  - `corepack pnpm --filter @try-works/pi-role-model test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge run test:validate-ui` or the changed-path equivalent
- Required targeted verification themes:
  - richer telemetry extraction and persistence
  - centralized dimension authority coverage
  - multi-valued analytics semantics
  - startup migration or schema-upgrade behavior for older telemetry stores
  - mixed old/new richer-taxonomy windows
  - high-cardinality or truncation behavior
  - Observe requests/routing control and graph inventories
  - model rollups and request-detail visibility
  - Pi runtime refresh and request/explain command coverage

## Playwright Plan (if applicable)

- UI scope is large enough that a browser plan is applicable, but it should stay narrow and purposeful.
- Preferred path:
  - extend the existing runtime-ui browser harness only if the seeded runtime can expose deterministic richer-taxonomy telemetry without live credentials
  - otherwise keep automated route coverage at component/test-model level and rely on Phase 5 rebuilt-runtime browser verification for the live credential-backed slice
- Minimum browser-proof intent for this run:
  1. `/app/observe/requests` loads richer taxonomy controls and graph cards without duplicating shell headers
  2. `/app/observe/routing` shows richer taxonomy graph cards and correct semantic empty/unsupported/truncated states
  3. `/app/models` inspect modal shows richer production rollups with provenance
  4. `/app/observe/requests/:requestId` shows structured richer taxonomy sections plus raw evidence disclosure
- If a new or extended Playwright spec is added, it must cite the covered `R#` values in a short file-header comment per recursive-mode guidance.

## Manual QA Scenarios

1. Rebuild the runtime packages, runtime UI, and `pi-role-model` from the run 59 worktree.
2. Start the rebuilt runtime on `:3456` or record the exact replacement port if `:3456` is occupied.
3. Use the local production runtime config source on this device for endpoint credentials without copying secrets into recursive artifacts.
4. Verify the expected alias contract and prefer `hybrid.remote-only` unless Phase 1 proves the alias naming changed.
5. Drive the local Pi agent through:
   - `/role-model status`
   - `/role-model doctor`
   - `/role-model requests`
   - `/role-model explain latest`
6. Send classified prompts/requests through the rebuilt runtime and observe:
   - persisted richer taxonomy telemetry
   - `/app/observe/requests` graphs and ledger
   - `/app/observe/routing` graphs
   - `/app/models` rollups
   - request-detail richer taxonomy visibility
7. Record explicit receipts for `E2E-P6-001` through `E2E-P6-007` plus the carried-forward Phase 5 dependency coverage table.

## Idempotence and Recovery

- Telemetry storage changes must be additive or migration-safe; old role/task-only rows must remain readable.
- The backend must return explicit partial/unsupported/truncated semantics rather than silently failing or inferring support from empty data.
- UI routes must preserve design-system shell ownership and degrade honestly when richer taxonomy data is absent.
- Pi request/explain commands must fail closed with runtime-owned diagnostics when the runtime is unreachable or missing expected request evidence.
- Phase 5 config setup must be reproducible from local config sources without ever copying secret values into recursive artifacts.

## Implementation Sub-phases

### `SP1` Telemetry taxonomy contract and dimension authority (`R2`, `R3`, `R4`, `R15`, `R16`)

Goal:
Establish one canonical richer-taxonomy analytics contract across extraction, storage, backend analytics, and frontend dimension typing.

RED-first work:
- protocol-types tests for richer field extraction and authority coverage
- sqlite/runtime-observability tests for persistence and migration
- host-bridge analytics tests for richer filters, breakdowns, and support metadata

Production changes:
- extend `taxonomy-extraction.ts`
- refactor `taxonomy-dimensions.ts` into the shared analytics authority
- extend `runtime-observability` and `sqlite-memory`
- extend host-bridge analytics types and query semantics

Exit criteria:
- richer fields are extracted and queryable
- mixed old/new windows have explicit semantics
- taxonomy-specific truncation/partial behavior is defined

### `SP2` Observe routes and shared telemetry primitives (`R5`, `R6`, `R10`, `R16`, `R17`)

Goal:
Turn Observe request/routing analytics into first-class richer-taxonomy operator surfaces using the existing design-system and graph-state contract.

RED-first work:
- route-model tests for richer chart cards
- component or route tests for richer controls and URL-backed state
- shared chart-state tests for sparse/unsupported/partial/truncated responses

Production changes:
- extend `runtime-api.ts`, `telemetry-route-models.ts`, shared telemetry controls/charts/view models
- upgrade `requests.tsx` and `observe-routing.tsx`
- update `11-runtime-ui-telemetry-graph-matrix.md`
- update `DESIGN_SYSTEM.md` only if route behavior requires it

Exit criteria:
- richer taxonomy controls and cards exist on both Observe routes
- request-route state is URL-addressable
- route/shared-primitive ownership is documented

### `SP3` Request detail and model rollups (`R7`, `R8`, `R10`, `R17`)

Goal:
Make the richer taxonomy explainable from concrete request and model surfaces.

RED-first work:
- runtime-ui tests for structured request-detail taxonomy sections
- runtime-ui tests for model-rollup visibility, provenance, and empty states
- analytics tests for any new backend-owned rollup helper if one is added

Production changes:
- extend `request-detail.tsx`
- extend `control-models.tsx`
- extend `runtime-api.ts` and any supporting host-bridge response shaping

Exit criteria:
- request detail shows original vs normalized vs derived richer taxonomy
- model inspect rollups show recent group/role/task usage plus strengths/warnings with provenance

### `SP4` Privacy, mixed-version, and operational policy closure (`R9`, `R12`, `R15`, `R16`)

Goal:
Close the operator-trust gaps that remain when richer taxonomy analytics widen the telemetry surface.

RED-first work:
- backend tests for sampling/retention/redaction/mixed-window semantics
- UI tests for partial-coverage wording and request-detail pre-richer-taxonomy wording
- migration tests against representative pre-run-59 telemetry stores

Production changes:
- finalize backend semantics in `runtime-observability`, `sqlite-memory`, and host-bridge
- update request-detail and Observe wording where needed
- document any explicitly deferred sampling/redaction detail with rationale only if implementation is not feasible

Exit criteria:
- no ambiguous richer-taxonomy privacy or backfill behavior remains
- old/new sampled or partial windows are explicit to operators

### `SP5` Pi runtime-inspection and explain parity (`R11`, `R12`, `R13`, `R14`)

Goal:
Bring the clean `pi-role-model` baseline up to runtime request/explain parity without widening its safety boundary.

RED-first work:
- command tests for `/role-model requests` and `/role-model explain latest`
- extension tests for runtime taxonomy refresh after setup/alias refresh
- new runtime-inspection helper tests for latest request selection and reason formatting

Production changes:
- add `runtime-inspection.ts`
- extend `commands.ts`, `extension.ts`, and `resolve-effective-taxonomy.ts`
- update README and Pi skill guidance

Exit criteria:
- Pi can inspect recent runtime requests and explain latest request using runtime-owned diagnostics
- runtime-owned benchmark/telemetry reasons are surfaced without Pi claiming authorship

## Earlier Phase Reconciliation

- Phase 1 confirmed that the clean worktree baseline, not the dirty main checkout, is authoritative for run 59. This plan therefore explicitly includes the missing Pi request/explain work rather than assuming it already landed.
- Phase 1 also confirmed that the current design-system and graph-matrix docs are already the correct UI authorities. This plan preserves them and only permits doc changes when route/shared-primitive ownership or semantic state behavior actually changes.
- The run 59 requirements artifact required the full upstream disposition matrix to become durable by Phase 2. This plan satisfies that requirement in `## Traceability And Disposition Matrix`.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md` and `01-as-is.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/04-test-summary.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/05-manual-qa.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/06-decisions-update.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/addenda/05-final-audit.addendum-01.md`
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/05-manual-qa.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed:
  - verified sub-agent capability availability through `tool_search`
  - verified no delegated action records were created or relied upon for this phase
  - performed the full planning and upstream disposition mapping directly against the locked Phase 1 artifact and effective inputs
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `2ad27c9f385b81f4cfb41870f2a2e4e8080e6444`
- Comparison reference: `working-tree`
- Normalized baseline: `2ad27c9f385b81f4cfb41870f2a2e4e8080e6444`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 2ad27c9f385b81f4cfb41870f2a2e4e8080e6444`
- Diff basis used: `git diff --name-only 2ad27c9f385b81f4cfb41870f2a2e4e8080e6444`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/59-observe-taxonomy-analytics-completion`
- Planned or claimed changed files:
  - `/.recursive/run/59-observe-taxonomy-analytics-completion/02-to-be-plan.md`
- Actual changed files reviewed:
  - none in tracked product code
- Untracked run-owned files reviewed:
  - `/.recursive/run/59-observe-taxonomy-analytics-completion/02-to-be-plan.md`
- Unexplained drift:
  - none; the worktree residue is limited to intentional run-59 recursive artifacts

## Gaps Found

- none; after repair, this Phase 2 artifact has no unresolved recursive-mode audit or traceability gaps blocking lock

## Repair Work Performed

- None in product code. This Phase 2 artifact is planning-only and does not change runtime behavior.

## Requirement Completion Status

- R1 | Status: deferred | Rationale: the AS-IS inventory is complete and locked, but implementation and verification still belong to later phases. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: Phase 1 now provides the baseline inventory this plan executes against.
- R2 | Status: deferred | Rationale: richer telemetry contract implementation belongs to Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP1` defines the exact implementation slice.
- R3 | Status: deferred | Rationale: the central dimension authority will be implemented in Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP1` resolves the authority shape decision.
- R4 | Status: deferred | Rationale: richer backend persistence and query semantics belong to Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP1` and `SP4` define the backend work.
- R5 | Status: deferred | Rationale: richer request-route controls and charts belong to Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP2` owns `/app/observe/requests`.
- R6 | Status: deferred | Rationale: richer routing-route controls and charts belong to Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP2` owns `/app/observe/routing`.
- R7 | Status: deferred | Rationale: richer model rollups belong to Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP3` resolves model-rollup ownership and provenance.
- R8 | Status: deferred | Rationale: richer request-ledger/detail visibility belongs to Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP3` owns the structured request-detail work.
- R9 | Status: deferred | Rationale: privacy, retention, sampling, and advisory-boundary closure belongs to later implementation and verification. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP4` owns the operational policy closure.
- R10 | Status: deferred | Rationale: design-system-governed UI implementation belongs to Phase 3 and later evidence phases. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP2` and `SP3` preserve design-system and graph-matrix authority.
- R11 | Status: deferred | Rationale: end-to-end verification belongs to Phases 4 and 5 after implementation. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: testing and QA floors are explicit in this plan.
- R12 | Status: deferred | Rationale: credential-handling and safety verification belongs to Phase 5 after rebuilt-runtime QA setup. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: the plan keeps local config use non-secret and runtime-owned.
- R13 | Status: deferred | Rationale: Pi runtime-inspection and explain parity belongs to Phase 3 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP5` owns the clean-baseline Pi gap closure.
- R14 | Status: deferred | Rationale: this plan now contains the required upstream disposition matrix, but final downstream citation and evidence still belong to later phases. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `## Traceability And Disposition Matrix` is the durable Phase 2 answer.
- R15 | Status: deferred | Rationale: mixed-version implementation and verification belongs to Phase 3 and Phase 4 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP1` and `SP4` own the old/new telemetry semantics.
- R16 | Status: deferred | Rationale: taxonomy-specific scalability and truncation work belongs to Phase 3 and Phase 4 after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: `SP1` and `SP2` define the backend/UI sides of the guardrails.
- R17 | Status: deferred | Rationale: route-level UI authority mapping and receipts belong to later implementation and evidence phases after this plan locks. | Deferred By: `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md` | Audit Note: the plan now identifies which docs and shared primitives each UI slice must own.

## Audit Verdict

Audit: PASS

## Traceability

- `R1` -> locked `01-as-is.md`, `## Requirement Mapping`, and `## Requirement Completion Status`
- `R2` -> `SP1`, `## Planned Changes by File`, and `## Testing Strategy`
- `R3` -> `SP1`, `## Phase 1 Decisions`, and `## Planned Changes by File`
- `R4` -> `SP1`, `SP4`, and `## Testing Strategy`
- `R5` -> `SP2`, `## Planned Changes by File`, and `## Manual QA Scenarios`
- `R6` -> `SP2`, `## Planned Changes by File`, and `## Manual QA Scenarios`
- `R7` -> `SP3`, `## Planned Changes by File`, and `## Manual QA Scenarios`
- `R8` -> `SP3`, `## Planned Changes by File`, and `## Manual QA Scenarios`
- `R9` -> `SP4`, `## Testing Strategy`, and `## Manual QA Scenarios`
- `R10` -> `SP2`, `SP3`, and `## Playwright Plan (if applicable)`
- `R11` -> `## Testing Strategy`, `## Manual QA Scenarios`, and `SP5`
- `R12` -> `SP4`, `SP5`, and `## Manual QA Scenarios`
- `R13` -> `SP5`, `## Planned Changes by File`, and `## Manual QA Scenarios`
- `R14` -> `## Traceability And Disposition Matrix`, `## Earlier Phase Reconciliation`, and `## Requirement Completion Status`
- `R15` -> `SP1`, `SP4`, `## Testing Strategy`, and `## Manual QA Scenarios`
- `R16` -> `SP1`, `SP2`, `## Testing Strategy`, and `## Manual QA Scenarios`
- `R17` -> `SP2`, `SP3`, `## Planned Changes by File`, and `## Playwright Plan (if applicable)`

## Coverage Gate

- Effective inputs reviewed:
  - locked run-59 requirements, worktree, and AS-IS artifacts
  - upstream run `56`, `57`, and `58` artifacts listed under `Inputs`
  - current design-system and graph-matrix authority docs
  - current memory/domain docs relevant to telemetry and Pi boundaries
- Requirement coverage check:
  - `R1` through `R17` are each covered in `## Requirement Mapping`, `## Implementation Sub-phases`, `## Requirement Completion Status`, and `## Traceability`
  - the full upstream disposition contract required by `R14` is now recorded in `## Traceability And Disposition Matrix`
- Out-of-scope confirmation:
  - no product implementation started in Phase 2
  - benchmark pipeline redesign and `/app/models/benchmark` rework remain out of scope unless a carried-forward dependency breaks during implementation

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - every in-scope requirement has a concrete ownership path, verification surface, and QA expectation
  - the upstream narrowing/disposition contract is explicit
  - the sequence resolves the main architecture ambiguities before code changes start
  - the plan preserves the design-system, graph-matrix, Pi-boundary, and mixed-version constraints identified in Phase 1
- Remaining blockers:
  - none for proceeding to Phase 3 strict TDD implementation

Approval: PASS
