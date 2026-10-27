# S311 — independent review: S310b B6/R27 Backend owner extraction

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran tsc, the affected seven test files, and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `00FA383F49E4100B832D9256F18544C02AA1611F7FF0E52988352C0238DF59C6` | 45649 |
| `src/cli.ts` | `936B1C55A3B2B24857F81B79D128E3EF7BF75E24DBACFF3E6B435E43001CD41F` | 591815 |
| `src/index.ts` | `C27188C296E5C852B60009EFE36E93B6DF918109390C0A40E4B3CCE526DA7761` | 1360711 |
| `test/s310b-backend-owner.test.ts` | `95BDB7AA5A376855E4B822BAADB7E26D384EEFCB14649C56B0533D56DF427F48` | 2849 |

All match. `git diff`: cli.ts 687 changed lines (383 insertions / 572 deletions across the two files), composition-dag +268; `index.ts` unchanged (hash matches HEAD). Backups `E:/rm-tmp/s310b/cli.ts.bak` and `composition-dag.ts.bak` are byte-identical to HEAD (ADB051F2…/54E78CDD…), so rollback safety is real.

## Q1 — Fidelity ledger: HOLD (two fields dropped)

I compared the old cli options literal (backup lines 4348-4939) with the new DAG options (composition-dag 590-763) plus the 7 overrides. Old has **181** top-level option names; new has **179** (157 bind + 7 overrides + base/lifecycle). The two missing names are:

1. **`getRoutableInventory`** — old `cli.ts.bak:4938`: `getRoutableInventory: () => resolveBackend()?.getEffectiveRoutableInventory() ?? null`. The new DAG defines `getEffectiveRoutableInventory` only in the `BackendLike` type (`composition-dag:520`) and never constructs the option field; **no override supplies it** (the 7 overrides list does not). The live server consumes `options.getRoutableInventory?.() ?? null` at `index.ts:18292,19193`, so those reads now silently become `null` instead of the backend inventory. This is a behavior change, not a moved binding.
2. **`anonymousLearningReads`** — old `cli.ts.bak:4584-4585` conditionally included it; the new cli still accepts it (`cli.ts:4311`) and still passes `...(anonymousLearningReads ? …)` into `createCliServerOptions` (`:5191`), but `BackendOwnerInput` has no such field and `composeBackendOwner` never emits it. The server reads `options.anonymousLearningReads` at `index.ts:17576`; the flag is now ignored. This is a second dropped field.

The backup ledger (`meta.json`) says `allFields:175, pairs:157, overrides:7, unaccounted:[]`; that ledger missed these two. The 157 bind names and 7 overrides themselves match (`pairs.json` all 157 name pairs, no duplicate/missing against the DAG bind set).

**Required:** add these two fields (the getRoutableInventory fallback and the conditional anonymousLearningReads input) to `BackendOwnerInput`/composeBackendOwner or explicitly move them to a documented override; correct the ledger; add assertions so the affected tests would fail if either is dropped again.

## Q2 — Ordering/lifecycle: PASS (static)

`startServer` remains `startBridgeServer(createCliServerOptions(...))` (`cli.ts:5182-5231`); `index.ts` is byte-unchanged, so listener/createServer/trace/listen/server.close-only and readiness ordering are not reordered by this slice. The thin CLI function only constructs options and returns `owner.options`; start/close are still owned by the existing server/Scope path (`cli.ts:5239-5258`). `readStartupReadiness` still projects `readBootstrapState` through the same `projectCliStartupReadiness` function. PASS statically; no end-to-end start/close claim beyond the affected tests.

## Q3 — Identity/no-fallback: PASS

`createCliServerOptions` calls `composeBackendOwner`, then `assertComposedBackendOwner(owner)`, then `onBackendOwner?.(owner)`, and returns `owner.options` (`cli.ts:4351-4482`). The test captures the owner via the callback, asserts `options === captured.options`, asserts `isComposedBackendOwner(captured)`, and asserts a plain `{host,port}` fails `assertComposedBackendOwner` (`test:41-59`). These are real assertions, not tautologies: the callback is the only way the test receives the owner, and the legacy object is a distinct construction. The brand is a `Symbol.for` marker (forgeable in principle, but this is an internal construction check, not a security boundary).

