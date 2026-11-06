# S322 — independent review: S321 B6/R27 partial-shutdown owner

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the affected 6 files, tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `4281F499DEF52F2C3B7138130A7E0D44E88A9324D3181A86AFFF4B7F1512EA6A` | 57710 |
| `src/cli.ts` | `075FAE3B6AB1068589234C5E0A3B76127AE3021967F6A13715D72BE11F8FE739` | 592511 |
| `src/index.ts` | `2D1232F624C1E9699FE0CEF5F6BE210DB357E168F36086A29A02F2C1910D5AAB` | 1366312 (unchanged) |
| `test/s321-partial-shutdown.test.ts` | `F8BA8A7D676DAA898B98914ED0B60B358E2EF37B3B43D61CE37DCE0CDEC666FB` | 6113 |

All match. Backups `E:/rm-tmp/s321` include pre-edit and implementation snapshots. Affected 6 files: **30/30 pass**; tsc exit 0.

## Q1 — Ordering contract: PASS for the DAG contract

`runReleaseAll` runs every step in sequence, catches each failure, and throws one `AggregateError` after all steps (`composition-dag:96-108`). `ServerOwner.shutdown` builds stopAccepting -> join -> interrupt -> transport.close -> backend.close (`:1003-1009`); `started.close` delegates to the same `shutdown` (`:994`); repeated shutdown returns the memoized promise (`:998-1001`). The test asserts the exact order and a failing transport close still runs backend close (`test:61-79`). PASS as an ordering contract.

## Q2 — Production identity: PASS (with two production caveats below)

The cli path now defines `closePackagedRuntimeOnce = onceClose(...)` (`cli:5117-5119`), passes it as `closeBackend` to `createCliServerOptions` (`:5241`), and that function forwards `closeBackend` into `composeBackendOwner` (`:4371`); the DAG stores it as the BackendOwner `close` member (`composition-dag:912`) and the Server owner runs it last. The hostScope `packagedRuntime` registration uses the same wrapper (`cli:12155`); grep finds no other hostScope path closing `packagedRuntime` directly. The test's double-close counter is behavioral for `onceClose` and the DAG shutdown (`test:96-120`), and the source-wiring test checks the cli strings (`:122-132`). PASS for identity/onceClose.

## Q3 — Double-close safety: PASS for the wrapper, test is partly simulated

`onceClose` memoizes the promise and never invokes the close twice (`composition-dag:88-94`); the test calls DAG shutdown then the shared wrapper and sees exactly one teardown (`test:96-120`). The test does not exercise the real `hostScope.close` or `Scope` finalizer — it calls the wrapper directly — so it proves the wrapper, not the full hostScope sequencing.

## Q4 — No regression / run: PASS

Affected 6 files **30/30**; tsc exit 0. `cli.ts` diff is confined to the authorized regions: `onceClose` import, `createCliServerOptions`'s closeBackend parameter/forwarding, the hostScope wrapper definition, the startServer call, and the packagedRuntime registration (`:5112-5119,5238-5242,12152-12155`). `index.ts` hash is unchanged.

## Q5 — RED honesty: PASS

`s321-red.log`: 4 failed / 1 passed on the pre-implementation state; `s321-red2.log`: 2 failed / 5 passed on the pre-wiring state. The failures are the expected contract/wiring assertions, not setup errors.

## Q6 — Lint: HOLD for the test file

- DAG `effect:true`: **161**, the same moved-boundary set (159 `require-safety` + 2 `no-unknown-returns`); no shutdown-region finding. PASS.
- cli: 1035 findings, all pre-existing rules; the new wiring lines add no finding in the diff region. PASS.
- **test/s321-partial-shutdown.test.ts: 5 findings** — `require-safety-comment-for-type-assertion` at `:24,25,92,103,104` (the `as never` test double casts). This contradicts the “no new findings” claim; they are not listed or justified. Required: add SAFETY comments/typed test helpers or explicitly justify each.

## Q7 — R27 production partial shutdown: HOLD

The contract is real and ordered, and backend close is wired last, but production does not satisfy the “stops admission then joins/drains/interrupts tasks before dependencies; finalizer failure cannot skip later releases/force early exit” clause in two respects:

1. **The production join has no bound before interrupt.** `bridgeServerTransport.stopAccepting` calls `httpServer.close()` and returns; `join` awaits the close callback (`index:20798-20805`), which Node resolves only after all connections are gone. `interrupt` (`closeAllConnections`) is a later `runReleaseAll` step, so a hung/keep-alive request can keep join pending forever and interrupt never runs. The test's fake join resolves immediately, so this is untested. A partial shutdown needs a bounded join/drain timeout followed by interrupt.
2. **The packaged Scope is no longer closed in normal shutdown.** The old registration closed `packagedScope` (`Scope.close(packagedScope)`), running the acquireRelease finalizer; the new registration calls `closePackagedRuntimeOnce()` instead (`cli:12155`). The runtime is closed once via the wrapper, but the Effect Scope itself is never closed on the normal path, so its finalizer/ownership is bypassed and the scope leaks. Keep `Scope.close(packagedScope)` with a onceClose-backed finalizer (or close the scope and have the finalizer call the same wrapper) and test the real hostScope path.

## VERDICT: HOLD (3 required repairs)

1. **Bound the production join and then interrupt:** add a join/drain timeout (or an interrupt-before-indefinite-join policy) so a hung connection cannot block shutdown forever; test a hung/keep-alive connection.
2. **Restore packagedScope ownership:** close the scope in the normal hostScope path and make its acquireRelease finalizer use the same onceClose close, rather than replacing Scope.close with a direct wrapper call; test the real hostScope close path.
3. **Fix/justify the 5 new test-file lint findings** at `test/s321-partial-shutdown.test.ts:24,25,92,103,104`; the DAG/cli classification itself is unchanged.

