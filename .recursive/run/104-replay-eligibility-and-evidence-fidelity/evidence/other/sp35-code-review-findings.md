# Run 104 Phase 3.5 — delegated code review findings

Reviewer: `/root/sp104_phase35_code_review` (delegated, strictly READ-ONLY)
Receipt token: `r104-phase35-review-3Q7W`
Date: 2026-10-01

**Verdict: FAIL-repairable** — 1 major, 2 minor, 1 nit.

The run's central claims hold: the R8 completion contract is sound, the append-recovery identity pin is
real, the SP2 terminal/deferrable split does not mis-classify the pool scan, and no acceptance criterion
is claimed `implemented` without a re-runnable command (R9 is correctly recorded `blocked`, not
`implemented`). The blocker-to-fix is F1: the append recovery that this run repaired now attaches a
silently truncated counterfactual output to the durable branch, which is the same class of
evidence-fidelity defect the run exists to remove.

## Basis

- Review bundle: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/review-bundles/phase35-code-review.md`
  (Artifact Content Hash `0be7e69e572b315f776860b027a8dd142ab816f7c2830859a8af787179e46209`).
- Public diff basis: `git diff 84d5996cb156217d37801943831762bc734ae21f...HEAD` at HEAD
  `9179d377` ("recursive/104 phase 3: record the R8 and R9 closures in the implementation summary");
  `git status --short` = ` M .recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/review-bundles/phase35-code-review.md`
  (the bundle's own regeneration — the product tree is clean, so `working-tree` == HEAD).
- Private diff basis: `git diff 5df90b6d12772f70bbdaff543b183fc5d312537b...HEAD` at HEAD `885eda30`
  ("recursive/104 R9: exclude an effort-mismatched arm from promotion evidence"); `git status --short` = clean.
- Upstream artifacts read: `00-requirements.md` (R1-R15 acceptance rows), `01-as-is.md`,
  `02-to-be-plan.md` (ownership matrix), `addenda/00-requirements.post-lock-*.addendum-0{1,2,3}.md`,
  `03-implementation-summary.md` (acceptance table + TDD compliance log), and the review bundle's
  changed-file list (49 product paths).
- Surfaces reviewed in the brief's priority order: (1) R8 completion contract, (2) branch-append
  recovery, (3) SP2 terminal/deferrable split, (4) R9, (5) SP9/R14 traffic classes, (6) claim audit.

## Verified, no finding

- **`#durableCompletionEvidence` cannot complete a job on a comparison that never happened.**
  `extensions/evaluation-core/index.mjs:1303-1311` narrows coverage to `candidate_ref ∈ declared pair`
  ∩ `holdout case ids`, but `finalizeComparisonGroup` independently refuses any candidate outside the
  declared pair (`:3537-3557`), demands both roles (`:3558-3565`), demands ≥2 distinct trials
  (`:3419`) and excludes the train partition (`:3578-3582`). A job with only its source trial scored
  can therefore only be covered by a finalized *two-role* group. Legacy jobs that declare no pair or
  no holdout fall back to the previous whole-job requirement (`:1303-1306`), and the loop's
  all-trials-terminal precondition (`:1278`) is unchanged. Nit recorded as F4.
- **The receipt's `trialIds` narrowing (2 of 4) breaks no consumer.** `evaluation:list-completion-receipts`
  (`extensions/evaluation-core/index.mjs:4401-4407`) has no caller in the public repo
  (`rg 'list-completion-receipts|completionReceipts' role-model-router` → only an unrelated retention
  e2e), and the only production readers of `evaluation_job_completion_receipts` are
  `shared/learning/activity.mjs:367-371` and `:625-629`, which select `job_id, completed_at_ms` only.
  Nothing in the public repo reads `completion_digest` (`rg 'completion_digest|completionDigest'` in the
  public worktree → 0 hits). `INSERT OR REPLACE` + `COALESCE(completion_digest, ?)` keep existing
  receipts byte-identical.
