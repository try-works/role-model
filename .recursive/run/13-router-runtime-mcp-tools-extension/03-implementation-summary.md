Run: `/.recursive/run/13-router-runtime-mcp-tools-extension/`
Phase: `03 Implementation`
Status: `LOCKED`
LockedAt: `2026-05-06T13:41:35Z`
LockHash: `c78c1ea2bd14f13912842466370e0e20537d44ef3229fd9df102b604da1211b0`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
Outputs:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/03-implementation-summary.md`
Scope note: This artifact records the run-13 implementation that adds a provider-agnostic tool registry, runtime MCP connector definitions, tool-call surfacing in the host bridge, tool-aware runtime observation receipts, a deterministic `runtime:validate-tools` path, and the runtime export conditions needed for compiled executable verification.

## TODO

- [x] Re-read the locked Phase 2 plan before touching implementation-owned files
- [x] Follow strict RED-GREEN discipline for each new behavior slice
- [x] Ship the provider-agnostic tool registry and deterministic MCP connector input layer
- [x] Wire normalized tool calls into the runtime backend and outward host response
- [x] Extend runtime observations with tool-call executions and diagnostics
- [x] Add the strongest local `runtime:validate-tools` validator
- [x] Repair the compiled-runtime export path across the runtime dependency graph
- [x] Complete the implementation audit sections and gates

## Changes Applied

- `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`: recorded the additive MCP/tool baseline and the missing execution, observability, and validation seams before implementation began.
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md`: recorded the executable packaging root cause so the runtime export-condition work stayed justified and narrow.
- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`: locked the implementation stance around one provider-agnostic tool registry, one deterministic MCP connector input layer, tool-aware observations, and one strongest local validator.
- `/package.json`: added the repo-local `runtime:validate-tools` command.
- `/packages/protocol-types/package.json`: added a `runtime` export condition for compiled-runtime resolution.
- `/role-model-router/apps/runtime-host-bridge/package.json`: added `runtime` export support and expanded the test command to include executable and tool-validation coverage.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: added runtime tool-registry loading, deterministic MCP-backed tool execution, outward OpenAI-compatible `tool_calls`, persisted tool execution receipts, and tool-aware request observation persistence.
- `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`: added the strongest local tool-execution validator.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`: added response-contract coverage for outward `tool_calls`.
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`: added compiled-runtime export-graph coverage.
- `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`: added end-to-end validator coverage for tool executions and stored observations.
- `/role-model-router/packages/tool-registry/package.json`: added the new runtime-owned tool registry package with runtime export support.
- `/role-model-router/packages/tool-registry/src/index.ts`: implemented registry connectors, strict required-field validation, and execution receipts.
- `/role-model-router/packages/tool-registry/test/index.test.ts`: added focused TDD coverage for successful tool execution and schema rejection.
- `/role-model-router/packages/provider-mcp/package.json`: added runtime export support.
- `/role-model-router/packages/provider-mcp/src/index.ts`: extended the discovery-only MCP surface with runtime connector definitions.
- `/role-model-router/packages/provider-mcp/test/index.test.ts`: added focused connector-definition coverage.
- `/role-model-router/packages/runtime-observability/package.json`: added runtime export support and the new `tool-registry` dependency.
- `/role-model-router/packages/runtime-observability/src/index.ts`: added tool-call, tool-execution, and tool-diagnostic sections to the runtime observation bundle.
- `/testdata/router-runtime/mcp-connectors.json`: added deterministic MCP connector input fixtures for the local validation path.
- runtime dependency package manifests under `/role-model-router/packages/` and `/packages/protocol-types/`: added `runtime: "./dist/index.js"` export conditions across the compiled runtime dependency graph.
- `/pnpm-lock.yaml`: recorded the new workspace package linkage for `@role-model-router/tool-registry`.

## Sub-phase Implementation Summary

- `SP1`: shipped the new provider-agnostic tool registry package, added deterministic MCP connector-definition shaping in `provider-mcp`, and added the pinned `mcp-connectors.json` fixture for local runtime validation.
- `SP2`: wired normalized provider tool calls through the runtime backend, surfaced OpenAI-compatible `tool_calls` from the host bridge, and persisted tool execution receipts and diagnostics through `runtime-observability`.
- `SP3`: added `runtime:validate-tools`, added the executable packaging regression test, and repaired the compiled-runtime export graph by adding `runtime` export conditions across the runtime dependency chain.

## TDD Compliance Log

**The Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

TDD Mode: strict

RED Evidence:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/tool-registry.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/tool-registry-schema.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/tool-registry-failures.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/provider-mcp.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-host-bridge-tool-calls.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-tools-validation.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-executable-exports.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-executable-layout.red.log`