## Q4 — withPermit: HOLD (provider path bypass)

The DAG wraps `executeChatCompletions` and `executeResponses` with `OWNER_PERMITS.withPermit` (`composition-dag:546-558,767-772`), defaults 4 permits/16 waiters (`DEFAULT_COMPOSITION_CONFIG`); the test fires 6 concurrent chat calls and sees maxActive ≤4, proving the wrapped options path. `ProviderPermits.withPermit` uses `acquireUseRelease` and releases on success/failure/interruption (`composition-dag:336-381`); the release logic is sound, though the test only covers the success path and only `executeChatCompletions` (not `executeResponses`).

**Bypass:** the CLI still calls the raw backend directly in a real provider path: `createRouterPairwiseJudge({ executeChatCompletions: input.backend.executeChatCompletions.bind(input.backend), ... })` (`cli.ts:10317-10319`). That call never goes through `owner.options.executeChatCompletions` and therefore bypasses the DAG permit. Other direct backend uses exist in validation utilities (`validate-*.ts`), but the pairwise-judge is inside the host's replay/completion path. The claim “no other provider path bypasses it” is therefore not established.

**Required:** route this (and any other live provider path) through the DAG-wrapped functions, or explicitly scope/justify the bypass and add a test that a permit-bound execution is used where permits are required. Add an `executeResponses` and a failure-path permit-release test.

## Q5 — tsc / affected tests: PASS (reported, not whole monolith)

- `corepack pnpm exec tsc -p apps/runtime-host-bridge/tsconfig.json --noEmit` → **exit 0**.
- Affected 7 files: `cli-composition-scope` (7), `cli-startup-readiness` (3), `s128-scope-owned-server` (3), `s6b-cli-sqlite-service-migration` (7), `s310b-backend-owner` (2), `s21a-composition-dag` (6), `s21c-bootstrap-owner-wiring` (2) → **30/30 pass**; s21a 6/6 and s21c 2/2 included.
- Whole-monolith suite stability remains unclaimed (documented in the task evidence).

## Q6 — Lint: HOLD (new findings not justified)

- New test: **2 findings** — `no-known-value-widening` at `:32`, `require-safety-comment-for-type-assertion` at `:61`. The task/evidence only says “disclosed”; it does not explicitly justify either at the required policy level. Line 61 is an `as never` assertion without a SAFETY comment; line 32 widens the return type. These are cheap to fix (remove the explicit object return type; add SAFETY comments on the test doubles) or must be justified explicitly.
- DAG with `effect:true`: **176 findings**. HEAD `composition-dag.ts` (git backup) is **lint-clean**; HEAD cli has 1196. Most of the DAG's 157 `require-safety-comment` findings at 605-762 are moved bind casts from the old cli, but the new helper/identity/wrapper code contributes **new** findings not covered by “pre-existing/moved”: `no-unknown-returns` at 519/520/523, `no-unknown-parameters` at 536/539, `no-runtime-typeof`/`no-unsafe-dictionary-type` at 537, `no-unknown-returns` at 552-574, and `no-chained-type-assertions`/`no-known-value-widening` at 767. The task evidence does not enumerate or justify these; “disclosed” is not the policy’s fix-or-justify.
  **Required:** separate the moved casts from the new helper/wrapper findings, fix the fixable ones (SAFETY comments, remove widening, avoid the mutable double-cast via a typed local builder), and explicitly justify any remaining moved boundary in the task doc.

## Q7 — Backups: PASS

`E:/rm-tmp/s310b` contains `cli.ts.bak` (ADB051F2…, identical to HEAD), `composition-dag.ts.bak` (54E78CDD…, identical to HEAD), `index.ts.bak` (same C27188C2… hash as the unchanged current file), plus the pairs/generated/overrides ledger. Rollback material is present and pre-edit.