- **SP2 does not produce a false terminal or a false deferral from the pool scan itself.**
  `classifyReplayCandidateShortfall` (`track-b-replay-policy.ts:548-651`) and `selectReplayCandidates`
  (`:654-729`) iterate the same configured list with the same `evaluateReplayCandidateEligibility`
  inputs, so "every declared arm rejected" can only hold when the planner also found zero eligible
  arms. The classifier deliberately forces the deferrable outcome whenever any configured endpoint
  declares no profile (`undeclared > 0`) or a capable endpoint is unhealthy/excluded
  (`:626-640`), which is exactly the "the pool can change" case. Re-run:
  `corepack pnpm exec vitest run test/run104-sp2-refusal-semantics.test.ts` → 4 passed (exit 0).
- **SP9/R14 live-class default.** Replay and benchmark dispatches do declare their class
  (`cli.ts:8242`, `track-b-shadow-judge-dispatch.ts:248`, `benchmark-runner.ts:100`), and the writers
  now persist the declared value (`index.ts:29208`, `:29565`) instead of the hardcoded `live_request`,
  so a *declared* replay/benchmark row cannot enter the live headline. Residual risk recorded as F3's
  sibling in "Could not verify".

## Findings

### F1 [major] — the append recovery silently truncates the counterfactual output it re-attaches

`role-model-router/apps/runtime-host-bridge/src/cli.ts:808-813` accepts the projection's `responseText`
as the recovered execution's `outputText` (`:839`), and that text is written to the durable branch at
`:8542`. The projection is bounded by the boundary that produces it:
`scripts/track-b/runtime-operations-server.mjs:7324-7326` ("Only the first 2 KiB of assistant text is
returned") and `:7348` (`joined.slice(0, 2_048)`, with `:7376-7377` falling back to a 2 KiB provider
excerpt). Nothing on the returned execution or on the branch append records that the text was an
excerpt, and the branch's provider execution is recorded as `statusCode: 200` (`cli.ts:8543-8550`).

Impact: on the *recovery* leg only — the leg this run repaired in `efab6bc3` — the durable branch that
evaluation scores can hold a 2 KiB prefix of the provider's answer while the operator reads that the
counterfactual arm ran to completion. A comparison whose scoring depends on text past the cap (the
exact-match/semantic judges) can therefore invert on an artifact that is not the provider's output.
This is the same defect class as the run's own R8/R9 brief (evidence that reads as measured but is not),
and it is strictly introduced by the fix: before `efab6bc3` the leg refused instead of attaching
anything.

Reproduction (not executed by me — see the disclosure below; the existing test does not cover it):
the recovery fixture at `test/run104-branch-append-recovery.test.ts:52` carries a 52-character
`responseText`. Add a case to that file whose projection returns `"y".repeat(2_048)` and assert what the
recovered execution says about its own completeness; the command is
`corepack pnpm exec vitest run test/run104-branch-append-recovery.test.ts`. To measure the live blast
radius, compare `length(capture.responseText)` for the frozen captures named by the live deferrals
(`req-a29409df…`, cited in `cli.ts:775`) against 2 048.

