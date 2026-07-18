Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-07-18T01:11:37Z`
LockHash: `6d1d4f7eb6c73d68e07aba93f38962521f7aa39372f1c89806dbff725f9c6a6b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-worktree.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/01-as-is.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md` (DRAFT)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/02-to-be-plan.upstream-gap.01.5-root-cause.addendum-02.md` (DRAFT)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/requirements-investigation.md`
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase2-takeover-audit.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/02-to-be-plan.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`
Outputs:
- This file
Scope note: Define the audited, test-first implementation and validation sequence for request-ledger performance, Models mutation convergence, benchmark startup/profile scaling, streaming failure ownership and telemetry, Kimi K3 streaming coverage, compact catalog serialization, packaging, and mandatory rebuilt-runtime verification.

## TODO

- [x] Reconcile locked requirements and root-cause artifacts
- [x] Reconcile both Phase-2 upstream-gap addenda
- [x] Audit the normalized worktree diff and prior agent state
- [x] Replace invalid RED tests with desired-behavior regressions
- [x] Map R1-R10 and A1-A5 to concrete implementation/test/QA paths
- [x] Define ordered sub-phases with stop gates and recovery notes
- [x] Define Playwright, performance, packaging, and rebuilt-runtime plans
- [x] Run the Phase-2 self-audit and repair all discovered gaps
- [x] Prepare the base plan and addenda for canonical locking

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: collaboration tools are present in the environment.
- Delegation Decision Basis: the controller performed a full local takeover audit over the locked artifacts, both addenda, exact normalized diff, code surfaces, and baseline suites.
- Delegation Override Reason: current task policy does not authorize spawning subagents unless the user explicitly requests delegation; the user requested this agent to take over and audit the run.
- Audit Inputs Provided:
  - artifacts: all paths listed under `Inputs`
  - diff basis: `7094a252b7cab222f5ff12d1753e77cef83d6a22` to `working-tree`
  - actual product/test changed files: none
  - targeted code: sqlite-memory observation/profile reads; Models and benchmark routes; bridge streaming handlers/profile builder; execution telemetry; catalog export/load consumers; runtime UI E2E and packaging validators

## Effective Inputs Re-read

- `00-requirements.md`: re-read R1-R10, OOS1-OOS6, performance budgets, strict TDD constraint, packaging and rebuilt-runtime criteria.
- `00-worktree.md`: re-read the isolated branch/worktree and normalized diff basis.
- `01-as-is.md`: re-read the request-list blob scan, mutation fanout, benchmark gating, profile N+1 reads, and catalog artifact analysis.
- `01.5-root-cause.md`: re-read the confirmed synchronous SQLite/event-loop root cause and benchmark/profile contributing architecture.
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`: re-read A1-A5 for post-commit streaming, selected-target telemetry, Kimi K3 coverage, and `/proc` negative-control ownership.
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/02-to-be-plan.upstream-gap.01.5-root-cause.addendum-02.md`: re-read the missing RED-evidence recovery and mandatory rebuilt-runtime Phase-5 gate.
- `evidence/requirements-investigation.md`: restored into the worktree and re-read for query plans, timings, payload sizes, and cross-route health evidence.
- `evidence/phase2-takeover-audit.md`: re-read every mechanical and technical finding; each P0/P1 finding is compensated below.
- Relevant state, decision, memory, and prior-run artifacts were re-read for Run 67 route ownership, Run 74 Kimi K3 behavior, Run 75 Pi model preflight, and Run 76 eject authority.

## Earlier Phase Reconciliation

