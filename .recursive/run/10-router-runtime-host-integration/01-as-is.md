Run: `/.recursive/run/10-router-runtime-host-integration/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-05T08:03:38Z`
LockHash: `80261fac6583e4a93c19c7bbca6d491f35cabc185085b35defdfacf3ced0499a`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/gateway-smoke/src/index.ts`
- `/role-model-router/apps/gateway-smoke/package.json`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/cli.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/runtime-web/src/index.ts`
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
- `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
Scope note: This artifact records the current repository state for `10-router-runtime-host-integration`, with emphasis on the gap between the existing TypeScript routing/adapter execution plane and the missing long-lived request-serving host, plus the concrete `llama-swap` vendor seams that can host a managed role-model bridge without making vendor dispatch the routing source of truth.

## TODO

- [x] Re-read the locked Phase 0 artifacts and authoritative inputs
- [x] Inventory the current role-model runtime path after run 09
- [x] Inventory the local `llama-swap` vendor host path and operator surfaces
- [x] Map current behavior and gaps back to `R1`-`R4`
- [x] Record concrete code pointers, evidence, and remaining open edges
- [x] Capture the user-selected bridge direction for Phase 2

## Reproduction Steps (Novice-Runnable)

1. Open the active worktree at `D:\DEV\role-model\.worktrees\10-router-runtime-host-integration`.
2. Read the locked Phase 0 artifacts:
   - `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
   - `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
3. Re-read the current authoritative repo/roadmap sources:
   - `/.recursive/STATE.md`
   - `/.recursive/DECISIONS.md`
   - `/docs/architecture/06-router-runtime-architecture-lock.md`
   - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
4. Inspect the current role-model runtime execution path:
   - `/package.json`
   - `/pnpm-workspace.yaml`
   - `/role-model-router/apps/gateway-smoke/src/index.ts`
   - `/role-model-router/apps/gateway-smoke/package.json`
   - `/role-model-router/packages/adapter-execution/src/index.ts`
   - `/role-model-router/packages/adapter-execution/src/cli.ts`
   - `/role-model-router/packages/protocol-routing/src/index.ts`
   - `/role-model-router/packages/endpoint-registry/src/index.ts`
   - `/role-model-router/packages/runtime-web/src/index.ts`
   - `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
5. Inspect the local vendor host checkout:
   - `D:\llama-swap\README.md`
   - `D:\llama-swap\go.mod`
   - `D:\llama-swap\llama-swap.go`
   - `D:\llama-swap\proxy\proxymanager.go`
   - `D:\llama-swap\proxy\process.go`
   - `D:\llama-swap\proxy\metrics_monitor.go`
   - `D:\llama-swap\proxy\proxymanager_api.go`
   - `D:\llama-swap\proxy\proxymanager_loghandlers.go`
   - `D:\llama-swap\proxy\ui_embed.go`
6. Confirm the local vendor baseline commit:
   - `git -C D:\llama-swap rev-parse HEAD`
   - expected local baseline at planning time: `e261745c66969c119eed1de740380187b365d458`
7. Re-run the Phase 0 baseline commands from this worktree if needed:
   - `corepack pnpm run schemas:validate`
   - `corepack pnpm run runtime:validate-routing`
   - `corepack pnpm run runtime:validate-adapter`
   - `corepack pnpm run smoke`
   - `corepack pnpm run build`
   - `corepack pnpm run test`

## Current Behavior by Requirement

