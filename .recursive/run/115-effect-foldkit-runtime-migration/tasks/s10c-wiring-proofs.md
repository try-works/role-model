# S10c make the writer wiring actually tested (public, R20)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review proved the current tests do not test the wiring: they call the factory and the handler directly, so three mutations leave both tests green.

## Failing inputs to make fail
(a) delete `readDiagnosticsSource: moduleHealth.source` from `handlerOptions` (index.ts:20541-20544);
(b) delete the `moduleHealth?.reportRequestFailure(error)` call (index.ts:20584);
(c) move `createModuleHealthComposition` inside the per-request `createServer` callback.

## Required work
Extract the wiring into a small testable function (for example one that takes options and returns the handler options plus a report wrapper) so the tests can assert: exactly one writer construction, the injected source is that writer's source by identity, and the report wrapper is invoked exactly once when a handler rejects. Then assert the three mutations above fail.
If extraction is not possible without touching more than the composition region, start an ephemeral-port server with `enabled: true` and a deliberately throwing route and assert the report lands - but prefer the extraction, and state which you chose.

## Also from the review
- Record in the module doc and evidence that the transport edge sees only escaping failures, that `recordError` classifies them coarsely (the Fail/Die/Interrupt path in `observe`/`recordCause` is unwired), and that client-caused escapes are still counted as module failures. Name what R20 still needs.
- Decide whether writer `outages()` should be exposed through the diagnostics source; if it should and cannot be in this slice, record it as a named follow-up.

## Files you may write
- the composition region of `role-model-router/apps/runtime-host-bridge/src/index.ts`
- the writer module if a small seam is required
- the existing wiring test file, plus one new test if two files are clearer
- `evidence/logs/s10c-*` and `evidence/other/s10c-tdd.json`

Nothing else.

## Rules
Mutation-first: apply each of (a)(b)(c), observe the RED, restore byte-identically, then finalize. No installs, no commits, no subagents, no operator ports.
Report: the mutation REDs, GREEN counts, tsc exit, and the R20 gaps you recorded.