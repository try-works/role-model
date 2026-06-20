Run: `/.recursive/run/52-codex-subscription-benchmark-tool-path/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-06-20T14:23:56Z`
LockHash: `f3c4a75fa14be81a59866b4aaec07917e5a8a298220464afb07c598dcdef50b2`
Inputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/01-as-is.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/01.5-root-cause.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/addenda/00-requirements.root-cause-handoff.md`
Outputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/02-to-be-plan.md`
Scope note: This document defines the planned changes, test strategy, and validation approach for the Codex Subscription benchmark tool path fix.

## TODO

- [x] Read AS-IS and root cause artifacts
- [x] Read requirements and addendum
- [x] Define implementation steps for R1
- [x] Define regression tests for R2, R3, R4
- [x] Define test coverage for R5
- [x] Define full suite validation for R6
- [x] Define live benchmark verification for R7
- [x] List expected changed files
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Root Cause Reference

Root cause identified in `01.5-root-cause.md`:
- Location: `index.ts:12917`
- Cause: Codex Subscription branch calls `createRuntimeToolRegistry` (reads `testdata/router-runtime/mcp-connectors.json`) instead of `createRequestScopedToolRegistry` (in-memory, no file reads)
- Fix: Replace call site, export `createRequestScopedToolRegistry` for testing

## Implementation Plan

## Planned Changes by File

| File | Change | Requirement |
| --- | --- | --- |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | Export `createRequestScopedToolRegistry` (line 5833), replace call site at line 12917 | R1, R5 |
| `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Add tests for `createRequestScopedToolRegistry`, Codex path no file read, non-tool regression, packaging regression | R5, R2, R3, R4 |

## Implementation Steps

### Step 1: Export `createRequestScopedToolRegistry` (R1, R5)

**File:** `role-model-router/apps/runtime-host-bridge/src/index.ts`
**Line:** 5833
**Change:** `function createRequestScopedToolRegistry` -> `export function createRequestScopedToolRegistry`
**Rationale:** Needed for direct unit testing per R5. Consistent with `buildCodexDynamicTools` which is already exported.

### Step 2: Replace call site at Codex path (R1)

**File:** `role-model-router/apps/runtime-host-bridge/src/index.ts`
**Line:** 12917-12918
**Current:**
```ts
const runtimeToolRegistry =
  codexDynamicTools.length > 0
    ? await createRuntimeToolRegistry(options.repoRoot, currentRegistry, networkFetcher)
    : null;
```
**Target:**
```ts
const runtimeToolRegistry =
  codexDynamicTools.length > 0
    ? createRequestScopedToolRegistry(codexDynamicTools)
    : null;
```
**Note:** `createRequestScopedToolRegistry` is synchronous, so `await` is removed. The return type `ToolRegistry` is compatible with the existing `executeToolCalls` usage at line 12937.

### Step 3: Write RED tests (R5, TDD)

**File:** `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

**Test 1: `createRequestScopedToolRegistry` produces working registry**
- Test that `createRequestScopedToolRegistry` is exported and produces a `ToolRegistry` with correct tool names
- Test that `executeToolCalls` with the registry returns passthrough content
- RED: Fails because function is not exported (or test not yet present)

**Test 2: Codex path does not read `mcp-connectors.json`**
- Test that when the Codex path processes function tools, `loadMcpConnectorConfigs` is not called
- Use spy/mock on `loadMcpConnectorConfigs` or verify no file read occurs
- RED: Fails on current code because `createRuntimeToolRegistry` calls `loadMcpConnectorConfigs`

**Test 3: Non-tool Codex behavior unchanged (R2 regression)**
- Test that when no tools are present, `runtimeToolRegistry` is null and no registry is created
- RED: Should pass on current code (regression guard)

**Test 4: Packaging rules still exclude `testdata/router-runtime` (R4 regression)**
- Test that `forbiddenProductionReleasePathFragments` includes `testdata/router-runtime`
- RED: Should pass on current code (regression guard)

### Step 4: Apply GREEN fix (R1)

Apply Step 1 and Step 2 changes. Run all tests. All should pass.

### Step 5: Full suite validation (R6)

- `pnpm run lint` (0 errors)
- `pnpm run build` (all workspace projects)
- `pnpm run test` (all workspace projects)
- `runtime:test-critical`

### Step 6: Live benchmark verification (R7)

- Build production SEA package
- Start packaged runtime
- Run quick-mode benchmark against `openai.personal.openai-codex-subscription.global.gpt-5.4`
- Verify no ENOENT errors on `mcp-connectors.json`
- Verify tool-bearing cases produce execution results
- Capture benchmark run summary as evidence

## Expected Changed Files

