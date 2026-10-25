# S71 R16 verdict: the client replacement does NOT yet preserve the operator surfaces

The systematic R-vs-C comparison (`evidence/other/s70b-ui-comparison.md`, 20 screenshots) classified 10 sections: **1 same, 3 different, 5 regression, 1 missing**. I verified the two most concrete claims myself against the candidate on `:5802`.

## Confirmed by the lead

| Claim | Verification |
|---|---|
| `/models` is missing | C `/models` -> `Not found: /models` (R has `/app/models` "Configured models") |
| Duplicate `h1`s on five+ routes | measured **2 `h1`s** each on `/studio`, `/local/choose`, `/control/providers`, `/control/endpoints`, `/models` and the NotFound page - a candidate-only regression, since the single-title rule was only fixed on `/learning` |

## Lost operator capabilities (R has them, C does not)

1. **Models page** - R `/app/models` "Configured models"; C has no route.
2. **Overview filters and model pool** - R has Breakdown / Source / Status / Difficulty filters plus a quality-cost-speed model pool with route-score sizing; C has only Time range and aggregate charts plus a 1-D cost strip.
3. **Remote / Connect / System actions** - R has provider setup, connect/account actions and a runtime-config editor; C renders readbacks only.
4. **Router strategy controls** - R edits the strategy; C shows a summary readback.
5. **Five Studio tabs** - present in C with honest 404/400 inside them, but with no R equivalent; additive rather than a replacement.

## What survives

Navigation, the Overview readbacks, Learning, Local and a request list; empty/disabled honesty is otherwise good, and no fabricated content was found.

## Honest conclusion

The Foldkit client is a real, styled, browser-verified product surface - but as of now it is a **read-mostly subset** of the 0.0.20 operator UI, not a replacement. R16 cannot pass on this. The remaining work is a capability port (editors and filters), not styling: models page, router strategy editor, provider/connect/system actions, runtime-config editor, Overview breakdown/filters, and the model pool with quality/speed once a host field exists for them.

Recorded rather than softened: this is the single most important finding of the UI effort so far.