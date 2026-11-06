# S17b SSE frame preservation with scoped cleanup (public, R26 second half)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The transport JSON path now carries a real AbortSignal, cleans up its reader and pins the retry schedule. The SSE path is untouched and that is exactly what R26 still needs.

## Read first
1. `00-requirements.md` R26 (lines 238-244) - the frame list that must be preserved.
2. `role-model-router/apps/runtime-host-bridge/src/index.ts` around the SSE transcript readers (`readCodexResponsesSseTranscript`, `readProviderStreamTranscript`) - read the current implementation before deciding anything.
3. The transport slice's accepted test `test/s17a-transport-signal.test.ts` for the shape of an abort/cleanup proof, and the Effect API notes for the arity rule.

## Required work
1. Scoped cleanup for the SSE read path: the response body reader, any decoder and any listener created for the stream are released on success, on failure and on caller abort. Prove it by counting releases on all three paths.
2. A caller abort reaches the streaming read: interrupting the fiber must stop reading the stream rather than leaving it running. Prove it with a stream that only settles on abort under a short timeout.
3. Frame semantics preserved exactly: ordered tool/reasoning/fragmentation/drain/first-substantive commit/finish/DONE/error. Pin them with tests that would fail if a frame were reordered, dropped or duplicated. If existing tests already cover a frame, extend rather than duplicate.
4. Typed failures distinct from the JSON path's: a stream that ends mid-frame, a protocol violation, and an abort must be distinguishable.

## Files you may write
- the SSE read region of `role-model-router/apps/runtime-host-bridge/src/index.ts`, or a new module if extracting the readers is cleaner (state which and why)
- one new test file under its `test/`
- `evidence/logs/s17b-*` and `evidence/other/s17b-tdd.json`

Do not touch the queue runtime, diagnostics modules, the client app, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
One behavioural RED per numbered item. Report: what you extracted or changed and why, the abort proof, cleanup counts per path, the frame assertions, typed names, and any frame you could not pin.