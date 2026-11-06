# S314 — independent review: S313 B6/R27 Server owner (facade semantics)

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran tsc, the affected eight files and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `42B099EF4A509FAE40DD12897F721A61582359493E2F2F1E61654C56AA0336DE` | 51054 |
| `src/index.ts` | `BC0DA0CCB1590184D2025985FB6E94E0B83DC9AAC1A4AFC90248C7AFD39302C9` | 1362812 |
| `src/cli.ts` | `3C6396FEECA75F57F4D6E644BF6530B13956F5F02E7EAA51755AA5C01E297F6E` | 591875 (byte-unchanged) |
| `test/s313-server-owner.test.ts` | `24E4BD7A1DB0945C3F54D33EFA1ABE6FDCDC61551A71B143166F34FC919C8208` | 3606 |

All match. Backups `E:/rm-tmp/s313/{composition-dag,index,cli}.ts.bak` exist; cli is byte-identical to HEAD, index diff is S313 only.

## Q1 — Single construction path: PASS

`startBridgeServer` contains **no local listen/createServer construction**; it composes `composeServerOwner` and calls `owner.start()` (`index.ts:20816-20830`). The only `listen`/`createServer` sites in index are the transport bundle (`:20458,20749,20791`), not a second facade path. The DAG's `start()` is listener -> createServer -> listen and its returned close delegates to `transport.close(server)` (`composition-dag:857-867`). `startBridgeServer` has 94 textual references (85 call sites plus definition/imports) and all take options/facade, so callers and the 4 validate scripts flow through the owner; cli.ts is unchanged.

## Q2 — Identity/no-fallback: PASS for the Server owner (with a backend caveat in Q4)

`composeServerOwner` brands the frozen owner (`composition-dag:853-856`); `isComposedServerOwner` checks the own brand, and `assertComposedServerOwner({id:"legacy"})` throws (`the test:74`). The facade test captures the owner through `onServerOwner`, asserts `capturedOwner === server.serverOwner`, and drives listener/server/listen/close through the owner's transport (`test:77-95`). These are real, not tautological: the legacy object is distinct and the serving handle is the captured owner.

## Q3 — Ordering/close/readiness: PASS

Diffing the old local `startBridgeServer` (`E:/rm-tmp/s313/index.ts.bak:20730-20790`) with the new transport confirms the same sequence: `createBridgeRequestListener` -> `createServer` with the same trace wrapper (request-start/finish/close) -> `listen`; close is `server.close` only via `transport.close` (`index.ts:20740-20801`, `composition-dag:857-867`). Readiness readback remains `options.readStartupReadiness?.()` at the existing route; no reordering was introduced.

## Q4 — Backend/Server composition: HOLD

**The Server owner does not consume the composed Backend owner in production.** `composeServerOwner` calls `assertComposedBackendOwner(input.backend)` (`composition-dag:850`), but the facade chooses `lifecycle?.backend ?? facadeBackendOwner(options)` (`index.ts:20820`). `facadeBackendOwner` (also exported, `composition-dag:873-877`) constructs a **fresh** `{ id: "backend-owner:facade", options }` and adds the Backend brand directly, so `assertComposedBackendOwner` accepts an object made from arbitrary plain options. The CLI calls `startBridgeServer(createCliServerOptions(...))` with **no `lifecycle.backend`** (`cli.ts:5183-5231`), and the 85 unchanged callers likewise pass plain options. Thus in production `server.serverOwner.backend` is the facade object, not the s310b Backend owner; the Backend brand/no-fallback boundary is bypassed. The test uses `facadeBackendOwner({host,port})` itself and never compares `serverOwner.backend` to an actual composed owner.

**Required:** thread the real `BackendOwner` from `createCliServerOptions`/callers into `startBridgeServer` (e.g. lifecycle.owner or an owner-returning API), or make the facade construct/accept the actual DAG owner rather than rebranding plain options. Remove/restrict `facadeBackendOwner` to an explicit test seam, and add an identity test asserting `serverOwner.backend === composedBackendOwner` and that a legacy backend construction is refused. The s310b fields/ledger and provider wrapper themselves remain intact (s310b tests are green in the affected 35).

## Q5 — tsc + affected tests: PASS

- `corepack pnpm exec tsc -p apps/runtime-host-bridge/tsconfig.json --noEmit` → **exit 0**.
- 8 files: cli-composition-scope (7), cli-startup-readiness (3), s128-scope-owned-server (3), s6b-cli-sqlite-service-migration (7), s310b-backend-owner (4), s313-server-owner (2), s21a-composition-dag (6), s21c-bootstrap-owner-wiring (2) → **35/35 pass**. cli.ts byte-unchanged.

