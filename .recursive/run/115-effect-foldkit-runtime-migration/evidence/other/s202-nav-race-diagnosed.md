# S202 The 390px routing anomaly was an audit race, not a routing defect

S201 recorded `audited / instead of /dashboard` and `no [data-route] section rendered` at 390px as **unexplained**. This round diagnosed it.

## Diagnosis

Auditing only three routes reproduced nothing:

```
debug /dashboard {"pathname":"/dashboard","routeMarker":"readback","title":"Dashboard | RM3 Foldkit shell"}
debug /studio    {"pathname":"/studio","routeMarker":"studio", …}
debug /learning  {"pathname":"/learning","routeMarker":"learning", …}
PASS x3
```

Auditing all twenty in sequence did. So it is a **navigation race in the audit**: `Page.navigate` returns before the SPA router has settled, and the next route starts evaluating against the previous document - or against a fresh document at `/`.

## Fix

Navigation now **lands deterministically**: after each `Page.navigate` the audit polls `document.readyState + "|" + location.pathname` until it equals `complete|<route>` (8 s budget), retrying the navigation once. Only then does the settle-and-evaluate step run.

```
run 1: {"routes":20,"failures":0,"focus":true}
run 2: {"routes":20,"failures":0,"focus":true}
run 3: {"routes":20,"failures":0,"focus":true}
```

Three consecutive full runs at 390x844, where the failure previously appeared intermittently.

## Why this matters more than the fix

The page-identity check I added in S199 (`pathname === route`, `[data-route]` present, `readyState complete`) is what **converted an intermittent wrong-page audit into a hard failure**. Without it the same race would have silently audited the wrong route and reported PASS - which is exactly the false-pass class review #2 was warning about.

## Final state this round

```
1440x900   {"routes":20,"failures":0,"focus":true}
 390x844   {"routes":20,"failures":0,"focus":true}   (x3 consecutive)
packaged gate
  PASS chat completion: openai/gpt-4.1-mini-fast total_tokens=56
  PASS expected model deepseek-official/deepseek-flash
  PASS chat completion: deepseek-official/deepseek-flash total_tokens=56
  {"routes":20,"failures":0,"focus":true}   exit=0
```

## Correcting my own S201 language

I wrote that the anomaly was "either a navigation race in the audit or a real narrow-width routing problem" and left it there. The first alternative was correct and testable in one round; leaving it unexplained any longer would have been a choice, not a limitation.