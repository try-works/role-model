Run: `/.recursive/run/52-codex-subscription-benchmark-tool-path/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-20T14:21:23Z`
LockHash: `1d907bbb74cd72131b7d0792e57334b8c18ca92fe8f5208332ed6541386c0620`
Inputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-worktree.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/addenda/00-requirements.root-cause-handoff.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `role-model-router/packages/tool-registry/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
Outputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/01-as-is.md`
Scope note: This document records the current state of the Codex Subscription benchmark tool path and surrounding code, establishing the baseline for the root cause analysis and fix plan.

## TODO

- [x] Read requirements and worktree artifacts
- [x] Read root cause addendum
- [x] Analyze the Codex Subscription tool path in index.ts
- [x] Analyze the non-Codex continuation path
- [x] Analyze packaging rules in package-sea.ts
- [x] Analyze existing test coverage
- [x] Analyze tool-registry package interfaces
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Reproduction Steps (Novice-Runnable)

1. Build the production SEA package: `pnpm run build` then `tsx src/package-sea.ts` in `role-model-router/apps/runtime-host-bridge`
2. Start the packaged runtime server
3. Run a quick-mode benchmark against `openai.personal.openai-codex-subscription.global.gpt-5.4` with tool-bearing cases
4. Observe: the benchmark crashes with `ENOENT` on `testdata/router-runtime/mcp-connectors.json` because the file is excluded from production packaging

## Current Behavior by Requirement

### R1: Codex tool path reads testdata file
The Codex Subscription branch at `index.ts:12917` calls `createRuntimeToolRegistry(options.repoRoot, currentRegistry, networkFetcher)` when `codexDynamicTools.length > 0`. This calls `loadMcpConnectorConfigs(repoRoot)` which reads `testdata/router-runtime/mcp-connectors.json`. On packaged runtime, this file does not exist, causing `ENOENT`.

### R2: Non-tool Codex behavior
When `codexDynamicTools.length === 0`, `runtimeToolRegistry` is `null` (line 12918). No `executeDynamicToolCall` callback is attached (line 12926). The Codex path returns early (line 12994). This behavior is correct and unaffected by the bug.

### R3: Non-Codex provider behavior
The Codex path returns early at line 12994, never reaching the continuation loop at line 13154. The continuation loop uses `shouldBridgeManageToolContinuation` which returns true only for hosted tools (`kind === "hosted"`). Function tools return false. This path is correct and separate.

### R4: Packaging rules
`package-sea.ts:91` forbids `testdata/router-runtime` in production. This is correct and the cause of the crash: the file is intentionally excluded but the Codex path tries to read it.

### R5: Test coverage gaps
Existing tests cover `buildCodexDynamicTools` extraction and packaging guards, but do not cover `createRequestScopedToolRegistry` (not exported), do not prove the Codex path avoids `mcp-connectors.json` reads, and have no regression tests for non-tool behavior or packaging of `mcp-connectors.json` specifically.

### R6: Test suite state
Worktree baseline passes `executable.test.ts` and `litellm-catalog.test.ts` (17 tests). Full repo suite was green as of run 51 closeout.

### R7: Benchmark verification
No live benchmark verification has been performed yet. The benchmark is run via `POST /api/role-model/benchmark/runs` API or CLI `runBenchmark` command with `mode: "quick"`.

## Relevant Code Pointers

- `index.ts:5738` - `loadMcpConnectorConfigs` reads `testdata/router-runtime/mcp-connectors.json`
- `index.ts:5795` - `createRuntimeToolRegistry` calls `loadMcpConnectorConfigs`
- `index.ts:5833` - `createRequestScopedToolRegistry` exists but is never called (not exported)
- `index.ts:6455` - `buildCodexDynamicTools` extracts function tools from request (exported)
- `index.ts:8083` - `shouldBridgeManageToolContinuation` returns true only for hosted tools
- `index.ts:12915` - `buildCodexDynamicTools(requestCapture)` call in Codex path
- `index.ts:12917` - `createRuntimeToolRegistry(...)` call in Codex path (the bug)
- `index.ts:12925-12926` - `executeDynamicToolCall` callback attached when registry is non-null
- `index.ts:12994` - Codex path early return
- `index.ts:13154` - Non-Codex continuation loop uses `createRuntimeToolRegistry` (correct)
- `package-sea.ts:91` - `forbiddenProductionReleasePathFragments` includes `testdata/router-runtime`
- `benchmark-runner.ts:335` - `caseItem.tools` forwarded with request
- `tool-registry/src/index.ts:50` - `createToolRegistry` factory
- `tool-registry/src/index.ts:111` - `executeToolCalls` resolves and executes tools
- `test/index.test.ts:1768` - Existing `buildCodexDynamicTools` test
- `test/executable.test.ts:373` - Existing packaging guard test

