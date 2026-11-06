# S289 — causal receipt: pagehide EventSource lifetime vs exact socket claim

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash** (verified live via `list_agents`). Read-only: no CLI, children, runtime/build, operator action or source edits.
- Artifacts compared: failure `E:/rm-tmp/s289-full-wire-ready.log`; intervention PASS `E:/rm-tmp/s289-pagehide-experiment.log`; experiment `E:/rm-tmp/s289-pagehide-experiment.mjs` vs current audit `scripts/runtime/audit-rendered-ui.mjs`.

## Exact intervention difference

- Experiment SHA-256 `65cbedbaa129087eba7391eb911e3ae39fedcdc67100d787d5ac0ae208c65e1f` (433 lines, 30,281 B); current audit `E8AB32C4F73D5483117C36573D98E1549EA1785FF358C43AE10974250B5F6B98` (431 lines, 29,701 B).
- Line diff: **1 added line, 3 removed lines**, and only two hunks:
  1. import path changed from `./studio-audit-evidence.mjs` to an absolute `file:///D:/...` URL (temp-copy artifact only, no behavior change);
  2. a two-line `Page.addScriptToEvaluateOnNewDocument` bootstrap (comment + proxy `EventSource`, `owned` set, `pagehide` closes all owned sources) inserted after `Network.enable`, before emulation/navigation.
- No route list, sweep/control sequence, timeout, outcome predicate, or other policy line differs.

## Log comparison (same pinned exe/UI, identical 20-route/sweep/control/final sequence)

| Observation | Full wire (no intervention) | Pagehide intervention |
|---|---|---|
| `openTelemetryStreams` (CDP IDs) | 41 | 42 |
| final POST `requestWillBeSentExtraInfo` | **false** | **true** |
| final catalogue | phase=final 200, 17 ms | phase=final 200, 15 ms |
| final Studio POST | claude-3.7-sonnet, start 388102 ms, **status undefined, no duration** | claude-3.7-sonnet, start 87812 ms, **200, 203 ms** |
| click state | disabled=false, raw=idle, claude-3.7-sonnet | disabled=false, raw=idle, claude-3.7-sonnet |
| audit outcome | `raw:loading`, **FAIL (1 failure)** | `raw:success` / `applied`, **PASS (0 failures)** |

## Causal conclusion (bounded)

The intervention changes **only browser EventSource lifetime**: every page's owned source is closed on `pagehide`. With that single change, the identical full gate passes and the final POST's headers are actually sent (extraInfo true) and receive 200 in 203 ms, instead of starting and never completing. This is **strong intervention evidence that retained EventSource/connection lifetime across the many full navigations is causally implicated** in the gate failure. Isolated controller/provider/Studio sweeps on fresh hosts passing (Lead) is consistent: accumulation needs the full route/sweep sequence.

## What this does NOT prove

- **Not an exact socket/pool count.** `openTelemetryStreams` is 41/42 in both runs; it is a CDP request-ID set that only deletes on `loadingFinished`/`loadingFailed`, and those finish events are missed for navigated-away streams. 41/42 cannot be 41/42 real sockets (Chrome's HTTP/1.1 per-origin limit is 6), and the final catalogue GET completed in 15-17 ms in both runs. The 6-pool exhaustion explanation remains plausible but unmeasured; the receipt supports **lifetime/retention**, not a measured socket count.
- The bootstrap may also change BFCache eligibility of pages with closed sources; no `pageshow` reopen was implemented in the experiment, so the BFCache-restore path was not exercised. One run per arm; no netlog/OS socket measurement.
- This is not a candidate PASS and not a product fix.

## Product implication for S5 S290 (review only)

Closing the one owned source on `pagehide` and reopening exactly one source on `pageshow persisted` is the matching minimal lifecycle. Do not dispose the whole runtime unless it is remounted on pageshow; on restore, re-open the source and invalidate/resync current data so events missed while closed cannot be trusted. The S290 test must prove one source per owner, close on pagehide, reopen on pageshow-persisted, and no offers into a disposed stream. Independent review of that freeze comes after the causal receipt.

