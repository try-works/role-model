Run: `/.recursive/run/52-codex-subscription-benchmark-tool-path/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-20T14:17:12Z`
LockHash: `c77ff0e0311fa7b7659e751e515b7bc3733d2dfefcae4f771b433b614d49ca11`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/addenda/00-requirements.root-cause-handoff.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `role-model-router/packages/tool-registry/src/index.ts`
- `role-model-router/packages/bench-routing/data/routing-capability-suite.json`
- `testdata/router-runtime/mcp-connectors.json`
- User-provided root cause analysis document (attached to chat, preserved as addendum)
Outputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
Scope note: This run fixes the Codex Subscription benchmark tool path so that request-scoped function tools no longer trigger a connector-registry bootstrap that depends on a testdata file excluded from production packaging.

## TODO

- [x] Elicit requirements from user/context
- [x] Define requirement identifiers (R1, R2, ...)
- [x] Write acceptance criteria for each requirement
- [x] Document out of scope items (OOS1, OOS2, ...)
- [x] List constraints and assumptions
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Problem Summary

On the packaged runtime, the authed OpenAI Codex Subscription endpoint `openai.personal.openai-codex-subscription.global.gpt-5.4` scores catastrophically bad on benchmark quick suite tool-bearing cases. The low score is not caused by poor model output. Instead, tool-bearing benchmark cases fail before normal model evaluation completes because the Codex-specific bridge path eagerly creates a runtime tool registry that reads `testdata/router-runtime/mcp-connectors.json`, a file intentionally excluded from production packaging. This produces an `ENOENT` crash before judged evaluation, artificially depressing the benchmark score.

## Root Cause (verified by controller research)

1. `loadMcpConnectorConfigs` reads `testdata/router-runtime/mcp-connectors.json` (index.ts:5738)
2. `createRuntimeToolRegistry` calls `loadMcpConnectorConfigs` (index.ts:5800)
3. Codex Subscription branch calls `createRuntimeToolRegistry` when `codexDynamicTools.length > 0` (index.ts:12917)
4. `package-sea.ts` explicitly forbids `testdata/router-runtime` in production packaging (line 91)
5. `benchmark-runner.ts` forwards `caseItem.tools` with the request (line 335)
6. Codex path returns early (index.ts:12991), so the continuation loop at 13154 is a separate non-Codex path
7. `createRequestScopedToolRegistry` function already exists (index.ts:5833) but is never called
8. `shouldBridgeManageToolContinuation` returns false for function tools, so the continuation loop only applies to hosted tools

## Fixed Decisions

1. The fix is to use `createRequestScopedToolRegistry(codexDynamicTools)` instead of `createRuntimeToolRegistry(...)` at the Codex Subscription call site.
2. `createRuntimeToolRegistry` is kept for the non-Codex hosted-tools continuation path.
3. No testdata files will be added to production packaging.
4. The fix stays tightly scoped to the Codex Subscription benchmark tool path.

## Requirements

### `R1` Request-scoped tool registry for Codex Subscription

Description:
The Codex Subscription execution path must use a request-scoped in-memory tool registry built from the request's function tool definitions instead of bootstrapping the generic connector registry that reads `testdata/router-runtime/mcp-connectors.json`.

Acceptance criteria:
- the Codex Subscription branch uses `createRequestScopedToolRegistry(codexDynamicTools)` instead of `createRuntimeToolRegistry(...)` when dynamic tools are present
- no `testdata/router-runtime/mcp-connectors.json` read occurs when the Codex Subscription path processes request-scoped function tools
- the `createRequestScopedToolRegistry` function creates an in-memory `ToolRegistry` from the dynamic tool definitions with passthrough execute handlers
- the existing `createRuntimeToolRegistry` function is preserved for the non-Codex hosted-tools continuation path

### `R2` Non-tool Codex behavior unchanged

Description:
Codex Subscription benchmark cases that do not include function tools must behave exactly as before.

Acceptance criteria:
- when `codexDynamicTools.length === 0`, the runtime tool registry remains null
- non-tool benchmark cases for Codex Subscription produce the same execution and judged artifacts as before the fix

