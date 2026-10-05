# Independent audit - Phase 1 AS-IS artifact

Auditor: subagent `audit104_as_is` (read-only; this file is the only write)
Artefact under audit: `01-as-is.md` (31 317 bytes, mtime 2026-10-01 15:40:32)
Baselines: public `84d5996c` / private `5df90b6d`. All checks below were re-derived from the worktrees and
the live readback; no claim in this file is copied from the artifact.
Budget note: the 15-minute box was respected for the checks; this write-up ran ~3 minutes over.

## Verdict

**FAIL - repairable, and the artifact is substantively strong.** The engineering content reproduces: I
re-ran or re-read 11 claims across all nine `T1.2` families plus the addendum's two-field claim, and 10
reproduced exactly (including the R33 failure set, the 5 s sidecar budget, the four capture paths, the
`live_request` stamps, and the monitor log's 44/106/10). It fails on four repairable defects: (a) two
stale "24 unconsumed fields" lines that the artifact's own body and addendum contradict - the Evidence
bullet is not reproducible as written; (b) the declared `T1.1` deliverable section
(`## Source Requirement Inventory`) is absent; (c) one code pointer misattributes
`replay_job_not_ready_for_evaluation` to the private server, where the string does not exist; (d) the
Known Unknowns list silently drops five items the analyst drafts explicitly marked unverified.

## Per-check results

| # | Check | Verdict |
| --- | --- | --- |
| 1 | Coverage R1-R15 points at real sections or recorded gaps | PARTIAL |
| 2 | Reproduction commands exist and are executable read-only | PASS, one defect |
| 3 | Eleven spot-checks (>= 2 per family, incl. addendum) | 10/11 reproduce; see below |
| 4 | Known Unknowns honest and complete vs the drafts | FAIL |
| 5 | Prior Recursive Evidence Reviewed grounded | PASS |
| 6 | Worktree Diff Audit correct | PASS |
| 7 | Locked-premise contradictions / missing addenda | PARTIAL |
| 8 | Phase 1 contract | FAIL (repairable) |

### 1. Coverage (PARTIAL)

- All fifteen `R#` rows exist in `## Traceability`, and the recorded gaps are real gaps: `R12` ("Phase 3
  obligation"), `R13` ("Phase 5 obligation") and `R15` ("no primitive map exists yet") are honest
  placeholders, not fabricated evidence.
- `T1.1` is missing its deliverable. `00-requirements.md:579` makes `T1.1`'s output
  `01-as-is.md` `## Source Requirement Inventory`; no such section exists, and the
  `## Detailed AS-IS by Task (T1.1-T1.2i)` heading has no `T1.1` subsection. The only `T1.1` mentions in
  the artifact are the heading and the "Earlier Phase Reconciliation" line.
- `R5`'s pointer is not supported by the section it names. `R5` is mapped to "replay-catalog draft
  (T1.2b/T1.2c)", but that draft contains exactly one `attachment` mention (line 68, about
  `ReplayAdmissionDecision` carrying no attachment field) and **zero** `pdf` occurrences; the
  `pdf`/`attachment` policy claim appears only in `01-as-is.md:63-64` itself, with no file:line.
- `R13` (`T1.2a`-`T1.2h`) legitimately folds into the phase-5 task; the run-103 monitor script it cites
  exists (`E:\tmp\run103-evidence\monitor-stage-30.ps1`, 4 741 bytes).

### 2. Reproduction (PASS with one defect)

Every named path/command was exercised or existence-checked read-only:

- Phase 0 worktree path and branch exist; both worktrees are on
  `recursive/104-replay-eligibility-and-evidence-fidelity`.
- `E:\tmp\run103-evidence\stage-monitor-30m.log` exists and parses to **samples=44, requests=106,
  failures=10**, with the final `q:replay.disposition w=0 a=0 d=5 f=7` - all three artifact numbers
  reproduce exactly.
- `GET http://127.0.0.1:3457/api/role-model/telemetry/requests?limit=500` answers read-only and returns
  **384 records, every one `requestClass = "live_request"`** - the mis-typing defect reproduces live.
- `node --test tests/track-b/run99-r33-policy-consumers.test.mjs` in the private worktree runs read-only
  and fails on **two** fields, not 24.
- **Defect:** step 4's expected result still says "-> 24 published activation-policy fields with no
  consumer". At the pinned baseline the command yields two; the addendum and the artifact's own `R11`
  and `T1.2i` sections say so. A novice following step 4 is told to expect a false result.
- Step 5 ("learner-gate readback gap") names no command and no artefact; it is recorded as deferred,
  which is acceptable for a timed-out endpoint, but it is the only reproduction step with no executable
  form.

### 3. Spot-checks (10/11 reproduce)

Family-by-family, each compared against the pinned worktree files:

| Family | Claim checked | Result |
| --- | --- | --- |
| `T1.2a` | `selectReplayCandidates` at `track-b-replay-policy.ts:296`; call sites `cli.ts:7772` / `track-b-auto-replay.ts:979`; `no_eligible_target` is a dispatch error (`index.ts:9008-9009`, `:26590`, `contribution-outcome.ts:37`) | reproduce, exact |
| `T1.2a` | `REPLAY_REFUSAL_CODES` at `:12-117`, `decideReplayAdmission` at `:161`, codes at `:186`/`:198`, tick adds `judge_candidate_overlap` (`track-b-auto-replay.ts:973`) | reproduce |
| `T1.2b` | `supportsCapabilityRequirement` exported at `router.ts:549`; modality rule `:1434-1440` pushes `MODALITY_UNSUPPORTED`; `toCandidateExclusion` `:1240-1246` carries both codes | reproduce, exact |
| `T1.2c` | `ModelOverride = { capabilities?, localNotes? }` (`catalog/src/index.ts:93-96`); build takes capabilities from override (`:557`) but modalities from the resolved model (`:559`) | reproduce, exact |
| `T1.2d` | `buildRequestClassification` at `index.ts:8148`; four capture paths at `:26518`, `:27509`, `:28329` (bare spread, no `classification`), `:28368-28376`; `buildBridgeTaxonomyIdentity` at `:10318` | reproduce (line anchor drift `:8163-8166` -> actual `:8169-8177`, immaterial) |
| `T1.2e` | floors `profile-learner/index.mjs:29-31`, merge `:726`, failures `:797-799`, `holdoutPassed:813`, `floors` in yield `:826`, receipt gate `:673` | reproduce, exact |
| `T1.2e` | `withReceiptReadings` projection (`runtime-operations-server.mjs:1993-2012`) carries verdict/validationRef/qualityDelta/claim/counts/countsState and **no floor** | reproduce |
| `T1.2e` | finalization boundary `evaluation-core:3759` / conflict guard `:3775-3777` / insert `:3782` / parent-job completion `:3789-3795`; stranded class named at `:723`; `candidate_not_validatable` built at public `cli.ts:1844-1851` and thrown at `:7442` | reproduce |
| `T1.2f` | `DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS = 5_000` (`track-b-operations.ts:877`), clamp at `:1488-1490`, `AbortSignal.timeout` `:999`, `TrackBPrivateOperationError 504` `:1004-1008`, timeouts not retried (`:990-991`) | reproduce, exact |
| `T1.2g` | hardcoded stamps `index.ts:20140` / `:27574`; vocabulary `sqlite-memory:1004`, `:4891`; live-only queries `:5406` / `:5503`; `telemetryWindowWhere:5945` -> aggregate `:5963` -> summary `:6070`; `filterTelemetryRequestRecords:24390`; `benchmark-runner.ts:91/:100/:1486`; `view-models.ts:1243-1244`; `sidebar-footer.ts:164+` | reproduce (minor drift: the `unknown` default is `:2846`, not `:2843`) |
| `T1.2h` | `packages/effect`, `packages/effect-mq` (v0.7.0, peer `effect: workspace:*`), `packages/sql-sqlite-node` exist; bridge declares `effect-mq: workspace:*`; **no source import** of `effect-mq` (six comment-only mentions in `queue-runtime/*` and `track-b-auto-replay-runtime.ts`); `PersistedQueue` at `queues.ts:54`, `learner.ts:60/69`, `evaluation.ts:73`, `store.ts`; `ManagedRuntime` `index.ts:156/276/389`; root `package.json:30-31` | reproduce |
| `T1.2i` + addendum | `node --test tests/track-b/run99-r33-policy-consumers.test.mjs` at private HEAD `5df90b6d` fails on exactly `perArmOutputEvidence`, `perArmOutputExclusionBound`; `KNOWN_UNWIRED` empty | **reproduces exactly** |

One claim did not reproduce (see below): the `replay_job_not_ready_for_evaluation` pointer in Known
Unknowns.

### 4. Known Unknowns (FAIL)

The list is honest about what it keeps but not complete. Cross-checking the three drafts' `## Unverified`
sections against `01-as-is.md`'s `## Known Unknowns`:

- Kept: full `replay.disposition` producer enum; which catalog entry the runtime's `deepseek-flash`
  resolves from; the R33 scan-root boundary; (implicitly) the upstream-flash reconciliation.
- **Dropped, with no home elsewhere in the artifact:**
  1. `replay-catalog` #2 - the registry-hydration hop (normalized catalog -> endpoint registry ->
     `candidate.declared.modalities`) was never read line by line.
  2. `replay-catalog` #3 - the exact write site of `vendor-version-ledger.json` was inferred, not read.
  3. `replay-catalog` #5 - whether `deepseek-v4-flash` is reachable through `difficulty.remote-only`
     today was not re-read from the live config.
  4. `sidecar-traffic-effect` #3 - it was not proven that no later re-stamp of `executionTrafficClass`
     occurs inside `routeRuntimeRequest`.
  5. `sidecar-traffic-effect` #4 - the per-model ranking and percentile surfaces were not read line by
     line (only the summary panel, sidebar and `view-models.ts:1243` were).
  6. `sidecar-traffic-effect` #5 - the private operations server's own HTTP request budget was not read.
