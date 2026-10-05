# Run 104 Phase 4 — tester audit: failure classification, test adequacy, R15 primitive map

RECEIPT TOKEN: `r104-phase4-tester-9D3H`

Role: `tester` (delegated, READ-ONLY except this file). Date: 2026-10-01. Box: 60 minutes.

## Basis and state

| Item | Value |
| --- | --- |
| Public worktree / HEAD | `D:\DEV\role-model\.worktrees\104-replay-eligibility-and-evidence-fidelity` @ `fed9cebb` at the end of this audit ("phase 5: record the rebuilt-runtime status (T5.1/T5.2 done, T5.3-T5.6 blocked on endpoint provisioning)"); the audit started at `d938049d` and the controller advanced HEAD mid-audit with a **run-folder-only** commit (`git show --stat fed9cebb` = `evidence/other/phase5-status.md`, +62 lines). The public product diff is unchanged (46 files) and `git status --short` = my one untracked findings file |
| Private worktree / HEAD | `D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity` @ `c8010267` ("phase 4: evidence artifacts refreshed by the paired Track B suite run"), `git status --short` = clean |
| Public diff basis | `git diff 84d5996cb156217d37801943831762bc734ae21f...HEAD` — 46 product files (excluding `.recursive/**`, `testdata/**`) |
| Private diff basis | `git diff 5df90b6d12772f70bbdaff543b183fc5d312537b...HEAD` — 16 non-`.recursive` paths |
| Paired failure log | `E:\tmp\run104-phase4\p4-private-trackb-paired.log` — 2 592 tests, 2 563 pass, 24 fail, 5 skipped, 19.4 min, written 23:03:23 |
| Unpaired failure log | `E:\tmp\run104-phase4\p4-private-trackb.log` — 35 fail |

**Log-identity caveat (material).** The paired suite started at ~22:43:59 (the private `15c33cdf`
"hoist `resolveShippedRoot`" commit is 22:43:52, immediately before the run) and the public tree's phase-3.5
repair commit `d938049d` landed at **23:00:48 — 17 minutes into the 19.4-minute run**. Any test file that
started after that point executed against the repaired `cli.ts`/`track-b-auto-replay.ts`; test files that
started earlier did not. The 24-failure measurement therefore has an ambiguous public-tree identity, and the
all-green re-run owed to Phase 4 must be made on the frozen `d938049d` + `15c33cdf`/`c8010267` pair, not
re-used from this log. I did not re-run the full 19.4-minute suite.

**Baseline proof method (deliverable 1).** I created two scratch worktrees outside both run worktrees:

- private `E:\tmp\rm104-baseline-a1` @ `5df90b6d` (`git worktree add --detach`, allowed by the brief);
- public `E:\tmp\rm104-baseline-pub-a1` @ `84d5996c`;
- `node_modules` directory junctions from each scratch root to the corresponding run worktree's
  `node_modules` (reads only; no install in either run worktree) so the pinned tests run without an install.

Each failing test file below was then run in the scratch copy with `node --test <file>`; the
`ROLE_MODEL_PUBLIC_WORKTREE` used for the baseline copy was the scratch public tree. Raw baseline logs are in
`E:\tmp\run104-phase4\baseline-*.txt`.

---

## 1. Classification of the 24 remaining failures

**Result: 16 `environment`, 8 `pre-existing`, 0 `regression`, 0 `flake`.** No failure in the paired log is
attributable to the run-104 product diff: every one of the 24 was either reproduced at the pinned baseline
(privately verified in the scratch copy, table column "baseline") or is a host/tooling state failure with an
unambiguous non-product cause. The five tests whose baseline failure mode differs are explicitly marked below.

Legend — **baseline**: same test fails at `5df90b6d` + `84d5996c` (verified); *same-mode* means the error is
identical to the paired log.