## Q6 — Lint: PASS

`anti_slop_lint(composition-dag.ts, effect:true)` = **161 findings**, same classification: 159 `require-safety-comment-for-type-assertion` (157 moved bind casts + 2 boundary casts) and 2 `no-unknown-returns` boundary callbacks. The new Server region (lines 800-890) adds **no findings**. `anti_slop_lint(test/s313-server-owner.test.ts)` = **clean**.

## Q7 — Scope honesty: HOLD implications

The lifecycle ordering/close ownership is genuinely in the DAG (not a cosmetic rename), and the opaque `ServerHandle` plus injected handler factory are reasonable facade seams; the transport keeps HTTP construction in index. But because the Server owner's `backend` is a brand-only facade over plain options, the Server clause has **not** honestly advanced to consuming the composed Backend owner; it advances lifecycle sequencing while preserving a legacy-style backend construction path. The owner table's “Server MOVED” is therefore only partial: Server lifecycle MOVED; Backend ownership inside it is still facade-only. Early readiness/partial shutdown/cache identity remain named gaps, and no whole-monolith/start-close end-to-end claim is made.

## VERDICT: HOLD (1 required repair)

1. **Preserve Backend-owner identity through the Server owner.** Replace the production `facadeBackendOwner(options)` fallback in `startBridgeServer` with the actual DAG `BackendOwner` (thread it from `createCliServerOptions`/callers or accept an owner API), restrict any facade brand to an explicit test seam, and add a test asserting `serverOwner.backend === composedBackendOwner` plus legacy-backend refusal. Without this, `assertComposedBackendOwner` is defeated by a local brand and the “Server owner consumes the composed Backend owner” claim is false.

No product file was modified; no commit made.

## Final re-review after backend-owner threading — HOLD (1 remaining)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `composition-dag.ts` | `AD1780F13111115A94AADD4CEE7D9035A00E3B3256D470E4D7875D34FA02C25A` | 51786 |
| `cli.ts` | `C6AFCD7354C2E5869D03B5D794974434B2B3308D49B29E8F0C1267EC0751F60A` | 592126 |
| `index.ts` | `4A168BAA8867C79597CD3DA9F0C9FB8F40458E97C0230CE02CD7FAD53B02F1D2` | 1363078 |
| `test/s313-server-owner.test.ts` | `E059AF71392943E8F79D4D2785223203431FADF5FEBF93D03C6872896BC66A09` | 5883 |

- **CLI path fixed:** the 14-line cli diff is confined to the authorized `startServer` region (`:5183-5232`): it captures the composed owner through the `onBackendOwner` callback and passes `{ backend: backendOwner }` to `startBridgeServer`. The real identity test composes `composeBackendOwner`, passes only `composed.options`, and asserts `serverOwner.backend === composed` (`test:97-113`); the injected legacy backend is refused behaviorally (`test:115-133`). PASS for the CLI and for the symbol-ref path.
- **Symbol/ledger:** `composeBackendOwner` attaches the owner with a non-enumerable `Symbol.for` ref (`composition-dag:807-810`); `composedBackendOwnerOf(plain)` is undefined; the 181-key ledger is unaffected (s310b test green). PASS.
- **Scope checks:** tsc exit 0; affected 8 files **37/37**; DAG lint **161** with no new Server-region finding; test file **clean**; ordering/close/readiness unchanged. PASS.

### Remaining HOLD

- **The test seam is still reachable from a production path.** `startBridgeServer` still falls back to `testSeamBackendOwner(options)` whenever it receives bare options (`index.ts:20823`). The CLI now passes the real owner, but `scripts/prod-launcher.ts:63` — the packaged production launcher — calls `startBridgeServer({...})` with plain options and no `lifecycle.backend`, so it takes exactly that fallback and builds a brand-only fake Backend owner. The 85 legacy test/validate callers also still use it (acceptable as tests), but the production launcher is not a test. Renaming `facadeBackendOwner` to `testSeamBackendOwner` does not enforce the seam; the exported function and the unconditional fallback remain in the production bundle.
  **Required:** make the fallback fail closed in production (or remove it), have `prod-launcher.ts` compose/pass the real Backend owner, and add a test that bare options are refused outside the explicit test seam. The Server owner still does not consume the real Backend owner on that production path; the “production path can no longer reach testSeamBackendOwner” claim is false.

