# S75a Overview breakdown/source/status/difficulty filters (public, R16 capability port)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R's Overview filters are implementable for real: the host's `/api/metrics/page` accepts them (verified in `index.ts:11923` `readTelemetryQuery`).

## Measured query contract

`/api/metrics/page` accepts, among others: `windowMs`, `startAtMs`, `endAtMs`, `limit`, `cursor`, `sourceTypes` (local|remote), `statusFamilies` (success|failure|unknown), `difficultyBuckets` (easy|medium|hard), `endpointIds`, `modelIds`, `providerIds`, `providerKinds`, `routingModes`, `trafficClasses`.

## Required work

1. Overview filter row matching the reference: **Breakdown** (By endpoint / By model / By provider), **Source** (All / Local / Remote), **Status** (All / Success / Failure / Unknown), **Difficulty** (All / Easy / Medium / Hard). Each drives a re-query of `/api/metrics/page` with the corresponding parameter (`endpointIds`/`modelIds`/`providerIds` grouping is a client-side breakdown of the same row set - state how you compute it).
2. Every filter change increments a token and re-reads; a late response from a previous filter combination must not win (same discipline as the window filter). Each filter shows `aria-pressed` or a labelled select with its current value.
3. Charts and the model cost strip recompute from the filtered rows; the period/filter summary line must state exactly what is applied (e.g. 'Local only / Success / Day').
4. Tests: exact query-string assertions per filter; a filtered fixture changing the row count and the chart point count; stale-response suppression for a filter change; four states; and a RED where dropping the token lets an old response win.
5. Capture REAL filtered bodies from a temp-state host (start it yourself, send a couple of requests with distinct sources/statuses so the filters have something to select), never from :3456.

## Constraints

NO host changes, no new dependency, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The filter-to-query mapping, the breakdown computation, the tests with RED logs, the real filtered captures, counts and typecheck.