| # | Test (file:line) | Test name | Label | Baseline | Cause / evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `tests\track-b\interop-process.test.mjs:64` | AC-R20-01 pinned Python/uv bridge | environment | yes, same-mode | `spawnSync ...\.toolchain\verifiers\.venv\Scripts\python.exe ENOENT` — the pinned interpreter is not provisioned in this worktree |
| 2 | `tests\track-b\public-runtime-build.test.mjs:6` | buildPublicRuntimeDependencies builds adapter dependencies before the Runtime UI | pre-existing | yes, same-mode | test expects 2 build invocations; script now runs a 3rd (vendored wrappers) first — `scripts\track-b\public-runtime-build.mjs` is not in either run-104 diff |
| 3 | `tests\track-b\public-runtime-build.test.mjs:36` | ... surfaces a dependency-build failure before packaging | pre-existing | yes, same-mode | expected `/paired public adapter dependency build failed/`, actual `paired public vendored wrapper build failed` — identical text at baseline |
| 4 | `tests\track-b\run88-phase5-process-supervisor.test.mjs:102` | RUN88-R-PRIV-R10-AC06 empty stage port is free | environment | yes, same-mode | `stage loopback port 3457 is occupied` — the operator's live stage RC is listening (brief says both runtimes are live and may not be stopped) |
| 5 | `tests\track-b\run94-live-interop-observer.test.mjs:252` | R94-R18/R19 non-ASCII byte-for-byte across the Python boundary | environment | yes, same-mode | same missing venv interpreter (spawn ENOENT) |
| 6 | `tests\track-b\run96-f152-packaged-shadow.test.mjs:233` | F152 GREEN packaged shadow persists Artifact Store refs | environment | yes, same-mode | `EPERM: operation not permitted, symlink` copying `shared/effect` on Windows (unprivileged symlink creation) |
| 7 | `tests\track-b\run96-f152-packaged-shadow.test.mjs:267` | F152 packaged shadow rejects unresolved caller refs | environment | yes, same-mode | same `EPERM` symlink |
| 8 | `tests\track-b\run96-operator-cluster-red.test.mjs:237` | F136 RED packaged operator owner supervises children | pre-existing | yes, same-mode | `owner.domain("replay").processBoundary` is `undefined`; the test is literally a pinned **RED** future-work test. Baseline with `ROLE_MODEL_PUBLIC_WORKTREE` set fails identically (1 fail; without the env it fails earlier on a hard-coded `E:\role-model` path, which is why the paired env matters) |
| 9 | `tests\track-b\run96-r8-r11-criterion-contracts.test.mjs:512` | AC-R10-02 production replay enforces ... deadline | pre-existing | yes, same-mode | `AssertionError: Missing expected rejection` at `:586` — baseline identical |
| 10 | `tests\track-b\run96-runtime-graph-capture.test.mjs:467` | capture recovery after trace-root commit | pre-existing | yes, same-mode | `Missing expected rejection` at `:425` — baseline identical |
| 11 | `tests\track-b\run96-runtime-graph-capture.test.mjs:471` | capture recovery before queue acknowledgement | pre-existing | yes, same-mode | `0 !== 1` at `:423` — baseline identical |
| 12 | `tests\track-b\run96-semantic-proof-repairs.test.mjs:167` | AC-R15-03 comparison members retained | pre-existing | yes, same-mode (twice) | `'insufficient' !== 'tie'` at `:182` — baseline identical and deterministic over two runs |
| 13 | `tests\track-b\run96-semantic-proof-repairs.test.mjs:302` | AC-R15-05 finalization idempotent / no manufactured tie | pre-existing | yes, same-mode (twice) | `'insufficient' !== 'tie'` at `:311` — baseline identical and deterministic |
| 14 | `tests\track-b\runtime-distribution.test.mjs:143` | AC-R24-04 manifest seals exact paired source | environment | different mode | `manifest.privateCommit` = `885eda30` vs worktree `rev-parse HEAD` = `15c33cdf`: the `dist/run00-dev` manifest was sealed **before** the last private commit. Baseline fails as "no `dist/run00-dev/track-b-runtime-manifest.json` at all" |
| 15 | `tests\track-b\runtime-distribution.test.mjs:254` | AC-R24-02 thirteen supervised child processes | environment | different mode | packaged `public-runtime-adapter.mjs` cannot resolve `role-model-router/packages/core/data/taxonomy/manifest.json`: every candidate root is under the **private** tree (`C:\Program Files\nodejs\...`, `role-model-internal\...`); the public worktree root is absent from the candidate list. Baseline fails at the missing manifest |
| 16 | `tests\track-b\runtime-distribution.test.mjs:450` | AC-R24-05 rebuilt distribution uses the real process host | environment | different mode | same taxonomy-root resolution failure |
| 17 | `tests\track-b\runtime-distribution.test.mjs:538` | rebuilt distribution runs shadow pipeline without an external public checkout | environment | different mode | same taxonomy-root resolution failure |
| 18 | `tests\track-b\runtime-distribution.test.mjs:593` | packaged shadow reports a non-routing degradation | environment | different mode | same taxonomy-root resolution failure |
| 19 | `tests\track-b\runtime-sidecar-process.test.mjs:442` | run 87 packaged sidecar owns a graph-migration operator | environment | build reproduced, test not re-run | the test rebuilds the distribution (`ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=1`) and the build exits 1 (`runtime distribution build failed: 1`). I ran the same `scripts/track-b/build-runtime-distribution.mjs` in the baseline scratch pair: it also exits non-zero (`@role-model-router/provider-account` `tsc` build failure). 135 s test; not re-run at baseline (see "could not verify") |
| 20 | `tests\track-b\tb06.test.mjs:31` | TB06 legacy retention previews fail closed | environment | yes, same-mode | `ERR_MODULE_NOT_FOUND ...\role-model-router\packages\protocol-types\src\generated.js` — the public tree's generated protocol artifact has not been built in this checkout |
| 21-24 | `tests\track-b\tb09.test.mjs:181,201,295,492` | TB09 integration / regression / renderers / review bridge (4) | environment | yes, same-mode | all four: `interop process failed to start: spawnSync ...\.toolchain\verifiers\.venv\Scripts\python.exe ENOENT` |