GREEN Evidence:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry-schema.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry-failures.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/provider-mcp.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-host-bridge-tool-calls.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-tools-validation.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-exports.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-layout.green.log`

### Requirement R1 - add MCP connector integration and a provider-agnostic tool registry

**Tests:** `/role-model-router/packages/tool-registry/test/index.test.ts`, `/role-model-router/packages/provider-mcp/test/index.test.ts`
- RED: the repo had no runtime-owned tool-registry package, no execution receipts, and no runtime MCP connector-definition surface; later regression tests also proved unresolved tools and thrown connector executions escaped as uncaught exceptions instead of failed execution receipts.
- GREEN: added `/role-model-router/packages/tool-registry/`, extended `provider-mcp` with `createMcpConnectorDefinitions()`, added the deterministic connector fixture at `/testdata/router-runtime/mcp-connectors.json`, and repaired `executeToolCalls()` so missing tools and thrown tool executions are recorded as failed receipts.
- REFACTOR: kept discovery/export and runtime execution separate by extending `provider-mcp` only up to connector-definition shaping while placing execution semantics in the new tool-registry package.
- Final state: PASS

### Requirement R2 - normalize tool-call and MCP-aware execution semantics

**Tests:** `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- RED: the host bridge did not surface outward `tool_calls`, did not execute normalized tool calls through a provider-agnostic registry, and the compiled runtime dependency graph failed executable verification under plain Node.
- GREEN: the host bridge now maps normalized tool calls to OpenAI-compatible `tool_calls`, executes them through the runtime tool registry, persists execution receipts, and the runtime package graph exposes `runtime` export conditions for compiled execution.
- REFACTOR: preserved the existing provider-native normalization path and changed only the missing provider-agnostic execution and packaging surfaces.
- Final state: PASS

### Requirement R3 - extend observability and diagnostics for tool-aware flows

**Tests / Evidence:** `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`, `corepack pnpm --filter @role-model-router/runtime-observability test`, `corepack pnpm run runtime:validate-tools`
- RED: the observation bundle had no tooling section and no durable tool execution receipts or tool diagnostics.
- GREEN: `runtime-observability` now emits tool-call summaries, execution receipts, and tool diagnostics; the tool validator reads back the stored observation and confirms the tooling payload.
- REFACTOR: extended the existing observation bundle rather than inventing a second persistence plane.
- Final state: PASS

### Requirement R4 - preserve mandatory local validation and log review

**Tests / Evidence:** `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`, `corepack pnpm run runtime:validate-tools`
- RED: there was no run-owned tool validator, and the strongest compiled-runtime proof failed because workspace packages exported source entrypoints instead of built runtime entrypoints.
- GREEN: added `runtime:validate-tools`, added the new validator entrypoint, and repaired the runtime package graph so the compiled executable path is explicitly supported.
- REFACTOR: kept the validator deterministic and fixture-backed rather than widening into live external MCP infrastructure.
- Final state: PASS

### TDD Red Flags Check

- [x] No code written before failing test
- [x] All RED phases documented with failure output
- [x] All GREEN phases documented with minimal implementation
- [x] No tests passing immediately
- [x] No "tests to be added later"