- Handled elsewhere, so not dropped: the "120 lines" discrepancy is addressed in `T1.2f`; the
  clean-checkout build failure is addressed in `T1.2h`; the 24->2 correction is the addendum.

### 5. Prior Recursive Evidence Reviewed (PASS)

Each run named contributes a concrete constraint, and the cited sources exist: the private memory shard
`D:\DEV\role-model-internal\.recursive\memory\domains\direct-track-b.md` carries `## Run 97 ...`,
`## Run 98 authority ...` and `## Run 100 authority ...` sections; run 101's landed plane code is in
`queue-runtime/*`; run 103's `00-requirements.md`, `05-manual-qa.md` and `06-decisions-update.md` all
exist in the public worktree. The "superseded or contradicted" entries are specific (the effect-mq naming
correction; the stale memory plane), not vague summaries.

### 6. Worktree Diff Audit (PASS)

`git diff --name-only 84d5996cb156217d37801943831762bc734ae21f` in the public worktree returns exactly
five files, all inside `.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
(`00-requirements.md`, `00-worktree.md`, `evidence/other/codex-subagent-protocol.md`, two lock receipts),
plus three untracked run-folder paths (`01-as-is.md`, `addenda/`, `evidence/other/as-is/`). No product file
is touched. `HEAD` is `5f17de4e` (three run-folder commits on top of the baseline), which is consistent
with `00-worktree.md`'s note that run-folder artifacts become part of the comparison surface once
committed; the diff basis, base branch and normalized baseline in the audit section match
`00-worktree.md` exactly.

### 7. Locked-premise contradictions (PARTIAL)

- `R11`: contradiction is recorded and **has** its addendum
  (`addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`, currently `DRAFT`,
  lock checkbox unticked). The body corrects it; two stale lines in the repro/evidence sections do not
  (see below).
- `R3`: contradicted in substance and **missing an addendum**. The locked text (`00-requirements.md:151-163`)
  asserts the lineage "`deepseek-v4-flash` is a deprecated alias served by `deepseek/deepseek-v4.1-flash`";
  the pinned baseline has **no** `deepseek/deepseek-v4.1-flash` entry, has `deepseek/deepseek-v4-flash` as
  text-only with a local override applied, and has an image-capable `deepseek/deepseek-flash` - the id the
  runtime calls. `01-as-is.md` records this only under `## Gaps Found` ("Phase 2 must reconcile"); by the
  run's own R11 precedent that is addendum work, not a plan-time note.
