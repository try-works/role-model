# S168 independent review of the last R23/R32/R39 block

Read-only review; no product edits. Public HEAD `9290f1ef`, private HEAD `7b1c5616`; both clean. Scope is the commits after public `b1193b0c` and private `3fb5d429`, plus the files named in the request.

I ran the private R23/R32 checks directly: **14/14 passed** (`run115-r23-transaction-inventory`, `-schema-inventory`, `-schema-contracts`, `-owner-delegation`, `-schema-set-contract`, `-r32-retention-manager`). The passing tests are part of the problem below: two burndown tests cannot see several real sites.

## Verdicts

| Item | Verdict |
|---|---|
| 1. `shared/sql/transaction.mjs` + conversions | **PASS-with-caveats** - no ordinary-path regression found; two refusal paths change rollback-failure semantics and are untested; the artifact-store nesting proof is source-only |
| 2. `shared/sql/schema.mjs` + 8 conversions | **PASS-with-caveats** - method/return types are correct and dynamic names are validated, but two raw `PRAGMA table_info` sites sit outside the inventory and one allowed raw site still builds SQL from an unvalidated ${table} |
| 3. Burndown inventories/tests | **FAIL** - the regex only catches one literal shape, scans only `extensions/`+`shared/`, and the allowlists are incomplete; tested sites can be missing while both tests pass |
| 4. Private R32 factory/wiring + flake fix | **FAIL on coverage claim** - the factory tests pass, but no test fails if the operations server reverts to `new RetentionManager()`; the flake fix is a timeout bump and the tests are still `E:`-only |
| 5. `compare-release.mjs` after S167 | **PASS-with-caveats/FAIL on "no misleading same"** - readiness/cross-channel/non-2xx improved, but same-port, 200-non-JSON, identity stripping and URL/exe cross-channel cases can still return `same`/0 |

## 1. Transaction helper and conversions

`shared/sql/transaction.mjs:1-15` is a single `BEGIN IMMEDIATE` / work / COMMIT / catch-ROLLBACK-rethrow helper. The conversions I read are structurally equivalent on the normal path:

- durable-queue `endMaintenance` (`shared/capture/durable-queue.mjs:368-376`) replaced an identical hand-rolled block; the refusal (`ended.changes !== 1`) now throws inside the helper, which rolls back and rethrows exactly once.
- queue-admin `inTransaction` (`shared/queues/queue-admin.mjs:137-148`) throws `RefusedAction` for `commit:false`; the helper rolls back, rethrows, and the wrapper returns the refusal value. This is the intended sentinel pattern and 58570ef4 fixed the old "rollback failure masks the refusal" ordering.
- scheduler `#persist` (`extensions/background-evidence-scheduler/index.mjs:790-804`) and crowdsourced `#persist/#persistInsert` are not nested inside another transaction; helper scope is one transaction. `#persistClaim` and other raw sites remain, so the inventory still lists them.
- evaluation-core completion (`extensions/evaluation-core/index.mjs:1384-1407`): `EVALUATION_REFUSED` is thrown only after `completed.changes !== 1`, before the receipt insert; the helper rolls back, outer catch returns `null`. The old code explicitly rolled back and returned `null`; the sentinel preserves the observable result. The 268 A/B logs are consistent.
- artifact-store owner (`extensions/artifact-store/index.mjs:372-387`): depth is checked before the helper; `#transactionDepth += 1` happens before BEGIN and `finally` decrements. The old owner incremented after BEGIN; if BEGIN failed, the old code left depth untouched, while the new code temporarily increments then decrements in `finally` - net state is the same and synchronous code cannot observe the transient. Nested calls still re-use the open transaction (depth > 0 returns `producer()`), matching the old behavior.
- The four remaining artifact-store `BEGIN IMMEDIATE` sites (e.g. `index.mjs:1425`) still do their own depth bookkeeping; they are not part of the owner conversion and are correctly still in the transaction inventory.

**Behavior-changing caveat the tests would not catch.** `withSqlTransaction` swallows a ROLLBACK failure and rethrows the primary error. For a refusal sentinel there is no primary error, so:

