## Verdict

**PASS - all seven repairs land and nothing load-bearing broke.** I re-derived every repaired claim from the
worktrees and the frozen stage state copies rather than re-reading them out of `01-as-is.md`: the two-field R33
result, the 12-row source inventory, the public-bridge attribution of
`replay_job_not_ready_for_evaluation`, the six restored unverified items, the R5 catalog facts (0 `attachment`
fields, 1 436 `pdf` models, the three first-party DeepSeek rows pdf-free), the three LOCKED addenda, and three
live queue-stall spot-checks (26/26 deferred; the exact `effect_queue` table; operator endpoint hung while
telemetry answered 200 in 817 ms). No fabricated line or new contradiction was found.

Five P3 (non-blocking) precision notes are listed under `## New defects`; none of them changes a finding, a
requirement, or a traceability edge. The controller may lock Phase 1.

## Repair verification (1-7)

1. **PASS.** Reproduction step 4 (`01-as-is.md:44-47`) now reads "exactly two published activation-policy fields
   with no consumer (`perArmOutputEvidence`, `perArmOutputExclusionBound`)" and the `## Evidence` bullet
   (`:437-441`) reads "exactly two unconsumed fields ... controller-reproduced and recorded in
   `addenda/...addendum-01.md`". No "24" remains in the repro/evidence path. The three surviving "24"
   occurrences are legitimate (`24 bench-*` degradation counts at `:86`, `:266`, `:435`) except one discussed
   under note (a).
2. **PASS.** `## Source Requirement Inventory (T1.1)` exists (`:112-127`) with exactly 12 rows, matching the
   12-row `## Findings coverage map` in `00-requirements.md:88-103` 1:1 and in order, each with an AS-IS
   disposition that names a real section or a recorded gap. The section that was absent at first audit is now
   the phase deliverable it was declared to be.
3. **PASS.** `## Known Unknowns:402-408` attributes `replay_job_not_ready_for_evaluation` to the **public
   bridge** with four citations, and keeps the private server rows only for `deferred`/`replay_failed`. Verified
   independently: `Select-String` finds the string at `track-b-auto-replay.ts:376`, `:730`, `:773` and
   `track-b-replay-policy.ts:101`; a grep of the private
   `D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity\scripts\track-b\runtime-operations-server.mjs`
   returns **zero** occurrences, and its `:3152`, `:3498`, `:3515`, `:7199` are all about
   `deferred`/`replay_failed` exactly as the artifact now says.
