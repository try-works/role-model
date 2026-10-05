Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-10-01T17:11:21Z`
LockHash: `c58087a49405d8670839f7fafebaca570e67b0e895e4d75d9b38b044d9bb4c67`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/phase5-status.md`
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md`
Scope note: The rebuilt-runtime matrix, the monitored window and the per-request readbacks, with the two
criteria that could not be shown live recorded against the locked addendum rather than asserted.

## TODO

- [x] Rebuild the packaged runtime and record its digest (`T5.1`)
- [x] Start it on its own channel and state root (`T5.2`)
- [x] Point pi at that channel (`T5.3`)
- [x] Execute the live matrix (`T5.4`)
- [x] Run the monitored window (`T5.5`)
- [x] Inspect each request's decision, telemetry and receipts (`T5.6`)
- [x] Lock this artifact

## QA Execution Record

QA Execution Mode: agent-operated

Agent Executor: `/root` (the run's controller), executing the locked plan's `T5.1`-`T5.7` on this machine
Tools Used: `corepack pnpm` (the paired distribution and SEA builds), PowerShell (`Start-Process` for the runtime, the monitor and the traffic generator), `curl.exe` (readbacks), the `pi` CLI (the matrix), `node:sqlite` (read-only store queries), `Get-NetTCPConnection`/`Get-CimInstance` (process and listener identity)

- Runtime: `role-model-dev.exe` built from the run's public worktree at `d938049d` plus the paired private
  distribution built at the same revision; SEA sha256
  `fbd0b0a476e4f3d9fde84f55c7b405a1b963eb44ad62d1d8269797523c91a806`; sidecar sha256
  `6b9b0a744f351866027e7059fde187bcab9fb1c0dab54b11fcdc5b4ff25305e7`; 13 extensions.
- Channel: its own listener on `127.0.0.1:3459` with its own state root
  `C:\Users\erikb\AppData\Local\role-model-runtime-104` and scope `standalone-runtime-dev`. The operator's
  `:3457` (stage RC) and `:3458` (dev) were never restarted, reconfigured or stopped.
- `/healthz` at start: `status healthy`, `ready true`, `executionMode remote_only`,
  `commit d938049d9e527f6789fff91d8183f919e9898a21`, `executable_sha256` equal to the digest above.
- Models: the operator's own six activated endpoints were seeded onto the run's channel through the public
  activation API. The activation body must carry the **source** endpoint kind (`remote-openai-compatible`);
  posting the readback's already-normalised `remote_api` re-normalises to `local_engine`, which is why the first
  seeding attempt produced `routingEligible: false` endpoints. Recorded because it is a real trap for anyone
  seeding a fresh state root.
- pi: pointed at the run's channel through a run-private agent directory (`PI_CODING_AGENT_DIR`) whose
  `models.json` sets the role-model base URL to `http://127.0.0.1:3459/v1`. **The operator's `D:\pi\agent` was
  not modified**; `ROLE_MODEL_ENDPOINT` alone does not redirect pi, because the provider base URL comes from the
  agent directory's model store.
- Parallel interface: the matrix completed **before** the window started, so the monitor's live class is only
  the window's own traffic plus the run's own generator; the matrix's four requests are recorded separately.

## QA Scenarios and Results

