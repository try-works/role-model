# S10b wire the module-health writer at one composition edge, default off (public, R20)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The writer exists (src/module-health-writer.ts) and the read seam exists (readDiagnosticsSource at index.ts:3493, consumed at index.ts:17576). Nobody constructs the writer, so outside tests the endpoint always answers disabled.

## Read first
1. 00-requirements.md R20 (lines 190-197), especially the clause that concrete limits must be calibrated and approved BEFORE enablement.
2. src/module-health-writer.ts and its test.
3. src/local-diagnostics-read.ts - do not change its contract.

## Required work
1. ONE composition edge that constructs the writer and passes source() to readDiagnosticsSource. The writer is created once, not per request, and disposed with the host if it holds resources.
2. Enablement is explicit and OFF by default: with the flag absent the endpoint must still answer the honest disabled state. That flag is where R20 calibration approval will land.
3. The reporting edge is one place, after finalizers and before wire translation, as R20 requires. State exactly where it is and why it satisfies the clause; if the available edge cannot satisfy it, report that instead of approximating.
4. Placeholder limits are labelled as placeholders in code and evidence; the enablement path must not claim calibration.
5. An end-to-end test through the REAL read path: enable the writer, record a failure, call the diagnostics read, assert the record appears with its classification and that business behaviour is unchanged. A second test asserts the default-off path still answers disabled.

## Files you may write
- role-model-router/apps/runtime-host-bridge/src/index.ts (composition region only)
- the writer module if a small seam is needed
- one new test file under its test/ directory
- evidence/logs/s10b-* and evidence/other/s10b-tdd.json

Do not change the read contract, the client app, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
RED first for both the enabled path and the default-off path. Report: the edge, its citations, what calibration still requires, RED/GREEN, counts, tsc exit.