- `R14`: one clause of the locked premise is factually wrong and has **no addendum**. The requirement says
  "the type's `benchmark` value is never written"; `benchmark-runner.ts:100`/`:1486` writes
  `executionTrafficClass: "benchmark"` and `source_type: "benchmark"` into the observation/sample tables,
  so `benchmark` *is* written there while `runtime_telemetry_records` still stamps `live_request`. The
  artifact records the two-table disagreement as a "design input the requirement did not know about".
- `R10`: the title/framing ("under replay load") is contradicted by the measurement (264 of 337
  degradations were live `req-*`). The requirement's acceptance criteria still cover the observed load, so
  this is a premise-drift note rather than a blocked criterion; it is recorded in `## Gaps Found`, no
  addendum.

### 8. Phase 1 contract (FAIL, repairable)

Novice-runnable repro: yes apart from step 4's wrong expectation. Behaviour tied to `R#`: yes, all
fifteen. Concrete pointers: yes, with one misattribution. Known unknowns: incomplete (check 4). No
fabricated evidence: **broken once** - the `## Evidence` bullet "`node --test ...` - 24 unconsumed fields
(controller-run, reproduced)" cannot be reproduced and is contradicted by the artifact's own `R11` and
`T1.2i` sections and by its addendum.

## Claims that did not reproduce