### Why the 11-test difference between the unpaired and paired logs is not a flake signal

The unpaired run had 35 failures and the paired run 24; the 11 that disappeared are exactly the tests gated
on `ROLE_MODEL_PUBLIC_WORKTREE`/`ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` (cross-repo tests that otherwise fail
closed). That is environment wiring, not nondeterminism. The failures I re-ran were deterministic across
repeats (semantic-proof run twice, f152/interop/port instant and identical).

### Cross-cutting observation: the suite writes tracked evidence files

The private diff contains four **committed** evidence artifacts changed by this suite itself
(`evidence/capacity-results.json`, `evidence/capacity-results-system.json`,
`evidence/track-a-exclusion-results/TB00.json`, `evidence/track-a-exclusion-system-proof.json`), and private
HEAD `c8010267` exists only to record that refresh. Combined with AC-R24-04's stale-manifest assertion, this
is a process risk: a suite that rewrites tracked files cannot be interleaved with a build-seal assertion, and
the Phase 5 clean-pair rebuild must freeze the tree first. Not a run-104 product defect, but it should be
recorded before the Phase 5 window.

---

## 2. Test-adequacy audit for R1-R15

Verdict scale: **adequate** (the cited tests can falsify the acceptance criterion), **gaps** (a named
acceptance bullet has no test), **not provable here** (the criterion is a Phase 5/live deliverable).

