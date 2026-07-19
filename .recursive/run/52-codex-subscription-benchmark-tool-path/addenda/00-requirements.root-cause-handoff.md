Run: `/.recursive/run/52-codex-subscription-benchmark-tool-path/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-20T14:56:33Z`
LockHash: `9e737308cf606f220b6c44778831485547db66041a11aad4e419f8477788d951`
Inputs:
- User-provided root cause analysis document (attached to chat)
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
Outputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/addenda/00-requirements.root-cause-handoff.md`
Scope note: Provides the verified root cause analysis and recommended fix shape for run 52.

# Addendum: Root Cause Handoff Document

Type: addendum
Source: User-provided root cause analysis document
Scope: Provides the verified root cause analysis and recommended fix shape for run 52.

## Content

The full root cause document is the authoritative input for this run. Key findings verified by controller research:

1. `loadMcpConnectorConfigs` reads `testdata/router-runtime/mcp-connectors.json` (index.ts:5738)
2. `createRuntimeToolRegistry` calls `loadMcpConnectorConfigs` (index.ts:5800)
3. Codex Subscription branch calls `createRuntimeToolRegistry` when `codexDynamicTools.length > 0` (index.ts:12917)
4. `package-sea.ts` explicitly forbids `testdata/router-runtime` in production packaging (line 91)
5. `benchmark-runner.ts` forwards `caseItem.tools` with the request (line 335)
6. Codex path returns early (index.ts:12991), so the continuation loop at 13154 is a separate non-Codex path
7. `createRequestScopedToolRegistry` function already exists (index.ts:5833) but is never called - from a prior interrupted implementation attempt
8. `shouldBridgeManageToolContinuation` returns false for function tools, so the continuation loop only applies to hosted tools

## Verified Fix Shape

Replace `createRuntimeToolRegistry(...)` with `createRequestScopedToolRegistry(codexDynamicTools)` at line 12917. Keep `createRuntimeToolRegistry` for the non-Codex hosted-tools continuation path.

## TODO

- [x] Verify root cause findings against actual code
- [x] Record verified fix shape
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