### `R3` Non-Codex provider behavior unchanged

Description:
DeepSeek, Kimi, and other non-Codex provider benchmark behavior must remain unchanged.

Acceptance criteria:
- non-Codex provider paths do not call `createRequestScopedToolRegistry`
- non-Codex provider benchmark scores are unaffected by this change
- the hosted-tools continuation loop still uses `createRuntimeToolRegistry` for legitimate connector-backed scenarios

### `R4` Packaging rules preserved

Description:
Production packaging rules must still exclude `testdata/router-runtime`.

Acceptance criteria:
- `package-sea.ts` forbidden path fragments still include `testdata/router-runtime`
- no testdata files are added to the production release copy allowlist
- existing packaging tests remain green

### `R5` Automated test coverage

Description:
Automated tests must prove the fix works and prevent regression.

Acceptance criteria:
- a test proves that request-scoped benchmark function tools on the Codex path no longer trigger `mcp-connectors.json` reads
- a test proves the `createRequestScopedToolRegistry` function produces a working `ToolRegistry` with the correct tool names and passthrough execution
- a regression test proves non-tool Codex benchmark behavior is unchanged
- a regression test proves packaging rules still exclude `testdata/router-runtime`

### `R6` Full test suite green

Description:
The full repo test suite, lint, and build must pass after the fix.

Acceptance criteria:
- `pnpm run lint` passes with 0 errors
- `pnpm run build` passes
- `pnpm run test` passes (all workspace projects)
- `runtime:test-critical` passes

### `R7` Live runtime benchmark verification on rebuilt package

Description:
After rebuilding the production SEA package, a quick-mode benchmark must be run against the `openai.personal.openai-codex-subscription.global.gpt-5.4` endpoint with tool-bearing cases to verify the fix works in the actual packaged runtime (not just in unit tests).

Acceptance criteria:
- the production SEA package is rebuilt with `pnpm run build` and `package-sea`
- the rebuilt runtime starts and serves requests
- a quick-mode benchmark run against `openai.personal.openai-codex-subscription.global.gpt-5.4` completes without `ENOENT` errors on `mcp-connectors.json`
- tool-bearing benchmark cases for the Codex Subscription endpoint produce execution results instead of crashing before evaluation
- the benchmark run summary is captured as evidence

## Out of Scope

- `OOS1`: general benchmark redesign or scoring changes
- `OOS2`: provider capability scoring changes
- `OOS3`: catalog benchmarking policy changes
- `OOS4`: unrelated routing/controller work
- `OOS5`: shipping `testdata/router-runtime` in production packaging
- `OOS6`: deleting `createRuntimeToolRegistry` (it is still needed for hosted-tools continuation)

## Constraints

- the fix must not widen beyond the Codex Subscription benchmark tool path
- the fix must not weaken packaging rules
- the fix must not hide failures without making tool cases actually execute
- default automated tiers must remain deterministic and offline-safe

## Assumptions

- the `createRequestScopedToolRegistry` function already in the codebase (from a prior interrupted attempt) is correct and can be wired in
- passthrough tool execution (returning tool arguments as content) is sufficient for benchmark evaluation
- the `buildCodexDynamicTools` function correctly extracts request-scoped function tool definitions

## Coverage Gate

Coverage: PASS

- `R1` defines the core fix: use request-scoped registry instead of connector-registry bootstrap
- `R2` and `R3` ensure no regressions for non-tool and non-Codex paths
- `R4` ensures packaging rules are preserved
- `R5` requires automated test coverage for the fix and regressions
- `R6` requires full repo validation
- `R7` requires live runtime benchmark verification on the rebuilt production package against gpt-5.4 tool-bearing cases
- out-of-scope items fence off benchmark redesign, scoring changes, and packaging weakening

## Approval Gate

Approval: PASS

- the root cause is verified by controller research against actual code
- the fix shape is minimal: one call site change plus tests
- the `createRequestScopedToolRegistry` function already exists and is correct
- the fix is tightly scoped to the Codex Subscription benchmark tool path
