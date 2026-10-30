# S549 — backend verification staleness re-check (current pair)

Status: evidence-only; no code changes; no commit. Author verification, independent review follows.

## Identities and environment

- Task pair: public `7d0d25bb` / private `fc80966d`.
- Observed worktrees at verification: public HEAD `d9f37aeabb401ce541ff69c75388a92d4f9074da` (descendant of 7d0d25bb; UI/evidence commits after final8), private HEAD `fc80966dd5fd1c9460a9a4639d70a81749278ed8` (matches).
- Packaged artifact used: `D:/DEV/rm-clean/release-final8/win32-x64/role-model-dev.exe`; manifest `name=role-model-dev`, `version=0.0.20-382-g7d0d25bb`, `commit=7d0d25bb6a792cdeef02cfdb0bf70dd47dedfaf1`, `source_tree=269eb160d8df0e1c4433b5a7a58d53687029386c`, built 2026-10-30T00:15:29. This is the final8 build of the 7d0d25bb/fc80966d pair; the public worktree has since moved ahead (drift disclosed, not hidden).
- No provider credentials, no operator ports, no code edits.

## Per-item verdicts

### 1) B4 / R25 — VERIFIED-ON-FINAL8

Commands and results (public worktree):
- `node_modules/.bin/vitest run role-model-router/packages/core/test/run115-s7-route-decision-producer.test.ts role-model-router/packages/protocol-routing/test/run115-s7b-route-decision-wiring.test.ts role-model-router/packages/protocol-routing/test/run115-s7c-routing-parity.test.ts` → `Test Files 3 passed`, `Tests 13 passed`, exit 0.
- `node scripts/runtime/verify-packaged-candidate.mjs --package-dir D:/DEV/rm-clean/release-final8/win32-x64 --static-root D:/DEV/rm-clean/release-final8/win32-x64/build/client --fixture-root <pub>/testdata/router-runtime/fixtures` → PASS on the launched final8 exe, exit 0: `health: healthy 0.0.20-382-g7d0d25bb`, `models: 3 models`, telemetry/controller/learning/replay/evaluation/ui css+bundle+theme boot, `chat completion: openai/gpt-4.1-mini-fast total_tokens=56`, `ui shell`.

Verdict: the R25 routing producer/wiring/parity suites pass and the final8 packaged runtime from the 7d0d25bb pair passes the packaged-candidate gate. No R25 gap found on final8. Caveat: the public worktree is ahead of the packaged artifact, so this is final8 verification, not a re-run on the current public HEAD.

### 2) B5 / R26 — STALE-GAP-WITH-EVIDENCE (not closed)

Historical claim located: `status-a.md` B5/R26 row quotes the historical `03-implementation-summary`: "four production sweeps uncancellable"; the S8a subagent record (`subagents/s8a-worker-signal.md:44`) says it "Passed the AbortSignal ... updated four handler call sites, and stated the non-cancellable sweeps at their call sites". The original `03-implementation-summary` file for this run is not present in the current worktree, so the claim is cited through status-a + the S8a action record.

Current-source evidence that the gap remains:
- `apps/runtime-host-bridge/src/queue-runtime/workers.ts:39-49` documents that the Effect signal only reaches handlers that forward it and that non-signal-capable work must be declared at the call site; `workers.ts:302-305` states "The store has no cancellation signal of its own, so the watch ...".
- `apps/runtime-host-bridge/src/track-b-auto-replay-runtime.ts:1428-1435` states explicitly: "Effect cannot cancel the underlying capability call - Effect's own guidance is that 'a wrapper cannot cancel underlying work that exposes no cancellation mechanism' - so this does not try to stop the hung work; it stops the hung work from stopping the loop." That is a timeout/reclaim, not cancellation.
- The four production queue sweeps are the learner derive/consume sweeps (`cli.ts:8754`, `cli.ts:8812`), the post-finalization signals sweep (`cli.ts:7219`, called from `track-b-auto-replay-runtime.ts:1207-1221`), the recovery/liveness sweep (`cli.ts:7666-7676`), and the resume of pending supervised replay evaluations (`cli.ts:10605`). None of these bodies reads an AbortSignal; their extension/SQLite work is synchronous from the caller's perspective.
- What IS verified on current source: transport/SSE cancellation. `vitest run role-model-router/apps/runtime-host-bridge/test/s17b-sse-cleanup.test.ts` → 7/7 pass, exit 0 (AbortSignal reaches fetch/reader/cleanup). That does not close the queue-sweep lifetime.