- queue-admin: old code's refusal branch executed `database.exec("ROLLBACK")` outside a try; a failing rollback propagated. New code returns the refusal value anyway.
- evaluation-core: old refusal branch rolled back, then returned `null`; a failing rollback fell into the catch which attempted ROLLBACK again and then threw. New code returns `null` while the transaction may still be open.

That is a deliberate "rollback failure must not mask the primary failure" policy, but for refusals it can hide a broken connection and leave an open transaction. No current test uses a database whose ROLLBACK throws. Smallest test: a fake database object whose `exec` throws only on ROLLBACK, passed to `inTransaction` (or the evaluation path); assert the refusal is not returned as success/that the failure is surfaced. The current 14 green tests do not cover it.

The owner test (`tests/track-b/run115-r23-owner-delegation.test.mjs:17-27`) is a source assertion, not a behavior proof. It would catch reverting to raw BEGIN, but it would also pass if the depth bookkeeping were reordered incorrectly as long as the strings remain. A behavioral nested-owner test (outer owner + inner owner, then throw) is the smallest missing test.

## 2. Schema helper and call sites

`shared/sql/schema.mjs:11-29`: `tableColumns` validates `/^[A-Za-z_][A-Za-z0-9_]*$/` and returns a Set; `tableColumnList` delegates and returns an array. All converted uses I inspected match the return type:
- Set users: scheduler (`background-evidence-scheduler/index.mjs:183-198`), crowdsourced (`:413-415`), knowledge-store (`:158-167`), durable-queue (`:72`).
- Array users: artifact-store (`:420,460`), evaluation-core (`:1218-1222,1286,1296,4383`), knowledge-worker (`:1023`).

**Remaining raw sites / unvalidated path:**
- `extensions/evaluation-core/index.mjs:1411-1416` is intentionally allowed in `tests/track-b/r23-schema-inventory.json` because it needs full PRAGMA rows (scoreColumn.notnull). It still interpolates ${table} without the helper's guard. Today the callers are the constants `evaluation_trial_scores` and `evaluation_trial_score_revisions`, so this is not reachable from outside; the allowlist reason is honest but the raw identifier is unvalidated by construction.
- `scripts/track-b/runtime-operations-server.mjs:2896,2898` has two raw `PRAGMA table_info(runtime_endpoints)` / `(runtime_telemetry_records)` sites. The schema inventory test only scans `extensions/` and `shared/` (`run115-r23-schema-inventory.test.mjs:18-22`), so these are invisible and unallowlisted. They are literal table names today, but they are remaining call sites and the claim "no inline PRAGMA outside the helper" is false for the tree.
- The helper's identifier guard is sound for what reaches it; no wrong-method call site was found. The inventory's blind spot is directory scope, not the helper.

## 3. Burndown inventories and tests

These tests can pass while sites are unenforced:

- **Transaction regex** (`run115-r23-transaction-inventory.test.mjs:19,34`): `/exec\("BEGIN IMMEDIATE"\)/g`. It misses single quotes, backticks, multiline calls, `exec(BEGIN_CONSTANT)`, `BEGIN IMMEDIATE;` with trailing SQL, and **plain `BEGIN`**. I found `extensions/knowledge-store/index.mjs:734`: `this.database.exec("BEGIN"); ... COMMIT/ROLLBACK` in the route-ladder listing. It is a real same-connection transaction, not in the 40-site inventory, and the test does not flag it. Scanning all `extensions/`+`shared/` `.mjs` with a broader pattern found **42** BEGIN-style sites versus the 40-entry allowlist (the extra is this one plus the test-only `extensions/trajectory-signals/test/concurrent-writer.test.mjs:41`).
- **Schema scan** (`run115-r23-schema-inventory.test.mjs:18-22`): only `extensions/` and `shared/`; the two operations-server sites above are excluded, and the line test is a case-sensitive substring `"PRAGMA table_info"`, so whitespace/case/concatenation variants slip. The inventory has one entry (evaluation-core) but there are three raw sites in the codebase.
- The transaction inventory has the same directory blind spot: it scans only `extensions/` and `shared/`, while `scripts/track-b/runtime-operations-server.mjs` has three raw `BEGIN IMMEDIATE` sites (`:5925`, `:7282`, `:8063`). Those are production runtime paths, not tests, and are entirely outside the burndown.
- **Allowlists are also comment-blind.** A line in a comment containing `exec("BEGIN IMMEDIATE")` is counted and can be allowlisted; a real site replaced by a comment at the same line still satisfies the stale-entry check. The tests check line presence, not AST/code.
- The transaction allowlist explicitly includes owners (artifact-store depth sites, scheduler/claims) and a note says the list may only shrink. That is honest about its scope, but the prose claim "40 hand-rolled transactions + 1 reasoned table_info site" is not true for the tree: there is at least the unlisted knowledge-store BEGIN and the two uninventoried operations-server table_info sites.

