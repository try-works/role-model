# S285 — independent read-only review of the frozen S282 capture primitive

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash** (verified via `list_agents`; s5 is the author, not the reviewer).
- Frozen inputs verified (SHA-256 / bytes): `scripts/runtime/parity-capture.mjs` `C698CCB4009421B0315D6DBFBC1251CEC41606C54E9EBF4380F77DF262ADCEE0` / 16041; `scripts/parity-capture.test.mjs` `81AF1BDF1BC2A6C06AF72DEBAFF7732209BB013C3654E113915FDFE4D6DA7FD9` / 13173. Report reviewed: `evidence/other/s282-parity-capture.md`.
- No product writes, no builds, no browser/test runs, no children/CLI. This is a source review; the Lead's real-browser smoke remains the behavioural gate.

## Verdict

**HOLD (bounded) for real CDP correctness.** The mocked protocol contract is well tested and PASS-worthy on its own terms, but four assumptions do not hold against a real CDP session: event domains are never enabled, transport waits are not bounded by `deadlineMs`, the frozen `Date` is not callable, and the mutation observer may never attach. None of these is proven by the fake transport.

## Findings (prioritized)

1. **HIGH — CDP event channels are subscribed without enabling their domains.** `parity-capture.mjs:202-238` subscribes to `Runtime.exceptionThrown`, `Log.entryAdded`, `Network.loadingFailed`, `Network.responseReceived`, but the preconditions only send `Page.enable`, `Emulation.*`, `Page.addScriptToEvaluateOnNewDocument` (`:255-266`). Real CDP delivers these events only after `Runtime.enable` / `Log.enable` / `Network.enable`. The in-page recorder still catches `console.error` and failed fetch/XHR (`:106-140`), but CDP-only exceptions and network failures are lost while `events.channel` still reports `"subscribed"` and `clean` can be true. The test emits events directly from a fake (`parity-capture.test.mjs:257-261`) without enabling domains, so it cannot catch this. Also no `Network.setCacheDisabled` is sent; a reused owned session can serve cached assets between runs.
2. **HIGH — the finite deadline does not bound a CDP call.** `deadlineMs` is checked between awaits (`parity-capture.mjs:271-280, 290-309, 319-343`), but every `await cdp.send(...)` (including `Page.navigate`, `Runtime.evaluate`, `Page.captureScreenshot`) has no timeout/race. A hung or slow CDP response hangs the primitive forever, contradicting the `capture_timeout` contract. The timeout tests only exercise polling loops that reach the deadline (`test:195-234`), never a pending `send`. The caller-owned transport must impose per-call timeouts, or the primitive must race each send against the remaining deadline.
3. **HIGH — frozen `Date` is not callable.** `parity-capture.mjs:78-91` replaces `Date` with a `class extends Date`; native `Date()` (call without `new`) throws `TypeError` for class constructors. Any page code using `Date()` changes behaviour (and may surface as an error), so the freeze is not a drop-in native replacement. `Date.now`, `parse`, `UTC`, `new Date(...)` and `instanceof` are preserved; `Date.prototype.constructor` is not. The test only regex-matches `/Date/` in the bootstrap source (`test:128`) and never executes it.
4. **MEDIUM — the mutation observer can silently never attach.** `parity-capture.mjs:142-151` installs `MutationObserver` only when `document.documentElement` exists at bootstrap time; `addScriptToEvaluateOnNewDocument` runs at document-start, when the element is commonly still null. Then `recorder.mutations` stays 0 forever and the DOM-quiet requirement (`:288-310`) degenerates to a fixed `quietMs` after the first readiness sample rather than actual DOM quiet. Tests fake the readiness expression (`test:60-78`), so this is not proven either way; real smoke must assert the counter moves.
5. **MEDIUM — readiness has no in-flight request or "network quiet" concept.** Readiness waits only fonts, images, `readyState`, and DOM mutations (`:45-52`). A route whose data arrives by fetch after load, without a DOM mutation in the quiet window, can be captured stale; pending fetches are only reported when they fail, never awaited. Chart/canvas renderers are bounded by the deadline but not proven stable (S282 report already notes the pilot chart requirement is out of scope).
6. **MEDIUM — stability is exact byte equality with a coarse readiness base.** `Page.captureScreenshot` (`:319-343`) requires consecutive identical PNG buffers with `stableCount >= 2` and no perceptual tolerance (policy decision later). This is correct for the stated contract, but byte equality is sensitive to font rasterization, scrollbars, and compositor state; combined with findings 1/4 a "stable" result can still be captured before the page's async data lands.
7. **LOW — one capture may be issued after the deadline.** The stability loop captures before checking `remaining()` (`:319-343`); always bounded by one extra call, but with finding 2 that call can hang.
8. **LOW — event/path coverage is text-deduped.** `events.consoleErrors`/`networkErrors` merge via `new Set` of strings (`:349-350`); two distinct failures with identical text collapse, and the in-page fetch failure plus the CDP `loadingFailed` may appear as different text for one event. Not a correctness break for "surfaced at all", but counts are not exact.
9. **LOW — `Math.random` seeded, `crypto.getRandomValues` not frozen; `performance.now`/timers intentionally real.** Documented in S282; retain as an explicit determinism boundary, not a defect.

## What the frozen tests actually prove (mocks are not proof)

- They prove option validation, ordering before navigation, style-before-screenshot, polling and stability loops, typed errors for unstable/timeout, in-page/CDP surfacing plumbing, and two-run purity — all against a fake `cdp` whose handlers resolve immediately and whose events are emitted synchronously (`test:30-107`).
- They do **not** prove: real CDP domain delivery, real navigation/capture timing, the bootstrap executing in a document (Date callable, observer attachment), real PNG bytes, real font/image settling, cache behaviour, or React-vs-React determinism. S282 correctly records real-browser smoke as NOT_RUN; that gate is still required.
- Bounded suite of 8 tests, RED 8-fail→GREEN 8-pass per S282; I did not re-run it (read-only).

## Required real-browser gates before acceptance

1. Add `Runtime.enable`, `Log.enable`, `Network.enable` (and `Network.setCacheDisabled` for parity runs) or state explicitly that callers must enable them; then assert a deliberately failing fetch/exception is surfaced.
2. Assert the deadline bounds a deliberately stalled `send` (transport timeout or race), not only polling loops.
3. Execute the bootstrap in a real page and assert `Date()`, `new Date()`, `Date.now()`, `Date.parse` and `instanceof Date` all behave; assert `__parityCapture.mutations` increases on a DOM update.
4. Capture a page with a post-load fetch/chart and confirm stability only after the data settles (or document the non-wait explicitly).
5. Real PNG determinism across two runs in the packaged lane (Lead owns).

## Limits

Source-only review of the frozen hashes; no browser/CDP execution, no suite, no build, no test run. I did not edit either file. Earlier S283 private-only absence claims were already corrected in `s283-package-preflight.md`; no new absence claims are made here.