- The locked SQLite/UI root-cause analysis remains valid and is not edited.
- R1's missed pre-Phase-2 RED timing is preserved as an upstream gap. Phase 3 must disclose it and recover honestly with strict RED-before-production evidence.
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md` adds a second, independent post-commit stream-failure root cause; it does not replace the SQLite event-loop root cause.
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/02-to-be-plan.upstream-gap.01.5-root-cause.addendum-02.md` invalidates the prior Phase-2 passing audit and requires this repaired plan plus mandatory rebuilt-runtime execution.
- No product implementation from another agent exists to accept or revert. Phase 3 starts from the normalized baseline after this plan and both addenda lock.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md` and `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`: first-render route ownership and prior removal of broad `fetchRuntimeSnapshot()` bootstraps.
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`: canonical `moonshot/kimi-k3` -> upstream `k3`, Kimi Code chat-completions shape, OAuth QA, and fixed-temperature omission.
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/02-to-be-plan.md`: Role Model model-discovery preflight owns invalid custom model IDs; no Run-77 `/proc` special case.
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`: exact account/model eject identity, authority separation, atomic YAML mutation, typed conflicts, rollback, indeterminate outcomes, and reconciliation receipts.
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`: selected-endpoint failure truth, Kimi validation expectations, rebuilt-runtime verification, and request-ledger startup boundaries.
- `/.recursive/memory/domains/pi-role-model-package.md`: a clean Pi pass requires both runtime telemetry and a terminating Pi transcript.

## Source Requirement Inventory

- `R1`: root-cause and failing-regression timing; compensated by Addendum 02 and strict first-action RED evidence.
- `R2`: projection-only indexed recent-request summaries plus route-source ownership and performance budgets.
- `R3`: mutation completion independent of rich requests and full candidates.
- `R4`: independently responsive Models-to-benchmark navigation and progressive startup.
- `R5`: indexed, bounded, batched benchmark profile/candidate enrichment.
- `R6`: Save bindings correctness and idempotence.
- `R7`: Run-76 eject authority, safety, and receipt preservation.
- `R8`: bounded purpose-specific post-mutation convergence.
- `R9`: versioned compact catalog wire format and canonical hydration boundary.
- `R10`: affected suites, validators, clean packaging, large-database evidence, and rebuilt-runtime compatibility.
- `A1-A2`: commit-aware response ownership and deterministic committed-stream termination.
- `A3`: selected-target and partial-usage truth on post-selection stream failures.
- `A4`: Kimi K3 chat-completions streaming success/failure matrix.
- `A5`: malformed `/proc` model ID remains pre-execution/non-provider truth.

## Requirement Mapping

- `R1` | Coverage: `merged` | Source Quote: "Phase 1 and mandatory Phase 1.5 must reproduce and isolate each stage of the affected mutations and route transition before implementation planning" | Implementation Surface: `/.recursive/run/77-catalog-json-size-and-ui-freeze/03-implementation-summary.md` | Verification Surface: `/.recursive/run/77-catalog-json-size-and-ui-freeze/04-test-summary.md` | QA Surface: `/.recursive/run/77-catalog-json-size-and-ui-freeze/05-manual-qa.md` | Merge Rationale: Addendum 02 preserves the missed timing and requires strict RED evidence before every production edit.
- `R2` | Coverage: `direct` | Source Quote: "`listRecentRuntimeObservations()` selects `client_request_id` directly and does not select `observation_json`" | Implementation Surface: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Surface: `role-model-router/packages/sqlite-memory/test/index.test.ts`, `role-model-router/apps/runtime-ui/app/routes/startup-bootstrap-regression.test.ts`, `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/perf/` | QA Surface: Phase-5 rebuilt runtime request/health performance matrix.
- `R3` | Coverage: `direct` | Source Quote: "`Save bindings` does not call or await `fetchRuntimeRequests()` as part of mutation completion" | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`, Run-77 Playwright spec | QA Surface: rebuilt-runtime Save/Eject critical-path timings.
- `R4` | Coverage: `direct` | Source Quote: "navigating from `/app/models` to `/app/models/benchmark` renders the benchmark page shell and essential controls within `500 ms` on the defined QA environment" | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/routes/control-benchmark.test.ts`, Run-77 Playwright spec | QA Surface: rebuilt-runtime Models-to-benchmark navigation matrix.
- `R5` | Coverage: `direct` | Source Quote: "idempotent migrations add indexes matching endpoint/difficulty filters and timestamp/sample or measured-at/snapshot ordering" | Implementation Surface: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/packages/sqlite-memory/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, performance fixtures | QA Surface: rebuilt-runtime candidate/profile timing and query-plan proof.
- `R6` | Coverage: `direct` | Source Quote: "save persists the selected account/model assignment using the existing role assignment modes and normalization rules" | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts` | QA Surface: rebuilt-runtime role-binding save and repeat-save proof.
- `R7` | Coverage: `direct` | Source Quote: "exact `{providerAccountId, modelId}` identity remains the eject target" | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, existing Run-76 backend eject surfaces (guardrail only) | Verification Surface: `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`, affected Run-76 host tests | QA Surface: disposable rebuilt-runtime eject outcome matrix.
- `R8` | Coverage: `direct` | Source Quote: "only canonical changed surfaces are reread after mutation when the mutation response does not already carry them" | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: Models route request-count/payload regression and Playwright network receipts | QA Surface: rebuilt-runtime request-count/byte evidence.
- `R9` | Coverage: `direct` | Source Quote: "define a versioned compact serialized catalog type and canonical hydration/decoder boundary" | Implementation Surface: `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/src/cli.ts`, all tracked-catalog consumers, `role-model-router/packages/catalog/data/normalized-catalog.json`, packaging copy/validation surfaces | Verification Surface: catalog, token-economics, account, registry, routing, adapter, host, sqlite-memory, and packaging suites | QA Surface: rebuilt-runtime catalog load plus byte/parse evidence.
- `R10` | Coverage: `direct` | Source Quote: "affected sqlite-memory, runtime-host, runtime-ui, provider-account, endpoint-registry, catalog, and packaging suites pass" | Implementation Surface: `role-model-router/packages/sqlite-memory/`, `role-model-router/apps/runtime-ui/`, `role-model-router/apps/runtime-host-bridge/`, `role-model-router/packages/catalog/`, `role-model-router/packages/provider-account/`, `role-model-router/packages/endpoint-registry/`, `role-model-router/packages/adapter-execution/`, `role-model-router/packages/provider-openai/` | Verification Surface: `package.json` named validators, `role-model-router/apps/runtime-ui/playwright.config.ts`, `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`, `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/` | QA Surface: mandatory running rebuilt-runtime Phase-5 matrix from Addendum 02 B3.
- `A1` | Status: `planned` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | QA Surface: rebuilt-runtime induced post-commit stream failure.
- `A2` | Status: `planned` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: bridge real-server/client bounded-termination tests | QA Surface: terminating Pi/client transcript plus post-failure health.
- `A3` | Status: `planned` | Implementation Surface: runtime-host execution failure persistence plus `role-model-router/packages/runtime-observability/` and `role-model-router/packages/sqlite-memory/` only where RED trace proves a gap | Verification Surface: selected-endpoint failure/request-detail tests | QA Surface: rebuilt-runtime request inspection after induced failure.
- `A4` | Status: `planned` | Implementation Surface: Kimi Code shared provider/adapter path only where RED trace proves a gap | Verification Surface: `role-model-router/packages/adapter-execution/test/index.test.ts`, `role-model-router/packages/provider-openai/test/index.test.ts`, bridge stream tests | QA Surface: live rebuilt-runtime Kimi K3 when configured; otherwise exact blocker plus deterministic matrix.
- `A5` | Status: `planned-indirectly` | Implementation Surface: no Run-77 production change; Run-75 `packages/pi-role-model/src/extension.ts` remains owner | Verification Surface: existing Pi preflight tests plus runtime pre-execution negative control | QA Surface: request inspection confirms no selected provider/endpoint | Rationale: the malformed path is explicitly non-causal and must not create runtime special cases.

