# S275 — native teammate recheck of the frozen S273 SQL cleanup repair

- Reviewer: native teammate `s9` (read-only), actual model **deepseek-flash** (confirmed by `list_agents` this turn; no CLI/child was used).
- Reviewed at: 2026-10-27T16:04:51+08:00 (Asia/Shanghai), against the Lead's freeze notice.
- Mode: static read-only review of the frozen bytes; no source/test edits, no test/build/tsc/biome runs by me, no children, no commits, no operator/provider/network.
- Scope: cleanup failure order and handles only; no broader redesign.

## Frozen bytes verified (`Get-FileHash`, this turn)

| File | SHA-256 | State |
|---|---|---|
| `role-model-router/packages/sql-sqlite-node/src/service.ts` | `485AC00EC71FEC0134BD3CD094646FA81235E45824FD9211C8CA36413A5E82BF` | equals S270-pinned product hash; mtime 14:54:02 (before S273) |
| `.../test/s268-mixed-owner.test.ts` | `1BB6116FA9A8EA34FA1DD459A523E9545AE4F6768B443ECFE8C81721D31A34D8` | frozen |
| `.../test/support/s273-cleanup.ts` | `A0E7588D0C77CF31E6290B04E5A1A252D8DCBED59A492A2A29339EB93511245E` | frozen |
| `.../test/s273-cleanup.test.ts` | `85805EAE3C5B0A70493B2DFF2C2A6B46E09C6093583496658451511CDC52EC39` | frozen |

All four match the Lead's freeze list exactly.

## Verdict

**PASS (bounded) on the cleanup failure order and handle ownership at the frozen hashes.** No code defect found in the reviewed scope. One **evidence HOLD**, not a code defect: `s273-tsc.log` predates the final `s268-mixed-owner.test.ts` save and must not be cited as current (Finding 4). One non-material note on the injectable reporter (Finding 5) requires no change.

## Findings

### 1. [PASS] Primary failure (ready or inspect) survives cleanup, by identity, including falsey thrown values
- `test/support/s273-cleanup.ts:69-75` captures the primary behind a presence wrapper (`{ error }`), so `undefined`/`null`/`0`/`""`/`false` are still a primary (not "absent").
- `:78-79` awaits release, then commit, unconditionally — both are attempted after a ready or inspect failure.
- `:81-83` reports each cleanup failure, then `:85-87` rethrows `primary.error` by identity.
- `test/s273-cleanup.test.ts:56-91` proves primary identity while release **and** commit both throw, with attempted order `["release","commit"]` and both failures reported; `:178-206` repeats for all five falsey primaries and asserts commit is still attempted.

### 2. [PASS] Cleanup-only failures remain visible and are never swallowed
- No primary: `s273-cleanup.ts:89-92` rethrows the first cleanup failure (falsey included).
- Tests: `s273-cleanup.test.ts:93-121` (release-only), `:123-145` (commit-only), `:208-227` (falsey cleanup-only values).
- No blanket suppression: `disposeAfterTest` (`s273-cleanup.ts:116-134`) throws `AggregateError` with every cleanup error when teardown is the sole failure (`s273-cleanup.test.ts:316-329`), and only suppresses when a real test failure already exists — it still reports the cleanup errors separately (`:301-314`).

### 3. [PASS] Ready/setup failures attempt release/join and release owned handles; no orphan or losing assertion
- Ready failure: `s273-cleanup.ts:71-79` skips inspect and still attempts release+commit; `s273-cleanup.test.ts:147-176` asserts inspected=false and both attempts.
- Failed setup: `s273-cleanup.ts:148-171` closes the acquired service (`closeSync`) before `rmSync`, reports cleanup failures through the injectable reporter, and rethrows the setup error (no swallow, no leaked open handle). Test `s273-cleanup.test.ts:231-261` covers the real disposable DB, asserts `isOpen() === false` and no reported cleanup failures.
- Teardown ownership: `makeCleanupBatch` (`:95-114`) registers close before remove and `splice(0)` prevents double-dispose; `disposeAfterTest` (`:116-134`) reports every step and throws only when cleanup is the sole failure.
- `s268-mixed-owner.test.ts:27-35` wires one module batch and computes `testFailed` in `afterEach`, so teardown cannot replace a real assertion failure; `s268-mixed-owner.test.ts:191-220` interrupts the real fiber and awaits `Fiber.interrupt` before assertions (no suspended fiber left).