TDD Compliance: PASS

## Plan Deviations

- The Phase 2 plan mentioned separate `/testdata/router-runtime/tool-registry.json` and `/testdata/router-runtime/tool-execution.json` fixtures. The final implementation stayed narrower: one deterministic MCP connector fixture plus inline validator/tool definitions were sufficient, so those extra fixture files were not introduced.
- The Phase 2 plan reserved space for narrow `adapter-execution` type or diagnostic changes. The existing normalized tool-call shape proved sufficient, so no source-level `adapter-execution` code change was needed beyond adding the compiled-runtime export condition in its package manifest.
- The compiled-runtime export-condition repair became broader than a single-package fix because the executable proof required the full runtime dependency graph to expose `runtime: "./dist/index.js"`, not only `runtime-host-bridge`.

## Implementation Evidence

- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/tool-registry.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/tool-registry-schema.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry-schema.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/tool-registry-failures.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry-failures.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/provider-mcp.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/provider-mcp.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-host-bridge-tool-calls.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-host-bridge-tool-calls.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-tools-validation.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-tools-validation.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-executable-exports.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-exports.green.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/red/runtime-executable-layout.red.log`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-layout.green.log`
- `/package.json`
- `/packages/protocol-types/package.json`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`
- `/role-model-router/packages/tool-registry/package.json`
- `/role-model-router/packages/tool-registry/src/index.ts`
- `/role-model-router/packages/tool-registry/test/index.test.ts`
- `/role-model-router/packages/provider-mcp/package.json`
- `/role-model-router/packages/provider-mcp/src/index.ts`
- `/role-model-router/packages/provider-mcp/test/index.test.ts`
- `/role-model-router/packages/runtime-observability/package.json`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/testdata/router-runtime/mcp-connectors.json`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `Phase 3 remained controller-owned so strict RED/GREEN work, executable packaging repair, and host-integrated tool validation stayed tied to one evidence chain before delegated review.`
Delegation Decision Basis: `the implementation phase required direct control over each failing test, each green proof, and each packaging repair before Phase 3.5 delegated review.`
Delegation Override Reason: `strict recursive TDD was the primary control for this phase, and delegating code edits would have weakened the direct red-to-green evidence trail.`
Audit Inputs Provided:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
- Changed files:
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
  - `/package.json`
  - `/packages/protocol-types/package.json`
  - `/pnpm-lock.yaml`
  - `/role-model-router/apps/runtime-host-bridge/package.json`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`
  - `/role-model-router/packages/tool-registry/package.json`
  - `/role-model-router/packages/tool-registry/src/index.ts`
  - `/role-model-router/packages/tool-registry/test/index.test.ts`
  - `/role-model-router/packages/provider-mcp/package.json`
  - `/role-model-router/packages/provider-mcp/src/index.ts`
  - `/role-model-router/packages/provider-mcp/test/index.test.ts`
  - `/role-model-router/packages/runtime-observability/package.json`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - runtime dependency graph package manifests under `/role-model-router/packages/` and `/packages/protocol-types/`
  - `/testdata/router-runtime/mcp-connectors.json`
- Targeted code references:
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`
  - `/role-model-router/packages/tool-registry/src/index.ts`
  - `/role-model-router/packages/provider-mcp/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/packages/protocol-types/package.json`
- Review inputs:
  - red and green logs listed above
  - changed code
  - focused package build/test evidence

## Effective Inputs Re-read

- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`

## Earlier Phase Reconciliation

- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`:
  - in-scope `R1`-`R4` implemented on the planned MCP/tool, observation, validator, and runtime-packaging surfaces.
- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`:
  - `SP1`, `SP2`, and `SP3` all landed.
  - deviations were narrow and documented rather than scope-widening.
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md`:
  - the compiled-runtime export mismatch remained accurate and directly motivated the runtime export-condition work.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/03-implementation-summary.md`
  - `/package.json`
  - `/packages/protocol-types/package.json`
  - `/role-model-router/apps/runtime-host-bridge/package.json`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`
  - `/role-model-router/packages/tool-registry/src/index.ts`
  - `/role-model-router/packages/provider-mcp/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `85abf980096c931f09554ca203b66fa58bcb3cf4`
- Comparison reference: `working-tree`
- Normalized baseline: `85abf980096c931f09554ca203b66fa58bcb3cf4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 85abf980096c931f09554ca203b66fa58bcb3cf4`
- Diff basis used: `git diff --name-only 85abf980096c931f09554ca203b66fa58bcb3cf4`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/13-router-runtime-mcp-tools-extension`
- Planned or claimed changed files:
  - `/.recursive/DECISIONS.md`
  - `/.recursive/STATE.md`
  - `/.recursive/memory/domains/role-model-baseline.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/03-implementation-summary.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/03.5-code-review.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/04-test-summary.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/05-manual-qa.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/06-decisions-update.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/07-state-update.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/08-memory-impact.md`
  - `/package.json`
  - `/packages/protocol-types/package.json`
  - `/pnpm-lock.yaml`
  - `/role-model-router/apps/runtime-host-bridge/package.json`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`
  - `/role-model-router/packages/tool-registry/package.json`
  - `/role-model-router/packages/tool-registry/src/index.ts`
  - `/role-model-router/packages/tool-registry/test/index.test.ts`
  - `/role-model-router/packages/tool-registry/tsconfig.json`
  - `/role-model-router/packages/provider-mcp/package.json`
  - `/role-model-router/packages/provider-mcp/src/index.ts`
  - `/role-model-router/packages/provider-mcp/test/index.test.ts`
  - `/role-model-router/packages/runtime-observability/package.json`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - runtime dependency graph package manifests under `/role-model-router/packages/` and `/packages/protocol-types/`
  - `/testdata/router-runtime/mcp-connectors.json`
- Actual changed files reviewed:
  - all planned or claimed files listed above, with the runtime export-condition manifests expanded concretely as `/role-model-router/packages/adapter-execution/package.json`, `/role-model-router/packages/catalog/package.json`, `/role-model-router/packages/context-envelope/package.json`, `/role-model-router/packages/core/package.json`, `/role-model-router/packages/endpoint-registry/package.json`, `/role-model-router/packages/profile-aggregator/package.json`, `/role-model-router/packages/protocol-routing/package.json`, `/role-model-router/packages/provider-account/package.json`, `/role-model-router/packages/provider-anthropic/package.json`, `/role-model-router/packages/provider-openai/package.json`, `/role-model-router/packages/retrieval-receipt/package.json`, `/role-model-router/packages/sqlite-memory/package.json`, `/role-model-router/packages/trace/package.json`, and `/role-model-router/packages/usage/package.json`
- Unexplained drift:
  - none after restoring incidental `packages/protocol-types/src/generated.ts` churn from the inherited root build/test failure

## Gaps Found

- none remaining in Phase 3 scope

## Repair Work Performed

- restored incidental `packages/protocol-types/src/generated.ts` churn introduced by the inherited schema-tools/Biome failure path so the run diff stays limited to intentional run-13 changes
- normalized `/.recursive/run/13-router-runtime-mcp-tools-extension/01.5-root-cause.md` to the current audited-phase contract so recursive lint passes before closeout
- repaired `executeToolCalls()` so unresolved tools and thrown connector executions now produce failed execution receipts instead of escaping as uncaught exceptions, and added regression coverage for both cases

## Requirement Completion Status

- R1 | Status: implemented | Changed Files: `/role-model-router/packages/tool-registry/package.json`, `/role-model-router/packages/tool-registry/tsconfig.json`, `/role-model-router/packages/tool-registry/src/index.ts`, `/role-model-router/packages/tool-registry/test/index.test.ts`, `/role-model-router/packages/provider-mcp/package.json`, `/role-model-router/packages/provider-mcp/src/index.ts`, `/role-model-router/packages/provider-mcp/test/index.test.ts`, `/testdata/router-runtime/mcp-connectors.json`, `/pnpm-lock.yaml` | Implementation Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry.green.log`, `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/tool-registry-schema.green.log`, `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/provider-mcp.green.log`, `/role-model-router/packages/tool-registry/src/index.ts`, `/role-model-router/packages/provider-mcp/src/index.ts`
- R2 | Status: implemented | Changed Files: `/packages/protocol-types/package.json`, `/role-model-router/apps/runtime-host-bridge/package.json`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`, `/role-model-router/packages/adapter-execution/package.json`, `/role-model-router/packages/catalog/package.json`, `/role-model-router/packages/context-envelope/package.json`, `/role-model-router/packages/core/package.json`, `/role-model-router/packages/endpoint-registry/package.json`, `/role-model-router/packages/profile-aggregator/package.json`, `/role-model-router/packages/protocol-routing/package.json`, `/role-model-router/packages/provider-account/package.json`, `/role-model-router/packages/provider-anthropic/package.json`, `/role-model-router/packages/provider-openai/package.json`, `/role-model-router/packages/retrieval-receipt/package.json`, `/role-model-router/packages/sqlite-memory/package.json`, `/role-model-router/packages/trace/package.json`, `/role-model-router/packages/usage/package.json` | Implementation Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-host-bridge-tool-calls.green.log`, `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-exports.green.log`, `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-layout.green.log`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- R3 | Status: implemented | Changed Files: `/role-model-router/packages/runtime-observability/package.json`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts` | Implementation Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-tools-validation.green.log`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`
- R4 | Status: implemented | Changed Files: `/package.json`, `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`, `/packages/protocol-types/package.json`, `/role-model-router/apps/runtime-host-bridge/package.json`, `/role-model-router/packages/core/package.json`, `/role-model-router/packages/provider-mcp/package.json`, `/role-model-router/packages/runtime-observability/package.json`, `/role-model-router/packages/tool-registry/package.json` | Implementation Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-tools-validation.green.log`, `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-exports.green.log`, `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/green/runtime-executable-layout.green.log`, `/package.json`, `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`