## Plan Drift Check

- Prior draft drift: omitted both addenda, browser requirements, bounded benchmark projection, batched profiles, catalog consumers, telemetry/stream work, performance harnesses, and concrete R10 paths.
- Current repair: all takeover-audit P0/P1 findings are mapped into sub-phases SP1-SP8.
- Expected product scope grows beyond the original draft only where Addendum 01 or a base acceptance criterion already requires it.
- No providers-page optimization, general telemetry redesign, catalog persistence, upstream catalog refresh, breaking API removal, or broad Models redesign is introduced.
- Any Phase-3 RED trace that proves an expected file unnecessary must record the reduction in `03-implementation-summary.md`; any new product path requires a Phase-3 upstream-gap addendum.

## Design Decisions

1. Automatic Models bootstrap and mutation paths do not call the rich request-list endpoint. Existing request evidence is preserved through mutations; any retained refresh is explicit and bounded.
2. Save bindings converges from the returned account truth or one targeted account read. Eject consumes its structured receipt and only rereads canonical surfaces not carried by the receipt.
3. Full router candidates and request history never gate mutation success or button clearing.
4. Benchmark shell renders synchronously. Essential data is limited to suite, preferences, and a compact runnable-endpoint projection; each resolves independently.
5. Candidate capability enrichment batches latest general/difficulty profiles. Sample history is absent from candidate construction and bounded on explicit detail reads.
6. Streaming handlers share one response-state-aware terminal-error helper. Pre-commit failures can return JSON; post-commit failures terminate the stream without a second header write.
7. Selected-target failure persistence is changed only if the RED test proves current selected endpoint/provider/model/adapter or partial-usage truth is lost.
8. Catalog compaction uses a versioned wire schema and one canonical decoder. Direct consumers may not parse the compact JSON as `NormalizedCatalog`.
9. Phase 5 must run the rebuilt runtime from this worktree on isolated state/port and capture the full B3 evidence matrix.

## Planned Changes by File

Expected core paths:

- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/startup-bootstrap-regression.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/e2e/recursive-77-catalog-json-size-and-ui-freeze.sp8.runtime-responsiveness.spec.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `role-model-router/packages/adapter-execution/test/index.test.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/packages/catalog/src/index.ts`
- `role-model-router/packages/catalog/src/cli.ts`
- `role-model-router/packages/catalog/test/index.test.ts`
- `role-model-router/packages/catalog/test/token-economics.test.ts`
- `role-model-router/packages/catalog/data/normalized-catalog.json`

