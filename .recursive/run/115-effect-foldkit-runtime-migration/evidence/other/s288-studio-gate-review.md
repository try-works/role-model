# S288 — Studio gate failure boundary review (read-only, no root-cause claim)

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash** (verified live via `list_agents`). No product edits, no harness changes, no runtime/build/provider/operator calls.
- Inputs: `s284-paired-package-result.md`, `s284-studio-run-diagnosis.md`, gate logs first/repeat/isolated; `scripts/runtime/audit-rendered-ui.mjs:338-404`; Studio view `view.ts:674`; update `update.ts:571-598`; defaults `studio.ts:37-56`; dispatch `commands.ts:306-330`.

## Exact observed behaviour (two unmodified full gates, same artifact)

- HTTP 12 checks, 20 routes and 20 click-sweeps PASS; control action PASS (honest HTTP 400 message); **both gates FAIL** `studio run: clicked -> raw:loading` at the audit's 15 s bound (`s284-packaged-gate-first.log`, `s284-packaged-gate-repeat.log`). Both logs show `PASS click sweep /studio: clicked 7`.
- Isolated Studio audit on an already-owned session: `PASS studio run: clicked -> raw:success` (`s284-studio-isolated.log`).
- Manual fresh shipped browser: one catalogue GET + one runtime summary GET; after catalogue known, a `POST /v1/chat/completions` body model `claude-3.7-sonnet`, HTTP 200 in 264 ms. That is a **different request** from the failed gate one; failed POST body/status/latency were not captured.

## Exact code behaviour at the failure point

1. **Audit order:** click-sweep navigates every route (including `/studio`), waits a fixed 1.2 s, clicks up to 12 enabled buttons with 250 ms spacing (audit `:340-365`), then moves to the next route. Studio's Run button is enabled at idle (`view.ts:674` disables only when `status === "loading"`), so the `clicked 7` sweep includes Run; it dispatches while the sweep does not wait for the response, and the next navigation destroys the page while the HTTP request may still be live server-side.
2. **Studio step:** navigate `/studio`, fixed **1.5 s** settle (audit `:389-390`), then `b.click()` on `[data-studio-run]` **without checking `disabled`/catalogue readiness** (`:391`), poll `[data-studio-raw]` every 300 ms up to 15 s (`:394-400`).
3. **Product path:** `StudioRunRequested` ignores a click only while `status === "loading"` (`update.ts:571-573`); it sends `catalogue[0]` only if `configuredModels.status === "ok"`, otherwise the fixed default `moonshot/kimi-k2.5` (`update.ts:574-580`, `studio.ts:47`). `DispatchStudio` has **no client timeout** (`commands.ts:306-330`); `StudioLoaded/StudioFailed` apply only on matching token (`update.ts:582-598`). The Studio route requests the catalogue at init (`update.ts:191-213`) but the audit does not wait for it.

## Finite possible failure mechanisms (enumerated, none claimed)

- **A. Sweep/request interaction.** Sweep's Run click may leave a `/v1/chat/completions` POST in flight for the default/whatever model; a single-flight or slow fixture can then starve or delay the Studio step's catalogue GET and/or Run POST → `raw:loading` at 15 s. Allowed by code and sequence; not proven because sweep POSTs are unlogged.
- **B. Catalogue-readiness race.** At the fixed 1.5 s click, `configuredModels.status` may not be `ok`, so the body uses default `moonshot/kimi-k2.5`; if the fixture defers/does not serve that model, no reply arrives inside 15 s. Fits the default-model hypothesis; unproven without the POST body and catalogue timing.
- **C. Fixture latency for the served model.** A served-model POST could take >15 s (queue/contention); the 264 ms post-catalogue manual request does not measure the failed gate request.
- **D. Click ineffective.** A disabled/busy button would make `b.click()` a no-op; on a fresh Studio document state is `idle` so this is unlikely, but it is unmeasured (the audit never reads `disabled`).
- **E. Response received but UI never leaves loading.** A token mismatch or dropped `StudioLoaded` would leave `loading`; the token is fixed on dispatch and no navigation occurs inside the step, so this needs reducer/state instrumentation before it can be asserted.
- Same-route navigation is **NOT excluded**: the audit drives `Page.navigate`, and whether a step actually produced a new document/frame must be measured with `Page.frameNavigated`/frame id plus `performance.getEntriesByType("navigation")`/`document.readyState`. The log cannot prove a fresh document, so no exclusion is claimed.

