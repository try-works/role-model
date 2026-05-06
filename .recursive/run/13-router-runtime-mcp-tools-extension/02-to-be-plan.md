Run: `/.recursive/run/13-router-runtime-mcp-tools-extension/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T13:14:33Z`
LockHash: `13aaae69f958f2c25d8b01733f0b1e5737ad405e837c504ebf1e7085b1d56168`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/router-devtools/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/provider-mcp/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
Outputs:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `13-router-runtime-mcp-tools-extension` into a narrow additive implementation plan. The run will add the missing provider-agnostic tool registry and MCP connector layer, wire tool-aware execution and receipts into the runtime backend and inspection model, surface OpenAI-compatible tool calls from the host bridge, and add one local validator for the tool-execution path. It must not widen into full agentic orchestration, canonical protocol redesign, or a hidden redefinition of the first complete runtime milestone.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the roadmap run-13 slice
- [x] Choose the concrete MCP/tool execution stance for the public host contract
- [x] Choose the package/file boundaries for the provider-agnostic tool registry and MCP connector layer
- [x] Choose the observability and validation surfaces for run 13
- [x] Define implementation sub-phases, verification commands, and manual QA scope
- [x] Complete the audited-phase sections and gates

## Strategy Decision

- Selected public-host stance: keep `/v1/chat/completions` OpenAI-compatible and additive by surfacing normalized `tool_calls` in the assistant message when the routed provider emits them; do not widen run 13 into automatic multi-turn orchestration that synthesizes a second assistant turn.
- Selected execution stance: add a role-model-owned provider-agnostic tool registry plus MCP connector integration that can execute normalized tool calls through a runtime backend helper and the local validator, leaving durable execution receipts in inspection/observability surfaces.
- Selected MCP stance: extend the existing `provider-mcp` area into a real MCP connector input layer while introducing one new runtime-owned package for provider-agnostic tool registry and execution contracts, so discovery/export logic and runtime execution logic stay separate.
- Selected observability stance: extend the existing runtime observation bundle and structured request inspection surface with tool/MCP receipts and diagnostics instead of inventing a second persistence plane or replacing the canonical trace/usage model.
- Selected validation stance: add one strongest local validator, `runtime:validate-tools`, that exercises a local tool-execution path, reviews MCP/tool/adapter/host diagnostics, and preserves the current runtime validation floor unchanged.
- Reason this plan follows those choices:
  - Phase 1 proved the repo already has tool-aware routing, explicit capability negotiation, and provider-native tool-call normalization; duplicating those concerns in new packages would widen the run unnecessarily.
  - The missing line is the provider-agnostic registry/execution loop plus durable inspection receipts, not basic capability metadata.
  - Keeping the public host response OpenAI-compatible avoids redefining the current bridge surface while still exposing real tool-call behavior.
  - Extending the existing observation bundle keeps MCP/tool work additive to the canonical artifact model required by the architecture lock.

## Planned Changes by File

- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`: define the concrete package boundaries, host-contract stance, tool/MCP observability shape, and validation plan for run 13.
- `/package.json`: add `runtime:validate-tools` while preserving the existing runtime validation floor and known broader baseline caveats.
- `/role-model-router/README.md`: document the new tool-validation command and the additive host/tool behavior if the final implementation changes the runtime command surface materially.
- `/role-model-router/packages/tool-registry/package.json`: add the new provider-agnostic tool registry package.
- `/role-model-router/packages/tool-registry/src/index.ts`: implement tool definition, registry, strict-schema validation, connector binding, execution receipt, and diagnostic contracts.
- `/role-model-router/packages/tool-registry/test/index.test.ts`: add focused TDD coverage for registry loading, strict-schema handling, execution receipts, and connector failure behavior.
- `/role-model-router/packages/provider-mcp/src/index.ts`: extend the existing MCP discovery surface into a connector-definition input layer that can describe runtime MCP-backed tool sources without claiming broader provider completeness.
- `/role-model-router/packages/provider-mcp/test/index.test.ts`: add focused tests for MCP connector/tool-definition shaping if the package currently has no coverage.
- `/role-model-router/packages/adapter-execution/src/index.ts`: add the narrow type/diagnostic extensions needed so normalized provider tool calls and strict-schema diagnostics can feed the runtime tool registry cleanly without replacing the current provider-native normalization layer.
- `/role-model-router/packages/adapter-execution/test/index.test.ts`: add focused tests first for any new tool-related diagnostics or execution-result helpers added in run 13.
- `/role-model-router/packages/runtime-observability/src/index.ts`: extend the runtime observation bundle and inspection payloads with tool/MCP-aware execution receipts and diagnostics while preserving existing trace, usage, and cache fields.
- `/role-model-router/packages/runtime-observability/test/index.test.ts`: add focused tests first for the new tool-aware observation sections.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: wire the new tool registry into the runtime backend, surface OpenAI-compatible `tool_calls` in chat-completions responses, and persist tool/MCP receipts into the structured inspection path without adding full orchestration.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`: add focused tests first for tool-call response mapping, backend tool execution integration, and inspection-route behavior.
- `/role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`: add the strongest local tool-execution validator for run 13.
- `/role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`: add focused tests first for any validator helper logic extracted for the new tool-execution path.
- `/testdata/router-runtime/tool-registry.json`: add pinned tool definitions and strict-schema expectations for deterministic local validation.
- `/testdata/router-runtime/tool-execution.json`: add pinned tool execution/result fixtures for local runtime validation and tests.
- `/testdata/router-runtime/mcp-connectors.json`: add pinned MCP connector input fixtures so the local validation path is deterministic and does not depend on external services.

## Implementation Steps

1. Add the provider-agnostic tool registry boundary as a new runtime-owned package:
   - define runtime tool definitions, strict-schema expectations, connector bindings, execution requests, execution receipts, and tool diagnostics,
   - keep the package provider-agnostic; it should consume normalized tool calls rather than provider-specific response bodies,
   - require explicit schema-validation behavior rather than silently accepting malformed tool arguments.
2. Extend the existing `provider-mcp` area into a real MCP connector input layer:
   - keep discovery/export behavior intact for router-devtools,
   - add connector-definition shaping that can describe MCP-backed tool sources for the runtime,
   - keep this layer deterministic and fixture-backed for the local validation path instead of requiring live external MCP services.
3. Reuse the current tool-aware routing and provider-native normalization rather than replacing them:
   - keep `endpoint-registry` as the source of tool-support metadata,
   - keep `core` routing's `needsTools` / `TOOLS_UNSUPPORTED` behavior intact,
   - keep `provider-openai` and `provider-anthropic` as the source of provider-native tool-call extraction,
   - add only the narrow adapter-execution types or diagnostics needed to pass normalized tool calls into the new registry/execution layer.
4. Wire tool execution into the runtime backend without widening into orchestration:
   - keep `/v1/chat/completions` outwardly OpenAI-compatible,
   - map normalized tool calls into OpenAI-style `tool_calls` on the assistant message,
   - execute the normalized tool calls through the provider-agnostic registry in the runtime backend and validator path,
   - store tool execution receipts and diagnostics in role-model inspection surfaces instead of synthesizing a second assistant completion turn automatically.
5. Extend runtime observability and inspection for tool-aware flows:
   - add one tool/MCP section to the runtime observation bundle,
   - capture requested tools, normalized provider tool calls, executed-tool receipts, strict-schema validation outcomes, MCP connector identifiers, and connector/tool execution diagnostics,
   - preserve the current trace/usage/cache observability model and do not redefine canonical protocol artifacts.
6. Add one strongest local tool-execution validator:
   - add `runtime:validate-tools`,
   - start from the existing host/backend path and one deterministic routed request that yields normalized tool calls,
   - exercise at least one local tool-execution path through the runtime backend,
   - inspect MCP/tool/adapter/host diagnostics and structured observation reads,
   - keep the validator deterministic and fixture-backed rather than requiring external tool or MCP infrastructure.