Conditional catalog-consumer paths, changed only as required by the chosen decoder boundary:

- `role-model-router/packages/sqlite-memory/src/cli.ts`
- `role-model-router/packages/protocol-routing/src/cli.ts`
- `role-model-router/packages/endpoint-registry/src/cli.ts`
- `role-model-router/packages/adapter-execution/src/cli.ts`
- corresponding provider-account, routing, registry, adapter, host, and packaging tests
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`

## Implementation Steps

1. Implement SP1-SP4 in order to remove synchronous request-ledger work and benchmark/profile startup fanout while preserving Models mutation authority.
2. Implement SP5-SP6 to make committed-stream failure ownership and selected-target/Kimi telemetry deterministic.
3. Implement SP7 only through the canonical compact-catalog decoder boundary, then migrate every direct consumer proven by repository search.
4. Implement SP8 last to assemble browser, performance, packaging, and clean-staging verification controls.
5. Stop at every sub-phase gate until strict RED, focused GREEN, and refactor receipts are captured.

## Implementation Sub-phases

### SP1 — Recent-request projection, index, and route ownership (`R1`, `R2`)

Purpose: make summaries projection-only/indexed and prevent automatic production routes from reintroducing rich-ledger fanout.

Implementation checklist:

- [ ] Add desired-behavior RED tests for direct `client_request_id`, null preservation, large blobs, ordering index, migration receipt/idempotence, detail-read preservation, and latest-ID preservation.
- [ ] Add a route-source RED test scanning all registered production route files for calls to `fetchRuntimeSnapshot()` or `fetchRuntimeRequests()`.
- [ ] Capture RED logs before production edits.
- [ ] Add the ordering index through schema initialization and the existing migration receipt mechanism.
- [ ] Rewrite `listRecentRuntimeObservations()` to project `client_request_id` and remove JSON parsing.
- [ ] Remove automatic rich-history calls from Models bootstrap/mutation paths while preserving current UI truth until SP2.
- [ ] Add a representative large-blob performance fixture and 30-sample request/health measurement script or test harness.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/startup-bootstrap-regression.test.ts
```

Acceptance gate:

- RED fails for the intended query/source reason before production edits.
- GREEN proves index-backed query plan, no blob projection/parse, null semantics, lightweight detail separation, and zero automatic route calls.
- Performance evidence records fixture shape, warmup, all samples, p95, and concurrent health max.

Recovery: index creation is idempotent; revert only SP1 product/test diffs if the query contract cannot remain backward compatible.

### SP2 — Models mutation convergence and authority preservation (`R3`, `R6`, `R7`, `R8`)

Purpose: finish Save/Eject after canonical truth without remounting inventory or waiting on advisory data.

Implementation checklist:

- [ ] Add exported/pure mutation orchestration tests or component-level tests that hold rich requests/candidates indefinitely.
- [ ] Add RED cases for save success, repeat-save idempotence, validation failure, advisory failure, peer eject, account-managed/config-managed eject, conflict, rollback, indeterminate, already absent, and last-model deletion.
- [ ] Record request counts and payload bytes in test receipts.
- [ ] Make Save use returned/targeted account truth and preserve unchanged snapshot surfaces.
- [ ] Make Eject consume the structured receipt and bounded canonical rereads only.
- [ ] Do not clear loaded candidates/request evidence during mutation; refresh advisory candidates after interactivity if needed.
- [ ] Clear button pending state after canonical convergence, not after advisory work.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/control-models.test.ts app/lib/runtime-api.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/remove-account-model.test.ts test/backend-unified-runtime-config.test.ts
```

Acceptance gate: all mutation correctness outcomes remain truthful, pending state is independent of hung advisory calls, and request-count/byte limits are asserted.

Recovery: retain the current snapshot until canonical convergence succeeds; on mutation failure restore prior visible truth and do not run advisory updates.

### SP3 — Batched/indexed benchmark profile data (`R5`)

Purpose: eliminate per-endpoint full-history/N+1 work from candidate construction and bound explicit detail reads.

Implementation checklist:

- [ ] Add RED query-plan tests for general/difficulty samples and profiles.
- [ ] Add RED scaling tests with multiple endpoints/history rows that count database opens/queries and fail on per-endpoint sample reads.
- [ ] Add matching idempotent indexes.
- [ ] Reuse/extend `readLatestObservedProfilesByEndpointIds()` for bulk general/difficulty reads.
- [ ] Remove sample-history reads from benchmark capability/candidate construction.
- [ ] Add a documented recent-sample limit to explicit endpoint-profile reads while preserving chronological response semantics.
- [ ] Measure 3+ endpoint-count tiers and candidate payload/time.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "profile|candidate"
```