### 4. [HOLD — evidence only] `s273-tsc.log` is stale versus the frozen s268 bytes
- Log content: `test/s268-mixed-owner.test.ts(33,22): error TS18048: 'context.task.result' is possibly 'undefined'.`
- Log mtime 15:56:45; `s268-mixed-owner.test.ts` mtime 15:56:55 — the test was saved **after** that tsc run.
- Frozen `s268-mixed-owner.test.ts:33` is `const testFailed = context.task.result?.state === "fail";` (optional chain present), so the logged error describes the pre-final expression, not the frozen bytes.
- Action: if typecheck is a gate, re-run `tsc` against hash `1BB6116F…` and replace this log; do not cite the stale log as current evidence. No code change indicated.

### 5. [NOTE — not material at frozen bytes] A throwing reporter can replace the primary
- `finishSuspended` reports at `s273-cleanup.ts:81-83` **before** rethrowing the primary at `:85-87`; if the injected reporter throws, that error replaces the primary and aborts reporting the remaining failures (both cleanup **attempts** already happened at `:78-79`, so joining is not lost).
- `disposeAfterTest` reports at `:121-124` before the `AggregateError` rethrow at `:130`; a throwing reporter can also mask a real test failure when `testFailed` is true.
- `makeTempDatabase` reports at `:166-169` before rethrowing the setup error at `:170`; same masking shape.
- Materiality: the shipped reporter is `console.error` (`:48-50`), every s268 call site uses it `s268-mixed-owner.test.ts:34`, and every test injects a non-throwing collector. No production path uses this test helper and no caller supplies a throwing reporter, so this is not a defect of the frozen contract. If totality is wanted later, the minimal change is a `try/catch` around each `report(...)` at the three report sites; **not applied** — frozen bytes untouched.

### 6. [PASS] Unchanged product mixed-owner guard
- `src/service.ts` hash equals the S270-pinned `485AC…` and its mtime (14:54:02) precedes S273; only test files changed in this slice. S270's executed PASS (7/7 new, 28/28 combined) therefore applies to this product hash; this recheck does **not** re-run or re-claim product behaviour.

## Evidence available on the frozen bytes

- `s273-green.log` 15:57:24 (run started 15:57:07, after the final file saves: s268 15:56:55, cleanup test 15:50:15, helper 15:49:17): **4 files / 39 tests passed** — `s273-cleanup` 11, `sqlite-service` 11, `s268-mixed-owner` 7, `s18a-sql-truth` 10; exit 0.
- `s273-hashes.log` 15:57:51 lists exactly the frozen four hashes (service + 3 test files).
- `s273-biome.log` 15:57:42: "Checked 3 files in 58ms. No fixes applied."
- RED ordering: `s273-red-initial.log` 15:46:32 (module import failed — no tests), `s273-red.log` 15:47:07 (10 failed / 1 passed); both precede the final helper/test saves and the 15:57:07 green.
- This review's `anti_slop_lint` on the three frozen test files: 0 findings each.

## Limits

- Static, read-only review: I ran no vitest, tsc, biome, full suite, provider/operator, packaged/SEA, live or child process, and made no CLI launches; I did not edit source, tests or evidence other than this file.
- Handle freeing and timing are verified only by the frozen tests' assertions and the Lead's recorded 39-test green; I did not observe processes/handles myself.
- The throwing-reporter assessment is by inspection; no test exercises a throwing reporter.
- Unrelated monoliths were not read; `service.ts` was hashed and mtime-checked only.
- No claim about S273 tests beyond the frozen hashes above; evidence for earlier bytes is explicitly treated as superseded.