- `R1`: partially satisfied by prerequisites only. Role-model now has a real routed execution plane, but it exists only inside TypeScript package/CLI flows. `/package.json` exposes `runtime:validate-adapter`, `runtime:validate-routing`, and `smoke`; `gateway-smoke` calls `runRuntimeAdapterValidation()` and writes artifacts; `adapter-execution/src/cli.ts` can load runtime state, build the endpoint registry, route a request, and execute the chosen provider-family adapter. There is still no long-lived request-serving host inside the role-model repo, and `runtime-web/src/index.ts` is still only a browser-family constant export rather than an HTTP server.
- `R2`: partially satisfied below the host line, blocked at the host line. The adapter layer already preserves target/provider/account context, canonical trace/usage event generation, and request/response captures for deterministic validation. But host-lifecycle and concurrency control are still absent from role-model itself; there is no managed server process, no host-managed bridge lifecycle, and no way for request-serving code to invoke the existing TypeScript runtime path per incoming API call.
- `R3`: blocked in role-model, already solved in the vendor host. The role-model side emits trace, usage, and capture artifacts only through CLI/smoke flows and does not expose them through a live local operator endpoint. By contrast, the local `llama-swap` checkout already exposes `/logs`, `/logs/stream`, `/api/metrics`, `/api/events`, and `/api/captures/:id`, and its `metricsMonitor.wrapHandler()` can record request/response captures and response-derived metrics for proxied POST requests.
- `R4`: partially satisfied by the TypeScript baseline and the vendor host independently, but not yet by one integrated request path. Run 09 added deterministic local validation for routing plus adapter execution, and `llama-swap` already supports a local HTTP host with logs and captures. What is missing is a combined host-integrated validation path that sends a real request through the changed host path, then reads host logs, metrics, and captures from that same running system. The inherited root `build` and `test` failure in `packages/schema-tools` remains unchanged broader baseline state.

## Relevant Code Pointers

- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/gateway-smoke/src/index.ts`
- `/role-model-router/apps/gateway-smoke/package.json`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/cli.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/runtime-web/src/index.ts`
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

## Evidence