Verdict: stale gap, with the exact remaining gap recorded: the four queue sweep bodies have no cooperative cancellation; only the stale-tick reclaim stops the loop from blocking, not the hung work. Closing it requires a cancellation mechanism inside the underlying capability calls (or an abort-aware sweep contract), which is outside evidence-only scope.

### 3) B7 / R29 + B8 / R30 — flush join VERIFIED; multi-host distinct-job CAP still a gap

B7/R29 in-flight capture flush join (status-a said "still not joined during close"): now verified on current private `fc80966d`:
- `node --test tests/track-b/run115-r30-request-flush-join.test.mjs` → 3/3: "close joins every in-flight request-path flush so the post-flush metrics UPDATE lands", "a request-path flush wedged past the close bound is abandoned with a recorded loss", "a request arriving after close began is refused and leaves its WAL row durable".
- Combined B7/B8 run `run115-r30-request-flush-join.test.mjs run115-r28-lease-fences.test.mjs run115-capture-queue-close.test.mjs run115-capture-drain-close.test.mjs` → tests 19, pass 19, fail 0, exit 0.
Verdict B7 flush join: verified-on-current-private; the status-a residual is stale for this item.

B8/R30 multi-host distinct-job cap:
- Lease tests pass: `run115-r28-lease-fences.test.mjs` → "a live lease cannot be claimed by a second host", "a prepared dispatch is published exactly once", "two hosts lease different jobs with no overlap".
- However there is no bounded per-host distinct-job cap to verify: `extensions/replay-core/index.mjs:965 claimJob(jobId, {leaseOwner, leaseMs})` claims one caller-chosen job by id; no max-per-host/cap parameter exists, and no test asserts a cap. The verified behaviour is distinct-job separation + lease/publication fences, not a cap.
Verdict B8 cap: partial/stale-gap-with-evidence; separating distinct jobs works, an explicit multi-host distinct-job cap is neither implemented nor tested (gap recorded).

### 4) B9 / R32 — VERIFIED-ON-CURRENT-PRIVATE (bounded to the B9 suites)

- `node --test tests/track-b/run115-b9-*.mjs` (16 files: handshake, evaluation-handshake-correctness, packaged-evaluation-layer, operator handshake/healthz, replay composition/lifecycle/shutdown, retention layer, sidecar main/scope close, storage-audit, contribution-flush-timeout, etc.) → tests 70, pass 70, fail 0, exit 0.
Verdict: evaluation-handshake and private-layer suites pass on current private `fc80966d`. This is bounded to these suites: status-a/S435 still record evaluation-handshake gaps explicitly left open, and full R32 cross-process/partial-acquire/auth/projection/ledger/package acceptance is not claimed here.

## Summary table

| Item | Verdict | Evidence |
|---|---|---|
| B4/R25 routing on final8 | verified-on-final8 | routing 13/13; packaged-candidate PASS on 0.0.20-382-g7d0d25bb |
| B5/R26 cancellation | stale-gap-with-evidence | SSE 7/7 pass; four sweep bodies non-cancellable (workers.ts, track-b-auto-replay-runtime.ts:1428-1435, cli.ts sweeps) |
| B7/R29 flush join | verified-on-current-private | run115-r30-request-flush-join 3/3; combined 19/19 |
| B8/R30 multi-host distinct-job cap | stale-gap-with-evidence | r28 two-host distinct-pass; no cap API/test in ReplayCore.claimJob |
| B9/R32 handshake/layers | verified-on-current-private (bounded) | 16 b9 files, 70/70 |

## Limitations

- Final8 is the 7d0d25bb build; the public worktree observed at d9f37aea is ahead, so B4 verification is pinned to final8 rather than a fresh rebuild from current HEAD.
- No independent review of this evidence; no code changed or committed.
- "Verified" is bounded to the suites/commands above, not a whole-requirement claim.
