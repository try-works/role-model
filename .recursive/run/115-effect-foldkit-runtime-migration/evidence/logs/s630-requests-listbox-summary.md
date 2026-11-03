# S630 / task-108 - Requests ranking selectors wired and machine-detectable

## Problem
The Requests route rendered its ranking metric/target pickers through the Foldkit Listbox submodel
(ui/listbox.ts -> childAttributes()), which requires a runtime render frame. The handler-presence recorder
could not enter that frame and reported the route as a scanner ERROR (the only known recorder gap), so the
selectors were not machine-visible as controls and selection could not be driven/asserted on the route.

## Change
- observe/views.ts now renders two real <select> controls (Ranking metric / Ranking target) with
  h.OnInput -> Message.RequestsRankingFieldChanged({ field: "metric" | "rankingTarget", value }). The parent
  handler already builds and dispatches the real ranking readback query, so selection now drives
  POST /api/role-model/telemetry/query directly and remains fully scanner-visible.
- Replaced the submodel render block and removed its now-unused imports/helper; view.ts and the s619 test
  wrapper no longer pass listbox models.
- s617: no route reports a scanner error now; the Requests entry is asserted to have zero unwired controls.
- s491/s496: rewritten to drive the real selects on the mounted route and assert the ranking query payload
  (they previously drove the removed listbox popup; the facade module itself is unchanged and covered elsewhere).

## TDD
- RED: evidence/logs/s630-requests-ranking-red.log - at the pre-change tree the new s630 test fails:
  scanRouteTag("Requests").error is the Foldkit "must be called inside a runtime-driven render" error and the
  mounted route has no [data-requests-ranking-metric] select (both tests failed).
- GREEN: evidence/logs/s630-requests-ranking-green.log - s630 2/2 (scanner: no error, zero unwired, >=2 wired
  selects; behavioral: select change dispatches the ranking query with metrics/ranking metric and target).
- Targeted: s630+s617+s619+s491+s628+s565+s534 = 7 files / 90 tests PASS, tsc 0
  (evidence/logs/s630-requests-targeted.log).
- Full UI suite: 105 files / 956 tests PASS, tsc 0 (evidence/logs/s630-requests-full-ui.log; the pnpm test chain runs tsc first).
- S247 lane: 4/4 (evidence/logs/s630-s247.log), unaffected because no synthetic .click() was added.

## S247
No synthetic .click() was added: the new test drives selection with dispatchEvent("input"/"change"), so the
S247 click budget is untouched (the Week-range click entry from task-109 remains the only s628 click).