| # | Scenario | Command shape | Result |
| --- | --- | --- | --- |
| 1 | Text-only control through a posture alias | `pi --no-session --provider role-model --model baseline.remote-only -p "Reply with exactly: t5-text-ok"` | **PASS** — `t5-text-ok`, 9 s, 200, live class, `deepseek-flash-max` selected |
| 2 | Image-bearing request through `difficulty.remote-only` (`R3`'s live acceptance) | `pi … --model difficulty.remote-only @<screenshot>.png -p "In one short sentence, say what kind of image this is."` | **PASS** — correctly described the screenshot ("a dark-themed dashboard panel showing a replay request's model, endpoint, status, latency, token, and cost details"), 200, and the telemetry record names `deepseek.personal.deepseek-api-key.global.deepseek-flash` — the DeepSeek flash endpoint `R3` requires |
| 3 | PDF-bearing control | `pi … --model baseline.remote-only @<fixture>.pdf -p "Reply with exactly: t5-pdf-ok"` | **PASS** — `t5-pdf-ok`, 9 s, 200. No configured endpoint declares `pdf`, so the request routed as a text-bearing attachment; `R5`'s policy is that `attachment` is not consulted for PDF eligibility |
| 4 | `hybrid.remote-only` | `pi … --model hybrid.remote-only -p "Reply with exactly: t5-hybrid-ok"` | **PASS** — `t5-hybrid-ok`, 25 s, 200, `deepseek-v4-pro` selected |
| 5 | Monitored window (`R13`) | `monitor-104.ps1` at 30 s intervals, plus `t5-traffic-during-window.ps1` sending 14 further pi requests | **PASS with one recorded limitation** — 123 samples over 61.5 minutes (00:39:24 → 01:41 local), runtime healthy throughout, operator readback `queuesMs` 9-16 ms, one transient upstream 502, no degradation lines |
| 6 | Live-only headline metrics and excluded counts (`R14`) | `GET /api/role-model/telemetry/summary` | **PASS** — the live headline stayed at 75 % cache with `excludedRequestCount` 34 at the end (17 replay rows × 2 sample points) while the same store held replay-class rows; a replay cannot move the live cache rate, counts, latency or cost |
| 7 | Per-request decision and receipts (`T5.6`) | `GET /api/role-model/telemetry/requests` on `:3459` | **PASS** — every matrix request carries its selected endpoint, class (`live`), status, latency and tokens; the failure case carries `errorContext` naming `upstream_connection_error` with `retryable: true` |
| 8 | Replay disposition drain (`R8`'s live half) | `replay-disposition.sqlite` sampled every 60 s | **FAIL for the live criterion** — 17 rows, all `deferred`/`replay_failed`; the runtime log shows `live advisory observation skipped: route advisory observation requires decision and route package`, so the spine has no route package on this fresh state root |
| 9 | Effort-comparability exclusion firing live (`R9`) | n/a | **NOT APPLICABLE** — the producer link is not wired, so no live comparison carries the dimension; covered by the locked addendum |

## Evidence and Artifacts

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/phase5-status.md` — the setup,
  the commands and the blocker analysis.
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/` —
  `private-dist-build.log`, `public-sea-build.log`, `t5-matrix-run.log` and the four transcripts,
  `t5-monitor-window.log` (123 samples), `t5-traffic-during-window.log` (14 requests),
  `t5-disposition-samples.log` (the disposition plane over the window), `t5-per-request.txt`, and the runtime's
  error log.
- Start/seed scripts kept outside the repo: `E:\tmp\run104-phase5\{start-runtime-104.ps1, provision-104.ps1,
  reseed-endpoints-104.ps1, setup-pi-agent.ps1, t5-matrix.ps1, monitor-104.ps1, t5-traffic-during-window.ps1,
  sample-dispositions.ps1}`.

## User Sign-Off

The operator is the run's owner and asked for this verification; the live channel, the pi matrix and the window
were executed and recorded as above. No interactive sign-off step is pending from the operator for the matrix
itself. The one decision this phase hands back is whether `R8`'s live drain should be demonstrated on a channel
that already carries a route package (the operator's stage) — recorded in the locked addendum.

## Traceability

- `R3` -> scenario 2 (the image request selected the DeepSeek flash endpoint) -> `evidence/logs/phase5/t5-matrix-image-difficulty-remote-only.txt`
- `R5` -> scenario 3 (the PDF-bearing control exercised the attachment policy)
- `R8` -> scenario 8 (live drain not shown; in-suite half in `04-test-summary.md`)
- `R9` -> scenario 9 (not applicable; locked addendum)
- `R10` -> scenario 5 (operator readback latency over the window)
- `R13` -> scenarios 1-5 (rebuild, start, point, matrix, window)
- `R14` -> scenario 6 (live-only headline with visible excluded counts)
- `R1`/`R2`/`R4`/`R6`/`R7`/`R11`/`R12`/`R15` -> verified in `04-test-summary.md`; this phase adds no live
  evidence for them beyond the traffic that exercised the same paths

## Effective Inputs Re-read

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/phase5-status.md`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/queue-stall.md`
- `E:\tmp\run103-evidence\monitor-stage-30.ps1` (the monitor harness this phase adapts)

## Earlier Phase Reconciliation

- `04-test-summary.md`: its `R13` row promised the rebuilt-runtime matrix and the window; both ran. Its two
  carried requirements are the two this phase could not close live, exactly as it recorded.
- `03-implementation-summary.md` / `03.5-code-review.md`: every in-suite claim this phase relies on was verified
  there; this phase adds the live half and disputes none of it.
- `02-to-be-plan.md`: its `T5.1`-`T5.8` checklist is executed in order except that `T5.8`'s parallel option was
  chosen as "matrix first, then window".
- `00-requirements.md`: `R13`'s acceptance ("live verification of the rebuilt runtime") is met for the matrix and
  the window; `R8`'s live drain and `R9`'s firing remain open under the locked addendum.

## Subagent Contribution Verification

Reviewed Action Records: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T164608Z-sp104-phase4-tester-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T170335Z-sp104-phase35-code-review-action.md`

Main-Agent Verification Performed: the controller executed `T5.1`-`T5.7` itself (the phase rule reserves them to the controller except for delegated testers) and verified the delegated inputs it builds on - `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` and the private evaluation core - by re-running their suites before starting the runtime, then confirmed the runtime's own identity against the packaged digest, re-read every transcript, and sampled the telemetry and disposition stores directly rather than trusting a readback alone.

Acceptance Decision: accepted

Refresh Handling: the runtime was rebuilt once after the phase-4 repairs (the first SEA predated them and the packaging gate refused the stale paired distribution); after that rebuild nothing was restarted during the window.

Repair Performed After Verification: none in this phase - the runtime under test is the packaged artifact of the locked implementation plus the two phase-3.5/4 repairs (`d938049d`, `06967221`).

## Audit Context

Subagent Capability Probe: `spawn_agent` was available; this phase's delegated slots (the Phase 4 tester and the Phase 3.5 reviewer) had already delivered
Subagent Availability: available
Delegation Override Reason: `T5.1`-`T5.3` are controller-only by the locked plan, and `T5.4`-`T5.6` were executed by the controller rather than a tester because the phase-5 runtime needed seeding and a run-private pi configuration that only the controller had prepared
Audit Execution Mode: self-audit
Delegation Decision Basis: the matrix and window are mechanical executions of a prepared runtime; the controller recorded every command, and the evidence is the raw transcripts and the runtime's own stores
Audit Inputs Provided:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/phase5-status.md`
- the raw logs under `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/`

## Requirement Completion Status

- R3 | Status: verified | Changed Files: `role-model-router/packages/catalog/src/index.ts` | Implementation Evidence: `role-model-router/packages/catalog/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-matrix-image-difficulty-remote-only.txt` | Audit Note: the live image request selected the DeepSeek flash endpoint
- R13 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/cli.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/cli.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-monitor-window.log` | Audit Note: 123 samples over 61.5 minutes
- R14 | Status: verified | Changed Files: `role-model-router/packages/sqlite-memory/src/index.ts` | Implementation Evidence: `role-model-router/packages/sqlite-memory/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-per-request.txt` | Audit Note: the live headline excluded 34 non-live rows while the store held them
- R10 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-monitor-window.log` | Audit Note: operator readbacks answered in 9-16 ms throughout
- R8 | Status: deferred | Rationale: the live drain needs a route package the run's fresh state root does not have; the in-suite half is verified | Deferred By: the operator's stage channel | Addendum: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` | Audit Note: 17 dispositions, all deferred
- R9 | Status: deferred | Rationale: no live comparison carries the effort dimension because the producer link is not wired | Deferred By: a follow-up run | Addendum: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` | Audit Note: unchanged from Phase 4
- R1 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp1fix-dispatch-subset-green.txt` | Audit Note: verified in Phase 4; the window exercised the same dispatch path
- R2 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/repair-green.txt` | Audit Note: verified in Phase 4
- R4 | Status: verified | Changed Files: `role-model-router/packages/catalog/src/index.ts` | Implementation Evidence: `role-model-router/packages/catalog/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/p4-catalog.txt` | Audit Note: verified in Phase 4
- R5 | Status: verified | Changed Files: `role-model-router/packages/catalog/src/index.ts` | Implementation Evidence: `role-model-router/packages/catalog/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-matrix-pdf-baseline-remote-only.txt` | Audit Note: the PDF control exercised the policy live
- R6 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp4-green.txt` | Audit Note: verified in Phase 4
- R7 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/routes/learning.tsx` | Implementation Evidence: `role-model-router/apps/runtime-ui/app/routes/learning.tsx` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp5-ui-green.txt` | Audit Note: verified in Phase 4
- R11 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp8-focused-and-r33-green.txt` | Audit Note: verified in Phase 4
- R12 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/repair-suite.txt` | Audit Note: verified in Phase 4
- R15 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp4-tester-audit-findings.md` | Audit Note: repaired in Phase 4

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `84d5996cb156217d37801943831762bc734ae21f`
- Comparison reference: `working-tree`
- Normalized baseline: `84d5996cb156217d37801943831762bc734ae21f`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`
- Private baseline: `5df90b6d12772f70bbdaff543b183fc5d312537b`
- Actual changed files reviewed: this phase changes **no product file**. Its additions are run-folder artifacts
  (`05-manual-qa.md`, the `phase5` evidence directory) and files outside the repo
  (`E:\tmp\run104-phase5\*`). The runtime under test was built from the revision the earlier phases locked;
  the only product files it contains beyond Phase 3 are the two repairs recorded in
  `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03.5-code-review.md` and the one in
  `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`

## Gaps Found

None unresolved for this phase's lock beyond the two requirements the locked addendum already carries:

1. `R8`'s live drain cannot be shown on a fresh state root (no route package), recorded with the runtime's own
   advisory-skip line and 17 deferred dispositions.
2. `R9`'s exclusion cannot fire live until the producer link is wired, recorded in the same addendum.

Both are covered by `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`.

## Repair Work Performed

None. This phase executed and measured the artifact the earlier phases locked; it changed no product code, and
the one setup defect it found (the endpoint-kind normalisation trap) is recorded above as an operational note
rather than a code change.

## Audit Verdict

Audit: PASS

The rebuilt runtime was packaged, identified by digest, started on its own channel, pointed at by pi, exercised
with the required matrix and monitored for 61.5 minutes with 123 samples and 14 further live requests. Every
claim above is backed by a raw log or a runtime store read. The two criteria that could not be shown live are
recorded against a locked addendum with the evidence that explains them, not asserted as passing.

## Coverage Gate

- [x] `T5.1`-`T5.7` executed with the artifacts named
- [x] The matrix covers image-through-a-posture-alias, text control, PDF control and `hybrid.remote-only`
- [x] The window exceeds the required 30 minutes and records its own samples
- [x] The live-only metrics and the excluded counts reconcile in the same store
- [x] The two non-closable criteria are carried by a locked addendum

Coverage: PASS

TDD Compliance: PASS

## Approval Gate

- [x] The runtime under test is the packaged artifact of the locked implementation
- [x] The operator's live channels were not disturbed
- [x] The live evidence is recorded, including the one live failure and its classification

Approval: PASS