No product file was modified; no commit made.

## Final re-review after join/scope fixes — HOLD (2 lint repairs)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `composition-dag.ts` | `DEA2CE1A803AC0C8FEE0A7F6EB0F664433793A68CFDE355AD84F6E902CEEEB3D` | 58703 |
| `cli.ts` | `2D374E8FDF106F640573E323B3A90723937A511CB36284BC0EAA81A547C31C85` | 592920 |
| `index.ts` | `2D1232F624C1E9699FE0CEF5F6BE210DB357E168F36086A29A02F2C1910D5AAB` | 1366312 (unchanged) |
| `test/s321-partial-shutdown.test.ts` | `A72476E10D5BBC79F203B25E932B83F00C59B57BC6C11E83DC29F8569D674356` | 9051 |

- **Bounded join — PASS:** `composeServerOwner` races `transport.join` against a `joinTimeoutMs` default 10s timer (`composition-dag:1019-1030`), clears the timer on settle, and the hung keep-alive test rejects with `ServerJoinTimeoutError` inside an AggregateError at 25 ms while still running interrupt -> transport.close -> backend.close in order (`test:135-167`). The timer cannot starve interrupt.
- **Packaged Scope — PASS:** `closePackagedScopeRef` is assigned to `Scope.close(packagedScope, Exit.void)` before acquisition (`cli:12006-12010`); `closePackagedRuntimeOnce` closes that scope (`:5118-5121`); hostScope uses the same wrapper (`:12161`). The exactly-once Scope test runs the finalizer once across two closes (`test:169-181`); source wiring checks the scope close and absence of `packagedRuntime.close()` (`test:183-189`). No leak/double-close path found.
- **Run:** affected 6 files **33/33 pass**, tsc exit 0; cli diff is confined to the authorized import/create-options/hostScope/registration regions.
- **RED:** s321-red 4/1, red2 2/5, red3 2?; the new tests are behavioral.

### Remaining HOLD

1. **The test file is not lint-clean.** `anti_slop_lint(test/s321-partial-shutdown.test.ts)` reports **8 findings**, not the claimed clean file: `require-safety-comment-for-type-assertion` at `:25,26,93,104,105,140,141` and `no-unknown-parameters` at `:161`. The five original `as never` casts (now lines 25/26/93/104/105) still have no SAFETY comments; the new hung-join test adds two more casts (`:140,141`) and an unknown-typed catch callback (`:161`). Required: add SAFETY comments/typed test helpers and fix the unknown parameter; the claim “test lint clean / SAFETY comments above lines 24,25,92,103,104” is false on these bytes.
2. **DAG lint classification changed.** `anti_slop_lint(composition-dag.ts, effect:true)` is **162**, not 161: the new `no-unknown-parameters` finding at `composition-dag:1027` is the join rejection callback `(error: unknown)` inside the new timer/race code. Required: give that callback a named domain error type/schema or record an explicit reviewed boundary justification; the “classification unchanged / no new findings” claim is false.

**FINAL VERDICT: HOLD (2 lint repairs).** Join boundedness and packaged-Scope ownership are fixed and 33/33 tests pass, but the test file and DAG have undisclosed/new lint findings. No product file was modified; no commit made.

## Final re-review after lint repairs — PASS

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `composition-dag.ts` | `9590F9C673B0EE5A8CBB160CB60C97C3B68849F3E101055886EBB5E99E5AE189` | 58701 |
| `test/s321-partial-shutdown.test.ts` | `B8A90157B5F51F1D196C1846C837E65E0FDFBEACD569C2223D1920A75FD139DA` | 9602 |
| `cli.ts` | `2D374E8FDF106F640573E323B3A90723937A511CB36284BC0EAA81A547C31C85` | 592920 (unchanged) |
| `index.ts` | `2D1232F624C1E9699FE0CEF5F6BE210DB357E168F36086A29A02F2C1910D5AAB` | 1366312 (unchanged) |

- **Test lint clean:** `anti_slop_lint(test/s321-partial-shutdown.test.ts)` returns **0 findings**. The seven casts at the former finding sites now have direct `// SAFETY:` comments (e.g. `:25-28,95-96,107-110`), and the catch callback is typed; no behavior changed.
- **DAG classification restored:** `anti_slop_lint(composition-dag.ts, effect:true)` is **161** (159 `require-safety` moved-boundary + 2 `no-unknown-returns`), with **no finding in the join region 1000-1040**. The join rejection callback is now `(error: Error)` (`:1027`); this is a type annotation only.
- **Behavior unchanged:** the only executable-path change from the prior `DEA2CE1A`/`A72476E1` set is the typed rejection parameter plus SAFETY comments/test typings; join timeout, interrupt ordering, runReleaseAll, and packaged-Scope onceClose logic are untouched. The diff inspection shows no new logic.
- **Run myself:** affected 6 files **33/33 pass**; tsc exit 0; cli.ts and index.ts byte-unchanged from the prior round. The hung keep-alive, exactly-once Scope, and ordering tests remain green.

Residual non-blocking note: the join rejection annotation narrows an actual `unknown` reason to `Error` for the callback; it does not change runtime behavior or the AggregateError contents.

## FINAL VERDICT: PASS

Both lint items are closed on the final bytes: test file clean, DAG back to the 161 moved-boundary classification with no join-region finding, and 33/33 tests + tsc 0 reproduce. No remaining numbered items. No product file was modified; no commit made.