- `/package.json` confirms the repo's current runtime contract is still TypeScript/CLI-oriented: `runtime:validate-adapter`, `runtime:validate-routing`, `runtime:validate-state`, and `smoke` exist, but there is no host-start or host-validation script yet.
- `/role-model-router/apps/gateway-smoke/src/index.ts` proves the current "runtime" path is not a daemon. It calls `runRuntimeAdapterValidation()`, synthesizes the router plus provider-execution trace/usage artifacts, writes JSON files under `runtime-output\gateway-smoke\`, validates schemas, and exits.
- `/role-model-router/packages/adapter-execution/src/cli.ts` already performs most of the role-model-owned execution work the bridge needs: it loads the normalized catalog, provider accounts, registry sources, continuity snapshot, routing model guidance, and response captures; routes the request; and executes the chosen adapter family.
- `/role-model-router/packages/adapter-execution/src/index.ts` confirms the execution layer already resolves the chosen endpoint, negotiates adapter capabilities, emits provider-shaped request/response captures, creates canonical trace artifacts, and creates a usage event. Run 10 therefore does not need to re-port routing or adapter semantics into Go.
- `/role-model-router/packages/protocol-routing/src/index.ts` plus `/role-model-router/packages/endpoint-registry/src/index.ts` show the remaining host integration can treat the bridge as a thin caller into the existing registry/routing pipeline: runtime routing requests are compact, registry endpoints expose concrete `endpoint_id` and `model_id`, and requested models can be mapped to allowed endpoint sets before routing.
- `/role-model-router/packages/runtime-web/src/index.ts` shows the role-model repo still lacks any persistent host package; it exports only browser-runtime family names.
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json` currently tracks only `models.dev`, so run 10 still needs to add the pinned `llama-swap` vendor baseline to the role-model-owned ledger.
- `D:\llama-swap\README.md` and `D:\llama-swap\llama-swap.go` confirm the vendor already provides the long-lived HTTP server, signal handling, optional config watching, and stable operator endpoints.
- `D:\llama-swap\proxy\proxymanager.go` shows the narrowest request seam: `mkProxyJSONHandler()` parses JSON requests, extracts `model`, rewrites parameters, sets request context, and then hands the request into `metricsMonitor.wrapHandler()` plus the chosen downstream handler. That seam is narrow enough to redirect JSON LLM requests into a role-model bridge while preserving request logging and capture emission.
- `D:\llama-swap\proxy\metrics_monitor.go` proves the vendor host already has the artifact surface run 10 needs. `wrapHandler()` records request/response captures, derives usage/timing metrics from JSON or SSE responses, stores captures in the cache, and emits `ActivityLogEvent` entries.
- `D:\llama-swap\proxy\proxymanager_api.go` and `D:\llama-swap\proxy\proxymanager_loghandlers.go` confirm the exact local operator access paths already available in the vendor host: `/api/metrics`, `/api/events`, `/api/captures/:id`, `/logs`, and `/logs/stream`.
- `D:\llama-swap\proxy\process.go` shows the vendor host already contains the lifecycle and concurrency machinery run 10 should preserve at the host layer even if provider execution itself is delegated to a managed TypeScript bridge.
- `D:\llama-swap\proxy\ui_embed.go` plus the missing local `D:\llama-swap\proxy\ui_dist\` directory show one concrete fork consideration: the repo fork must either copy upstream built UI assets or provide a minimal stub `ui_dist` so the vendored Go package still compiles.
- In-session user direction selected the bridge path explicitly: `lets go with the bridge option`. That eliminates the Phase 2 fork-layout ambiguity and rules out a run-10 Go re-port of routing and adapter execution.

## Known Unknowns

- The exact first request-path subset to expose through the bridge is still a Phase 2 implementation choice, but the most likely initial set is `/v1/chat/completions`, `/v1/responses`, `/v1/messages`, and `/v1/models`.
- The exact external runtime configuration surface for the bridge is still open at the start of Phase 2: it could be flags plus environment, or a small vendor-config extension. The choice should optimize for a narrow upstream diff.
- The exact validation command layout is still open: run 10 may add a dedicated `runtime:validate-host` command, or it may rely on package-local tests plus the existing root validation surface.
- The fork must decide whether to preserve the upstream UI by copying assets or to stub `proxy\ui_dist\` minimally until later operator-UI work.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills are available in this session.
Delegation Decision Basis: `Phase 1 required controller-owned cross-reading between the locked run-10 contract, the merged run-09 TypeScript execution plane, and the local vendor checkout at D:\llama-swap so the bridge decision could be grounded in real code seams rather than summarized repo claims.`
Delegation Override Reason: `The AS-IS inventory depended on reconciling local role-model execution paths with exact vendor handler, metrics, and operator endpoints before choosing the fork layout; splitting that into delegated audit would have increased drift risk.`
Audit Inputs Provided:
- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/gateway-smoke/src/index.ts`
- `/role-model-router/apps/gateway-smoke/package.json`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/cli.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/runtime-web/src/index.ts`
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

## Effective Inputs Re-read

- `/.recursive/run/10-router-runtime-host-integration/00-requirements.md`
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/gateway-smoke/src/index.ts`
- `/role-model-router/apps/gateway-smoke/package.json`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/cli.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/runtime-web/src/index.ts`
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
  - claim carried forward: run 10 must add a real host path, host-layer lifecycle/concurrency hooks, local operator log/capture access, and a local validation/repair loop without letting `llama-swap` become the routing source of truth.
  - current reconciliation: the repository still lacks any long-lived host path, while the vendor host already provides the needed host/operator surfaces; that means the remaining work is exactly the bridge integration the requirements describe.
- `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`:
  - claim carried forward: downstream audited phases must execute from `D:\DEV\role-model\.worktrees\10-router-runtime-host-integration` using diff basis `1e6e543e1dca7bce7765ec55e4fc3a78bf442405`.
  - current reconciliation: Phase 1 inspection was performed from that selected worktree and reused the locked diff basis unchanged.
- `/.recursive/run/09-router-runtime-adapter-execution-plane/03-implementation-summary.md` and the merged run-09 code:
  - claim carried forward: routing plus adapter execution now exist as deterministic TypeScript runtime contracts and should be consumed, not redefined, by the next host run.
  - current reconciliation: the live code matches that handoff exactly; the host gap is now request serving and operator access, not execution semantics.
- `/docs/architecture/06-router-runtime-architecture-lock.md` plus the roadmap host section:
  - claim carried forward: `llama-swap` may influence execution-plane host mechanics, but protocol-driven routing and adapter execution must stay authoritative upstream of vendor dispatch.
  - current reconciliation: the vendor seam in `mkProxyJSONHandler()` is narrow enough to preserve that boundary by redirecting requests into role-model-owned routing/execution before any vendor model swap occurs.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
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
  - `/role-model-router/apps/gateway-smoke/package.json`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/adapter-execution/src/cli.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/packages/runtime-web/src/index.ts`
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
  - `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`

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