**FINAL VERDICT: HOLD (1 item).** CLI identity is real and the prior bypass is fixed there; the packaged launcher still reaches the test seam, so the Server owner can still be constructed over a fake Backend owner in production. No product file was modified; no commit made.

## Final re-review after prod-launcher fix — HOLD (1 blocking regression)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `387DAC6E438EC0BCB9BF80D548F1C25D4039796CCAD83A60E61CB4C39352568B` | 1363760 |
| `scripts/prod-launcher.ts` | `DE5CAC9CCF9537B00996B4FAFCB9C0259DD592A75BB3AA6CF2BC802F4F79DCAD` | 3321 |
| `test/s313-server-owner.test.ts` | `A66395C3642DE91D680CD63C322D05A663086A93A59BEEF56DDB7D59049DE84E` | 6476 |
| `composition-dag.ts` / `cli.ts` | `AD1780F1…` / `C6AFCD73…` | unchanged |

- **Production fail-closed is real:** `startBridgeServer` uses `lifecycle.backend ?? composedBackendOwnerOf(options)`; when both are absent it throws unless `allowTestSeamBackend === true` (`index.ts:20827-20834`). The explicit test-seam test passes the flag; bare options are refused (`test:137-143`); legacy injected backend refused. The packaged launcher now composes via `createCliServerOptions`/`onBackendOwner` and passes `{ backend: owner }` (`prod-launcher:63-82`); no launcher process was executed and no test binds 3456.
- **Affected 8 / tsc:** 38/38 pass, tsc 0. DAG lint 161, test clean; prod-launcher has only the pre-existing `JSON.parse(...) as {...}` boundary finding at line 22, not a new DAG finding.
- **Provable regression:** the new fail-closed check breaks existing plain-options test callers that were left unchanged. `test/benchmark-data-clear.test.ts:117` calls `startBridgeServer({...})` with no composed owner and no `allowTestSeamBackend`; it now fails with the new “Server options were not produced by composeBackendOwner…” error (1 failed / 2 passed). Only 2 test references contain `allowTestSeamBackend`, while the task still claims 85 test call sites unchanged. The affected-8 subset does not cover those callers. Required: update the remaining plain-options test/validate callers (or central test harness) to pass the explicit test seam, or provide a test-only wrapper, and add a regression test outside s313; the “85 call sites unchanged” claim is false at runtime.
- **Symbol-ref claim correction (non-blocking):** `prod-launcher.ts:80` merges with object spread, so the non-enumerable `Symbol.for` owner ref on `serverOptions` is not copied. It still passes `{ backend: owner }` explicitly, so production behavior is correct, but “merge preserves … symbol ref” is inaccurate; the ledger’s 181 enumerable keys are unaffected. Preserve descriptors (Object.create/defineProperty) or correct the claim/test.

**FINAL VERDICT: HOLD (1 blocking item).** Production launcher/fail-closed behavior is fixed, but the fail-closed change breaks unchanged plain-options test callers (demonstrated by benchmark-data-clear). No product file was modified; no commit made.

## Final re-review after caller sweep/guard — HOLD (1 guard defect)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `387DAC6E438EC0BCB9BF80D548F1C25D4039796CCAD83A60E61CB4C39352568B` | 1363760 (unchanged) |
| `scripts/prod-launcher.ts` | `BF11FAB927F959761B0EC2FE1F534F80E186126CD6408C45F6D10A7CEAC9E64E` | 3923 |
| `test/s313-server-owner.test.ts` | `A66395C3642DE91D680CD63C322D05A663086A93A59BEEF56DDB7D59049DE84E` | 6476 (unchanged) |
| `test/s313-caller-seam.test.ts` | `CB8DB6FD8CEACC40DFB5BB12A7D3D2B6B78D79D550D56A026D888755943C2AB1` | 3588 |
| `composition-dag.ts` / `cli.ts` | `AD1780F1…` / `C6AFCD73…` | unchanged |