| File | Change | Requirement |
| --- | --- | --- |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | Export `createRequestScopedToolRegistry`, replace call site at line 12917 | R1, R5 |
| `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Add tests for `createRequestScopedToolRegistry`, Codex path no file read, non-tool regression, packaging regression | R5, R2, R3, R4 |

## Testing Strategy

| Test | Requirement | Type | RED/GREEN |
| --- | --- | --- | --- |
| `createRequestScopedToolRegistry` produces working registry with correct tools and passthrough | R1, R5 | Unit | RED (not exported) -> GREEN (exported + tested) |
| Codex path with function tools does not trigger `mcp-connectors.json` read | R1, R5 | Integration | RED (calls createRuntimeToolRegistry) -> GREEN (calls createRequestScopedToolRegistry) |
| Non-tool Codex behavior unchanged (null registry) | R2 | Regression | Passes before and after |
| Non-Codex continuation path still uses `createRuntimeToolRegistry` | R3 | Regression | Passes before and after |
| Packaging rules still exclude `testdata/router-runtime` | R4 | Regression | Passes before and after |
| Full lint/build/test suite | R6 | Full suite | Passes after fix |
| Live benchmark on gpt-5.4 with tools | R7 | Live QA | Completes without ENOENT after fix |

## Playwright Plan (if applicable)

Not applicable. This run does not involve browser UI testing. The fix is in the runtime host bridge backend, and verification is via unit tests and live benchmark runs.

## Manual QA Scenarios

### QA-1: Live benchmark quick suite on gpt-5.4 (R7)
1. Build production SEA package (`pnpm run build` + `package-sea`)
2. Start packaged runtime server
3. Run quick-mode benchmark against `openai.personal.openai-codex-subscription.global.gpt-5.4` with tool-bearing cases
4. Verify: no ENOENT errors on `mcp-connectors.json`
5. Verify: tool-bearing cases produce execution results
6. Capture benchmark run summary as evidence

## Idempotence and Recovery

- The fix is a single call site replacement. Running it multiple times has no effect (idempotent).
- If the fix needs to be reverted, restoring the original `createRuntimeToolRegistry` call at line 12917 restores the previous behavior.
- The `createRequestScopedToolRegistry` function can remain exported even if the fix is reverted (it is a useful utility).
- No database migrations, no config changes, no irreversible state changes.

## Implementation Sub-phases

### Sub-phase 3a: RED - Write failing tests
- Write test for `createRequestScopedToolRegistry` (fails: not exported)
- Write test for Codex path not reading `mcp-connectors.json` (fails: current code reads it)
- Write regression tests for R2, R4 (should pass on current code)
- Run tests, capture RED evidence

### Sub-phase 3b: GREEN - Apply fix
- Export `createRequestScopedToolRegistry` at line 5833
- Replace call site at line 12917
- Run tests, capture GREEN evidence

### Sub-phase 3c: REFACTOR - Clean up
- Verify no `await` needed on synchronous `createRequestScopedToolRegistry`
- Run full test suite
- Capture final state

## QA Plan

QA Execution Mode: agent-operated

- Agent builds the production SEA package
- Agent starts the packaged runtime server
- Agent runs a quick-mode benchmark against `openai.personal.openai-codex-subscription.global.gpt-5.4`
- Agent verifies no ENOENT errors and tool-bearing cases produce execution results
- Agent captures the benchmark run summary as evidence

## Effective Inputs Re-read

- `01-as-is.md`: Current architecture, code pointers, test gaps
- `01.5-root-cause.md`: Root cause at index.ts:12917, fix strategy, test plan
- `00-requirements.md`: R1-R7 acceptance criteria
- `addenda/00-requirements.root-cause-handoff.md`: Verified root cause findings

## Earlier Phase Reconciliation

- Phase 1 AS-IS identified the call site and all code pointers. Phase 1.5 confirmed the root cause. No discrepancies between phases.
- The addendum's root cause findings (8 items) were all verified in Phase 1 and Phase 1.5.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: Worker droids are available for delegated review.
Delegation Decision Basis: TO-BE plan is a planning task grounded in root cause analysis. Self-audit is appropriate.
Delegation Override Reason: N/A

## Worktree Diff Audit

Baseline type: `local commit`
Baseline reference: `16fc64ee`
Comparison reference: `working-tree`
Normalized baseline: `16fc64ee`
Normalized diff command: `git diff --name-only 16fc64ee`
Planned or claimed changed files:
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Actual changed files reviewed: none yet (planning phase)
Unexplained drift: none

## Requirement Completion Status

- R1 | Status: planned | Implementation: Step 1 (export) + Step 2 (replace call site) | Changed Files: index.ts
- R2 | Status: planned | Regression test: Step 3 Test 3 | Changed Files: index.test.ts
- R3 | Status: planned | Regression: confirmed separate path, no change needed
- R4 | Status: planned | Regression test: Step 3 Test 4 | Changed Files: index.test.ts
- R5 | Status: planned | Tests: Step 3 Tests 1-4 | Changed Files: index.test.ts
- R6 | Status: planned | Validation: Step 5 full suite
- R7 | Status: planned | Validation: Step 6 live benchmark

## Traceability

- R1 -> Step 1 (export) + Step 2 (replace call site) in index.ts
- R2 -> Step 3 Test 3 (non-tool regression) in index.test.ts
- R3 -> No change needed (confirmed separate path in root cause analysis)
- R4 -> Step 3 Test 4 (packaging regression) in index.test.ts
- R5 -> Step 3 Tests 1-4 (all test coverage) in index.test.ts
- R6 -> Step 5 (full suite validation)
- R7 -> Step 6 (live benchmark verification)

## Coverage Gate

- [x] R1: Fix planned (export + replace call site)
- [x] R2: Regression test planned
- [x] R3: Confirmed no change needed, regression guarded
- [x] R4: Regression test planned
- [x] R5: All test coverage planned with TDD RED-GREEN
- [x] R6: Full suite validation planned
- [x] R7: Live benchmark verification planned
- [x] Out-of-scope items acknowledged (OOS1-OOS6)
- [x] Expected changed files are concrete
- [x] Tests and QA coverage are concrete

Coverage: PASS

## Approval Gate

- [x] Every in-scope R# is planned
- [x] Targeted files/modules are concrete
- [x] Tests and QA coverage are concrete
- [x] Expected change surface is concrete enough for later diff reconciliation
- [x] TDD RED-GREEN strategy defined
- [x] Live benchmark verification included per R7

Approval: PASS