| Req | Verdict | Strongest evidence | Weakest test / gap and the falsifier |
| --- | --- | --- | --- |
| R1 | adequate | `run104-sp1-replay-eligibility.test.ts` (7 tests, incl. `satisfies capability requirements through the router's exported rule only` and the tick integration) + `run104-sp1-dispatch-subset.test.ts` (6 tests, incl. planner-empty-set and pre-dispatch re-check) | `run104-sp1-dispatch-subset.test.ts` "an arm with no declared profile stays planned": it asserts the *plan*, not that the undeclared arm is later refused or served; falsifier — delete the pre-dispatch re-check and this suite still passes |
| R2 | adequate with one gap | `run104-sp2-refusal-semantics.test.ts` 4 tests: terminal (all declared arms cannot serve), deferrable (capable arm unhealthy), undeclared→deferrable, text-only byte-identical, plus the F2 precedence case | The "capable arm exists but is **excluded by the policy set**" branch has no test (only `healthyEndpointIds` is exercised); and the acceptance "countable in `GET /api/role-model/operator/queues`" is asserted only at the census-function level in `tests\track-b\run104-sp2-refusal-terminality.test.mjs`, never through the HTTP readback. Falsifier: force `classifyReplayCandidateShortfall` to return `refused` when a capable arm is present-but-excluded; both suites stay green |
| R3 | adequate (catalog half) | `run104-alias-lineage.test.ts`: override-sets-modalities, disagreeing alias fails export by name, shipped catalog has the v4.1 base + deprecated flash alias | live metadata check is Phase 5; unit half is fine |
| R4 | adequate | same file — the intentionally-stale-alias failure is the drift guard | the guard's failure message is asserted; the *configured-model-vs-pinned-upstream* clause is not exercised |
| R5 | **gaps** | `run104-alias-lineage.test.ts:192` `expect(model.modalities).not.toContain("pdf")` | Acceptance bullet 1 requires "a model whose upstream entry declares `attachment = true` but no `pdf` input modality is not eligible for a PDF request (**now covered by a test**)". **No such test exists anywhere in the run's changed tests** (`rg -i "pdf"` over every changed test file returns exactly the one `not.toContain` line; no pre-existing test covers the attachment-vs-pdf router rule either). Bullet 2 (documentation reference check) likewise has no test. Falsifier: make the router treat `attachment: true` as `pdf` eligibility; no changed test fails |
| R6 | adequate | `run104-sp4-taxonomy-fallback.test.ts` 9 tests (all three fallback steps, unknown-id rejection, variant, all-four-capture-sites equality) + `learning-task-family.test.tsx` | the capture-site test compares the **input builder's** classification shape, not a persisted capture row; the acceptance "a newly captured request reads back with a non-null `taxonomyTaskType`" is a live readback (Phase 5) |
| R7 | adequate | private `run104-sp5-learner-floor-readback.test.mjs` 3 tests (published floor verbatim, policy fallback, absence honesty) + `learning-floor-progress.test.tsx` 7 tests | the UI tests use hand-built readback fixtures, not the private server's projection; falsifier — drop `floor` from `withReceiptReadings` while keeping the fixture shape, and only the private test fails |
| R8 | adequate for the code paths, live half open | private `run104-r8-finalization-boundary.test.mjs` 3 tests (comparable-trial coverage, named retirement, durable floor), `run104-sp10-replay-evaluation-handoff.test.mjs` 3 tests (inert legacy plane, exactly-one enqueue, supervised handoff), `run104-branch-append-recovery.test.ts` 5 tests incl. the F1 saturated-projection refusal | the acceptance bullets "count of stuck entries drains", "no terminal `candidate_not_validatable`", "at least one comparison reaches `finalized` **live**" are Phase 5; no test asserts they are unreachable in a simulated tick |
| R9 | **not provable / blocked (as recorded)** | `run104-sp6-arm-comparability.test.ts` 8 unit tests + private `run104-r9-effort-exclusion.test.mjs` 5 tests (durable dimension, named exclusion, drift refused) | **No end-to-end assertion exists that a live comparison's comparability key carries `effortComparability`.** `rg effortComparability` in the public bridge finds exactly two sites — the writer at `cli.ts:8153` and the type at `supervised-replay-evaluation-resume.ts:109` — and nothing copies it into an evaluation job's `comparability`; `evaluation-core` can only see it if a caller sets it. The summary correctly records R9 **blocked**; the test suite cannot prove the acceptance "mismatch ... excluded from promotion evidence" against the live path |
| R10 | adequate with a named weakness | `run104-sp7-contribution-budget.test.ts` 3 tests (real HTTP server, typed timeout, 3 attempts, exact delays, 409 terminal no-retry) + `run104-sp7-finalized-listing-cache.test.ts` 6 tests (window, empty-cache, in-flight sharing, failure-not-cached, scope key) | **The retry is asserted with an injected sleeper, not a real timer** (`contributionAggregateRetry.sleep` records `delayMs` synchronously and resolves immediately). Falsifier: delete `await` from `await sleep(delayMs)` in `withContributionAggregateTimeoutRetry` — attempts and delays stay identical, so the test still passes while production busy-retries. A timestamp-ordering assertion (or one real short delay) would kill it. The listing cache's window test does use an injected clock, which is acceptable |
| R11 | adequate | private `run104-sp8-per-arm-output-consumer.test.mjs` 4 tests (durable serialisation, durable-preferred, named exclusion, exclusion bound) + the `run99-r33-policy-consumers` ratchet (recorded green by the controller) | I did not re-run the ratchet (see disclosure); the consumer tests use hand-built state rather than the real `persistRouteCapture` write path |
| R12 | **gaps** | every sub-phase has a RED/GREEN pair under `evidence/logs/{red,green}`; all 36 red logs I inspected show assertion-style failures rather than module-resolution errors (the three non-assertion red files are supplementary: `append-live-sql.txt`, `r9-live.txt`, `sp2-build-blocked-by-sibling-writers.txt`) | R12's acceptance requires the **controller** to re-run each recorded command "against the pre-change baseline (the parent revision in a scratch worktree) and confirm it fails there". The run folder contains no baseline re-run log or scratch-worktree receipt for any sub-phase — the recorded proof is the children's own RED logs plus post-change controller re-runs. Also `sp7-finalized-listing-cache-red.txt` is 6 failures against a *stub module the child wrote*, not against the parent revision. Falsifier of the whole criterion: a test written after its production change would look exactly like this artifact set |
| R13 | not provable here | Phase 5 deliverable | the rebuilt-runtime matrix and 30-minute window have not run |
| R14 | adequate with a named gap | `packages\sqlite-memory\test\run104-live-only-summary.test.ts` asserts **hand-computed** values (1 request, 100 ms avg/p95, 0.01 cost, 1/1 = 100 % live cache rate vs 33 % mixed, 2 excluded with per-class counts), `run104-traffic-class.test.ts` mapping, `run104-traffic-class-filter.test.ts` analytics filter, `app-shell.test.ts` + `sidebar-footer.test.ts` live-newest sampling | Two gaps: (a) the acceptance "offers a filter to include them" — the storage/analytics paths accept `trafficClasses`, but no UI control test exists (the SP9 child disclosed the View/Overview control was out of scope); (b) `excludedByClass` is asserted in storage but never reconciled against the UI's rendered excluded count. Falsifier: render `0 excluded` in the dashboard while the aggregate returns 2 — the current UI tests assert only that the *sample* is live-only |
| R15 | **gaps** | see section 3 | the manifest check for the final diff has not been run and does not yet pass |