Acceptance gate: query plans use matching indexes without temp sorts, candidate construction performs bounded batched profile work, no candidate path reads full samples, and p95/scaling evidence meets R5.

Recovery: keep explicit full-history/export behavior separate; if an existing explicit consumer requires history, add a dedicated bounded/detail option rather than restoring it to startup.

### SP4 — Benchmark compact startup and progressive UI (`R4`, `R5`)

Purpose: render benchmark shell/controls independently from every advisory read and avoid the full rich-candidate payload as essential data.

Implementation checklist:

- [ ] Define and RED-test a compact runnable benchmark endpoint identity/capability contract.
- [ ] Add runtime-api/bridge coverage for the bounded projection and payload-size ceiling.
- [ ] Add route tests with separately controlled promises for suite, preferences, endpoints, summaries, runs, runtime summary, and rich profiles.
- [ ] Render shell synchronously and settle each section independently with truthful loading/error state.
- [ ] Prevent duplicate candidate construction when summaries are absent.
- [ ] Add abort signals for route-owned advisory fetches; backend correctness remains independent of abort.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/control-benchmark.test.ts app/lib/runtime-api.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "benchmark.*candidate|candidate.*benchmark"
```

Acceptance gate: shell renders before any fetch settles, controls do not wait on advisory data, essential payload is bounded, and each advisory failure is isolated.

Recovery: keep last known advisory state while refreshing; cancellation/unmount must not clear previously loaded state.

### SP5 — Post-commit stream ownership (`A1`, `A2`)

Purpose: prevent second-response header mutation and terminate committed streams deterministically.

Implementation checklist:

- [ ] Add real bridge-server RED tests for chat-completions and Responses: write first chunk with metadata, then reject execution.
- [ ] Assert baseline exhibits header-write failure or hanging/incorrect terminal behavior for the expected reason.
- [ ] Add pre-commit error, successful stream, and client-disconnect controls.
- [ ] Introduce one shared response-state-aware terminal-error helper.
- [ ] Preserve pre-commit structured errors; after commit, stop writes and close/destroy the stream without JSON/header replacement.
- [ ] Assert bounded client body-reader termination and no `ERR_HTTP_HEADERS_SENT`.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "post-commit|committed stream|stream failure"
```

Acceptance gate: both ingress surfaces pass success, pre-commit failure, post-commit failure, and disconnect matrices with deterministic termination.

Recovery: helper is local to HTTP response ownership; do not alter router fallback or provider retry policy.

### SP6 — Selected-target telemetry and Kimi K3 streaming (`A3`, `A4`, `A5`)

Purpose: preserve attributable post-selection failure truth and verify Kimi's intended chat-completions stream shape.

Implementation checklist:

- [ ] Add RED request-detail/telemetry tests for endpoint, provider account, selected model, adapter, routing decision, error class, and partial/unknown usage after first-chunk failure.
- [ ] Reuse existing selected-provider failure persistence where possible; modify runtime-observability/sqlite only for fields proven missing by RED.
- [ ] Add Kimi K3 canonical `/coding/v1/chat/completions` success and first-chunk-then-error fixtures.
- [ ] Include tools/function-calling payload compatibility and one `[DONE]` success control.
- [ ] Preserve `/proc/1513/fd/63` as `routing.failed.pre-execution` with no selected target; make no `/proc` production change.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/adapter-execution exec vitest run test/index.test.ts -t "kimi"
corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts -t "kimi"
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "selected endpoint|Kimi|stream failure"
corepack pnpm --filter @try-works/pi-role-model exec vitest run test/extension.test.ts -t "foreign provider ids"
```

Acceptance gate: future Kimi-shaped failures are attributable without inference; partial usage is not authoritative zero; malformed custom IDs remain pre-execution only.

Recovery: do not widen telemetry into OOS general redesign; retain additive/backward-compatible fields.

### SP7 — Versioned compact catalog and consumer migration (`R9`)

Purpose: reduce tracked/packaged bytes by at least 40% without breaking any direct consumer or changing the pinned source revision.

Implementation checklist:

- [ ] Inventory and lock the current source revision/provider/model counts and semantic hashes.
- [ ] Add RED serialization/default/non-default/round-trip/size tests.
- [ ] Define a versioned compact wire type and one canonical decode/hydrate loader.
- [ ] Omit only fields allowed by R9 and restore exact defaults.
- [ ] Migrate every direct runtime/CLI/test consumer to the decoder or define separate compact/hydrated artifacts with explicit packaging ownership.
- [ ] Update export CLI and tracked-artifact parity.
- [ ] Regenerate only from the pinned source; reject unrelated content drift.
- [ ] Verify SEA/staged packaging reads the compact representation through the canonical boundary.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/catalog test
corepack pnpm --filter @role-model-router/sqlite-memory test
corepack pnpm --filter @role-model-router/provider-account test
corepack pnpm --filter @role-model-router/endpoint-registry test
corepack pnpm --filter @role-model-router/protocol-routing test
corepack pnpm --filter @role-model-router/adapter-execution test
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/provider-overlap-metadata.test.ts test/executable.test.ts
```

