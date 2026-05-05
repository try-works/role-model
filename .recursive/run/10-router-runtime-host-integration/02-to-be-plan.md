Run: `/.recursive/run/10-router-runtime-host-integration/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T08:03:54Z`
LockHash: `bb27fbec929c2a497d41112abbdb186a486f9d468369a2414f07a8cc1f54ab32`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/gateway-smoke/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/cli.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- `D:\llama-swap\README.md`
- `D:\llama-swap\go.mod`
- `D:\llama-swap\llama-swap.go`
- `D:\llama-swap\proxy\proxymanager.go`
- `D:\llama-swap\proxy\process.go`
- `D:\llama-swap\proxy\metrics_monitor.go`
- `D:\llama-swap\proxy\proxymanager_api.go`
- `D:\llama-swap\proxy\proxymanager_loghandlers.go`
- `D:\llama-swap\proxy\ui_embed.go`
Outputs:
- `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `10-router-runtime-host-integration` into a narrow bridge-based implementation plan. Run 10 will vendor a bounded `llama-swap` fork inside the repo, add a managed TypeScript bridge that reuses the existing role-model routing/adapter stack, and redirect the vendor host's JSON LLM request path into that bridge while preserving upstream log, metric, and capture surfaces.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the roadmap slice
- [x] Choose the concrete fork layout and bridge topology
- [x] Define the file-level implementation surface
- [x] Define the validation and manual-QA surface for the integrated host path
- [x] Constrain the run away from direct Go re-porting and later observability/product work

## Fork Layout Decision

- Selected runtime shape: `Go llama-swap fork + managed TypeScript bridge`
- Fork location: `role-model-router/vendor/llama-swap/`
- Reason this plan follows that split:
  - Phase 1 showed that role-model already owns the routing and adapter semantics that must remain authoritative. Re-porting those semantics into Go in run 10 would duplicate run-08/09 logic and create high drift risk.
  - The local vendor host already owns the durable server concerns run 10 actually needs: long-lived HTTP serving, request logging, in-flight tracking, metrics/capture storage, log streaming, admin/event endpoints, and process/shutdown wiring.
  - Keeping the upstream file layout inside `role-model-router/vendor/llama-swap/` preserves vendor-trackability and keeps the fork mechanically comparable to the local baseline at `D:\llama-swap` commit `e261745c66969c119eed1de740380187b365d458`.
  - The user explicitly selected the bridge path in-session, which makes the bridge the authoritative Phase 2 direction for this run.

## Planned Changes by File

- `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`: record the concrete bridge-based fork plan, validation, and scope discipline for run 10.
- `/role-model-router/apps/runtime-host-bridge/package.json`: add a dedicated workspace app for the managed bridge process.
- `/role-model-router/apps/runtime-host-bridge/tsconfig.json`: follow the repo app convention for source and test separation.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: implement the long-lived bridge server entry point and exported start/stop helpers.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`: add bridge-focused tests first for request mapping, model listing, and response shaping before production code is added.
- `/role-model-router/packages/adapter-execution/src/cli.ts`: extract reusable environment-loading helpers where needed so the existing CLI and the new bridge both reuse the same routing/adapter execution path.
- `/role-model-router/packages/adapter-execution/src/index.ts`: extend reusable exports only if the bridge needs shared request/response shaping helpers or a public environment type.
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`: append the pinned `llama-swap` vendor baseline commit and capture metadata.
- `/role-model-router/vendor/llama-swap/go.mod`: vendor the upstream module baseline under the repo-owned fork path.
- `/role-model-router/vendor/llama-swap/go.sum`: vendor the upstream module lockfile.
- `/role-model-router/vendor/llama-swap/llama-swap.go`: preserve the upstream main entry point and add managed bridge process lifecycle only where required.
- `/role-model-router/vendor/llama-swap/proxy/proxymanager.go`: add the narrow bridge-forwarding seam in `mkProxyJSONHandler()` and the `/v1/models` bridge proxy path while preserving existing metrics/log/capture wrapping.
- `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge.go`: add the fork-owned bridge HTTP client/helper surface instead of scattering bridge logic across upstream files.
- `/role-model-router/vendor/llama-swap/proxy/ui_dist/index.html`: add a minimal embedded UI placeholder so the vendored fork builds without depending on an out-of-repo upstream UI build artifact.
- `/role-model-router/vendor/llama-swap/proxy/ui_dist/favicon.ico`: add a minimal placeholder favicon so the upstream `proxy/ui_embed.go` embed target exists.
- `/role-model-router/vendor/llama-swap/config.role-model.yaml`: add a focused local config used by validation for bridge-backed host startup.
- `/package.json`: add one narrow host-validation command if needed, such as `runtime:validate-host`, without widening the general command surface.
- `/pnpm-lock.yaml`: record the new bridge app importer and any coupled dependency updates.

## Implementation Steps

1. Add a dedicated workspace app at `role-model-router/apps/runtime-host-bridge` rather than embedding server code inside `gateway-smoke` or `adapter-execution/cli.ts`, because run 10 needs a long-lived managed process with a stable HTTP interface, not another short-lived validation command.
2. Reuse the existing routing/adapter plane instead of re-implementing it:
   - factor reusable environment-loading helpers out of `adapter-execution/src/cli.ts` as needed,
   - keep registry construction, continuity loading, runtime routing, provider-adapter selection, trace creation, usage-event creation, and capture selection inside the TypeScript runtime path,
   - keep provider-family request/response semantics in the existing `provider-openai` and `provider-anthropic` packages.
3. Implement the bridge server so it can:
   - expose `/healthz`,
   - expose `/v1/models` using the runtime registry/catalog state,
   - accept `POST /v1/chat/completions`,
   - accept `POST /v1/responses`,
   - accept `POST /v1/messages`,
   - map each incoming API request into one role-model `RoutingRequest` plus one `RuntimeExecutionRequest`,
   - run routed execution through the existing TypeScript execution plane,
   - return front-door-compatible JSON or SSE responses derived from the normalized execution result,
   - include response headers that preserve resolved endpoint/model/adapter details for log and capture visibility.
4. Keep routing protocol-governed by deriving `allowEndpoints` from the requested `model` against the built endpoint registry rather than letting the vendor host's alias/process dispatch decide the winner. This preserves the run-08/09 routing contract and ensures the `llama-swap` fork remains an execution host, not the routing semantics source of truth.
5. Vendor the upstream `llama-swap` baseline under `role-model-router/vendor/llama-swap/` as a nested Go module, keeping the upstream layout as intact as practical. The fork should preserve `llama-swap.go`, `proxy/`, `event/`, `models/`, and related support files so later vendor refreshes can be audited against upstream.
6. Add one fork-owned bridge helper in the vendored proxy package instead of rewriting the server:
   - initialize bridge mode from narrow runtime configuration (flags/env and/or a small config overlay),
   - in `mkProxyJSONHandler()`, short-circuit JSON LLM requests into the bridge when bridge mode is enabled,
   - preserve `metricsMonitor.wrapHandler()` so request/response captures, metrics, and event emission still come from the vendor host,
   - proxy `/v1/models` to the bridge in bridge mode so model listing reflects role-model registry state rather than empty vendor `models`.
7. Keep lifecycle and shutdown at the host layer by letting the vendored `llama-swap.go` process manage the bridge subprocess:
   - start the bridge process on host startup when a bridge command is configured,
   - wait for bridge health before accepting traffic,
   - surface bridge start/stop failures in proxy logs,
   - stop the bridge process during normal host shutdown and config reload.
8. Preserve operator surfaces already present in the vendor host:
   - `/logs` and `/logs/stream` remain the primary local log access path,
   - `/api/metrics` and `/api/events` remain the primary host telemetry path,
   - `/api/captures/:id` remains the primary request/response capture readback path,
   - run 10 should not invent a duplicate operator API when the vendor host already provides one.
9. Add a minimal embedded `proxy/ui_dist\` placeholder to keep the vendored Go package buildable in the repo even though upstream built UI assets are not present in the local vendor checkout. This is a build-preservation step, not operator-UI product work.
10. Keep validation narrow and run-10 specific:
    - bridge app unit tests for request mapping and response shaping,
    - a host-integration validation that starts the bridge plus forked host, sends a real API request, reads `/logs` or `/logs/stream`, reads `/api/metrics`, and reads `/api/captures/:id`,
    - existing `runtime:validate-adapter`, `runtime:validate-routing`, and `smoke` regression paths,
    - inherited root `build` and `test` recorded accurately as unchanged broader baseline failures unless the fork introduces a distinct new regression.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- New build checks:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- Host integration validation:
  - `corepack pnpm run runtime:validate-host`
  - or the package-local equivalent if the command remains package-scoped
- Regression checks:
  - `corepack pnpm run runtime:validate-adapter`
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run smoke`
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
- Fork-local Go validation:
  - `C:\Program Files\Go\bin\go.exe test ./...` from `role-model-router\vendor\llama-swap\`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 10 adds a local HTTP host, a managed bridge process, and operator log/capture paths, but it does not add new browser UI work.

## Manual QA Scenarios

1. **Bridge-backed chat request**
   - Steps:
     - start the bridge-backed host validation path
     - send one `POST /v1/chat/completions` request through the vendored host
   - Expected:
     - the response is successful and comes back through the role-model routing/adapter execution plane
     - the returned headers or diagnostics show the resolved endpoint and adapter family

2. **Host log inspection**
   - Steps:
     - read `/logs`
     - optionally connect to `/logs/stream`
   - Expected:
     - host startup, request handling, and any bridge errors are visible locally without leaving the machine

3. **Capture inspection**
   - Steps:
     - read `/api/metrics`
     - extract the latest metric id with `has_capture=true`
     - read `/api/captures/:id`
   - Expected:
     - the request capture contains the front-door request path and host-visible headers/body
     - the response capture contains the bridge-produced response body

4. **Scope-boundary sanity check**
   - Steps:
     - inspect the final diff
   - Expected:
     - routing and adapter semantics still live in TypeScript packages
     - the Go fork adds host integration only
     - run 10 does not widen into full UI redesign, final observability closeout, or a Go rewrite of routing/adapter logic

## Idempotence and Recovery

- Re-running the bridge build/test commands is safe and should keep request mapping and response shaping deterministic.
- Re-running the host validation path is safe and should recreate the same class of logs, metrics, and capture records from the bridge-backed request path.
- Re-running `runtime:validate-adapter`, `runtime:validate-routing`, and `smoke` must remain safe and continue to exercise the existing TypeScript baseline independent of the new host.
- If the fork starts duplicating routing or adapter logic in Go, stop and move that logic back behind the bridge boundary.
- If the host path starts bypassing `metricsMonitor.wrapHandler()` or the existing `/logs` and `/api/captures/:id` surfaces, stop and restore the preserved vendor operator path before closing the run.
- If the vendored fork grows broad upstream UI or packaging churn unrelated to the bridge seam, trim the fork back to the minimum buildable host surface needed for run 10.

## Implementation Sub-phases

### SP1. Bridge app extraction and request/response shaping

Scope and purpose:
Create the managed TypeScript bridge app and factor any shared runtime-execution helpers needed so the bridge can execute real incoming requests through the existing routing/adapter path.

Requirement mapping: `R1`, `R2`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/apps/runtime-host-bridge/` with package metadata and TypeScript config
- [ ] Add tests first for request mapping, model listing, and response shaping
- [ ] Factor reusable runtime-environment loading/helpers out of `adapter-execution/src/cli.ts` where needed
- [ ] Implement the long-lived bridge server with `/healthz`, `/v1/models`, `/v1/chat/completions`, `/v1/responses`, and `/v1/messages`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`

Sub-phase acceptance:
- The bridge can accept front-door API requests, route them through the existing role-model execution plane, and produce path-compatible responses without a live provider network call.

### SP2. Vendored llama-swap fork and bridge seam

Scope and purpose:
Vendor the upstream host baseline and add the narrowest possible bridge seam so the host forwards JSON LLM traffic into the managed TypeScript bridge while preserving logs, metrics, and captures.

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Add `role-model-router/vendor/llama-swap/` from the pinned local baseline
- [ ] Add minimal `proxy/ui_dist/` placeholder assets required for embedding/build
- [ ] Add a fork-owned bridge helper in the vendored proxy package
- [ ] Wire bridge mode into `llama-swap.go` lifecycle management
- [ ] Redirect JSON LLM request handling and `/v1/models` through the bridge when enabled
- [ ] Update the vendor version ledger with the pinned `llama-swap` baseline

Tests for this sub-phase:
- `C:\Program Files\Go\bin\go.exe test ./...`

Sub-phase acceptance:
- The vendored host can start in bridge mode and preserve vendor operator endpoints while serving role-model-backed requests.

### SP3. Integrated validation and receipts

Scope and purpose:
Add the host-validation path required by run 10 and prove the changed request path, logs, metrics, and captures all work together locally.

Requirement mapping: `R3`, `R4`

Implementation checklist:
- [ ] Add a host validation command or package-local equivalent
- [ ] Exercise a real host request through the bridge-backed path
- [ ] Read `/logs` or `/logs/stream`
- [ ] Read `/api/metrics`
- [ ] Read `/api/captures/:id`
- [ ] Record any inherited root failures distinctly from new host regressions

Tests for this sub-phase:
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-adapter`
- `corepack pnpm run runtime:validate-routing`
- `corepack pnpm run smoke`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run build`
- `corepack pnpm run test`

Sub-phase acceptance:
- One local request can travel through the vendored host into the bridge-backed role-model execution path, and the resulting host logs, metrics, and captures are inspectable locally.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/03-implementation-summary.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/04-test-summary.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills are available in this session.
Delegation Decision Basis: `Phase 2 required one controller-owned implementation plan spanning both the nested Go vendor fork and the existing TypeScript runtime packages, with the user-selected bridge architecture treated as the authoritative direction.`
Delegation Override Reason: `Choosing the bridge seam, fork location, operator-surface preservation plan, and validation path required tightly coupled reasoning across the run-10 contract and the concrete local vendor checkout; splitting that into delegated planning would have reduced traceability.`
Audit Inputs Provided:
- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/gateway-smoke/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/cli.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- `D:\llama-swap\README.md`
- `D:\llama-swap\go.mod`
- `D:\llama-swap\llama-swap.go`
- `D:\llama-swap\proxy\proxymanager.go`
- `D:\llama-swap\proxy\process.go`
- `D:\llama-swap\proxy\metrics_monitor.go`
- `D:\llama-swap\proxy\proxymanager_api.go`
- `D:\llama-swap\proxy\proxymanager_loghandlers.go`
- `D:\llama-swap\proxy\ui_embed.go`
- Changed files:
  - `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
  - `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
  - `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
  - `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/gateway-smoke/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/cli.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- `D:\llama-swap\README.md`
- `D:\llama-swap\go.mod`
- `D:\llama-swap\llama-swap.go`
- `D:\llama-swap\proxy\proxymanager.go`
- `D:\llama-swap\proxy\process.go`
- `D:\llama-swap\proxy\metrics_monitor.go`
- `D:\llama-swap\proxy\proxymanager_api.go`
- `D:\llama-swap\proxy\proxymanager_loghandlers.go`
- `D:\llama-swap\proxy\ui_embed.go`

## Earlier Phase Reconciliation

- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`:
  - claim carried forward: run 10 must connect the routed execution plane to a real host path, preserve host/operator boundaries, and add local validation for that changed request path.
  - current reconciliation: this plan does that by vendoring the host, reusing the existing TypeScript runtime plane through a managed bridge, and preserving vendor log/metric/capture APIs.