Suggested repair: carry the bound as data instead of hiding it — e.g. return
`outputSource: "capture_projection"` and `outputTruncated: boolean` from `buildReplayAppendExecution`
(the projection already reports `projectionCompleteness` at `runtime-operations-server.mjs:7447`, but it
describes the transcript, not the excerpt), record the same two fields on the branch capture at
`cli.ts:8530-8553`, and refuse recovery (keeping today's deferrable refusal) when the projection
saturated its cap. Raising the cap alone is not a repair.

### F2 [minor] — the R2 shortfall check preempts the more specific refusals it runs in front of

`role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts:1047-1057` evaluates
`plannedArmShortfall()` and `continue`s *before* `const status = input.ledger.status()` and
`decideReplayAdmission({...})` at `:1058-1090`. Admission's first two rules are
`sourceIsBenchmark` → `benchmark_source_not_replayable` (`track-b-replay-policy.ts:197-201`) and
`alreadyProcessed` (`:232`). A benchmark-originated capture — or a capture whose counterfactual is
already terminal under this policy set — that also happens to have one eligibility-rejected arm now
records `candidate_input_unsupported` instead of its own class, in the very plane
(`shared/capture/replay-disposition.mjs:144-150` and its `refusalCodes` projection at `:173-175`, the
new per-class census) this run added so refusals
are countable by name.

Impact: reporting only — no routing or evidence effect, and the refusal is still recorded — but it
pollutes the R2 census and hides the benchmark exclusion on exactly the captures the operator is
auditing. Note the asymmetry this creates: the same benchmark capture is recorded under the benchmark
code whenever its arms are all *declared eligible*, so the class a benchmark capture lands in depends
on an unrelated pool property.

Reproduction: add a benchmark-source capture (the `isBenchmarkReplaySourceRef` shape) plus one endpoint
profile that fails the modality rule to `test/run104-sp2-refusal-semantics.test.ts`, then run
`corepack pnpm exec vitest run test/run104-sp2-refusal-semantics.test.ts`; expect
`benchmark_source_not_replayable`, observe `candidate_input_unsupported`.

Suggested repair: move the shortfall check below `decideReplayAdmission` and apply it only to the
planner-owned outcome it replaces (`distinctCandidateCount === 0` / the current
`no_distinct_candidate_configured` branch at `:1120-1152`), so admission's named refusals keep
precedence.

### F3 [minor] — the SP9 live default still counts an undeclared row as live

`packages/sqlite-memory/src/index.ts:1236` (`DEFAULT_LIVE_TRAFFIC_CLASSES`, consumed at `:6166`; the
predicate compiles to `request_class IN ('live','live_request','unknown') OR request_class IS NULL`) is the
documented deviation, and the disclosure in that comment is accurate for *declared* producers. The
residual hole is the writer: `role-model-router/apps/runtime-host-bridge/src/index.ts:29208` and
`:29565` pass `requestClass: requestOptions?.executionTrafficClass` with no fallback, so any
replay-adjacent write that reaches those writers without the option stores `NULL` and is then counted
in the live headline (because `unknown` matches NULL). I verified that the three known replay/benchmark
dispatch sites set the option (`cli.ts:8242`, `track-b-shadow-judge-dispatch.ts:248`,
`benchmark-runner.ts:100`); I did not enumerate every caller of the two writers, so I cannot rule out a
fourth.

Suggested repair: make the omission explicit and *fail closed* for non-live code paths — either a
required parameter on those two writers, or storing the pre-run-104 placeholder as
`request_class_source = 'inferred'` with a class of `unknown` **and** excluding `unknown`/NULL from the
live headline once the producer markers are known to be live (the run's own Phase 5 measurement is the
natural gate).

### F4 [nit] — the completion contract can be satisfied by a group pairing an arm with a different counterfactual than the job declared

`extensions/evaluation-core/index.mjs:1303-1306` filters the job's trials by the job's declared pair,
then requires those trials to be members of *any* finalized group (`:1310-1312`). A comparison group
enforces its own declared pair (`:3533-3557`), and `finalizeComparisonGroup` accepts trials from
different jobs (it joins `evaluation_trials` to `evaluation_jobs` per row, `:3437`). So a job that
declares `(source, counterfactualC)` but produced only its source trial can complete against a
finalized group whose declared pair is `(source, counterfactualX)`. The receipt is still truthful
(its trial is covered by a finalized comparison), and the retro sweep makes this hard to reach — it
builds the group from the first trial's own job comparability (`:3367-3373`), which would then refuse
the foreign arm — so I rate it a nit rather than a defect.

Suggested repair (optional): require the covering group's `comparability.sourceCandidateRef` /
`counterfactualCandidateRef` to equal the job's declared pair before crediting coverage.

## Claim audit (surface 6)

Every acceptance row I sampled is backed by a command I re-ran or by an artifact I read.

| Requirement | Summary's status | Evidence cited | My re-run |
| --- | --- | --- | --- |
| R1 | implemented | `test/run104-sp1-dispatch-subset.test.ts` | 6 passed (exit 0) |
| R2 | implemented | `test/run104-sp2-refusal-semantics.test.ts` | 4 passed (exit 0) |
| R8 (append) | implemented | `test/run104-branch-append-recovery.test.ts` | 5 passed (exit 0) |
| R8 (completion contract, private) | implemented | `green/r8-finalization-boundary-green.txt` | `node --test tests/track-b/run104-r8-finalization-boundary.test.mjs` → 3 passed; plus `tests/track-b/run97-rc15-evaluation-job-terminality.test.mjs` 3 passed (no regression from the narrowing) |
| R9 | **blocked** (not `implemented`) | `green/sp6-arm-comparability-green.txt` | `node --test tests/track-b/run104-r9-effort-exclusion.test.mjs` → 5 passed; the recorded gap is **confirmed**: the public producer publishes `effortComparability` (`cli.ts:8132`) and types it on the resume entry (`supervised-replay-evaluation-resume.ts:109`), but no private consumer copies it into an evaluation job's `comparability`, so `normalizeArmEffortComparability` (`extensions/evaluation-core/index.mjs:1804`) can only see it from a caller that sets it. `arm_effort_mismatch` can therefore never fire against the live runtime, and the R9 acceptance criterion is unmet — as the summary says. |

No criterion marked `implemented` rests on a claim without a re-runnable command, and the one blocked
requirement is labelled honestly. The `E:\tmp\run104-evidence\*` logs the briefs require were not
consulted as proof — I re-ran the four suites above instead, and quote only my own runs.

## Could not verify

- **The live half of every row.** `:3457`/`:3458` were read-only to me and I did not call them; the
  AS-IS already records that the operator readback endpoints hang (`evidence/other/as-is/queue-stall.md`).
  So R14's "live reconciliation", R10's before/after, R3's live metadata check and R8's live drain are
  outside this review.
- **How often F1 bites.** I did not open the frozen capture store to measure
  `length(responseText)` against 2 048 for the live recovery captures, so the fraction of recovered
  branches that are truncated is unknown.
- **R7 / R14 / R6 / R11 UI and package suites** (`learning-floor-progress.test.tsx`,
  `run104-live-only-summary.test.ts`, `run104-alias-lineage.test.ts`, the SP8 consumer test) — not
  re-run inside the box; only the five suites in the table above were.
- **F2's reproduction** was derived by reading the guard order, not executed: the scenario needs a
  benchmark-shaped capture inside the tick harness, which lives in the test file I may not extend.
- The public `git diff` baseline `84d5996c…` also contains ~150 run-folder artifacts; I reviewed only
  the 49 product paths the bundle lists.

## Read-only disclosure

I wrote exactly one file — this one. No product code, phase artifact, log, commit, stash, checkout,
install or runtime interaction; the only commands executed were `git status`/`git log`/`git diff`
reads, `rg`/`Get-Content` file reads, and the `vitest`/`node --test` re-runs listed above. One
reproduction attempt (an inline `node --input-type=module` import of `src/cli.ts` for F1) failed on
`ERR_MODULE_NOT_FOUND` for `src/development-verification.js` and was abandoned rather than worked
around with a scratch file, which is why F1's reproduction is a prescription.

Process disclosure: my spawn payload arrived empty (the known transport defect). I recovered the task
from `E:\tmp\collab\INBOX.md` → `briefs\sp104_phase35_code_review.md`, but before that I read my own
session record to establish my own identity, which my brief's "must not investigate sessions" rule
would have forbidden had I known my task name; no other agent's identity or session was inspected and
nothing was mutated in that window. Budget disclosure: the 45-minute box was exceeded (~50 minutes) —
I stopped the investigation and wrote these partial-but-complete findings at that point rather than
continuing to explore.