7. Preserve the committed validation floor while extending it:
   - keep `runtime:validate-state`, `runtime:validate-routing`, `runtime:validate-adapter`, `runtime:validate-host`, `runtime:validate-observability`, `runtime:validate-operations`, and `smoke` green,
   - rerun `schemas:validate`,
   - record inherited broader baseline failures accurately if `build` and `test` still fail in the same schema-tools/Biome path.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/tool-registry test`
  - `corepack pnpm --filter @role-model-router/provider-mcp test`
  - `corepack pnpm --filter @role-model-router/adapter-execution test`
  - `corepack pnpm --filter @role-model-router/runtime-observability test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/tool-registry build`
  - `corepack pnpm --filter @role-model-router/provider-mcp build`
  - `corepack pnpm --filter @role-model-router/adapter-execution build`
  - `corepack pnpm --filter @role-model-router/runtime-observability build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- Direct run-13 validation paths:
  - `corepack pnpm run runtime:validate-tools`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-operations`
- Regression checks:
  - `corepack pnpm run runtime:validate-state`
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run runtime:validate-adapter`
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run smoke`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\13-router-runtime-mcp-tools-extension --run-id 13-router-runtime-mcp-tools-extension`
  - `git diff --name-only 85abf980096c931f09554ca203b66fa58bcb3cf4`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 13 extends runtime tool and MCP execution surfaces, observability receipts, and validator coverage; it does not add a browser UI workflow that requires Playwright.

## Manual QA Scenarios

1. **Tool-call response compatibility**
   - Steps:
     - start the runtime host bridge or use the dedicated local validator path
     - send a routed `/v1/chat/completions` request that includes tool definitions
   - Expected:
     - the response remains OpenAI-compatible
     - when the routed provider emits tool calls, the assistant message includes `tool_calls`
     - the response does not silently redefine the existing host contract into an orchestration engine

2. **Provider-agnostic tool execution path**
   - Steps:
     - run `corepack pnpm run runtime:validate-tools`
     - inspect the reported executed-tool receipts
   - Expected:
     - the runtime resolves normalized provider tool calls through the provider-agnostic registry
     - strict-schema validation succeeds or produces explicit diagnostics
     - at least one MCP-backed or MCP-defined tool source is exercised through the deterministic local path

3. **Tool-aware inspection reads**
   - Steps:
     - run `corepack pnpm run runtime:validate-tools`
     - inspect the structured request observation readback from the validator summary or the existing `/api/role-model/requests/:id` inspection route
   - Expected:
     - the inspection payload includes requested tools, normalized tool calls, tool execution receipts, and tool/MCP diagnostics
     - the older trace, usage, cache, and endpoint-profile sections remain present

4. **Regression floor preservation**
   - Steps:
     - rerun the existing runtime validation chain plus `smoke`
   - Expected:
     - the earlier runtime validators remain green
     - if root `build` / `test` are still red, they reproduce only the inherited schema-tools/Biome path rather than new run-13 regressions

## Idempotence and Recovery

- Re-running `runtime:validate-tools` must be safe; it should use deterministic fixture-backed tool definitions and runtime-state roots/scopes that do not corrupt durable local runtime state.
- Re-running the tool registry and MCP connector tests must not require live external MCP services; deterministic fixtures are the local validation baseline.
- If a tool-call schema is malformed or unsupported, the runtime must emit explicit diagnostics and inspection receipts rather than silently dropping the tool call.
- If a provider family emits tool calls that the registry cannot resolve, the runtime must record a clear tool-resolution failure without weakening the existing trace/usage/capture baseline.
- If the public host response cannot represent a given tool-execution outcome without widening into orchestration, prefer preserving OpenAI-compatible `tool_calls` plus role-model inspection receipts rather than inventing a new public protocol.

## Implementation Sub-phases

### SP1. Provider-agnostic tool registry and MCP connector input layer

Scope and purpose:
Add the missing runtime-owned tool registry and MCP connector definition layer without replacing the current discovery/export or provider-native normalization surfaces.

Requirement mapping: `R1`, `R2`