## Audit Verdict

- Summary: the run-13 implementation now lands on the planned additive MCP/tool surfaces, keeps the public host contract OpenAI-compatible, adds durable tool execution receipts to the observation model, and repairs the compiled-runtime export graph without widening into orchestration or broader protocol redesign.
Audit: PASS

## Traceability

- `R1` -> covered by `## Changes Applied`, `## Sub-phase Implementation Summary`, `## TDD Compliance Log`, and the `R1` requirement line above.
- `R2` -> covered by `## Changes Applied`, `## TDD Compliance Log`, `## Plan Deviations`, and the `R2` requirement line above.
- `R3` -> covered by `## Changes Applied`, `## Sub-phase Implementation Summary`, `## TDD Compliance Log`, and the `R3` requirement line above.
- `R4` -> covered by `## Changes Applied`, `## TDD Compliance Log`, `## Repair Work Performed`, and the `R4` requirement line above.

## Coverage Gate

- [x] All requirements (`R1`-`R4`) have implementation
- [x] All sub-phases completed
- [x] TDD Compliance Log complete for all requirements
- [x] No production code without preceding failing test
- [x] Plan deviations documented
- [x] Implementation evidence recorded

TDD Compliance: PASS
Coverage: PASS

## Approval Gate

- [x] Implementation matches the Phase 2 TO-BE plan or deviations are documented
- [x] Focused run-owned tests and builds pass
- [x] Recursive lint passes for the current artifact set
- [x] TDD Iron Law was followed
- [x] `Audit: PASS` recorded before phase lock

Approval: PASS