1. **"24 unconsumed activation-policy fields" (twice: Reproduction step 4 and the `## Evidence` bullet).**
   At private `5df90b6d`, `node --test tests/track-b/run99-r33-policy-consumers.test.mjs` fails with
   `published policy fields with no consumer: perArmOutputEvidence, perArmOutputExclusionBound` -
   **two** fields. Re-derived independently three times (my run, the wave-1 draft, the addendum).
2. **`replay_job_not_ready_for_evaluation` attributed to `runtime-operations-server.mjs`** (Known
   Unknowns, citing `:3149-3152`, `:3498`, `:3515`). That string does not occur anywhere in the private
   repository. It is a public bridge code: `track-b-auto-replay.ts:376`, `:730`, `:773` and
   `track-b-replay-policy.ts:101` (plus `test/run101-a40-replay-not-ready-class.test.ts`). The private
   lines `:3498`/`:3515` do carry `deferred` / `replay_failed`, so only the third item is misattributed.
3. **Minor anchor drift, reported for completeness, not as a defect worth blocking:** `T1.2d`
   `:8163-8166` -> actual `:8169-8177`; `T1.2g` `:2843` -> actual `:2846`; `:3377` is off by one. All
   sampled anchors stayed within 6 lines and every cited symbol exists.
4. **Not re-derivable now (time-varying window):** the exact "135 most recent telemetry records /
   47 by id heuristic / cache-hit 51.9% vs 68.2%" figures - the readback now returns 384 records and the
   runtime has kept serving. The load-bearing claim (every record `live_request`, including replay/bench
   ids) reproduces today: 384/384. The 135-row window was independently reproduced by the second-pass
   consistency auditor, so this is stated as window-moved, not as a failure.

## Missing or dropped evidence

- `T1.1`'s `## Source Requirement Inventory` (declared Phase 1 output).
- Draft-level unverified items 1-6 under check 4 (registry hydration hop, ledger write site,
  `difficulty.remote-only` reachability, no-re-stamp proof, ranking/percentile surfaces, private
  operations-server request budget).
- An evidence pointer for `R5`: the traceability row names the replay-catalog draft, which has no
  `pdf`/attachment-modality analysis, and the `R5` bullet in "Current Behavior" cites no file:line for
  the router's `pdf`-modality rule or for "no DeepSeek entry declares `pdf`".
- A command/artefact for `R7`'s live learning readback (repro step 5 is deferred with no readback
  capture); the floor-drop finding rests on a code read, which the wave-1 draft states plainly.

## Required repairs

1. Replace both stale "24 fields" lines (repro step 4, `## Evidence`) with the measured two-field result
   and cite the addendum + the exact test output line.
2. Add `## Source Requirement Inventory` for `T1.1` (or add `T1.1` to the recorded gaps with a reason).
3. Fix the `replay_job_not_ready_for_evaluation` pointer to the public bridge
   (`track-b-auto-replay.ts:773`, `track-b-replay-policy.ts:101`) and keep the private `:3498`/`:3515`
   citations for `deferred`/`replay_failed` only.
4. Extend `## Known Unknowns` with the six dropped draft items (check 4).
5. Give `R5` real evidence (router `pdf`-modality path + the DeepSeek rows it is checked against) or mark
   it a recorded gap.
6. Decide and record the `R3` and `R14` addenda (the artifact already contains both contradictions in
   `## Gaps Found`; only the amendment is missing), and lock addendum-01 before Phase 2 consumes it.
7. Optional (cheap, improves auditability): correct the three drifted anchors and state explicitly in
   `## Evidence` that the live-readback percentages refer to a specific frozen window (with its
   timestamp) because the endpoint is still growing.

None of these changes the requirement set or the phase's findings; they are documentation repairs.

Read-only disclosure: my spawn payload arrived empty (the known defect). I recovered
`/root/audit104_as_is` from `list_agents` + my own session rollout, then the brief via
`E:\tmp\collab\INBOX.md`. Only read operations were performed against the repos (git read commands,
file reads) plus three explicitly sanctioned read-only probes: the R33 `node --test` in the private
worktree, one `GET :3457/api/role-model/telemetry/requests`, and log parsing under `E:\tmp\run103-evidence`.
No repo writes outside this file, no commits, no runtime restarts, no spawns.

Audit: FAIL
Receipt token: r104-audit-as-is-6V8D
