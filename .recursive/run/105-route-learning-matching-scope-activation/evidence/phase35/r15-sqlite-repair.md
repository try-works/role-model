# R15 SQLite telemetry classification repair

Scope: R15 only. Public worktree: D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation.
TDD Mode: strict. Audit Execution Mode: self-audit (bounded delegated implementation).
Loaded recursive-debugging and recursive-tdd; inspected source before tests and production edits. No commits, stash, reset, host-bridge edits, or other-agent file edits.

## Root cause and assertion RED

The compact projection allowlisted failedAttempts[].errorPreview.message but copied it without a byte bound. Eight attempts multiplied arbitrary provider-error strings; JSON escaping and UTF-8 multibyte encoding worsened byte growth. persistRuntimeTelemetryFailure then threw before inserting primary failure telemetry. Raising an IPC frame limit does not change this independent SQLite inline limit.

Command (sqlite-memory package): pnpm exec vitest run test/run105-telemetry-failure-size-limit.test.ts
Evidence: [r15-sqlite.red.log](./r15-sqlite.red.log).
Result: exit 1, **6 genuine assertion failures / 2 passing tests**. ASCII and UTF-8, both real temp SQLite no-graph and file-artifact-backed modes, reproduced exactly:

> runtime telemetry failure classification stub exceeds 16384 bytes

The original projected envelopes at 16383 and 16384 bytes persisted; 16385 bytes failed. No production edits preceded this RED.

## Minimal GREEN repair

- Error preview message uses a 512-byte **serialized UTF-8 JSON-string** budget, including quotes/escapes; code-point iteration cannot split a surrogate pair. At most 4096 bytes of message JSON across eight attempts, leaving room for identifiers/classification/counters and other compact evidence.
- Only allowed message/status/class fields survive preview projection. Explicit messageTruncated and messageOriginalUtf8Bytes identify bounded previews; raw body/message trees remain excluded.
- Aggregate budgeting runs on the final failure envelope including artifactRef and failure classification. Optional diagnostic trees are evicted before primary request/route/endpoint IDs, status/class, attempt correlation IDs, cooldown facts and measured stream counters. compactTruncation records reason/original size/omitted fields. If needed, only preview message bytes are shed after optional evidence; primary IDs remain unchanged.
- Graph mode retains the original observation in the real file artifact and preserves the pointer. No-graph mode keeps bounded classification only without inventing artifact availability.
- The global LEGACY_INLINE_CAP_BYTES and SQLite INSERT/UPDATE guards remain 16384. No targeted increase needed: measured eight-attempt persisted envelopes are **7081 ASCII / 7065 UTF-8 bytes** without graph and **7313 ASCII / 7297 UTF-8 bytes** with artifact pointer.
- Unusually huge primary identifiers or unrelated I/O errors still fail closed, not silently lose primary IDs.

## Verification

- [r15-sqlite.green.log](./r15-sqlite.green.log): first GREEN, original 8 R15 tests + all 6 original run94 compact/privacy tests = 14/14.
- [r15-sqlite-suite.green.log](./r15-sqlite-suite.green.log): original full suite 122/122 tests, 23/23 files.
- [r15-sqlite-final.green.log](./r15-sqlite-final.green.log): strengthened final 16 R15 tests + original 6 compact tests = 22/22. Includes exact original 16383/16384/16385 envelope sizes, 511/512/513-byte serialized previews, emoji, escaped controls, explicit aggregate eviction, all attempt IDs and stream counters, no mutation, artifact content fidelity and original privacy exclusions.
- [r15-sqlite-typecheck.log](./r15-sqlite-typecheck.log): pnpm exec tsc -p tsconfig.json --noEmit exit 0; repeated after final test refinements exit 0.
- [r15-sqlite-suite-final.green.log](./r15-sqlite-suite-final.green.log): final full suite **130/130 tests, 23/23 files, exit 0**.

An interim strengthened boundary fixture incorrectly restored the disallowed responseBody (30 extra bytes); fixed the test-only fixture to model original allowlisted projection. Production repair unchanged; final exact-boundary tests GREEN.

## Required host-bridge caller fix (other owner)

Both index.ts callers (recordPreExecutionFailure around 20284 and routed provider failure persistence around 27781) call persistence unguarded. Catch **secondary telemetry/graph/SQLite** failures, report a bounded secondary diagnostic, retain and propagate the **original provider error object / class / status**. Mark telemetry persisted only on actual success. Keep independent post-observation handling. Caller-level injected SQLite/graph-error tests should prove original provider 503 cannot become generic HTTP 400. Parent notified before and after focused GREEN; bridge index.ts not edited by this owner.

## Completion boundary

Owned SQLite source repair and regression verification complete. Dev :3458 rebuild/restart, stage hotfix/source-identity verification and bridge caller hardening remain controller/other-owner work; not claimed complete here.