Implementation checklist:
- [ ] Add focused tests first for the new tool registry package
- [ ] Add the new `tool-registry` package with strict-schema validation and execution-receipt contracts
- [ ] Extend `provider-mcp` with deterministic connector-definition shaping for runtime tool sources
- [ ] Add pinned MCP connector and tool-registry fixtures under `/testdata/router-runtime/`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/tool-registry test`
- `corepack pnpm --filter @role-model-router/provider-mcp test`
- `corepack pnpm --filter @role-model-router/tool-registry build`
- `corepack pnpm --filter @role-model-router/provider-mcp build`

Sub-phase acceptance:
- The repo has one runtime-owned provider-agnostic tool registry boundary and one deterministic MCP connector input layer suitable for local validation.

### SP2. Host/backend integration and tool-aware observability

Scope and purpose:
Wire normalized provider tool calls into the runtime backend, surface OpenAI-compatible `tool_calls`, and persist tool/MCP receipts in the existing structured observation model.

Requirement mapping: `R2`, `R3`

Implementation checklist:
- [ ] Add focused tests first for any new adapter-execution tool diagnostics
- [ ] Add focused tests first for tool-aware host response mapping and backend integration
- [ ] Add focused tests first for tool/MCP observation-bundle extensions
- [ ] Extend adapter-execution only where needed to feed the tool registry cleanly
- [ ] Extend runtime-host-bridge to surface `tool_calls` and integrate the tool registry into the backend
- [ ] Extend runtime-observability with tool/MCP receipts and diagnostics

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/adapter-execution test`
- `corepack pnpm --filter @role-model-router/runtime-observability test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/adapter-execution build`
- `corepack pnpm --filter @role-model-router/runtime-observability build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`

Sub-phase acceptance:
- The public host response remains compatible while the runtime backend and structured inspection surfaces now carry explicit tool/MCP execution receipts and diagnostics.

### SP3. Tool validator, docs, and regression confirmation

Scope and purpose:
Leave behind one strongest local tool-execution validator and confirm the extension stays additive to the existing runtime baseline.

Requirement mapping: `R3`, `R4`

Implementation checklist:
- [ ] Add focused tests first for the new `validate-tools` helper logic
- [ ] Add `runtime-host-bridge/src/validate-tools.ts`
- [ ] Add `runtime:validate-tools` to `/package.json`
- [ ] Update `role-model-router/README.md` if the command or host behavior changes materially
- [ ] Rerun the runtime validation floor and distinguish inherited broader failures from new run-13 regressions

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm run runtime:validate-tools`
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:validate-operations`
- `corepack pnpm run runtime:validate-state`
- `corepack pnpm run runtime:validate-routing`
- `corepack pnpm run runtime:validate-adapter`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run smoke`
- `corepack pnpm run build`
- `corepack pnpm run test`

Sub-phase acceptance:
- The repo has one deterministic local command that proves tool/MCP execution, inspection, and diagnostics without weakening the current runtime validation floor or canonical artifact model.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
- `/.recursive/run/12-router-runtime-hardening-operations/00-requirements.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/SKILLS.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills are available in this session.
Delegation Decision Basis: `Phase 2 required one controller-owned plan spanning new package boundaries, host-response behavior, provider-agnostic tool execution, MCP connector shaping, observation-bundle extensions, and validator scope while preserving the locked architecture boundary.`
Delegation Override Reason: `Choosing the public-host stance, the runtime-owned registry boundary, and the validation surface required tightly coupled reasoning across the locked Phase 1 findings and the existing runtime package seams.`
Audit Inputs Provided:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/router-devtools/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/provider-mcp/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- Changed files:
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/router-devtools/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/provider-mcp/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`

## Earlier Phase Reconciliation

- `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`:
  - claim carried forward: the repo already has tool-aware routing, provider capability negotiation, provider-native tool-call normalization, and generic runtime inspection surfaces, but the actual provider-agnostic registry/execution loop and tool/MCP observability layer are still missing.
  - current reconciliation: the selected plan reuses those existing seams directly and adds only the missing registry, connector, host-contract, observation, and validation pieces.
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`:
  - claim carried forward: run 13 must add MCP connector integration, provider-agnostic tool registry/execution contracts, tool-aware normalization, observability extensions, and a local validation/log-review loop while remaining additive to the current runtime baseline.
  - current reconciliation: the plan stays additive by preserving the current host contract, canonical trace/usage model, routing eligibility rules, and runtime validation floor.
- `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`:
  - claim carried forward: downstream audited phases must execute from `D:\DEV\role-model\.worktrees\13-router-runtime-mcp-tools-extension` using diff basis `85abf980096c931f09554ca203b66fa58bcb3cf4`.
  - current reconciliation: the plan reuses that locked worktree and diff basis unchanged.
