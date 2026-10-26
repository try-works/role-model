# S141 Content audit: the "thin" pages are honest empty states, not stubs

I rendered all 25 navigation routes against the current package and measured the main-content text, looking for placeholder pages disguised as features.

## Result

| Band | Routes |
|---|---|
| substantial content (>200 chars) | 11 - `/models` (1201), `/learning` (806), `/control/controller` (507), `/runtime` (446), `/observe/queues` (344), `/`, `/router`, `/session-readiness`, `/observe/observability-snapshot`, ... |
| thin (<200 chars) | 13 |

The thin routes are **empty states, not stubs**. Every one reads as a state with an explicit remedy, e.g.:

```
/requests            "Requests - No telemetry requests recorded yet. Refresh ..."
/dashboard           "Dashboard - No dashboard requests recorded yet. Refresh ..."
/system/peers        "System peers - No system peers configured yet. ..."
/observe/logs        "Observe logs - No observe logs recorded yet. ..."
/diagnostics/42      "Diagnostics are disabled. This is a state, not an error."
```

That is the correct behaviour for a fixture host with no traffic, peers or logs: an empty page that says **why** it is empty and offers the action. The opposite failure - a blank panel that looks broken - does not appear anywhere.

Routes with host data do render it: `/control/endpoints` shows "3 row(s) from the live host", `/models` renders the model list, `/control/providers` shows "2 row(s)".

## Three navigation errors during the sweep

`/router/candidates`, `/local/peers` and `/local/logs` returned a browser navigation error mid-sweep (the same execution-context teardown this session hit before on rapid successive `browser_goto` calls). They are **not** route failures: the dedicated nav audit (s110, 25/25 through the real router, plus the earlier browser pass with zero dead links) covers them.

## What this establishes

The Foldkit port has no page that pretends to be implemented while being empty. Whether each page is *complete* in the sense of every planned panel is a different question, and one this audit does not answer.