---

# Addendum — final bounded verdict for acceptance (Lead evidence integrated)

Time: 2026-10-27T16:15+08:00. Frozen hashes re-verified unchanged this turn (all four equal the table above). No product or test edits were made by this reviewer.

## Lead-reported evidence accepted for this verdict

- 4 files / 39 tests PASS, exit 0, on the frozen hashes.
- Build / declarations PASS, and compiled-SQL owner smoke PASS, on the frozen bytes.
- `anti_slop_lint`: `s268-mixed-owner.test.ts` clean, `s273-cleanup.test.ts` clean, helper has only the opt-in `no-service-constructor-imports` finding.
- Product's five legacy findings remain (S270 scope; not S273).

## Opt-in helper finding — independently re-checked, justified

With `anti_slop_lint({ effect: true })` this turn: **exactly one finding**, `test/support/s273-cleanup.ts:5`, rule `no-service-constructor-imports`, message "Do not import Effect service constructor \"makeSync\" into runtime code…". Without the opt-in Effect rules the helper is clean (0 findings), as are both frozen test files both ways.

The line is `import { type SqliteService, makeSync } from "../../src/service";` — **test support** that deliberately creates a real disposable SQLite database per test (the suite's behavioural substrate). The rule targets runtime service-constructor imports; no product/runtime module imports this test-support file, and no service is constructed in shipped code through it. Review-scoped justification stands; no suppression needed and no code change indicated.

## Evidence correction (only open item, not a code defect)

- `evidence/other/s273-sql-cleanup-repair.md:66-68` claims the targeted strict tsc run exited 0, but `evidence/logs/s273-tsc.log` (mtime 15:56:45, before the final s268 save at 15:56:55) contains `test/s268-mixed-owner.test.ts(33,22): error TS18048: 'context.task.result' is possibly 'undefined'.` The frozen line 33 is `context.task.result?.state === "fail"` (optional chain), so that log describes pre-final bytes.
- The Lead's build/declarations PASS on the frozen bytes supersedes the typecheck question for acceptance, **provided it is cited with its artifact path + hash against `1BB6116F…`**. Otherwise the report line should be corrected and a current tsc log pinned. No source change is warranted.

## Final bounded verdict

**PASS (bounded) for acceptance on the frozen hashes** \
service `485AC00EC71FEC0134BD3CD094646FA81235E45824FD9211C8CA36413A5E82BF`; s268 test `1BB6116FA9A8EA34FA1DD459A523E9545AE4F6768B443ECFE8C81721D31A34D8`; helper `A0E7588D0C77CF31E6290B04E5A1A252D8DCBED59A492A2A29339EB93511245E`; cleanup test `85805EAE3C5B0A70493B2DFF2C2A6B46E09C6093583496658451511CDC52EC39`.

Cleanup failure order, both-attempts-after-failure, primary identity (including falsey), cleanup-only visibility, setup/ready handle release and teardown non-masking all hold as reviewed above. The reporter-throwing note remains non-material. Acceptance condition: cite the frozen-hash build/declarations PASS (or re-pin a current tsc log) — evidence only.

---

# Closure — Lead acceptance (2026-10-27T16:20:40+08:00)

Lead accepted S275 as final bounded and confirmed a **strict tsc run on the current frozen test files exits 0**, with the log at `E:/rm-tmp/s273-lead-tsc.log` (verified by this reviewer: file exists, **0 bytes** — no diagnostics emitted, consistent with exit 0), and will record the output/current hashes in the Lead receipt. `s273-tsc.log` (the failed, pre-final-save log) is retained as historical and is not current evidence.

**S275 evidence item closed.** Verdict remains **PASS (bounded)** at the frozen hashes listed above; no further SQL review was requested or performed. No product or test bytes were touched by this reviewer.

