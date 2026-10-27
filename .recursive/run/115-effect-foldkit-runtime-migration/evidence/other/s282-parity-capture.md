# S282 (R14 primitive) — bounded deterministic CDP capture primitive

Implementer: **deepseek-flash** (verified live via `list_agents`: target `s5-health-wait`, model
`deepseek-flash`, status running — not inferred from inactive metadata). Task: task-11 (rev 2, in_progress,
owner s5-health-wait). Mode: bounded native implementation, strict RED then GREEN; no children, no CLI, no
commits, no full suite, no package build, no provider/operator calls.

## Scope (exactly the two permitted new files)

- `scripts/runtime/parity-capture.mjs` (new — the primitive)
- `scripts/parity-capture.test.mjs` (new — strict control tests)

No root package/script/CI edit, no existing audit edit, no shared browser module, no packaging change.
Ideas were read from the current audit CDP implementation (`scripts/runtime/audit-rendered-ui.mjs`: its
`send(method, params, sessionId)` shape); nothing was copied.

## What the primitive does (one low-level capture, not the R14 runner)

`captureParityScreenshot({ cdp, url, sessionId?, viewport?, timezone?, quietMs?, pollMs?, stableCount?, deadlineMs?, fixedEpochMs?, randomSeed? })`

1. **Determinism before navigation** — `Page.enable`, `Emulation.setDeviceMetricsOverride` (fixed
   width/height/DPR, `mobile:false`), `Emulation.setTimezoneOverride`, then
   `Page.addScriptToEvaluateOnNewDocument` with a bootstrap that freezes `Date`/`Date.now`, seeds
   `Math.random` (mulberry32), installs an in-page recorder for `console.error`/`error`/
   `unhandledrejection` and for failed `fetch`/XHR, and counts DOM mutations. Only then `Page.navigate`.
   `performance.now`/timers/rAF are deliberately left real: freezing them would deadlock frame loops and
   animation end-states instead of removing nondeterminism.
2. **Animation/caret hide** — an injected style (`animation:none`, `transition:none`,
   `caret-color:transparent`, transparent scrollbar colours) applied before any screenshot.
3. **Readiness + bounded DOM quiet** — polls fonts (`document.fonts.status`), images
   (`complete && naturalWidth > 0`), `readyState` and the mutation counter; the counter must stay
   unchanged for `quietMs` (default 400 ms) inside the finite deadline.
4. **Stable consecutive screenshot bytes** — captures `Page.captureScreenshot` (`png`, `fromSurface`,
   no `captureBeyondViewport`), decodes base64 and requires `stableCount` (>= 2) consecutive
   byte-identical buffers via exact `Buffer.equals`; returns the exact PNG plus `sha256`/`bytes`.
5. **Surfacing, not ignoring** — in-page recorder results and the CDP event channel
   (`Runtime.exceptionThrown`, `Log.entryAdded` error, `Network.loadingFailed`,
   `Network.responseReceived >= 400`) are merged into `consoleErrors`/`networkErrors`; `clean` is false
   when anything is surfaced; `captureIssues(result)` lists them; when the transport exposes no `on`,
   `events.channel = "unavailable"` and `events.complete = false` so a caller can never read that run as
   clean.
6. **Bounded, diagnostic failures** — `ParityCaptureError` with stable codes `invalid_option`,
   `capture_timeout`, `capture_unstable`, `capture_protocol` and attached `diagnostics`
   (phase/screenshots/stableCount/lastSha256/readiness). All waits are finite; non-finite
   `deadlineMs`/`pollMs`/`quietMs` are rejected up front.

## RED (strict, meaningful — no setup failure)

`evidence/logs/s282-red.log` — `node --test scripts/parity-capture.test.mjs` against the zeroed
**contract skeleton** (real exports, zeroed result; final test file): exit **1**, `tests 8 | pass 0 | fail 8`.
Failures are capture assertions, not an import/setup error, e.g. viewport `deepEqual` mismatch, missing
`Page.navigate` ordering, missing `capture_unstable`/`capture_timeout` rejections, unsurfaced console/
network issues, wrong channel claim. The skeleton was used only for RED; the implementation was restored
afterwards and verified by sha256.

## GREEN

`evidence/logs/s282-green.log` — same command: exit **0**, `tests 8 | pass 8` (≈1.0 s). Covered:
preconditions before navigation (viewport/timezone/timezoneId/bootstrap content, style before first
screenshot), fonts/images + quiet-window wait, exact stable PNG/sha/byte metadata, bounded unstable failure
plus non-finite-deadline rejection, bounded navigation timeout with no screenshot taken, in-page errors and
network surfaced with `captureIssues`, event-channel surfacing and the honest `unavailable` channel,
and two-run determinism (identical PNG/sha/metadata).

## Real-browser smoke — NOT_RUN (gate missing, honestly recorded)

No `PARITY_CDP_ENDPOINT`/`CDP_ENDPOINT`/`CHROME_DEBUG_URL` is configured and nothing answers on
`127.0.0.1:9222`. Launching a browser would be a child process, which this task forbids, so the
real-browser gate is **NOT_RUN** — not a mocked PASS. Per plan V-CAPTURE, the next gate needs an injected
already-owned CDP session (packaged lane), plus React-vs-React 0-diff, the mutation check and dual-run
determinism; those stay open and are not claimed here.