## The measurement that discriminates (run on the Lead's fixture; diagnosis only)

Instrument the full gate's Studio step (and the sweep) with CDP `Network.enable` + `Network.requestWillBeSent`/`getRequestPostData`/`responseReceived`:
1. every `POST /v1/chat/completions`: timestamp, body `model`, response status and response timestamp (including the sweep's POST);
2. every `GET /api/role-model/models`: start/end timestamp and status, relative to the click;
3. at click time: `[data-studio-run].disabled`, `aria-busy`, current `[data-studio-raw]`, and a fresh-document marker (`performance.getEntriesByType("navigation")`);
4. poll `data-studio-raw` with timestamps.

Decision rules:
- **Sweep POST exists and the Studio-step POST uses the fixed default model while the catalogue GET was not complete at click** → audit sequencing/readiness interaction (A/B): the gate needs Studio isolation or a catalogue wait; do not change the product predicate.
- **Studio-step POST body equals the fixture-served model, response 200 in <15 s, but raw stays `loading`** → product/reducer defect (E); requires s5's state/token diagnostics to locate.
- **POST response >15 s or fixture never answers for the served model** → latency/bound issue (C); record measured latency before changing `AUDIT_STUDIO_TIMEOUT_MS`.
- **No POST after the click / button disabled** → audit no-op (D).

## Status / limits

The two unmodified gate failures are real and currently block acceptance; no failed POST was captured, so none of A–E is a root cause. The 264 ms success and 25 s isolated success are different requests/states. s5 is adding diagnostic-only audit/helper code with no product predicate change; this report should be re-read against those frozen changes when they land. No product, runtime, harness or operator action was taken by me.

## Correction (Lead note): token/cancel "refuted" was overstated

- The earlier blanket wording that token-keyed cancellation is *refuted* is **withdrawn**. The code still shows `DispatchStudio` has no `interrupt` and telemetry/revision transitions do not touch `studio`, but that does not exclude a **stale `StudioLoaded` whose token no longer matches**: `StudioTabSelected/StudioTabKey` reset `studio` to `studioIdle(tab)` (token 0) and `StudioRunRequested` mints `state.token + 1` per click (`view.ts:674`, `update.ts:571-598`), so a late result for token N is dropped when the current token is different. A mismatch alone cannot turn `idle` into `loading`; it can drop a late success while a *newer* loading state has no matching result — which is exactly the state the gate reports. Whether any such reset/newer run occurred in the gate is unmeasured.
- **"clicked" is not proof of dispatch.** The audit's final expression returns `"clicked"` even when the button is disabled (no `disabled` check at `audit-rendered-ui.mjs:391`); the view sets `disabled`/aria-busy only while `status === "loading"` (`view.ts:674`). A no-op click on a pre-existing loading state is therefore indistinguishable in the log from a real dispatch.
- **Same-URL navigation is an unverified boundary.** If the studio step's `Page.navigate` ever runs against the URL already loaded (e.g., a configured routes run ending on `/studio`, or an earlier step leaving it current), Chromium normally does a reload, but the log cannot prove a fresh document. Instrument `performance.getEntriesByType("navigation")` (count/startTime), `document.readyState` and URL at click.
- `data-studio-raw` is rendered only in the non-error branch and its value is `state.status` (`view.ts:677-679`), so the observed `raw:loading` means the final reducer status really was `loading` (not `idle`), and a late error would have been visible as `data-studio-error`.

**Additional discriminating signals:** capture dispatch and settle tokens (message token, current `studio.token` at click and at settle), the POST body/status/timing, whether a tab reset/focus change occurred between dispatch and settle, and the fresh-navigation marker — in addition to the A–E network data. Do not change the timeout or product predicate on any of these hypotheses.

## Review standard — standalone fresh evidence cannot close this gate (Lead instruction)

- **Rejected as closure:** a standalone CLI collector or a fresh/isolated Studio audit (`s284-studio-isolated` `raw:success`, the manual 264 ms POST) is **not** evidence about the failing full gate. We already know fresh Studio succeeds; the gate fails after the full sequence (sweep → control → studio) at 15 s. Evidence must be produced by the **exact existing audit** `scripts/runtime/audit-rendered-ui.mjs` in that same sequence.
- The acceptable diagnostic change is a few-line **phase hook only**: enable the Network phase (and required domains) **before** the sweep/studio sequence, record at-click state (`disabled`/`aria-busy`/raw status/token if exposed), capture every relevant POST (body model/status/timing, including sweep-triggered POSTs) and the catalogue GET timing relative to click, and emit the final **click state + last observed raw state**. Same exe + UI hashes; latest audit script outside the immutable package; no product predicate or timeout change.
- The 273-line standalone driver is out of scope; if it remains in the tree it must not be cited as closure evidence. If the diagnostic slice does not freeze, the Lead patches a native handoff — I will review whichever frozen artifact exists, once, without duplicating the patch.
- Acceptance of any diagnostic run requires RED-before-fix or a demonstrated discriminating observation, not a passing fresh context.

## Frozen diagnostic review (S286) — safety and predicate

Frozen hashes verified: audit `scripts/runtime/audit-rendered-ui.mjs` `6250F4D406D8367BF1EAD8AAB75DF3E76A6A16334C1FB626527B2DF68ABD12AC` (diff **+16 / −0**, additive); helper `scripts/runtime/studio-audit-evidence.mjs` `7319867899501EE7342F53F19E42266F56491D3379848BFA49B42636789D4EE5` (161 lines, pure collector, no CLI/browser); test `scripts/studio-audit-evidence.test.mjs` `E341E24C34B7844DE9ED714B2A6A5BBC7FB3BDE376AF9EBB0B25E81ADDB3EBEE` (246 lines). Lead owns the frozen audit; I made no edit.

- **Privacy — PASS.** `summarizeStudioBody` keeps only `model`/`stream`/`messageCount`; prompts/messages/auth are never stored, response bodies are never read, and the formatter prints only summaries. Tests assert the redaction (test:44-72, 184-209) and no response-body capture.
- **Predicate/timeout unchanged — PASS.** The diff only imports/invokes the collector, enables `Network` before the seed, records phases and the at-click snapshot, and prints formatted evidence after the existing result is computed. The 15 s loop, outcome condition and failure accounting are byte-untouched (0 deletions). Collection cannot flip PASS/FAIL.
- **Hook placement:** `Network.enable` runs before `--seed-chat`, and phases `seed`→`sweep`→`final` bracket the identical gate sequence; the click snapshot reads `disabled`/`rawAtClick`/`errorAtClick`/`pathname`/`selectedModelDom` before `b.click()`; output includes per-request model/stream/messages/status/duration/failure and the final `outcome` classification.

## Measurement gaps to fix before interpreting the run (evidence, not predicate)

1. **Catalogue cap can silently drop the final click's catalogue GET.** `CATALOGUE_CAP = 20` with `catalogues.length < CATALOGUE_CAP` records only the **first 20** GETs (`studio-audit-evidence.mjs:17,95-97`); a full gate has 20 route navigations (every route loads the rail `models` GET), then control and final `/studio` — the final catalogue is the 21st/22nd and is **not recorded**. `catalogueRequest()` returns the last *recorded* entry, and there is **no `catalogueDropped` count** (the `dropped` counter covers only Studio POSTs). The run output's "latest phase" line therefore can describe a sweep catalogue, not the final click. Fix: count all observed catalogue GETs, retain a ring/latest (or always keep the `final`-phase entry), and print total+dropped; do not call the last-recorded entry "latest".
2. **`navigatedSameUrl` is pathname-only and cannot prove a preserved document.** The audit compares `location.pathname` before/after (`audit-rendered-ui.mjs` hook, 16-line diff), and the formatter prints a "same-URL navigation preserved the existing page state; ... no POST was observed" note (`studio-audit-evidence.mjs:157-159`) without comparing `Page.frameNavigated` frame/loader identity (pageEvents are collected but unused for this claim). It also prints that note when a POST **was** observed (condition only `navigatedSameUrl && buttonDisabled`). Use frame/loader identity or drop the causal note; the test at `test:211-233` currently bakes the overclaim.
3. **Model body relies on `params.request.postData`.** CDP may omit `postData` in `Network.requestWillBeSent`; the collector does not call `Network.getRequestPostData` for the POST. If omitted, the discriminating model field is null even though a POST was observed. Capture it via `Network.getRequestPostData` (redacted to the same whitelist) or print why unavailable.
4. **Output truncation risk:** `formatStudioEvidence` emits request lines before click/outcome and then `slice(0, maxLines=30)`; with many observed POSTs the click/outcome can be cut. Reserve the final click/outcome lines.
5. Bound counters: `pageEvents` (30) and `catalogues` (20) drop silently; at minimum print totals so an incomplete evidence set is never read as complete.

**Verdict on this freeze: privacy and predicate are safe/unchanged; the measurement set is HOLD for final interpretation until the catalogue retain/drop-count and same-URL frameproof/note issues are fixed.** The actual full-gate run output is still the only closure evidence; no PASS is claimed from the collector.

## Actual full-gate run — hypothesis retractions (E:/rm-tmp/s287-studio-full-diagnostic.log)

- `buttonDisabled=false`, `rawAtClick=idle`, `selectedModelDom=claude-3.7-sonnet`, `navigatedSameUrl=false`; one Studio POST observed (requests=1, dropped=0): `phase=final model=claude-3.7-sonnet stream=false status=undefined duration=none start=386906ms`, outcome `in-flight`. The request started but no response arrived inside the gate window.
- **Refuted for this run:** the fixed-default-model hypothesis (body model is the served `claude-3.7-sonnet`) and the no-POST/no-op hypothesis (button enabled/idle at click and a POST was observed). The catalogue final-phase GET was not retained in the old first-20 evidence, but that is now moot for the model (the POST body is exact); the retained/final catalogue timing remains useful only for readiness.
- **Not controller-only:** the controller PATCH maps to `updateControllerAssignment` (`index.ts:19534-19551`) and the provider action to `reconnectProviderAccount` (`:19869-19886`) — controller assignment/provider state, never the model catalogue. The Leads' controller/provider/Studio isolates on fresh hosts all PASS, so a control-only cause is excluded for this run.

## Helper repair recheck (frozen F905CF46 / test 41EFBB00)

Frozen hashes verified: helper `F905CF4645D0B231B5FC70EE1934AE7FFAB17C04A05F9ED160E7982FE24A6FDD`; test `41EFBB006D283C85B1655C6369C3489EEDC6AA692E4A1C1D7EE68C390599B303`. **Audit note:** current audit is `E8AB32C4…` (Lead's extraInfo diagnostic extension), not the previously reviewed `6250F4D4`; that extension is Lead-owned and additive, and my prior safety/predicate review of the 16-line hook stands for the collector path.

- **Catalogue ring/counts — PASS.** `catalogueTotal` counts every GET; the ring retains the last `CATALOGUE_CAP` (shift increments `catalogueDropped`); header prints both totals; `catalogueRequest()`/evidence catalogue is the last retained (latest observed) entry. Test `studio-audit-evidence.test.mjs:249-250` asserts total 22 / dropped 2.
- **samePathname — PASS.** The formatter prints `samePathname=` as raw pathname evidence and the misleading "no POST observed" causal note is gone; test `:211-233` asserts the label and the absence of the causal claim. It remains pathname-only (not frame/loader proof) — correctly labelled, not a claim.
- **Output reservation — PASS.** Click/outcome lines are computed as `tail` and reserved before the request-line budget (`helper:164-171`); test with `maxLines:25` covers a long request list.
- **Missing postData — PASS (honest label), residual.** Formatter prints `model=unavailable` when `request.postData` is absent (helper:163; test `:276-289`); the collector still does not call `Network.getRequestPostData`, so a CDP omission yields "unavailable" rather than a model — visible, not silent. The actual run supplied a model.
- **Privacy — PASS.** `summarizeStudioBody` still whitelists only `model`/`stream`/`messageCount`; only those plus status/timing/failure are stored/printed; no prompt, messages, auth headers, tokens or response bodies (tests `:44-72`; helper:27-43, 163).

## SSE / client page lifecycle — exact code facts (connection-starvation hypothesis)

- **Client:** one `EventSource` per runtime subscription (`refresh.ts:30-33`, single `persistentEntry` at `:135-139`); the only close path is the subscription finalizer `source.close()` (`:61-100`). There are **no `pagehide`/`pageshow`/`beforeunload`/`visibilitychange` handlers** in `runtime-ui-next/src` (grep), and the audit navigates with raw `Page.navigate` without disposing the embed handle, so the app has no code that closes the source when a document is navigated away.
- **Host:** the `/api/role-model/telemetry/stream` handler writes SSE headers and subscribes, then `request.once("close")`/`response.once("close")` → unsubscribe + `response.end()` (`index.ts:19083-19101`). Cleanup is per-connection and close-driven; there is no server-side SSE cap or queue, and this handler has no heartbeat.
- **Exact potential:** if Chrome retains a navigated-away document (BFCache/slow teardown) and keeps its EventSource connection open, each of the 20 route navigations can leave one `telemetry/stream` request open. At six per-origin HTTP/1.1 connections, a later same-origin request (catalogue or the final POST) can be queued at the browser connection layer: the POST is issued (`requestWillBeSent`, start recorded) but its headers/body may not be sent and no response arrives inside 15 s. The app cannot prevent this (no pagehide close); the host cannot distinguish it (it only sees open connections). This is a plausible mechanism, not a proven cause.

## Discriminating measurement (Lead's extension already implements this)

At the final POST's `requestWillBeSent`/timeout, dump:
1. every open `telemetry/stream` requestId (no `loadingFinished`/`loadingFailed`) and their start times; count ≥6 vs closed/cancelled;
2. `Network.requestWillBeSentExtraInfo` for the final POST and whether **headers were actually sent** (boolean only; no header content);
3. all in-flight request IDs/timing by URL at the click;
4. on the persistent isolated host, after browser cleanup, a direct Node POST to the same endpoint (backend alive/queued?).
Decision: **≥6 open SSE and no extraInfo at 15 s → browser connection starvation (not backend)**; **<6 SSE, extraInfo sent, no response → backend/fixture queue**; **extraInfo sent and response later >15 s → latency/bound**; **old SSE show loadingFinished on navigation → starvation excluded**. No product fix or timeout change yet.

## Browser BFCache / SSE seam — exact evidence required (currently **NOT proven**)

Code facts confirmed read-only:
- `src/main.ts:10-12` calls `mountWithDiagnostics(container, { baseUrl })` and **ignores the returned handle**; there is no `pagehide`/`pageshow`/`beforeunload`/`visibilitychange` disposal anywhere in `runtime-ui-next/src`. The only EventSource close path is the subscription finalizer (`refresh.ts:61-100,135`).
- Host `subscribeTelemetry` returns `() => telemetryListeners.delete(listener)` (`index.ts:33595-33600`), so the two close hooks (`request.once("close")`/`response.once("close")`, `:19093-19100`) are safe to run twice. Cleanup is per connection; there is no SSE cap or queue.
- The browser side is **not decidable from this code**: a full `Page.navigate` may destroy the old document and close its EventSource (then `Network.loadingFinished`/`loadingFailed` appears), or keep it in BFCache (connection remains; no finish event). The old React client's hooks are not evidence for this Foldkit client and were not inspected.

Exact CDP evidence needed before fixing anything:
- `Page.frameNavigated` events with **loaderId** per route (a new loaderId = new document; reused loaderId = BFCache restore), plus `Page.frameDetached`/`Page.lifecycleEvent` if available;
- `Network` requestIds for every `/api/role-model/telemetry/stream`: `requestWillBeSent`, then whether `loadingFinished`/`loadingFailed` arrives before the next navigation; open-stream count and start times at the final POST;
- final POST `requestWillBeSentExtraInfo` (headers actually sent boolean), `responseReceived`/`loadingFinished` timing;
- optionally on the persistent host, a direct Node POST after browser cleanup to test backend liveness.

Until those show retained stream requestIds across navigation with the final POST's headers unsent, the BFCache/connection seam stays **unproven**; do not patch `main.ts` or add unload disposal blindly. The short controller/provider/Studio isolates (fresh hosts) pass; the full-wire first attempt was NOT_RUN (seed startup race, preserved), so the original failing POST remains open.

## S289 wire proof — scope and 6-connection exclusion (read-only, no socket-count claim)

Actual `E:/rm-tmp/s289-full-wire-ready.log`: `openTelemetryStreamIDs=41`, final POST `claude-3.7-sonnet` (button disabled=false, raw=idle), `requestWillBeSentExtraInfo` false, latest catalogue `phase=final status=200 duration=17ms`, POST start 991 ms later, no status; independent Node POST to the same backend 481/415 ms.

- **The 41 value is CDP request-ID bookkeeping, not a socket count.** The audit tracks each `requestWillBeSent` whose URL includes `/api/role-model/telemetry/stream` and deletes it only on `loadingFinished`/`loadingFailed` (audit `:125-126`). After many full navigations those finish events can be lost/not delivered, so 41 open IDs cannot be 41 open sockets. Do not cite 41 as actual concurrent connections.
- **Origin limit:** the host is a Node `http.createServer` (HTTP/1.1, `index.ts:20733`; no h2c/http2 in the server path), and Chrome's 6-connections-per-host:port limit applies to normal HTTP requests, which includes `EventSource`; WebSocket/QUIC use separate pools (none here). If the host did negotiate HTTP/2, multiplexing would remove the 6 limit — this host does not.
- **Why 6-slot starvation is not established:** 41 > 6 already proves the IDs are not sockets. More directly, the final catalogue GET completed `200` in `17 ms` after the stream count was taken; if six actual HTTP/1.1 sockets were occupied, that same-origin GET could not complete. After it completed, one connection was free, so a POST issued 991 ms later should have had a socket. The queue must therefore be measured, not inferred: it may be missed finish events, a different browser scheduling/throttling path, or retained sockets that free and refill between the GET and the POST.
- **`requestWillBeSentExtraInfo` false is suggestive, not conclusive:** absence can also be a missing/undelivered CDP event; pair it with `Network.responseReceived`/timing and, ideally, a browser NetLog or OS socket count (`Get-NetTCPConnection` against the host port) during the gate.

### Controlled intervention (Lead-owned, temporary audit bootstrap)

Install before any page script via `Page.addScriptToEvaluateOnNewDocument` a wrapper that tracks every `EventSource` and closes it on `pagehide`:

```js
(() => {
  const Native = window.EventSource;
  const live = new Set();
  function Wrapped(url, init) {
    const es = new Native(url, init);
    live.add(es);
    const close = es.close.bind(es);
    es.close = () => { live.delete(es); close(); };
    return es;
  }
  Wrapped.prototype = Native.prototype;
  Object.setPrototypeOf(Wrapped, Native);
  window.EventSource = Wrapped;
  addEventListener("pagehide", () => { for (const es of live) es.close(); live.clear(); });
})();
```

If the full gate then lets the final POST complete (or `extraInfo` becomes true), the seam is lifecycle/connection retention; if it still queues, the seam is elsewhere. This is diagnostic only, not a product change.

### Shortest real RED S278 lifecycle-owner test — only if the intervention proves the cause

In the S278 lifecycle owner (`refresh`/`mount` tests), mount the shell with a fake `RuntimeEventSourceFactory`, dispatch `window.dispatchEvent(new Event("pagehide"))`, and assert the single source closed exactly once and a post-pagehide event offers nothing. Current code has no pagehide handler, so the test is RED; the fix would belong in the S278 shell/subscription lifecycle (closing the one source on pagehide), **not** an added blind unload in `main.ts`. Do not add this test or fix until the intervention proves the lifecycle seam.