Acceptance gate: ≥40% tracked size reduction, semantic round trip, exact non-default preservation, unchanged pinned source/counts, and all direct consumers green.

Recovery: export is deterministic; retain the previous tracked artifact until all consumer tests are GREEN, then replace it atomically in the worktree.

### SP8 — Browser, performance, packaging, and rebuilt-runtime harness readiness (`R2-R10`, `A1-A4`)

Purpose: add deterministic automated evidence surfaces needed before Phase 4/5 without claiming Phase-5 results during implementation.

Implementation checklist:

- [ ] Extend `start-for-qa.ts` with deterministic delayed/hung rich-history/candidate and induced post-commit stream-failure controls, gated to QA configuration.
- [ ] Add the Run-77 Playwright spec with stable selectors and tags.
- [ ] Capture route shell, mutation completion, health/lightweight API, and failed-stream recovery in the spec.
- [ ] Add performance sampling utilities/fixtures under run evidence or package tests as appropriate.
- [ ] Add packaging assertions for clean staging and no obsolete route bundle imports.
- [ ] Keep Phase-5 live rebuilt-runtime scenarios documented but unclaimed until executed.

Tests and commands:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec playwright test --grep "@recursive:77-catalog-json-size-and-ui-freeze @sp8"
corepack pnpm --filter @role-model-router/runtime-ui exec playwright test --grep "@smoke"
corepack pnpm run runtime:validate-packaging
```

Acceptance gate: deterministic browser regressions and packaging checks are green; evidence paths are configured for traces/screenshots/videos on failure.

Recovery: QA-only controls must be unreachable in ordinary runtime startup and removable without product behavior changes.

## Testing Strategy

TDD Mode: `strict`

- Every production behavior change starts with a desired-behavior test that fails for the intended reason.
- RED logs: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/logs/red/sp<k>-<topic>.log`
- GREEN logs: `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/logs/green/sp<k>-<topic>.log`
- If a proposed RED passes, implementation stops until the test is corrected.
- Each sub-phase runs its focused gate before the next begins.
- Phase 4 reruns owning suites, named validators, Tier A, Tier B, and packaging from a clean state.
- Performance evidence records OS/Node, fixture/database size, row counts, blob distribution, warmups, sample count, raw samples, p50/p95/max, payload bytes, and method.

Broader Phase-4 commands:

```powershell
corepack pnpm run schemas:validate
corepack pnpm run runtime:test-critical
corepack pnpm run runtime:test-router
corepack pnpm run runtime:test-browser
corepack pnpm run runtime:validate-routing
corepack pnpm run runtime:validate-host
corepack pnpm run runtime:validate-vendors
corepack pnpm run runtime:validate-ui
corepack pnpm run runtime:validate-packaging
```

## Playwright Plan (if applicable)

- Canonical test directory: `role-model-router/apps/runtime-ui/e2e/` from `playwright.config.ts`.
- New file: `recursive-77-catalog-json-size-and-ui-freeze.sp8.runtime-responsiveness.spec.ts`.
- Required header comment: run id, SP8, covers R2-R4/R6-R8/R10/A1-A2, guardrails R7.
- Describe tags: `@smoke @recursive:77-catalog-json-size-and-ui-freeze @sp8`.
- Stable selectors only; add minimal `data-testid` values where current controls lack stable ownership.
- QA server: existing Playwright `webServer`, extended through opt-in Run-77 fixture configuration.
- Readiness: `http://127.0.0.1:3462/healthz` for automated E2E; Phase 5 uses a separate isolated port.
- Tier A: exact `--grep` SP8 command above.
- Tier B: `corepack pnpm run runtime:test-browser`.
- Evidence: Playwright report/test-results plus copied relevant traces/screenshots/videos under `evidence/traces/` and `evidence/screenshots/`.

## Manual QA Scenarios

### Mandatory Phase-5 Rebuilt-Runtime QA

QA Execution Mode will be `agent-operated` unless the user later requests human/hybrid sign-off.

The agent must run, not merely build, the rebuilt runtime:

1. Build runtime UI and runtime-host artifacts from this worktree.
2. Create a clean staging directory and disposable runtime-state root.
3. Start the rebuilt runtime on an unused isolated localhost port using tokenized Windows arguments.
4. Wait for canonical readiness and record executable hash, port, state root, Node/runtime version, and start log.
5. Run Save bindings and repeat-save against disposable state; record mutation response, essential convergence, button duration, requests, bytes, health, and unrelated API timing.
6. Run every safe R7 eject outcome supported by disposable fixtures; never mutate the user's live configured pool.
7. Navigate Models -> benchmark with history/candidates delayed; record shell/essential/advisory timing and long tasks.
8. Run request-list and candidate/profile performance loops against representative large fixtures and capture query plans.
9. Induce a post-commit stream failure; prove the client/Pi terminates, no `ERR_HTTP_HEADERS_SENT` occurs, request detail retains selected-target truth, and the runtime/UI remain responsive.
10. Run live Kimi K3 success if isolated configured OAuth is available; otherwise record the exact blocker and rely only on deterministic tests for that row.
11. Inspect staged UI/release bundles for retired `fetchRuntimeSnapshot()`/automatic `fetchRuntimeRequests()` route imports and prove clean staging removed stale hashed assets.
12. Stop the runtime and verify port/process/state cleanup.

Phase 5 cannot pass without these rebuilt-runtime execution receipts.

## Idempotence and Recovery

- SQLite indexes use idempotent creation plus migration receipts.
- Batched reads and bounded limits are read-only and backward compatible.
- Mutation UI retains prior visible state until canonical convergence; failures do not fabricate success.
- Catalog export is deterministic from the pinned source revision and replaces the tracked artifact only after consumer GREEN gates.
- Stream error handling changes response ownership only; it does not change routing retry/fallback semantics.
- Rebuilt QA uses disposable state and an isolated port; cleanup is required even on failure.
- If a sub-phase fails, stop there, preserve evidence, repair within the same sub-phase, and do not advance.

## Requirement Completion Status

- `R1 | Status: planned-via-merge | Implementation Surface: /.recursive/run/77-catalog-json-size-and-ui-freeze/03-implementation-summary.md | Verification Surface: /.recursive/run/77-catalog-json-size-and-ui-freeze/04-test-summary.md | QA Surface: /.recursive/run/77-catalog-json-size-and-ui-freeze/05-manual-qa.md | Rationale: Addendum 02 records and compensates the missed pre-Phase-2 RED timing.`
- `R2 | Status: planned | Implementation Surface: role-model-router/packages/sqlite-memory/src/index.ts, role-model-router/apps/runtime-ui/app/routes/control-models.tsx | Verification Surface: role-model-router/packages/sqlite-memory/test/index.test.ts, role-model-router/apps/runtime-ui/app/routes/startup-bootstrap-regression.test.ts | QA Surface: rebuilt-runtime request/health performance matrix`
- `R3 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/routes/control-models.tsx | Verification Surface: role-model-router/apps/runtime-ui/app/routes/control-models.test.ts, role-model-router/apps/runtime-ui/e2e/recursive-77-catalog-json-size-and-ui-freeze.sp8.runtime-responsiveness.spec.ts | QA Surface: rebuilt-runtime mutation timing`
- `R4 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx, role-model-router/apps/runtime-ui/app/lib/runtime-api.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-ui/app/routes/control-benchmark.test.ts, Run-77 Playwright spec | QA Surface: rebuilt-runtime navigation timing`
- `R5 | Status: planned | Implementation Surface: role-model-router/packages/sqlite-memory/src/index.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: sqlite-memory and runtime-host profile/candidate tests plus evidence/perf | QA Surface: rebuilt-runtime profile query plans and p95`
- `R6 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/routes/control-models.tsx | Verification Surface: role-model-router/apps/runtime-ui/app/routes/control-models.test.ts | QA Surface: rebuilt-runtime save/repeat-save`
- `R7 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/routes/control-models.tsx | Verification Surface: Models tests plus Run-76 host guardrails | QA Surface: disposable rebuilt-runtime eject matrix`
- `R8 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/routes/control-models.tsx, role-model-router/apps/runtime-ui/app/lib/runtime-api.ts | Verification Surface: request-count/payload tests and Playwright receipts | QA Surface: rebuilt-runtime request/byte evidence`
- `R9 | Status: planned | Implementation Surface: role-model-router/packages/catalog/src/index.ts, role-model-router/packages/catalog/src/cli.ts, tracked catalog consumers, normalized-catalog.json, package-sea.ts | Verification Surface: catalog and all direct-consumer suites | QA Surface: rebuilt-runtime catalog load plus byte/parse evidence`
- `R10 | Status: planned | Implementation Surface: role-model-router/packages/sqlite-memory/, role-model-router/apps/runtime-ui/, role-model-router/apps/runtime-host-bridge/, role-model-router/packages/catalog/, role-model-router/packages/provider-account/, role-model-router/packages/endpoint-registry/, role-model-router/packages/adapter-execution/, role-model-router/packages/provider-openai/ | Verification Surface: package.json validators, runtime-ui Playwright config, runtime-host validate-packaging | QA Surface: mandatory running rebuilt-runtime Phase-5 matrix`
- `A1 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/index.test.ts | QA Surface: rebuilt-runtime induced failure`
- `A2 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: real server/client stream tests | QA Surface: terminating Pi/client transcript`
- `A3 | Status: planned | Implementation Surface: runtime-host failure persistence and telemetry packages only if RED proves gaps | Verification Surface: selected-endpoint request-detail tests | QA Surface: rebuilt-runtime failed request inspection`
- `A4 | Status: planned | Implementation Surface: existing Kimi provider/adapter path only if RED proves gaps | Verification Surface: adapter, provider-openai, and bridge Kimi stream tests | QA Surface: live rebuilt Kimi when available or exact blocker`
- `A5 | Status: planned-indirectly | Implementation Surface: packages/pi-role-model/src/extension.ts (Run-75 owner, no Run-77 edit) | Verification Surface: Pi preflight and runtime pre-execution negative control | QA Surface: no selected target | Rationale: malformed `/proc` id is non-causal.`
- `OOS1-OOS6 | Status: out-of-scope | Rationale: unchanged from locked requirements | Scope Decision: /.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md`

