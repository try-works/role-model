# S477 — packaged bootstrap bootdiag location

Status: diagnostic complete; instrumentation reverted; no commit.

## Probe

Dirty unsealed diagnostic package (ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=1, private Track-B distribution staged) at `role-model-router/dist/release/win32-x64/role-model-dev.exe`, fresh state root, port 6278. Bootdiag sequence (stderr, evidence/logs/s477-bootdiag2.err.log):

- cli:before-createPackagedProductionRuntime
- trackB:before-start
- sidecar:ready-line-parsed
- trackB:after-start
- trackB:before-createBackend
- trackB:after-createBackend
- cli:after-createPackagedProductionRuntime
- cli:before-awaitCliExtensionRuntime
- beforeReady:start
- beforeReady:qa-loop-start
- beforeReady:retryContributionAggregates-before
- beforeReady:retryContributionAggregates-after
- beforeReady:advisory-refresh-before
- beforeReady:advisory-refresh-after
- cli:after-awaitCliExtensionRuntime
- cli:packaged-branch-end
- cli:setup-end

Result: /healthz 200, operator /api/role-model/operator/models 503 runtime_initializing. No per-extension qa-invoke marker appears (qaExtensions was empty in this probe), so the QA loop is not the blocker. Every awaited step in the packaged bootstrap completed; no unresolved await remained.

## Exact cause (correction to the await hypothesis)

In the clean HEAD source, the packaged branch ends at cli.ts:12210. `readinessOwner.markReady()` is inside the **non-packaged else branch**, at cli.ts:12235-12236:

```
12211  } else {
...
12235      bootstrapState.status = "ready";
12236    readinessOwner.markReady();
12237      delete bootstrapState.message;
12238    }
```

The packaged branch (backend assignment, packagedRuntime scope registration, extension runtime watchdog at 12200-12210) returns to the outer setup without ever calling `readinessOwner.markReady()`. Therefore the server readiness owner stays pending/runtime_initializing forever, even though all packaged awaits (sidecar ready, createBackend, extension runtime beforeReady, QA loop, retry aggregates, advisory refresh) completed.

No unresolved await line: the bootdiag reaches `cli:setup-end`; the missing action is the packaged-path `readinessOwner.markReady()` call. This differs from the original S475 hypothesis (qa invoke hang) and explains why the 30s invoke timeout and 90s sidecar timeout never fired.

## Instrumentation

Temporary console.error [bootdiag] markers only in cli.ts and track-b-runtime.ts, plus temporary dirty-build/tree-check bypasses in package-sea.ts/track-b-runtime.ts. All reverted after the probe; no behavior change remains. No commit.