- `/docs/architecture/06-router-runtime-architecture-lock.md` and the roadmap run-13 slice:
  - claim carried forward: MCP/tools work is a deferred extension that must remain additive and must not silently redefine the first complete runtime milestone.
  - current reconciliation: the selected package boundaries and validator strategy keep run 13 squarely in the deferred-extension lane without reopening canonical protocol or orchestration scope.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/role-model-baseline.md`
  - `/.recursive/memory/skills/SKILLS.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
  - `/package.json`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/router-devtools/src/index.ts`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/packages/provider-mcp/src/index.ts`
  - `/role-model-router/packages/provider-openai/src/index.ts`
  - `/role-model-router/packages/provider-anthropic/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`

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
- Actual changed files reviewed:
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-requirements.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/00-worktree.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/01-as-is.md`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
- Unexplained drift:
  - none; the current working diff is limited to intentional run-13 recursive artifacts

## Gaps Found

- none beyond the concrete plan choices already captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`; the plan is specific enough to drive strict TDD implementation.

## Repair Work Performed

- Converted the vague run-13 ask of “add MCP/tools” into one narrow additive plan that starts from the already-existing tool-aware routing and provider-native normalization seams.
- Chose one explicit public-host stance so implementation does not oscillate between OpenAI-compatible tool-call surfacing and a much larger orchestration engine.
- Kept the plan grounded in the existing runtime observation bundle and inspection surfaces so run 13 extends the current runtime instead of inventing a second execution or persistence plane.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines the MCP connector input layer plus provider-agnostic tool registry/execution boundary, but none of those runtime surfaces exist in code yet. | Blocking Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`, `/role-model-router/packages/provider-mcp/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Audit Note: Phase 3 will extend the existing runtime baseline rather than redefining the first-milestone architecture.
- R2 | Status: blocked | Rationale: the plan now defines tool-call surfacing, strict-schema handling, and backend integration points, but the actual tool execution loop and host-contract changes are not implemented yet. | Blocking Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`, `/role-model-router/packages/adapter-execution/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Audit Note: Phase 3 should reuse provider-native normalization and add only the missing provider-agnostic layer.
- R3 | Status: blocked | Rationale: the plan now defines tool/MCP receipts and diagnostics on top of the existing observation bundle, but the current inspection and observability surfaces do not yet carry that tool-aware information. | Blocking Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/package.json` | Audit Note: Phase 3 must extend the current observation model without replacing canonical trace, usage, or cache observability.
- R4 | Status: blocked | Rationale: the plan now defines one strongest local validator for tool execution and log review, but that validation path and its associated evidence surfaces do not exist yet. | Blocking Evidence: `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`, `/package.json`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Audit Note: Phase 4 must distinguish unchanged inherited `build` / `test` failures from any new run-13 regressions after `runtime:validate-tools` is added.

## Audit Verdict

- Audit summary: the plan is narrow and additive. It reuses the existing tool-aware routing and provider-native normalization seams, adds only the missing registry/connector/execution/inspection surfaces, and preserves the current host contract and validation floor rather than widening into full orchestration.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> the concrete MCP connector plus provider-agnostic tool registry/execution additions are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Implementation Sub-phases`.
- `R2` -> the tool-call normalization, strict-schema handling, and host/backend integration plan are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Manual QA Scenarios`.
- `R3` -> the tool/MCP observability extension plan is captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Implementation Sub-phases`.
- `R4` -> the local validation and log-review plan is captured in `## Testing Strategy`, `## Manual QA Scenarios`, `## Idempotence and Recovery`, and `## Implementation Sub-phases`.

## Coverage Gate

- [x] Locked Phase 0 and Phase 1 artifacts plus the roadmap run-13 slice were re-read
- [x] The plan chooses explicit package boundaries and a public-host behavior stance
- [x] The plan defines tool/MCP observability and local validation surfaces
- [x] The plan maps implementation work directly to `R1`-`R4`

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to drive strict TDD implementation
- [x] The plan keeps run 13 additive to the existing runtime baseline
- [x] No unresolved Phase 2 ambiguity blocks Phase 3 implementation

Approval: PASS