## Traceability

- R1 -> Addendum 02, strict RED evidence, Phase-3 TDD log
- R2 -> SP1 and SP8
- R3/R6/R7/R8 -> SP2 and SP8
- R5 -> SP3 and SP4
- R4 -> SP4 and SP8
- A1/A2 -> SP5 and Phase-5 induced failure
- A3/A4/A5 -> SP6 and Phase-5 request inspection/Kimi proof
- R9 -> SP7 plus packaging validation
- R10 -> every sub-phase gate, Phase 4 validators, SP8, and mandatory rebuilt-runtime Phase 5

## Subagent Contribution Verification

- Reviewed Action Records: none; the reported prior agent left no canonical action record.
- Main-Agent Verification Performed: normalized git diff, run status, lock verification, lint, all effective artifacts, targeted code paths, catalog consumers, and baseline owning suites.
- Acceptance Decision: rejected; no implementation existed and the prior Phase-2 audit was invalid.
- Refresh Handling: this plan is rebuilt from current on-disk artifacts and both addenda.
- Repair Performed After Verification: restored missing investigation evidence, created the takeover audit, created Addendum 02, and replaced the Phase-2 plan.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Comparison reference: `working-tree`
- Normalized baseline: `7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Planned or claimed changed files: all core/conditional paths listed under `## Planned Changed Files`.
- Actual changed files reviewed: no product/test files; only Run-77 control/evidence artifacts exist.
- Unexplained drift: none. The modified locked requirements artifact is the controller-approved locked content copied relative to the branch baseline and is covered by its valid lock/receipt.

## Gaps Found

None. The findings recorded as P0-1 through P2-1 in `evidence/phase2-takeover-audit.md` are repaired by this rewrite and Addendum 02. Phase-3 RED traces may still narrow conditional telemetry/catalog-consumer paths; any expansion requires an addendum.

## Repair Work Performed

- Restored `evidence/requirements-investigation.md` into the worktree.
- Added `evidence/phase2-takeover-audit.md`.
- Added `addenda/02-to-be-plan.upstream-gap.01.5-root-cause.addendum-02.md`.
- Replaced invalid broken-behavior RED tests with desired-behavior test contracts.
- Added browser, performance, batched-profile, bounded benchmark projection, stream/telemetry/Kimi, catalog-consumer, packaging, and mandatory rebuilt-runtime plans.
- Reconciled both addenda and mapped R1-R10/A1-A5 mechanically.

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] R1-R10 have concrete implementation, verification, and QA surfaces
- [x] A1-A5 are integrated without false Kimi or `/proc` attribution
- [x] Every takeover-audit finding is compensated
- [x] Sub-phases contain checklists, exact commands, acceptance, and recovery
- [x] Playwright Tier A/Tier B and performance evidence are concrete
- [x] Phase 5 must run the rebuilt runtime
- [x] OOS1-OOS6 remain excluded
- [x] Audit passes

Coverage: PASS

## Approval Gate

- [x] Phase 2 is planning-only with no unexplained product diff
- [x] Strict RED-before-production recovery is explicit
- [x] Expected files and conditional boundaries are concrete
- [x] Test, browser, performance, packaging, and rebuilt-runtime commands are runnable from the real worktree
- [x] Both Phase-2 addenda are effective inputs
- [x] Audit passes

Approval: PASS
