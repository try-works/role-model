# S633 - Charts fix + remaining UI gaps closeout (goal-b4a78dd6)

## Final artifact
0.0.20-594-ga0497dec (HEAD a0497dec), sha256 5389451949f4e294cb91de2c063011e721d564eba2605cc65fdff4b7734a6208 - CHANGED vs the previous build (1159f876). verify-packaged-candidate PASS all checks; health 200; served /assets/main.js byte-identical to the packaged client.

## Workstream A - charts (owner-reported MAJOR FAIL) - FIXED
Root causes (bff0cb9a):
1. Series data binding: token/cache/latency/volume series were built from emptyPoints() placeholders instead of the per-request metrics items; now aggregated from input_tokens/output_tokens/cache_tokens.
2. Query bug: READBACK_SPECS dashboard/overviewMetrics pathFor('') produced "?windowMs=" with an empty value and the rail passed an undefined dashboard id; now defaults to 86400000 and is always passed.
3. Empty state: loading/error/empty copy rendered BELOW a blank plot; now inside [data-chart-plot][data-chart-empty-message] per-chart hasData.
Observe volume binding (1132911f + 56273434 + 43c000bf): /requests and /observe/routing schedule the metrics readback on entry, ChangedUrl, readPlanForRoute invalidation and range changes; Requests draws Requests+Failures, Routing draws Requests (timestamp caveat stated); s628 asserts Day (86400000) AND Week (604800000) mounted-route queries plus the route re-reads; genuine RED transcript committed (s628-charts-red.log at f7939095) and the summary corrected (5/5, not 4/5).
Verified on the final instance: overview chart paths [1,3,2,2]; Requests volume 2 paths / series 2 with 2 wired ranking selects; Routing volume 1 path; :3456 same-window comparison documented (Day empty in production, Week series).

## Workstream B - recorded gaps
1. SystemOperator/SystemExtensions (5c74ed01 + 02bbb285): reference card order/copy restored (Operator Controls -> Capability Status badge grid -> Trace lineage -> Replay Jobs -> Evaluation Jobs -> Shadow Learning w/ mode select + Storage link; Extensions: Contribution posture -> Recommendation ledger -> Replay automation -> Inventory table w/ per-row Pause). Caveat corrected to STRUCTURAL parity only with the exact visual remainder enumerated (Trace/Replay/Evaluation static copy, Shadow Learning panels, live contribution/replay records, recommendation apply/dismiss, inventory health/actions).
2. Benchmark gaps (7a7134ac): subject checkboxes + "N of M selected" + Run gating (>=2 selected, judge, not running) with endpointIds in the body; per-model clear with confirm (DELETE /benchmark/endpoints/:id/data); judge preferences readback + PUT /benchmark/preferences; active-run polling (1.5s GET /benchmark/runs/:id, stops on terminal + refreshes); taxonomy role/task/capability filters over the real score shape; real p50/p95 from caseAudits. Raw at-commit transcripts committed (ee14102d).
3. Remote/account role binding (59976f3d + 75ab17cb): role toggles for remote/account-managed models POST /api/role-model/accounts with the full account body and recomputed modelRoleBindings (all/include/exclude, non-target bindings preserved); account eligibility rendered; missing account row is an explicit no-op; KNOWN GAP retired; s618 asserts the full body and all three modes (16/16).
4. Requests scanner gap (8b0c8f40 + a0497dec): ranking selectors are real wired selects driving POST /api/role-model/telemetry/query; the dead listbox feature path removed (view/routes/shim deleted, imports cleaned, ui/listbox.ts untouched); s491 captures method+pathname; scanner reports Requests with zero unwired controls and no error; s617/s623 no longer pin a gap.

## Verification
- Full UI suite at a0497dec from a clean worktree: tsc 0, 105 files / 956 tests PASS, node --test 21/21, exit 0 (raw transcript e82bb186; first run had one environmental S48a 20s timeout, green rerun recorded).
- S247 click budget green (the s628 Week click recorded with rationale).
- All slices independently reviewed; HOLDs closed with evidence (raw transcripts, exact bodies, RED logs).

## Honest remainder (recorded, not claimed)
SystemOperator/SystemExtensions STRUCTURAL parity only - the per-section visual remainder is enumerated in task102-visual-parity-caveat.log. Owner clarifications (R39-live meaning, R28 prune approval, R20 limit numbers) remain out of scope.
