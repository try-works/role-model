# S10a bounded module-health record writer (public, R20 first slice)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R20 says module health/Cause attribution must be separate from business telemetry, preserve the original failure semantics, must not change a business result, and must not recurse. The diagnostics read path already exists and its production source is a deliberate deferred wire; this slice provides the writer behind that wire and nothing else.

## Read first
1. `00-requirements.md` R20 (lines 190-197) - the acceptance criteria you are answering, clause by clause.
2. `role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts` - the record shape the reader expects (four scalar fields, identity, loss counters, staleness rule).
3. `evidence/other/effect-4.0.6-api-notes.md` and the vendored Effect `Cause` module source before writing any Cause code. Cite file:line.

## Required work
1. A writer that turns a `Cause` (and a plain error) into bounded health records matching the reader's contract, with an explicit ring buffer and a loss counter. Overflow must be counted, never silently dropped and never grown without bound.
2. Preservation: Fail, Die and Interrupt remain distinguishable in the record, and the ORIGINAL cause is never replaced, wrapped into oblivion or swallowed. The record carries a bounded code and message, not a serialized cause graph.
3. No recursion and no business impact: a reporter that throws, a cause whose accessors throw, a cyclic or reused error object, and a nested-cause chain must not throw out of the writer, must not recurse, and must not change the value or error a caller observes. Prove the last one: a program that fails must still fail with the same error identity whether or not the writer is installed.
4. Redaction: only bounded scalar fields leave the writer; no message capture that could carry credentials, no fiber dump.
5. One report owner: the writer is called at a single explicit edge, not sprinkled through business code. If wiring that edge requires touching an out-of-scope module, report the exact site instead of editing it.

## Files you may write
- one new module under `role-model-router/apps/runtime-host-bridge/src/` and one new test file under its `test/`
- if and only if the edge is inside the host bridge, the smallest wiring change, stated explicitly
- `evidence/logs/s10a-*` and `evidence/other/s10a-tdd.json`

Do not touch `local-diagnostics-read.ts` (its contract is fixed), the client app, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
One behavioural RED per numbered item, including the hostile inputs (throwing accessor, cyclic error, reused error, nested chain) and the business-identity proof. A missing module is a setup RED and does not count.
Report: each clause with its test and RED message, GREEN counts, the Cause API lines you used, tsc exit, and what you deliberately did not build (for example retention/rotation policy, which belongs to the enablement decision).