# S641 - Benchmark selection/progress consistency (goal-43b251fc)

## Final artifact
0.0.20-680-g82c13ca9 (HEAD 82c13ca9; host 404a4daa + UI 82c13ca9), sha256 fc58fcefa822... - CHANGED vs 72c9b1ad. verify-packaged-candidate PASS. UI suite 120 files / 1019 tests PASS. Health healthy. Root seeded only real DeepSeek endpoints.

## Owner report
Run started with 3 selected endpoints showed "model 2/2" and "2 / 60 steps" while at "case 4/12".

## Root cause
1. Host silently dropped requested endpoints that were momentarily unhealthy: targetEndpoints = healthy endpoints filtered by request.endpointIds (benchmark-runner.ts:1705-1720); endpointCount and totalSteps then reflected the reduced set (2 endpoints -> 60 steps), with no signal that one requested endpoint was skipped.
2. Progress counters were updated in separate writes: the case cursor was published at case start while completedSteps incremented only after persistence, so a poll could observe a case index ahead of the step counter (the "case 4 / 2 steps" mismatch), especially with a stale snapshot from another run.

## Fix
Host (404a4daa):
- New progress/result fields: requestedEndpointCount, executedEndpointCount, skippedEndpoints [{endpointId, reason: "unhealthy"|"not_configured"}]; requested ids deduped; endpointCount remains the executed count; nothing is silently dropped.
- Step invariant: at case start completedSteps = (endpointIndex-1)*caseCount + (caseIndex-1) published in the same update; after persistence caseStart+1; monotonic; completion equals totalSteps.
- Tests: "executes every requested endpoint, including two sharing a model, and keeps step progress aligned with the case cursor" (3 requested/3 executed, endpointCount 3, case-start steps 0,1,2, completion 3/3); "reports an unhealthy requested endpoint instead of silently dropping it" (requested 3 / executed 2, skipped [{ep-b, unhealthy}]). Host tsc 0; targeted 26 + 29 tests.
UI (82c13ca9):
- benchmarkRunRequestedEndpointIds recorded at click time; panel renders "Requested N endpoints - executed M - skipped: ..." and highlights mismatches; consumes the host fields when present with a derived fallback.
- Polls whose runId differs from the run this client started are ignored, so a stale snapshot cannot replace the active run; a case index that contradicts completedSteps is never rendered.
- Tests s642 (5): mounted POST body with 3 endpointIds; host counts/skipped display; derived fallback; stale runId ignored; contradictory case index suppressed. RED t132-progress-red.log (4/5) -> GREEN 5/5; tsc 0; full UI 120/1019; S247 4/4.

## Real 3-endpoint verification on 0.0.20-680-g82c13ca9
- POST run with deepseek-flash-low + deepseek-flash-max + deepseek-v4-pro-high, judge deepseek-v4-pro-max.
- Live progress samples (lead): ep=2/3 case=10/12 steps=21/84 expected=21 match=true; ep=2/3 case=12/12 steps=23/84 match=true; ep=3/3 case=1/12 steps=24/84 match=true; UI panel "Requested 3 endpoints - executed 3", Phase 3 of 3 compare, 74/84 steps, no "model 2/2".
- Final run f3422b68-ac5c-4256-ac1a-e79715c493b0: status completed, outcome partial, requestedEndpointCount 3, executedEndpointCount 3, steps 84/84, caseCounts {total 36, passed 33, failed 3}; endpoint scores flash-low 0.838 (1/12 failed), flash-max 0.842 (1/12), v4-pro-high 0.775 (1/12) - one genuine miss per endpoint, no transport failures or silent skips.

## Notes
- A second POST while another run is active yields a failed run record (single-active-run semantics); observed and expected.
- Evidence: 404a4daa + 82c13ca9 tests/logs; s9b final version-named evidence commit for 680.