- none beyond the repository gaps already captured in `## Current Behavior by Requirement`, `## Evidence`, `## Known Unknowns`, and `## Requirement Completion Status`; the AS-IS inventory is complete enough to drive Phase 2 planning and strict TDD.

## Repair Work Performed

- Converted the remaining run-10 ambiguity from "native host or vendor fork?" into one concrete bridge-host gap grounded in the live run-09 execution code and the local `llama-swap` handler/capture seams.
- Recorded the exact preserved operator surfaces already available in the vendor host so later implementation does not invent duplicate log/metric/capture APIs.
- Recorded the concrete fork-build consideration around `proxy\ui_dist\` so Phase 3 can keep the vendor host buildable without drifting into unrelated UI work.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the routed execution plane already exists in TypeScript, but the repository still has no long-lived request-serving host path that exposes it over HTTP. | Blocking Evidence: `/package.json`, `/role-model-router/apps/gateway-smoke/src/index.ts`, `/role-model-router/packages/runtime-web/src/index.ts`
- R2 | Status: blocked | Rationale: host-layer lifecycle and concurrency wiring do not yet exist in role-model even though the vendor host already provides those mechanisms. | Blocking Evidence: `/role-model-router/packages/adapter-execution/src/cli.ts`, `D:\llama-swap\llama-swap.go`, `D:\llama-swap\proxy\process.go`
- R3 | Status: blocked | Rationale: local operator log/capture access exists only in the vendor checkout today and is not yet connected to role-model-backed request serving. | Blocking Evidence: `D:\llama-swap\proxy\metrics_monitor.go`, `D:\llama-swap\proxy\proxymanager_api.go`, `D:\llama-swap\proxy\proxymanager_loghandlers.go`
- R4 | Status: blocked | Rationale: role-model can validate routing and adapter execution in isolation, but there is no integrated host validation path that exercises the changed request path and reads back host diagnostics. | Blocking Evidence: `/package.json`, `/role-model-router/packages/adapter-execution/src/cli.ts`, `/.recursive/run/10-router-runtime-host-integration/00-worktree.md`

## Audit Verdict

- Audit summary: the current baseline is ready for a bridge-based host integration run because the role-model-owned routing/execution plane already exists, the vendor host already provides the required long-lived server/operator surfaces, and the remaining gap is now a narrow integration seam rather than a semantic redesign.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> the missing real host path is captured in `## Current Behavior by Requirement`, `## Evidence`, `## Gaps Found`, and `## Requirement Completion Status`.
- `R2` -> the missing host lifecycle/concurrency integration is captured in `## Current Behavior by Requirement`, `## Evidence`, `## Repair Work Performed`, and `## Requirement Completion Status`.
- `R3` -> the preserved vendor operator surfaces and the current repo-side gap are captured in `## Current Behavior by Requirement`, `## Evidence`, `## Repair Work Performed`, and `## Requirement Completion Status`.
- `R4` -> the missing integrated host validation/repair loop is captured in `## Current Behavior by Requirement`, `## Evidence`, `## Gaps Found`, and `## Requirement Completion Status`.

## Coverage Gate

- [x] The current role-model runtime path was inventoried
- [x] The current vendor host path and operator surfaces were inventoried
- [x] The bridge decision was grounded in concrete code seams
- [x] The remaining host-integration gaps were mapped to `R1`-`R4`

Coverage: PASS

## Approval Gate

- [x] The AS-IS state is specific enough to drive a narrow Phase 2 plan
- [x] The recorded gaps stay inside host integration rather than widening into a Go re-port or later observability/product work

Approval: PASS
