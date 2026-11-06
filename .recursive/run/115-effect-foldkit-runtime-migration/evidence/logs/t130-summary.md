# Task-130 - real active alias id (no fabricated strategy.execution_mode)

## Root cause
router-family-view.ts rendered "Current active alias" as activeAlias + "." + executionMode, producing
baseline.remote_only, while every real alias id uses the hyphenated suffix (baseline.remote-only,
decision-only/local-only/remote-only/hybrid from unified-runtime-config primaryRoutingAliasExecutionSuffixes).
The fabricated id routes to no pool (chat 400 no_eligible_target).

## Fix
- Prefer the router readback profile row labelled alias/activeAlias when present.
- Otherwise resolve the persisted strategy + execution mode against the runtime-config alias inventory using the
  documented hyphenated suffix (decision_only->decision-only, local_only->local-only, remote_only->remote-only,
  hybrid->hybrid); exact-id match only.
- Never concatenate the execution-mode token into an alias id. When the inventory has no match the strategy id is
  shown as-is (unresolved alias).
- Added a separate "Execution mode" stat so the mode is labelled as a mode, not an alias.

## Evidence
- s641: executionMode remote_only + inventory baseline.remote-only renders "baseline.remote-only" and never
  "baseline.remote_only"; the router readback alias row (baseline.local-only) wins over resolution.
  RED t130-alias-red.log (both cases failed) -> GREEN t130-alias-green.log (2/2).
- t130-s247.log 4/4; t130-full-ui.log full suite 119 files / 1014 tests PASS; tsc 0.

## Packaged DOM evidence (:3484, production runtime-config copied read-only, dev host with this build)
- /router renders: "Current active alias baseline.remote-only" and a separate "Execution mode remote_only"; the alias
  inventory lists the hyphenated ids. bodyHasUnderscore=false. Evidence: t130-router-alias-3484.png and
  t130-router-alias-dom.json.
