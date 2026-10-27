# S285 recheck — five HOLD findings on the frozen capture repair

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash**; read-only. No product edits, no test/build/browser run, no children/CLI.
- Frozen repaired bytes verified (SHA-256 / bytes): `scripts/runtime/parity-capture.mjs` `E7C4978453262F203E881E3188E939520E88C8708F03C871DDE174449849CA03` / 19362; `scripts/parity-capture.test.mjs` `952F5771FB019435CA04325EF025572C9C965A8A0E9F4F8AE5AD9A27CC070AE1` / 22623. Report reference: `s285-capture-review.md` (HOLD), `s282-parity-capture.md`. Lead-reported: 14/14 GREEN, 6 meaningful RED before the fix; I did not run the suite.

## Verdict

**PASS (bounded) on all five prior HOLD items at the new frozen hashes.** The remaining gap is unchanged and explicitly real-browser-only: the fake CDP transport cannot prove actual event delivery, capture timing or PNG determinism; the Lead's real-CDP gate is still required.

## Item-by-item recheck

1. **CDP domain enables + cache — FIXED.** `parity-capture.mjs:312-315` now sends `Runtime.enable`, `Log.enable`, `Network.enable`, `Network.setCacheDisabled({cacheDisabled:true})` before navigation (all through `sendBounded`); events are subscribed at `:278` before the enables. Test `parity-capture.test.mjs:348-363` asserts all four are called and before `Page.navigate`.
2. **Bounded sends — FIXED.** `parity-capture.mjs:283-306` `sendBounded` races every `cdp.send` against the remaining deadline, rejects with `capture_timeout`, and always clears its timer; grep confirms every transport call (Page/Emulation/Runtime.evaluate/captureScreenshot/recorder) goes through `sendBounded`. Test `:462-487` proves both a hung `Page.captureScreenshot` and a hung precondition `Page.enable` resolve to `capture_timeout` rather than hanging.
3. **Callable Date — FIXED.** `parity-capture.mjs:82-99` replaces the class with a `Proxy` over the real `Date`: `apply` keeps `Date()` returning a string (no-arg frozen), `construct` uses `Reflect.construct` with frozen no-arg, `get` freezes `now` while `parse/UTC/prototype` pass through. Test `:365-381` executes the bootstrap in `node:vm` and asserts `Date.now`, `new Date().getTime`, `typeof Date() === "string"`, explicit args, `parse`, `UTC`, `instanceof Date` and prototype method.
4. **MutationObserver attach — FIXED.** `parity-capture.mjs:167-179` observes `document.documentElement ?? document` with the same subtree/attribute/characterData/childList options, so a null documentElement at document-start no longer silently observes nothing. Test `:383-389` executes the bootstrap with a fake observer both with a documentElement and with `documentElement: null`, asserting exactly one attachment in each case.
5. **Pending fetch/network-quiet readiness — FIXED.** `parity-capture.mjs:124-165` counts in-flight fetch and XHR in `recorder.pendingRequests` (fetch finally; XHR loadend/error/abort with a one-shot settle); readiness requires `pendingRequests === 0` (`:344-348`) and the diagnostics surface it. Tests `:393-418` prove unsettled fetch/XHR counts and clearing, and specifically that an SSE response resolves at headers (not networkidle); `:421-455` prove capture waits for pendingRequests to reach 0 and times out when they never settle.

## Residual (unchanged, bounded)

- The fake transport still cannot prove real CDP event delivery, real navigation/capture timing, or real PNG byte determinism; the Lead's real-CDP smoke remains the gate (Lead-owned). The tests now execute the bootstrap in `node:vm` (Date/mutation/pending), which is stronger mock evidence but still not a browser.
- `pendingRequests` deliberately counts request headers, not response-body/stream completion (documented at `:124-125`); a long-lived SSE cannot block capture. This is the intended readiness contract, not a defect.
- `Date.prototype.constructor` still points at the native constructor (Proxy target); `instanceof` and all tested semantics hold, so non-material.
- No runtime/build/operator/provider action was taken; no claim about the currently hung package gate or rendered PASS.

## Limits

Static read-only recheck of the frozen files; I did not execute the 14 tests or a browser. The Lead-reported GREEN/RED counts are recorded as Lead evidence.

## Executed real-CDP receipt (Lead-run, read-only verified by this reviewer)

- Harness: `E:/rm-tmp/s285-real-capture-smoke.mjs` (present); log: `E:/rm-tmp/s285-real-capture-smoke-2.log`.
- **PASS**, scope explicitly `real-chrome-synthetic-fixture-not-React-parity` (no React R14/parity claim).
- Two fresh Chrome contexts, both captures identical: `bytes=21246`, `sha256=a76c3544a0d06bfb4728eff2686dd262e2059abf51fc1c15f22259f99089fd96`, `screenshots=2`, `clean=true`, `events.channel="subscribed"`, `events.complete=true`.
- Observed page: `settled-real-data {"callable":"string","now":1700000000000,"random":0.3588899802416563,"instance":true}`; `mutations=3`, `pending=0` — delayed data settled, callable Date preserved, mutations counted, no pending requests.
- Source unchanged at the frozen hash `E7C4978453262F203E881E3188E939520E88C8708F03C871DDE174449849CA03` (verified this receipt); test `952F5771…070AE1`.
- This closes the previously-open real-CDP delivery/timing/PNG-determinism gate for this primitive (bounded). It does not establish React-vs-React parity, pixel comparators or the R14 runner.