Smallest tests: (a) add one `exec('BEGIN IMMEDIATE')` / `exec("BEGIN")` in a temporary fixture or assert the scanner matches both quote styles/plain BEGIN; (b) add `scripts/track-b` to the scanned roots (or an explicit allowlist with reasons) and make the current two sites fail; (c) a comment-line allowlist test.

## 4. R32 retention factory and wiring

The factory is real: `shared/retention/index.mjs:1498` requires an explicit registry and either `filePath` or `inMemory`; the tests in `tests/track-b/run115-r32-retention-manager.test.mjs` pin missing dependency, isolation, reopen and policy denial (all pass). `scripts/track-b/runtime-operations-server.mjs:5984-5988,6092` uses `createRetentionManager({ registry: STORAGE_REGISTRY, inMemory: true })` in `buildManager` and the per-record age check.

**Coverage claim is false.** I found no test that references `runtime-operations-server.mjs` together with `createRetentionManager`; the only `createRetentionManager` test imports `shared/retention/index.mjs` directly. Reverting both operations-server lines to `new RetentionManager()` would keep every current R32 and integration test green because the ambient manager still uses the same module registry and in-memory behavior. The smallest test is a source assertion in `run115-r32-retention-manager.test.mjs` that the operations-server file contains the factory calls (or, better, export `buildManager`/accept a `createManager` injection and assert the injected constructor is used). Source assertions are weak but honest; an injection seam is the real proof.

**Flake fix:** `tests/track-b/run115-r32-closed-domains.test.mjs:64-70` changes the sandbox timeout from 400 ms to 2000 ms. It reduces the flake window but does not root-cause it; the test still asserts a "hang" child is killed, and a cold runner could exceed 2 s. More importantly, both R32 files create temp roots under `E:` only (`E_ROOT = "E:" + path.sep`, `run115-r32-retention-manager.test.mjs:21`), so they fail on a Linux GitHub runner (no such drive) before testing anything. That is not a flake fix; it is a portability limit. Use `mkdtemp(path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), ...))` like the public tests.

## 5. `compare-release.mjs` after S167

S167 improvements are real:
- cross-channel check exists for two `--*-exe` inputs with `manifest.json` beside each (`:32-40`);
- `--scope-id` was removed from both child spawns (`:76,91`) so a production package can start;
- readiness has a 120 s budget (`:49-57`) and timeout fetch (`:46-48`);
- non-2xx/unreachable rows classify `not-run` and exit 2 (`:113-125`).