### The four specifically flagged questions, answered

- **SP2 terminal/deferrable split — can a servable capture be refused terminally?** No, on the tested paths:
  the terminal branch requires zero undeclared arms and zero healthy/excluded-capable arms, and the tests
  cover the healthy-capable counterexample. The residual hole is a *policy-excluded* capable arm (not
  covered by a test) and the absence of an HTTP-readback census assertion.
- **R9 — is the effort dimension ever asserted end-to-end?** No. Unit classification/repointing and the
  durable private record are covered; the public producer→job comparability link does not exist, so no test
  can assert it. The summary's `blocked` status is accurate and matches the Phase 3.5 reviewer.
- **R10 — real timer or injected sleeper?** The timeout itself is real (250 ms `AbortSignal` against a
  never-answering HTTP server); the **retry backoff** is injected and the test would survive a dropped
  `await`.
- **R14 — live-only arithmetic hand-computed?** Yes, in `run104-live-only-summary.test.ts` (finite expected
  counts, rates, latency and cost over a mixed fixture), which is the strongest form the brief asked for.

---

## 3. R15 Effect primitive-map check

Enumeration is derived from the diff bases, not from the manifest (the R15 method).

| Diff | Changed product files | Files importing `effect`/`effect-mq` | Mapped in `03` § "Effect Primitive Conformance"? |
| --- | --- | --- | --- |
| Public `84d5996c...d938049d` | 46 (excluding `.recursive/**`, `testdata/**`) | **1** — `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts:1` → `import { Match } from "effect"` | **NO — unmapped.** The section names only the private `scripts/track-b/runtime-operations-server.mjs` and states "Every other changed file imports no Effect primitive" |
| Private `5df90b6d...c8010267` | 16 non-`.recursive` paths | **1** — `scripts/track-b/runtime-operations-server.mjs:14` → `Effect, ManagedRuntime` (`ManagedRuntime.make` at `:3740`, `Effect.gen` at `:3753`) | yes — named with `ManagedRuntime`, `Effect.gen`, one store runtime per plane |