## Known Unknowns

- Whether passthrough tool execution (returning arguments as content) is sufficient for all benchmark evaluation scenarios. The assumption is that it is, since the existing `executeDynamicToolCall` callback already uses the same pattern via `executeToolCalls`.
- Whether exporting `createRequestScopedToolRegistry` will have any side effects on the module's public API surface. The function is self-contained and does not depend on external state.

## Evidence

- Code reading of `index.ts` lines 5736-5855, 6455-6505, 8083-8112, 12910-12998, 13140-13170
- Code reading of `package-sea.ts` lines 86-115
- Code reading of `tool-registry/src/index.ts` lines 1-90, 111-161
- Code reading of `benchmark-runner.ts` lines 325-345
- Code reading of `test/index.test.ts` lines 1768-1828
- Code reading of `test/executable.test.ts` lines 373-392
- Grep verification: `createRequestScopedToolRegistry` has zero call sites
- Grep verification: `createRuntimeToolRegistry` has two call sites (12917, 13154)
- Grep verification: `buildCodexDynamicTools` is exported, `createRequestScopedToolRegistry` is not

## Current Architecture

### Codex Subscription Execution Path

The Codex Subscription endpoint (`openai.personal.openai-codex-subscription.global.gpt-5.4`) is handled in `index.ts` at approximately line 12900. The flow is:

1. `buildCodexDynamicTools(requestCapture)` extracts function-type tools from the request body (line 12915). This function (line 6455) filters for `type: "function"` tools from either chat-completions or responses format, returning `Extract<RuntimeExecutionToolDefinition, { readonly kind?: "function" }>[]`.

2. `dynamicToolNames` is built as a Set of tool names for fast lookup (line 12916).

3. `runtimeToolRegistry` is created when `codexDynamicTools.length > 0` by calling `createRuntimeToolRegistry(options.repoRoot, currentRegistry, networkFetcher)` (line 12917-12918). When no tools are present, it is `null`.

4. If `runtimeToolRegistry` is non-null, an `executeDynamicToolCall` callback is attached to the Codex execution request (line 12925-12926). This callback:
   - Checks if the tool name is in `dynamicToolNames` (line 12935)
   - If yes, calls `executeToolCalls(runtimeToolRegistry, { ... })` to execute the tool (line 12937)
   - If no, returns a "rejected" execution with `TOOL_NOT_ALLOWED` diagnostic (line 12949-12961)

5. The Codex path returns early at line 12994-12998 with `{ providerFamily, endpointId, ...codexResponse }`.

### createRuntimeToolRegistry (line 5795)

This function:
- Calls `loadMcpConnectorConfigs(repoRoot)` which reads `path.join(repoRoot, "testdata", "router-runtime", "mcp-connectors.json")` (line 5738-5741)
- Creates MCP connector definitions from the loaded configs
- Adds a builtin `$web_search` passthrough tool for Kimi hosted web-search
- Returns a `ToolRegistry` with all connectors

### createRequestScopedToolRegistry (line 5833)

This function exists but is **never called** (grep confirmed zero call sites). It:
- Takes `dynamicTools` (the same type returned by `buildCodexDynamicTools`)
- Creates an in-memory `ToolRegistry` with a single "request-scoped" connector
- Each tool's execute handler returns the tool arguments as content (passthrough)
- Is synchronous (returns `ToolRegistry`, not `Promise<ToolRegistry>`)
- Is not exported (declared as `function`, not `export function`)

### Non-Codex Continuation Path (line 13154)

After the Codex early return, the non-Codex provider path has a continuation loop for hosted tools:
- `shouldBridgeManageToolContinuation(currentExecutionRequest.tools)` returns true only when all tools have `kind === "hosted"` (line 8083-8085)
- When true, the loop lazily creates the runtime tool registry: `runtimeToolRegistry ??= await createRuntimeToolRegistry(...)` (line 13154-13157)
- This path is correct for hosted connector tools and should remain unchanged

### Packaging Rules (package-sea.ts)

- `forbiddenProductionReleasePathFragments` (line 91) includes `"testdata/router-runtime"`, ensuring the directory is excluded from production packaging
- `assertProductionReleaseHasNoQaArtifacts` validates the release directory against these fragments
- Existing test at `executable.test.ts:373` creates `testdata/router-runtime/fixtures/provider-accounts.json` and verifies the guard rejects it

### Benchmark Runner (benchmark-runner.ts)

- `runCaseOnEndpoint` (line 325) forwards `caseItem.tools` with the request via `...(caseItem.tools && !omitTools ? { tools: caseItem.tools } : {})` (line 335)
- Benchmark mode can be "quick" or "full" (line 1367)
- The benchmark is triggered via `POST /api/role-model/benchmark/runs` API or CLI `runBenchmark` command