## Lint

`anti_slop_lint` (this session): `scripts/parity-capture.test.mjs` **clean**.
`scripts/runtime/parity-capture.mjs` reports **8 pre-existing-pattern `no-runtime-typeof` findings**
(lines 156/162/163/164/169/194/205/231) — every one is the injected-options/CDP-transport boundary
validation in a plain `.mjs` module (`typeof cdp.send === "function"`, `typeof url === "string"`, etc.),
i.e. the boundary parsing the rule asks for, not runtime type sniffing of domain data. Reported explicitly,
not normalised away; the lead owns any lint-tool decision.

## Frozen hashes / bytes

```
parity-capture.mjs|16041|394|C698CCB4009421B0315D6DBFBC1251CEC41606C54E9EBF4380F77DF262ADCEE0
parity-capture.test.mjs|13173|292|81AF1BDF1BC2A6C06AF72DEBAFF7732209BB013C3654E113915FDFE4D6DA7FD9
```

## S285 HOLD repair (supersedes the two hashes above)

Independent review HOLD findings, repaired on the same two files only:
1. **Domains/cache** — the primed preconditions now include `Runtime.enable`, `Log.enable`,
   `Network.enable` and `Network.setCacheDisabled {cacheDisabled:true}` before navigation. Without
   them the event channel never delivers, so console/network failures would have looked clean.
2. **Every `cdp.send` bounded** — a `sendBounded` wrapper races each transport call against the
   remaining deadline and always clears its timer in `finally`; a hung precondition or a hung
   `Page.captureScreenshot` fails the capture with `capture_timeout` instead of parking it.
3. **Callable Date** — the frozen clock is a Proxy over the real `Date` inside the bootstrap:
   `Date()` still returns a string, `new Date()`/explicit-argument construction, `Date.now/parse/UTC`,
   `Date.prototype` and `instanceof Date` all survive (a class previously broke `Date()`).
   Verified by EXECUTING the real sent bootstrap in `node:vm`, not by matching a regex.
4. **Mutation observer fallback** — attaches to `document.documentElement ?? document`, so the quiet
   window is observed even when the bootstrap runs before `documentElement` exists (vm-executed test
   asserts the observed target in both cases).
5. **Pending fetch/XHR readiness, not networkidle** — the in-page recorder counts in-flight fetch/XHR
   (`pendingRequests`), decremented when the fetch promise settles at headers / XHR loadend-error-abort,
   and readiness requires `pendingRequests === 0`. An SSE response settles at headers, so a stream can
   never hold the capture open; a request that never settles hits the bounded deadline
   (`capture_timeout`) rather than hanging.

Strict RED (pre-repair, `evidence/logs/s282-red-2.log`): `tests 14 | pass 8 | fail 6` — the six S285
assertions failed per defect (`Runtime.enable must be enabled...`, `typeof Date()` throwing,
`the observer must still attach when documentElement is null`, `an unsettled fetch must be counted as
pending`, `capture must wait until pendingRequests reaches 0 (saw 3 readiness polls)`,
`a hung captureScreenshot must be bounded by the deadline`). Test-harness changes made after that RED
only teach the fake CDP the newly enabled domain methods and default `pendingRequests: 0`; no assertion
was weakened.

GREEN (post-repair, `evidence/logs/s282-green.log`): exit 0, `tests 14 | pass 14 | fail 0`.

Actual surfaced errors (content, not generic wrappers): in-page recorder and CDP events yield strings
such as `TypeError: boom`, `GET /api/role-model/x -> 500`, `exception: boom-event`,
`net::ERR_FAILED`; `captureIssues` only prefixes their class (`console:` / `network:`).

Fresh frozen hashes/bytes (final):

```
scripts/runtime/parity-capture.mjs|19362|E7C4978453262F203E881E3188E939520E88C8708F03C871DDE174449849CA03
scripts/parity-capture.test.mjs|22623|952F5771FB019435CA04325EF025572C9C965A8A0E9F4F8AE5AD9A27CC070AE1
```

Lint after the repair: `scripts/parity-capture.test.mjs` clean; `scripts/runtime/parity-capture.mjs`
still reports exactly the 8 `no-runtime-typeof` boundary-validation findings (now lines
184/190/191/192/197/222/233/259), unchanged in character from the S282 report.

## Limits (bounded, no R14 closure claimed)

- Mocked protocol only: no real PNG, no real browser, no React self-check, no pixel comparator, no
  accessibility/structure comparator, no request-log comparator.
- Canvas-chart renderer completion waiting (source-proposal §6.2 pilot requirement) is NOT in this
  primitive; a continuously changing chart is bounded by the deadline but cannot be proven stable.
- Stability uses a `pollMs` delay between captures and exact byte equality; no perceptual tolerance
  (tolerance is a later G-CHARTS policy decision).
- `performance.now` remains real by design (documented above); only wall-clock `Date` and `Math.random`
  are frozen.
- Scrollbar hiding covers `scrollbar-color`; a WebKit-specific scrollbar pseudo-element rule is not added.
- This is one reusable primitive; the R14 runner (builds, identity, digests, scenario files, comparators,
  report) is out of scope and remains open.