- **Sweep looks complete at runtime:** I independently scanned every `startBridgeServer(` occurrence under test/**, src/**, scripts/**. The plain-options callers now carry `allowTestSeamBackend` (86 insertions/29 files); the four `cli.createCliServerOptions(...)` callers carry the composed symbol ref; cli/prod-launcher pass `{ backend: owner }`; s313's own refusal/composed cases are intentional. No remaining one-arg bare caller. The previously failing `benchmark-data-clear` call is fixed.
- **Expanded suite reproduced:** **34 files / 411 passed**; tsc exit 0; DAG lint remains 161 (no new Server-region findings); new `s313-caller-seam` test clean; `s313-server-owner` clean. prod-launcher has only the pre-existing `JSON.parse(...) as {...}` finding at line 22; the new symbol-descriptor copy adds no finding. The launcher was not executed; no process bound 3456.
- **Prod-launcher symbol merge fixed:** the object spread is followed by copying every own symbol descriptor from `serverOptions` (`prod-launcher:79-85`), so the non-enumerable owner ref survives; explicit `{ backend: owner }` remains authoritative. PASS.
- **Seam flow note:** `allowTestSeamBackend` is an explicit optional lifecycle boolean; only the swept test/validate/start callers set it; production CLI/prod-launcher do not. There is no runtime environment guard, so “production cannot set it accidentally” is enforced by caller discipline + the guard, not by code.

### Remaining HOLD

- **The regression guard has false negatives.** `s313-caller-seam.test.ts` treats a call as safe if `topLevelArgs(call) >= 2` (`:81-85`). That counts a **trailing comma** as a second argument, and accepts any second argument even when it has no `backend` or `allowTestSeamBackend`. A new bare caller such as `startBridgeServer({host,port},)` or `startBridgeServer({host,port}, { handlerFactory })` therefore passes the guard and fails only at runtime. The guard also doesn't recognize `cli.createCliServerOptions(...)` as composed — those four current calls pass via the trailing-comma artifact, not their actual safety. So the claimed rule “(>=2 args with backend/lifecycle)” is not what the test enforces, and the guard would not catch every new bare caller.
  **Required:** make the guard parse the actual second argument and require `backend` or `allowTestSeamBackend: true`; ignore trailing commas; accept both `createCliServerOptions` and `cli.createCliServerOptions` (or a composed-options helper); add a negative fixture test that the guard rejects a bare two-arg/trailing-comma caller. This is a test-quality repair; runtime behavior and the 411 suite are otherwise green.

**FINAL VERDICT: HOLD (1 item).** Production fail-closed/launcher and the 411-call expansion are fixed; the guard is too loose to reliably prevent recurrence. No product file was modified; no commit made.

## Final re-review after guard parser fix — PASS

Verified final hash:

| File | sha256 | bytes |
| --- | --- | --- |
| `test/s313-caller-seam.test.ts` | `10A5B88FE87D3C94B09F1B4C23C762FF7C9444C019B1AD107021F15EE5A2E765` | 5470 |

All other files are byte-unchanged from the last round: index `387DAC6E…/1363760`, prod-launcher `BF11FAB9…/3923`, s313-server `A66395C3…/6476`, DAG `AD1780F1…/51786`, cli `C6AFCD73…/592126`.

- **Parser fix is real:** `splitTopLevelArgs` drops empty depth-0 tails, so a trailing comma is one argument. `isSafeCall` accepts only `allowTestSeamBackend`, a `createCliServerOptions` first argument (plain or namespaced via the regex), or a second argument whose text contains `backend`. The two negative fixtures — `startBridgeServer({host,port},)` and `({host,port},{handlerFactory})` — are tested and rejected; positives (plain/namespaced create options, seam flag, backend, conditional backend) are accepted (`test:111-129`).
- **Sweep still clean:** the stricter rule reports **no offenders** across test/**, src/validate-*.ts and scripts/**; the previously flagged plain callers now carry seam/owner/composed options. The 4 `cli.createCliServerOptions` calls are recognized by the namespaced form, not the old trailing-comma artifact.
- **Run myself:** guard file + 9 spot files = **10 files / 44 passed**; tsc exit 0. The guard is behavioral (it scans every qualifying file and has negative/positive fixture assertions), and the sweep now fails on a bare two-arg/trailing-comma call.
- **Lint:** the new guard test is clean (0 findings); DAG/prod-launcher unchanged from the prior 161/pre-existing classification.
- **Seam flow:** only the swept test/validate/start callers set `allowTestSeamBackend`; CLI and prod-launcher do not. This remains caller discipline plus the guard, not a runtime environment gate — acceptable for the current test-seam contract. The launcher was not executed; no process bound 3456.

Residual non-blocking note: `isSafeCall` is text-based; a second argument containing the substring `backend` in an unrelated property would be accepted. No current caller has that shape, and the required negative fixtures are covered.

## FINAL VERDICT: PASS

The guard defect is closed: trailing-comma and handler-only second arguments are rejected, the sweep is clean, the test is behavioral, and 44/44 spot tests + tsc 0 reproduce. No remaining numbered items. No product file was modified; no commit made.