## VERDICT: HOLD (4 required repairs)

1. **Restore the two dropped fields**: `getRoutableInventory` (fallback to `resolveBackend()?.getEffectiveRoutableInventory() ?? null`) and conditional `anonymousLearningReads`; thread both through BackendOwnerInput/composeBackendOwner (or a documented override), correct the ledger, and add options-identity tests that would catch a future drop.
2. **Close the provider-permit bypass**: the pairwise-judge path uses raw `input.backend.executeChatCompletions` (`cli.ts:10317-10319`); route it through the DAG-wrapped function or explicitly scope/justify it, and add a negative test. Add `executeResponses` and failure-release coverage.
3. **Fix/justify the test lint findings** at `:32` and `:61` (policy requires fix or explicit justification, not just disclosure).
4. **Separate and justify DAG lint findings**: HEAD DAG is clean; the 157 moved bind casts plus new helper/identity/wrapper findings must be classified, fixable new findings fixed (SAFETY comments, no widened mutable cast), and remaining moved boundaries explicitly justified in the task doc.

No product file was modified; no commit made.

## Re-review (S311 final) — HOLD (1 remaining)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `composition-dag.ts` | `5D41E27C05A8D2A4E71D4581BB58D97DCEEE0014D763B734ABEA3BE31267E856` | 47097 |
| `cli.ts` | `3C6396FEECA75F57F4D6E644BF6530B13956F5F02E7EAA51755AA5C01E297F6E` | 591875 |
| `index.ts` | `ED1BC8757E39BFBEB0A836325D5DE5EB9EE3465E93A9F94C5E80C2E71661E960` | 1360769 |
| `s310b-backend-owner.test.ts` | `B6FEA11357BB1782C08B2C0B8B98CB022D3F11739C855A48AE538C07EFD95849` | 5752 |

### Closed in this round

- **Fidelity — CLOSED.** The field ledger reconciles **181 old names = 181 new names** with `missing:[]/extra:[]`; I independently extracted the same 181 names from `cli.ts.bak` (lines 4348-4939) and compared them to the ledger — no difference. `getRoutableInventory` (`composition-dag:625`) and conditional `anonymousLearningReads` (`:584,614-615`) are present; the test asserts the 181-key count, both fields, and the conditional key absence when omitted (`test:99-118`). PASS.
- **Test/permit coverage — CLOSED at the intended scope.** `withBackendProviderPermits` wraps both provider methods once at `index.ts:30284`; `composeBackendOwner` no longer wraps options again (it binds the already-wrapped backend), so there is no double-permit. The tests cover chat ≤4, responses ≤4, rejection release and the raw-handle path; `executeResponses` and failure branch are behavioral. Affected 7 files: **32/32**; tsc exit 0. PASS for the permit bound, with one accessor caveat below.
- **Lint — CLOSED/justified.** DAG `effect:true` = **161** findings, exactly the claimed classification: 159 `require-safety-comment` (157 moved bind casts + 2 boundary casts) and 2 `no-unknown-returns` boundary callbacks. The task doc explicitly classifies/justifies these as moved-boundary/boundary, and the new helper/identity/wrapper findings are gone. Test: one residual `no-known-value-widening` at `:54`, explicitly justified in the task doc as the `satisfies FakeBackend` typed-boundary artifact. PASS under the policy's fix-or-justify rule.
- **Backups** still match pre-edit HEAD; index diff is only the import + wrapper call (`+3/-2`); ordering/start/close/readiness unchanged; identity/no-fallback test real.

### Remaining HOLD

