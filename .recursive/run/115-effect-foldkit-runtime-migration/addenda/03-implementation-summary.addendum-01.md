Run: `/.recursive/run/115-effect-foldkit-runtime-migration/`
Phase: `03 Implementation - addendum 01 (state-machine audit/repair/re-audit)`
Status: `LOCKED`
LockedAt: `2026-11-07T05:49:00Z`
LockHash: `3fee121c57312d479c40017fe113c019b673e04affdfe451b8cd75d8e834e52d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- 03-implementation-summary.md (DRAFT, upstream phase)
- evidence/other/s671-state-machines.md (29-machine catalogue with states/invariants/transitions)
- evidence/other/s671-ui-state-machines.md, s671-host-state-machines.md, s671-cross-state-machines.md
- evidence/other/s672-state-machine-fixes.md, s673-r39-dispatch.md, s674-r15-pi-verification.md,
  s675-new-build.md, s676-r17-joined-journeys.md, s677-r32-cross-repo-proof.md, s678-process-closure.md
- commits: 9fb0a749, 4346d9bf, 1f43f73d, 7d009224, 9b39c586, c840d974, 76e2e49a, a8253516, 662e67ff,
  e4b576eb, 93c515e7, d2bc3081 (public) and b4688938, 223c82af, 423f439d (private)
Outputs:
- addenda/03-implementation-summary.addendum-01.md
Scope note: records the owner-requested state-machine audit and the repairs performed after it; does not
re-open the earlier plan or change R34/R35 dispositions.

## TODO

- [x] Catalogue every explicit and implicit state machine (29: 11 UI, 9 host, 9 cross-repo) with states,
      invariants, transition tables and reachable invalid states.
- [x] Repair every confirmed reachable defect RED-first (UI, host, private), including retries and
      concurrency paths.
- [x] Re-verify each repair with its suite and a packaged build; document residuals without claiming them.

## What changed

The catalogue and the per-plane detail live in evidence/other/s671-*.md. Repairs were grouped into
issues and landed with their own RED/GREEN evidence:
- UI: runtime-config edit loss, device-auth modal desync, benchmark run-token fence, and the six remaining
  P2s (route reset, selection busy guard, control-route ReadControl gap, localPolicy error preserved,
  pending-action preservation, provider generation fence).
- Host: gate admission release, terminal-status final, hung-case ceiling, device-auth readback expiry,
  replay enqueue rejection, activation-batch compensation, kill-fence expiry, cross-process ledger lock,
  capture claim/lease, terminal-disposition guard.
- Private: drain claim/ack (P0), event-log archive-trim retention (P0), close/flush, two-phase CAS,
  disposition CAS, projection generation monotonicity + durable-first publish, replay lease re-fence +
  exclusive expiry.

## Verification (re-audit)

- UI: 59/59 then 73/73 targeted (s671/s672/s673 suites), tsc 0.
- Host: benchmark runner 22/22, progress 5/5, restart+claim 22/22, replay 18/18, host P1/P2 32/32, tsc PASS.
- Private: 34/34 targeted (S671 suite + durable-queue + close), replay regressions 40/40, full replay
  184/184 on rerun; node --check 0.
- Packaged: 0.0.20-818-g9ff48b98 verified by verify-packaged-candidate 12/12 PASS, plus live real-model
  requests, alias routing, restart persistence, and the active private capture->queue->projection chain
  (s675/s676/s677).

## Bound

Residuals are documented, not claimed fixed: host case timeout cannot abort the provider request; capture
remains at-least-once after a post-handler crash; activation compensation has no public-API seam test;
two pre-existing private run96 capture failures were not established either way; one 100 ms-lease test is
timing-sensitive under parallel load.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS

## Audit Gate

Audit: PASS
