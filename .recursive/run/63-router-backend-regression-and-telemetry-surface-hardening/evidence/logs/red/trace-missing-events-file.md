# RED Evidence — Trace package initial test failure

## Workstream C: trace/usage package tests

### Test: "reads back an empty events file after writing only spans"

**State:** RED (failing)
**Date:** 2026-07-11

**Expected:** `readTraceArtifacts` should return empty events array when no events were written.
**Actual:** `readTraceArtifacts` throws `ENOENT: no such file or directory` because `writeTraceArtifacts` does not create `trace-events.jsonl` when the events array is empty.

**Error output:**
```
FAIL test/index.test.ts > trace artifact persistence > reads back an empty events file after writing only spans
Error: ENOENT: no such file or directory, open '...\trace-events.jsonl'
 ❯ readTraceArtifacts src/index.ts:36:19
```

**Fix applied:** Modified `readTraceArtifacts` in `trace/src/index.ts` to catch the missing file error and treat it as an empty events array.

**GREEN result:** All 8 trace tests pass after fix. See `evidence/logs/green/trace-test-green.log`.
