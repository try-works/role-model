# S503 — meet 24x24 control size for listbox triggers

Status: pending
TDD Mode: strict
Public basis 36d19496.

Packaged rendered audit (release-final5, Chrome) FAIL on /requests: "controls under 24x24: Average latency 103x17, Endpoint variants 114x17" - the two S491/S496 listbox triggers render below the WCAG 2.2 target-size minimum. 19/20 routes pass; this is the only failure.

Repair: give the listbox trigger a minimum 24x24 interactive target (min-height/min-width/padding in src/ui/listbox.ts or requests-ranking-view styles) WITHOUT changing visual layout materially or breaking existing tests; message flow unchanged.

Strict RED first: a DOM test (or audit-rule unit) asserts the rendered trigger offsetWidth/offsetHeight >= 24; today 103x17/114x17 fails. Then minimal fix; suites s491/s499/s397/s425/s458/s111 green; UI tsc 0; lint zero added-line; re-run packaged audit-rendered-ui until /requests PASS (20/20); freeze hashes; independent review by a different member; no commit.
