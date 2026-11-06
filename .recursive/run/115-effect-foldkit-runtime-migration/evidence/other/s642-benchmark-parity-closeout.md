# S642 - Benchmark page parity with production (goal-43b251fc)

## Final artifact
0.0.20-684-g41d60424 (HEAD 41d60424; includes 404a4daa host accounting, 82c13ca9 UI requested/executed coherence, fa03a379 production benchmark parity), sha256 d03ed8216be3... - CHANGED vs fc58fcef. verify-packaged-candidate PASS. UI suite 122 files / 1027 tests PASS. Health healthy. Fresh root seeded only real DeepSeek endpoints.

## Owner reports addressed
1. "3 models selected but it says model 2/2 and steps out of sync with the case number" - host silently dropped unhealthy requested endpoints and progress counters were published in separate writes.
2. "same model displayed several times in Benchmark scores and v4 pro not displayed at all" - the dropped endpoint plus score rows labeled by displayName/model with a hardcoded Profile column.
3. "this ui is not consistent with the production build" (Taxonomy dimensions) - our port rendered one merged all-dimensions table instead of production's single-active-dimension list.

## Fixes
Host (404a4daa):
- requestedEndpointCount / executedEndpointCount / skippedEndpoints[{endpointId, reason}] on progress + result; requested ids deduped; no silent drop; endpointCount = executed.
- Step invariant: at case start completedSteps = (endpointIndex-1)*caseCount + (caseIndex-1), published in the same update; after persistence +1; monotonic; completion = totalSteps.
- Tests: 3 requested/3 executed incl. two sharing a model (endpointCount 3, case-start steps 0,1,2, completion 3/3); unhealthy requested endpoint -> requested 3 / executed 2 + explicit skipped entry.

UI coherence (82c13ca9):
- Run request records click-time selection; panel renders "Requested N endpoints - executed M - skipped: ..." and highlights mismatches; polls whose runId differs from the started run are ignored (no stale snapshot); a case index contradicting completedSteps is never rendered.
- Tests s642 (5), RED t132-progress-red.log -> GREEN.

Production parity (fa03a379 + 41d60424), matching apps/runtime-ui/app/routes/control-benchmark.tsx:
- Benchmark scores: header Last run (summary runId) / Suite / Judge (+ Completed); columns Model, Overall, Profile, Easy, Medium, Hard, p50, p95, Scope, Actions; Model cell = displayName with reasoning-effort suffix + "runId · mode" (or "profile-derived") + endpoint path + evidence label; one row per endpointId; per-row Clear profile (endpoint DELETE); production empty-state wording.
- Taxonomy dimensions: description "Filters switch which dimension is active."; Role/Task/Capability filters mutually exclusive; active dimension renders ONLY its endpoint-keyed list under an eyebrow ("Role: coder") with model + endpoint path + score; the three production empty states.
- Run history: runId, "mode · N cases · N models", "completedAt · suiteId", mode badge, outcome + passed/total, View details.
- Tests s643 (same-model distinct rows, v4-pro row, summary runId/mismatch) and s644 (filter exclusivity, single-dimension list, empty states, history fields); s624/s622/s563/s640 updated; targeted 55/55; tsc 0; full UI 122/1027; S247 4/4.

## Live verification on 0.0.20-684-g41d60424 (lead + lane)
- 3-endpoint real run e8cf403e-3be5-4100-8b8c-284b8e681c77 (deepseek-flash-low + flash-max + v4-pro-high, judge v4-pro-max): outcome partial, 34/36 passed; progress samples satisfied the invariant (e.g. ep=3/3 case=4/12 steps=27/84 = (3-1)*12+3).
- Benchmark scores rendered: LAST RUN e8cf403e-... | SUITE Quick | JUDGE deepseek/deepseek-flash | Completed timestamp; table columns Model/Overall/Profile/Easy/Medium/Hard/p50/p95/Scope/Actions with THREE distinct rows - "deepseek/deepseek-flash (low)", "deepseek/deepseek-flash (max)", "deepseek/deepseek-v4-pro (high)", each with runId · quick, endpoint path, "Exact (run artifact)", p50/p95 and a Clear action. No duplicate labels; v4-pro present.
- Taxonomy: selecting Role=coder rendered eyebrow "ROLE: CODER" with the three endpoint-keyed entries (70% / 78% / 87%) and no merged table; selecting Task=coder.edit cleared the Role filter ("" ) and switched the eyebrow to TASK: CODER.EDIT.
- Run history: e8cf403e-... | "quick · 12 cases · 3 models" | "2026-11-05 22:43 · routing-capability-v2" | "Outcome: partial · 34/36 passed" | QUICK badge | View details.

## Evidence
- 41d60424 production-vs-packaged DOM/screenshots + 3-endpoint fixture; s9b version-named evidence for 684.
- Fixes and test logs: 404a4daa, 82c13ca9, fa03a379.

## Notes
- Single-active-run semantics: a POST while another run is active records a failed run; runs list is empty while a run is active (known host-list quirk).
