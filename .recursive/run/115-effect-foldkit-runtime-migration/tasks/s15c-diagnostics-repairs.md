# S15c repair the diagnostics read from the independent review (public, R21 server half)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review placed a HOLD with three reproducible defects. Fix them; do not weaken the tests that found them.

## Defect A - the byte cap does not bound the real response
Probe: `readLocalDiagnostics({ nowMs, query: { cursor }, source })` with 512-character CJK `instanceId` and `buildId` and 14 records of 1000-character codes returned 18,119 bytes against a stated 16 KiB cap. The identity is not counted against the record budget, and the code slices by UTF-16 code units rather than bytes. The existing test used `JSON.stringify(body).length` on ASCII data, which is why it passed.
Fix: measure the WHOLE serialized body (identity + envelope + records) in BYTES against the cap, shrinking records until it fits, and add a test that builds the exact failing input above and asserts the serialized byte length is within the cap while the response is still valid.

## Defect B - disabled is not unconditionally a state
Probe: no source plus `cursor: "zzz"` returns 400 `diagnostics_cursor_invalid`, because cursor and limit are validated before the disabled branch.
Fix: disabled must be answered before any query validation, so a disabled runtime never returns an error for any query. Add the exact failing input as a test, and keep the 400 for a genuinely invalid cursor when a source exists.

## Defect C - ordering assumption produces a false stale state
Probe: records supplied oldest-first without `lastRecordAtMs` yield state `stale` with `ageMs: 400000` while the newest record is 1 second old, because the fallback takes `all[0]`.
Fix: use the newest record by `atMs` (max), not the first, unless `lastRecordAtMs` is supplied. Add the oldest-first probe as a test.

## Defect D - dropped is masked by stale, and no ordering contract is documented
Fix: report loss explicitly alongside staleness (for example a `loss` object plus an explicit `dropped` flag or state precedence documented in the module), so a caller can tell `stale` from `stale + loss`; and document the ordering contract of `LocalDiagnosticsSource` in the type's doc comment.

## Defect E - the reader has no production writer
`readDiagnosticsSource` is set nowhere outside tests, so outside tests the endpoint always answers `disabled`. Either wire a real source or, if wiring is R20's boundary, record it explicitly in the module doc and in `evidence/other/s15a-tdd.json` as a deferred wire with the reason. Do not leave it silent.

## Also fix (minor, from the review)
- A cursor past the end currently returns `state: ok` with zero records; it should be `empty`.
- The route's 401 comes from the generic unauthorized writer and lacks the diagnostics no-store/nosniff headers; make the diagnostics path's 401 carry them, or state why it cannot.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts`
- the handler/route region of `src/index.ts` that this concerns
- `role-model-router/apps/runtime-host-bridge/test/run115-s15a-local-diagnostics-read.test.ts` (extend)
- `evidence/logs/s15c-*` and `evidence/other/s15c-tdd.json`

Nothing else.

## Rules
- One RED per defect using the reviewer's exact failing input, then GREEN.
- No installs, no commits, no subagents, no servers.
Report: each defect with its failing-input test and RED message, GREEN counts, tsc exit, and anything you judge to be a design limit rather than a bug.