**Still misleading `same` paths:**
1. **Same port is not rejected.** `--left-exe --left-port 7000 --right-exe --right-port 7000` (or `--left http://127.0.0.1:7000 --right-exe --right-port 7000`) lets the right child fail to bind; `waitReady(rightBase)` then reaches the left server and returns true. Both URLs address the same process, every non-state endpoint compares equal, and the script exits 0. The only same-artifact check is exact same exe path/URL (`:29`), not same effective port.
2. **200 non-JSON/HTML bodies compare `same`.** `fetchWithTimeout` sends no `accept: application/json`; if both sides return 200 `text/html`, `lj` and `rj` are `undefined`, and `JSON.stringify(undefined) === JSON.stringify(undefined)` for non-state endpoints. A static 404/error page served 200 on both sides is reported as parity. The existing test "both sides answer the same non-2xx" actually uses two dead ports, so it does not cover this.
3. **Identity stripping hides real config.** `IDENTITY` includes `endpoint` and `path` (`:106`), stripped recursively everywhere. `/api/role-model/runtime/summary` carries the selected endpoint; two builds configured to different endpoints compare `same`. `endpoint` is not just an environment identity.
4. **Cross-channel refusal is only exe/exe with manifests.** `--left` URL + `--right-exe` dev package, or an exe whose `manifest.json` is not in the same directory, bypasses the check (`channelOf` returns undefined). The claim "refuses cross-channel comparisons" needs that qualifier.
5. **State roots are fixed defaults** `compare-release-left-state` / `compare-release-state` in `os.tmpdir()` (`:74,82`), never cleaned. A legitimate package can fail to start on a state left by a previous channel/scope; the S167 scope removal makes this more visible. Use `mkdtemp` and remove.
6. **Left readiness failure leaks the right child** (`:110`: kills only `leftChild` then `process.exit(2)`); both children have piped stdout/stderr that are never drained (`:76,84`), and no wait after `child.kill()` in the final `finally`. On a runner this can leave processes/ports and can block a child that logs enough to fill the pipe.
7. **Adjacent R39 risk:** `verify-client-journeys.mjs:83` still forces `--scope-id standalone-runtime-dev`. S167's own compare comment says that forced scope made a production package refuse to start. If CI wires verify against a stage/production candidate, it can fail a legitimate package. Also, the verify health-failure branch calls `process.exit` inside the `try` (`:112`), so its new kill/wait `finally` does not run and the child is left alive on NOT RUN.

Smallest tests: (a) two HTTP servers returning 200 `text/html` for all endpoints -> expect 2/NOT RUN; current returns 0/same. (b) validate `leftPort === rightPort` before spawning -> expect NOT RUN; current can compare one process to itself. (c) a runtime-summary fixture differing only in `endpoint` -> expect `different`; current strips it. (d) `verify-client-journeys` source assertion that it does not contain `--scope-id` (same style as the existing compare test), plus a fake package that refuses the forced scope.

## Claims I believe are wrong

- "40 hand-rolled transactions + 1 reasoned table_info site": there are 42 BEGIN-style occurrences in `extensions/shared` (41 production incl. `knowledge-store:734`, one test) and three raw `PRAGMA table_info` sites in code (evaluation-core allowed + two in `scripts/track-b/runtime-operations-server.mjs` which the schema test does not scan). The inventory tests pass because of scope/regex, not because the tree is clean.
- "R23 burndown enforced by tests": the transaction test only enforces one exact literal shape in two directories; the schema test only enforces one directory pair and one exact substring. Both can pass with unenforced sites.
- "R32 operations wiring is covered": no test references the operations-server factory calls; reverting to `new RetentionManager()` would not fail a test.
- "compare-release no longer reports misleading `same`": S167 fixed dead/unauthorized sides but not same-port, 200-non-JSON, `endpoint` stripping, or URL/exe cross-channel.
- "flake fix": the 2 s timeout is a mitigation; the E:-only temp roots are a deterministic Linux failure, not a flake.

## Smallest test list

1. `tests/track-b/run115-r23-transaction-inventory.test.mjs`: also match single-quoted/backtick/plain `BEGIN`; add `scripts/track-b` or explicitly document its exclusion. Expect the current knowledge-store:734 site to fail.
2. `tests/track-b/run115-r23-schema-inventory.test.mjs`: scan `scripts/track-b` too (or allowlist the two operations-server sites with reasons); make the helper the only raw PRAGMA.
3. `tests/track-b/run115-r32-retention-manager.test.mjs`: source assertion for the operations-server `createRetentionManager` calls, or an injected `createManager` seam; expect a `new RetentionManager()` revert to fail.
4. `scripts/runtime/compare-release.mjs` tests: two 200 `text/html` stubs; same-port left/right; differing `endpoint` in runtime summary; URL/exe cross-channel.
5. `verify-client-journeys.mjs`: source/behaviour test for the forced `scope-id`; kill-before-exit test for the health-timeout path.
6. R32 temp-root portability: replace `E:` with `RUNNER_TEMP/os.tmpdir()` in both files; a Linux run currently fails at `mkdtemp`.

## Method

Read the public/private diffs and current files named above, both inventories and their tests, operations-server wiring, compare-release, verify-client-journeys, and ran the 14 private R23/R32 tests (14/14). I did not edit either tree. No claim here depends on the lead's narration.