### Tool Registry Package (tool-registry/src/index.ts)

- `createToolRegistry({ connectors })` creates a `ToolRegistry` (line 50)
- `resolveTool(registry, toolName)` iterates connectors to find a tool by name (line 59)
- `executeToolCalls(registry, { requestId, toolCalls })` resolves and executes tools (line 111)
- `ToolDefinition.execute(context)` returns `Promise<{ readonly content: unknown }>` (line 33)
- `ToolConnector.connectorKind` is `string` (not a union), so `"dynamic-tool"` is valid

### Existing Test Coverage

1. `index.test.ts:1768` - Tests `buildCodexDynamicTools` extraction: verifies function tools are extracted correctly, non-function tools (like `web_search`) are filtered out. `buildCodexDynamicTools` is exported.

2. `executable.test.ts:373` - Tests production release guard rejects `testdata/router-runtime/fixtures/provider-accounts.json`.

3. `openai-codex-subscription-matrix.test.ts` - Tests Codex subscription routing matrix including tool-bearing cases, but does not test tool registry creation or `mcp-connectors.json` reads.

4. No test for `createRequestScopedToolRegistry` (function is not exported).
5. No test proves the Codex path avoids `mcp-connectors.json` reads.
6. No regression test for non-tool Codex behavior.
7. No specific test for `mcp-connectors.json` being forbidden in packaging.

## Prior Run Reconciliation

No prior recursive runs were identified that touch the same subsystem. Run 51 (runtime testing architecture) added test infrastructure but did not modify the Codex tool path or `createRuntimeToolRegistry`.

## Effective Inputs Re-read

- `00-requirements.md`: R1-R7 with acceptance criteria, out-of-scope items, constraints, and assumptions
- `00-worktree.md`: Worktree at `.worktrees/52`, base commit `16fc64ee`, branch `recursive/52-codex-subscription-benchmark-tool-path`
- `addenda/00-requirements.root-cause-handoff.md`: Verified root cause with 8 findings and fix shape

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: Worker droids are available for delegated review. However, the AS-IS analysis is straightforward and grounded in direct code reading, so self-audit is appropriate.
Delegation Decision Basis: AS-IS analysis is a documentation task grounded in code reading, not a review or implementation task. Self-audit is sufficient.
Delegation Override Reason: N/A (self-audit chosen for documentation phase, not review delegation)

## Worktree Diff Audit

Baseline type: `local commit`
Baseline reference: `16fc64ee`
Comparison reference: `working-tree`
Normalized baseline: `16fc64ee`
Normalized diff command: `git diff --name-only 16fc64ee`
Planned or claimed changed files: none yet (AS-IS phase, no implementation)
Actual changed files reviewed: none (AS-IS phase)
Unexplained drift: none

## Requirement Completion Status

- R1 | Status: not started | Scope: AS-IS documents the current broken call site at index.ts:12917
- R2 | Status: not started | Scope: AS-IS documents the null branch for non-tool Codex cases
- R3 | Status: not started | Scope: AS-IS documents the non-Codex continuation path at line 13154
- R4 | Status: not started | Scope: AS-IS documents packaging rules in package-sea.ts
- R5 | Status: not started | Scope: AS-IS documents existing test coverage and gaps
- R6 | Status: not started | Scope: AS-IS documents baseline test state
- R7 | Status: not started | Scope: AS-IS documents benchmark runner flow

## Traceability

- R1 -> `createRuntimeToolRegistry` call at line 12917, `createRequestScopedToolRegistry` at line 5833
- R2 -> null branch at line 12918, early return at line 12994
- R3 -> `shouldBridgeManageToolContinuation` at line 8083, continuation loop at line 13154
- R4 -> `forbiddenProductionReleasePathFragments` at package-sea.ts:91
- R5 -> existing tests at index.test.ts:1768, executable.test.ts:373
- R6 -> worktree baseline verified at creation
- R7 -> benchmark-runner.ts:335, API at index.ts:15614

## Coverage Gate

- [x] R1: Codex tool path and call site documented
- [x] R2: Non-tool behavior documented
- [x] R3: Non-Codex continuation path documented
- [x] R4: Packaging rules documented
- [x] R5: Existing test coverage and gaps documented
- [x] R6: Baseline test state documented
- [x] R7: Benchmark runner flow documented
- [x] Out-of-scope items acknowledged (OOS1-OOS6)

Coverage: PASS

## Approval Gate

- [x] AS-IS analysis is grounded in actual code reading
- [x] All requirement IDs are mapped to current code locations
- [x] Test coverage gaps are identified
- [x] Ready for Phase 1.5 Root Cause Analysis

Approval: PASS