4. **PASS.** All six dropped draft items are present in `## Known Unknowns` (`:409-430`) with their draft
   provenance: registry-hydration hop (`replay-catalog` #2), `vendor-version-ledger.json` write site (#3),
   `difficulty.remote-only` reachability (#5), no-re-stamp of `executionTrafficClass`
   (`sidecar-traffic-effect` #3), ranking/percentile surfaces (#4), private operations-server request budget
   (#5).
5. **PASS.** `R5` now carries file:line evidence rather than a pointer to a draft that has none. The router rule
   is real at `packages/core/src/router.ts:1434-1440` (`required_modalities.some(... !candidate.declared.
   modalities.includes(modality))` -> `:1439` `MODALITY_UNSUPPORTED`). I re-ran the catalog scan myself over
   `packages/catalog/data/normalized-catalog.json`: **0** models carry an `attachment` field, **1 436** declare
   `pdf`, and the three first-party rows are `deepseek/deepseek-flash ["image","text"]`,
   `deepseek/deepseek-v4-flash ["text"]`, `deepseek/deepseek-v4-pro ["text"]` - none pdf. See note (b) for the
   one wording caveat.
6. **PASS.** `addenda/01`, `02`, `03` all exist, each with `Status: LOCKED`, `LockedAt:
   2026-10-01T08:08:2xZ`, a `LockHash`, and a ticked `[x] Lock this addendum`, and their substance matches what
   the controller claims: 01 corrects `R11`'s 24-field premise to the measured two
   (`perArmOutputEvidence`, `perArmOutputExclusionBound`) and re-states the amended criteria; 02 corrects the
   `R3` lineage/provenance premise (no local `v4.1-flash`, `deepseek-flash` already image-capable, pinned
   upstream `978733d4` older than the cited `67dcd8c9`) and moves the fix to provenance + lineage + alias
   inheritance + override-modalities; 03 corrects the `R14` "`benchmark` is never written" clause into the
   two-plane disagreement (`benchmark-runner.ts:91/:100/:1486` write it on the execution/observation plane while
   the telemetry writer stamps `live_request`). Each addendum closes with a PASS Coverage Gate and Approval
   Gate. Note (d) records that the addenda have no separate lock receipts under `locks/`.
7. **PASS - all three spot-checks reproduce** against the frozen stage copies under `E:\tmp\rm104-queues`:
   - `replay-disposition.sqlite` / `replay_dispositions`: `select outcome, count(*) ... group by outcome` returns
     exactly one row, `deferred = 26`; no terminal outcome exists. Matches the "26/26 deferred" claim.
   - `queues_queues.sqlite` / `effect_queue` reproduces the artifact's table line for line:
     `evaluation.score` completed 12 / last `2026-10-01 02:19:48`; `learner.derive` completed 18 / `02:19:49`;
     `learner.promote` completed 11 / `02:19:50`; `learner.promote` failed 1 / max attempts 3 / `02:01:07`;
     `replay.dispatch` completed 162 / `07:48:15` and pending 1 / `07:49:23`. The evaluation/learner planes are
     empty (no pending/active rows), i.e. starved, not wedged.
   - Live probe 2026-10-01 ~08:17Z: `GET /api/role-model/telemetry/requests?limit=2` -> **200 in 817 ms**,
     while `GET /api/role-model/operator/queues` did **not** answer within a 25 s client timeout (cancelled at
     25 063 ms). The qualitative claim ("operator readback unreachable while telemetry answers") reproduces; the
     absolute 60 s/90 s figures are historical probe values and were not re-derived inside the box.
8. **PASS.** No new contradiction or fabricated line found. The repaired/added text is the part I re-derived
   most heavily (checks 1-6 above), every new anchor I sampled exists at or within 6 lines of its citation, and
   the queue-stall section's tables, timestamps and counts match the frozen stores exactly. The one residual
   "24" that can be misread against the corrected baseline is note (a), and it is defensible on the git state.

## New defects

All five are P3 documentation precision notes; none blocks locking.

(a) **`01-as-is.md:478-479` still reads "which the current private `dev` violates with 24 fields"** in
`## Prior Recursive Evidence Reviewed` (run 98 entry). Check 1's parenthetical was "no '24' remains that
contradicts the baseline", so this was checked against git rather than assumed: the private repository's local
`dev` ref is still `06c61411` (the stale controller checkout), while the pinned baseline `5df90b6d` is the
fetched `origin/dev` and the run worktree HEAD. The sentence is therefore *literally true of the local `dev`
ref* and false of the pinned baseline - which is exactly the confusion addendum-01 was written to remove.
Recommend one clarifying clause ("at the unpulled local `dev` `06c61411`; the pinned baseline is two") when the
controller next touches the file, so no Phase 2 reader re-derives R11 from it.

(b) **`01-as-is.md:172-177` says "none of them is a DeepSeek entry" (pdf models).** Scope-checked with the same
catalog scan: no `deepseek/*` first-party entry declares `pdf` (true), but seven *proxied* DeepSeek-model ids
do, e.g. `google-vertex/deepseek-ai/deepseek-v3.1-maas ["pdf","text"]`,
`google-vertex/deepseek-ai/deepseek-v3.2-maas ["pdf","text"]`, `nano-gpt/deepseek-ai/DeepSeek-V3.1 ["pdf","text"]`,
`nano-gpt/deepseek/deepseek-v3.2 ["pdf","text"]` (plus its `:thinking` variant) and
`nano-gpt/deepseek-chat[-cheaper] ["pdf","text"]`. This matches the requirement's own wording
(`00-requirements.md:161`, addendum-02 "no DeepSeek entry declares `pdf`"), and R5's premise is about the
DeepSeek *provider* entry, so it is not a contradiction - but the sentence would read more precisely as "none of
them is a `deepseek/*` first-party entry".

(c) **Source-inventory row 1 fuses two measurements.** `01-as-is.md:115` says "9/106 failures
`no_eligible_target` (run-103 monitor)"; the source finding (`00-requirements.md:93`) says **9/110**, and the
AS-IS monitor evidence (`:432-433`) says **106 requests, 10 failures**. The AS-IS section's own numbers are the
reproducible ones (the monitor tail reproduces `d=5 f=7` and the run-103 parser gave 44 samples / 106 requests /
10 failures at first audit); the "9/106" hybrid matches neither source. Cheap to fix to "10 of 106".

(d) **Addenda lock mechanism is in-file only.** `addenda/01-03` carry `Status: LOCKED` + `LockHash`, but
`locks/` contains receipts only for `00-requirements` and `00-worktree`. If the run's lock convention expects a
receipt per locked artifact, the three addenda are locked by declaration only; if the in-file
`Status`/`LockHash`/`LockedAt` triple is the convention, this is fine and needs no action. Flagged because
check 6 asked specifically whether they "are LOCKED".

(e) **Traceability row for `R5` (`01-as-is.md:565`) still points at `replay-catalog draft (T1.2b/T1.2c)`**,
which contains exactly one `attachment` mention and zero `pdf` occurrences (re-confirmed by grep). The real R5
evidence now lives in this document's own `T1.2b` bullets (`:170-177`); the row would be more accurate as
`T1.2b (this document)`.

Audit: PASS
Receipt token: r104-audit-as-is-r2-4D2X