- **`withBackendProviderPermits` destroys accessors on the wrapped backend.** It returns `{ ...backend, executeChatCompletions: ..., executeResponses: ... }` (`composition-dag:553-562`). The production backend is an object literal with **getters** — `get registry()` and `get effectiveRegistry()` (`index.ts:30286-30290`) — and `getRouterEffectiveRegistry()` depends on `currentUnifiedRuntimeConfig?.executionMode` (`index.ts:22328-22331`). Object spread evaluates those getters **once** and stores static data properties. Any later execution-mode/config change then leaves the wrapped backend's `effectiveRegistry` stale; the wrapper therefore no longer exposes the live backend it claims to preserve. The test double has plain data properties, so it cannot catch this.
  **Required:** preserve property descriptors/getters — e.g. `Object.create(Object.getPrototypeOf(backend), Object.getOwnPropertyDescriptors(backend))` and override only the two provider methods with `Object.defineProperty` (or a Proxy whose get trap forwards and binds), not a spread — and add a test with a getter that changes after wrapping, asserting the wrapped value follows. This is a behavior-preservation requirement for the raw backend handle, independent of the permit logic.

**FINAL VERDICT: HOLD (1 item).** All prior fidelity/permit/lint items are closed; the accessor-preservation bug in the new wrapper remains. No product file was modified; no commit made.

## Final getter-preservation verification after hash correction — PASS

Corrected final hashes verified against the working tree:

| File | sha256 | bytes |
| --- | --- | --- |
| `composition-dag.ts` | `BD2BEE015D1B702758EBD719F7563EB3839EB1BC20A410096CBF655C5B4C9E63` | 47671 |
| `test/s310b-backend-owner.test.ts` | `58EE6AD1BC5C726E624C8ACDEB8B2C11865AB8AC713C6F645B3D95DD38FD1078` | 7168 |
| `cli.ts` | `3C6396FEECA75F57F4D6E644BF6530B13956F5F02E7EAA51755AA5C01E297F6E` | 591875 (unchanged) |
| `index.ts` | `ED1BC8757E39BFBEB0A836325D5DE5EB9EE3465E93A9F94C5E80C2E71661E960` | 1360769 (unchanged) |

The `D75508BE…/47556` and `DE9AC1E5…/7159` values from the first final message are superseded by this lint-only tidy; I verified the actual final bytes above.

- **Getter liveness is genuine:** `withBackendProviderPermits` now does `Object.create(backend)` and `Object.defineProperty` for only `executeChatCompletions`/`executeResponses` (`composition-dag:552-577`). No spread, no cached registry property. The new test (`test:120-147`) has a live `get effectiveRegistry()`, asserts 0 endpoints in `local`, flips `executionMode` to `remote`, and asserts the wrapped value now has 1 endpoint (`remote-1`). This is a real accessor-liveness test, and the two provider methods remain own permit-wrapped data properties (`enumerable:true`, `writable:false`).
- **Tidy is behavior-neutral:** cli.ts and index.ts are byte-unchanged from the reviewed round; the only changed files are composition-dag/test, the changed code is the getter-preserving wrapper plus lint-only cleanup, and I reproduced **tsc exit 0** and affected 7 files **33/33**. The existing getter test and all prior identity/permit/ledger tests remain green.
- **Ledger/lint intact:** the 181-name field ledger is unchanged (157 generated + 13 base + 4 conditional + 7 overrides, missing/extra empty; options length test 181). DAG `effect:true` remains **161 = 157 moved + 2 boundary casts + 2 unknown-returns**, with the task doc’s explicit moved-boundary justification; test has only the explicitly justified line-54 `no-known-value-widening`. No new finding from the getter fix.
- **Backups/ordering/identity:** backups remain pre-edit HEAD; index diff is still only the wrapper import/call; start/close/readiness ordering and identity/no-fallback behavior are unchanged.

Residual (non-blocking): `Object.create(backend)` preserves live property access but the wrapper’s own enumerable keys are only the two provider methods; consumed by property access in the host, not enumeration. If a future consumer spreads/keys the raw backend handle, it should use the prototype-aware view or a Proxy. This does not violate the requested getter-liveness contract.

## FINAL VERDICT: PASS

The accessor-preservation item is closed on the corrected final bytes: no spread/caching, live getters follow execution-mode changes, provider methods remain permit-wrapped, ledger and lint classification are intact, and tsc/affected tests pass 0/33-33. No remaining numbered items. No product file was modified; no commit made.