- `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`:
  - claim carried forward: the repo already owns routing and adapter semantics, while the vendor host already owns server and operator mechanics.
  - current reconciliation: this plan keeps that division intact by adding a bridge seam instead of a Go semantic rewrite.
- `/docs/architecture/06-router-runtime-architecture-lock.md` and the roadmap host slice:
  - claim carried forward: `llama-swap` can be used as an execution-plane host, but it must not replace protocol-governed routing logic.
  - current reconciliation: the bridge plan makes the vendored host call into role-model routing/execution before vendor dispatch rather than letting `llama-swap` choose the winner.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
  - `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
  - `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
  - `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/adapter-execution/src/cli.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
  - `D:\llama-swap\README.md`
  - `D:\llama-swap\go.mod`
  - `D:\llama-swap\llama-swap.go`
  - `D:\llama-swap\proxy\proxymanager.go`
  - `D:\llama-swap\proxy\process.go`
  - `D:\llama-swap\proxy\metrics_monitor.go`
  - `D:\llama-swap\proxy\proxymanager_api.go`
  - `D:\llama-swap\proxy\proxymanager_loghandlers.go`
  - `D:\llama-swap\proxy\ui_embed.go`
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `1e6e543e1dca7bce7765ec55e4fc3a78bf442405`
- Comparison reference: `working-tree`
- Normalized baseline: `1e6e543e1dca7bce7765ec55e4fc3a78bf442405`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 1e6e543e1dca7bce7765ec55e4fc3a78bf442405`
- Diff basis used: `git diff --name-only 1e6e543e1dca7bce7765ec55e4fc3a78bf442405`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/10-router-runtime-host-integration`
- Actual changed files reviewed:
  - `.recursive/run/10-router-runtime-host-integration/00-requirements.md`
  - `.recursive/run/10-router-runtime-host-integration/00-worktree.md`
  - `.recursive/run/10-router-runtime-host-integration/01-as-is.md`
  - `.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`
  - `.recursive/run/10-router-runtime-host-integration/evidence/logs/baseline/install.log`
  - `.recursive/run/10-router-runtime-host-integration/evidence/logs/baseline/schemas-validate.log`
  - `.recursive/run/10-router-runtime-host-integration/evidence/logs/baseline/runtime-validate-routing.log`
  - `.recursive/run/10-router-runtime-host-integration/evidence/logs/baseline/runtime-validate-adapter.log`
  - `.recursive/run/10-router-runtime-host-integration/evidence/logs/baseline/build.log`
  - `.recursive/run/10-router-runtime-host-integration/evidence/logs/baseline/test.log`
  - `.recursive/run/10-router-runtime-host-integration/evidence/logs/baseline/smoke.log`
- Unexplained drift:
  - none; the current working diff is limited to intentional run-10 phase artifacts and baseline evidence logs

## Gaps Found

- none beyond the implementation work intentionally planned in this artifact; the plan is specific enough to begin strict TDD without reopening Phase 1.

## Repair Work Performed

- Converted the remaining design ambiguity into one concrete implementation shape: a nested vendor fork plus one managed bridge app.
- Bound the host changes to the smallest identified vendor seam so the plan preserves existing operator endpoints and metrics/capture machinery instead of replacing them.
- Added an explicit build-preservation step for `proxy\ui_dist\` so the fork can compile locally without turning run 10 into upstream UI work.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines a concrete host path and bridge topology, but the vendored host and managed bridge do not exist in code yet. | Blocking Evidence: `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md` | Audit Note: Phase 3 will add the bridge app and vendored host seam without re-porting routing semantics into Go.
- R2 | Status: blocked | Rationale: lifecycle and concurrency responsibilities are assigned to the vendored host and managed bridge subprocess, but that wiring is not implemented yet. | Blocking Evidence: `D:\llama-swap\llama-swap.go`, `D:\llama-swap\proxy\process.go`, `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md` | Audit Note: Phase 3 should reuse existing host lifecycle primitives and add only the bridge lifecycle overlay.
- R3 | Status: blocked | Rationale: the plan preserves `/logs`, `/logs/stream`, `/api/metrics`, and `/api/captures/:id`, but the role-model-backed host path is not wired into those surfaces yet. | Blocking Evidence: `D:\llama-swap\proxy\metrics_monitor.go`, `D:\llama-swap\proxy\proxymanager_api.go`, `D:\llama-swap\proxy\proxymanager_loghandlers.go`, `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md` | Audit Note: Phase 3 must preserve vendor capture wrapping and operator APIs when bridge mode is enabled.
- R4 | Status: blocked | Rationale: the plan defines a concrete integrated validation path, but no host validation command or test exists yet. | Blocking Evidence: `/package.json`, `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md` | Audit Note: Phase 3 and Phase 4 must add and run a host-integrated request/log/capture validation path.

## Audit Verdict

- Audit summary: the plan is narrow, executable, and aligned to the locked Phase 1 gap: one managed bridge app, one nested vendor fork, one narrow bridge seam in the vendor host, and one local validation path that reads back logs, metrics, and captures.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> addressed in `## Fork Layout Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`.
- `R2` -> addressed in `## Planned Changes by File`, `## Implementation Steps`, `## Idempotence and Recovery`, and `## Requirement Completion Status`.
- `R3` -> addressed in `## Planned Changes by File`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R4` -> addressed in `## Testing Strategy`, `## Manual QA Scenarios`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.

## Coverage Gate

- [x] A concrete fork location and bridge topology were selected
- [x] The planned file-level change surface covers host path, lifecycle, captures, logs, and validation
- [x] The plan keeps routing and adapter semantics authoritative in TypeScript
- [x] The plan preserves vendor operator surfaces instead of inventing duplicates

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to drive strict TDD implementation
- [x] The plan remains within run-10 host integration scope and does not widen into a Go rewrite or later product work

Approval: PASS