- **Unmapped imports: 1** (`traffic-class.ts`). This is exactly the failure mode R15's mechanical check is
  specified to catch, and `R15` is (correctly) still `blocked` in the summary. The map must gain
  `<traffic-class.ts> → Match.value / Match.when / Match.orElse → traffic-class vocabulary mapping` before
  the check can pass.
- **Additional correctness note on that file (not just a bookkeeping omission):** `toPersistedTrafficClass`
  uses `Match.value(...).pipe(Match.when(...) x4, Match.orElse(() => "unknown"))`. The `orElse` is a default
  fallback, so adding a variant to `ExecutionTrafficClass` will **not** fail to compile — contradicting the
  function's own comment ("`Match.exhaustive` keeps the mapping total: adding an `ExecutionTrafficClass`
  variant fails to compile here") and R15's "`Match.exhaustive`, so adding a variant fails at compile time
  instead of falling through a default". Also, the vocabulary is declared as a bare TypeScript string union
  (`export type PersistedTrafficClass = "live" | ...`) and emitted as a `PERSISTED_TRAFFIC_CLASSES` array
  rather than a `Schema.Literals` decoded at the boundary, against R15's schema-first clause. R15's
  "sketches executed" audit proves the primitives exist; it does not excuse the changed file that uses a
  different shape.
- **Relative `vendor/**` imports: 0** (scanned every changed product file for `"effect` and `vendor/effect`).
- **Dependency / lockfile changes: 0** — `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` appear in
  neither diff.

---

## Disclosure — what I could not verify

1. **I did not re-run the full private Track B suite** (19.4 min) nor re-run it against the frozen
   `d938049d` public HEAD, so the 24-failure list is taken from the controller's log and the mid-run
   commit-race caveat above stands. My re-runs were per-file in the scratch baseline.
2. **`run 87 packaged sidecar`**: I did not run the 135-second test in the baseline copy. I reproduced a
   non-zero exit of the same `build-runtime-distribution.mjs` script in the baseline pair, but not the
   test's exact failure; the label `environment` rests on that build reproduction plus the brief's known
   candidate "needs a clean public tree".
3. **The five `runtime-distribution` failures are not baseline-same-mode** — baseline had no `dist/run00-dev`
   at all, while the paired run had a stale distribution. I verified the stale-manifest arithmetic for
   AC-R24-04 (`885eda30` vs `15c33cdf`) and read the taxonomy candidate list for the other four; I did not
   rebuild the paired distribution to prove they disappear after a clean pair build (Phase 5's job).
4. **Flake** is ruled out only for the tests I repeated (semantic-proof ×2) and for the deterministic
   host-state failures. I did not run each of the 24 twice.
5. **R11's ratchet** (`run99-r33-policy-consumers`) was not re-run by me; the summary and the Phase 3.5
   reviewer both record it green.
6. **Coverage is judged from the cited tests and their assertions**, not from a mutation run of every
   changed production file; my falsifiers are proposed, not executed, except where noted (the R10 dropped-`await`
   falsifier is by inspection of the injected sleeper's synchronous `delays.push`).
7. **Read-only respected**: my only write is this file. I created two scratch git worktrees outside both run
   worktrees, junctioned their `node_modules` to the run worktrees (reads), wrote raw logs and this audit
   under `E:\tmp\run104-phase4\`, and made no commit, checkout, reset, dependency change, runtime restart or
   HTTP request. The background baseline `build-runtime-distribution.mjs` run wrote only inside
   `E:\tmp\rm104-baseline-a1` / `E:\tmp\rm104-baseline-pub-a1`.

Box note: I finished ~10 minutes over the 60-minute box while writing this file; the three deliverables are
complete with the unverified items enumerated above rather than guessed.
