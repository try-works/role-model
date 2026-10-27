# S263 release assessment — original-goal reassessment (read-only)

Scope: acceptance R1–R3, R15–R18, R34–R39. This is a bounded source/evidence assessment, not an
implementation or closeout. No product file was edited, no provider was called, no operator port was
used, and no test suite was run. Other S259/S260 workers were still writing their owned files when the
snapshot below was taken.

## Revisions inspected and working-diff limits

- Public worktree: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, branch
  `recursive/115-effect-foldkit-runtime-migration`, HEAD `9ac82847af56b3360fd423361d78253c8b78ae14`
  (tree `be7369907065e422a364da55dc7e2415ea3f69ba`), 2026-10-27 11:05 +0800.
- Public `origin/dev` is `9b0ca8bd` (the squash migration commit); merge-base is `945a8906` (v0.0.20).
  The branch is **260 commits ahead and 1 commit behind** `origin/dev`. HEAD is 295 commits after the
  locked Phase-0 baseline `f0d50fab`. The current branch is therefore not a fresh `origin/dev` tip.
- Private worktree: `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration`, HEAD
  `263f02603db30eef01378552b2e3d13687025f4a`; 35 ahead / 0 behind private `origin/dev` (`266ccf76`).
  It is dirty: `scripts/track-b/runtime-shadow-pipeline.mjs` and
  `tests/track-b/run96-f152-packaged-shadow.test.mjs` are modified by the still-running S259 repair,
  with untracked S259 evidence.
- Public working tree is dirty: seven `runtime-ui-next/test/s2*.test.ts` files modified and untracked
  `test/support/runtime-shell.ts` belong to the running S260 type-harness repair. Two dozen untracked
  paths are run evidence, not product.
- Packaged candidate on disk is `0.0.20-231-gd61c32dc` (`role-model-dev.exe` sha256 `e3181d50…`,
  manifest source_tree `fb7dbc95…`). It predates the current HEAD tree `be7369…`, so all packaged and
  parity receipts tied to 231 are stale relative to the working tree.
- Read-only identity check: `E:/rm-tmp/r-stage/role-model.exe` and
  `D:/role-model-router/0.0.20/role-model.exe` both hash to
  `718d71f51ea6cf4f4bcfddf82165695c52fbc6d59eaaa600a38f3c73df8e248a`. The staged copy is the
  owner-designated v0.0.20 R artifact.
- `source-proposal.md` hashes to the recorded `870fa27f…534c`; `00-requirements.md` remains locked.
- Limits: no full host/private/packaged/browser suite, no live client or provider journey, no new
  parity run. Existing receipts are cited at their own dates; they are not refreshed here.

## Per-requirement assessment

| R# | Requirement clause (short) | Actual surface / caller | Evidence (file:line) | Lane / freshness | Remaining work | Class |
|---|---|---|---|---|---|---|
| R1 | Fresh paired SHA/tree/diff bases; preserve dirty work and protected branches; verify source hash; no operator state | Phase-0 `00-worktree`, `current-paired-identities.json`, git | `00-worktree.md:75-92`; `current-paired-identities.json:2-56`; source hash verified above; `s30-dev-main-reconciliation.md:9-20`; `s31-delivery.md:24-29` | docs/git, 24 Oct; stale for HEAD | Re-pin current paired identities; record deliberate divergence; reconcile the branch; no further protected-branch bypass | **PARTIAL** |
| R2 | Every delegated worker on deepseek-official/deepseek-flash; per-worker header/provider/model/config hash/session/output/exit; no fallback | DSH per-launch overlay; evidence/router | `deepseek-flash-worker.patch.yml:1-30`; `s259-s260-actual-worker-routes.json:1-14`; `s261-s263-actual-worker-routes.json:1-20`; `actual-request-routes.json:1-31`; `verified-official-route.md:5`; prior review `phase00-baseline-review-attempt01.md:30` | router evidence, 24–27 Oct; partial | Store the actual per-worker header/config-hash/output/exit ledger, not session/provider/model only; retain the preflight decode | **PARTIAL** |
| R3 | Assertion-level RED before GREEN; maintained tests/CI; sequential audited recursive locks | evidence/logs; `03-implementation-summary` | `01-as-is.md:3-6` and `02-to-be-plan.md:3-6` LOCKED; `03-implementation-summary.md:3-5` DRAFT; `03:1873-1883` Coverage/Approval/TDD/Audit FAIL; 788 logs incl. RED/GREEN | logs/docs, 24–27 Oct | Phase-3 audit, repair and supported lock; convert slice evidence into a phase-level TDD claim; finish the branch/PR sequence | **PARTIAL** |
| R15 | Ordinary supported DSH/pi client through the exact packaged router to an approved real provider; active model/plugin proof; curl/fixture not a substitute | `scripts/runtime/verify-client-journeys.mjs` — direct HTTP only, no client executable | `verify-client-journeys.mjs:104-131,171-193`; `package.json:83`; `s104-r39-scripts.md:21-28`; `s106-r39-hardened.md:17-23`; no product-client DSH/pi invocation in the verifier or receipts | packaged HTTP, 26 Oct; no client | Build the isolated DSH/pi lane and run it against an approved provider; never repurpose the fixture HTTP result as G-LIVE | **NOT-RUN** |
| R16 | R = owner-designated v0.0.20, D = clean dev, C = candidate; isolated identities/state; classified deltas; no unexplained R/C | `compare-release.mjs`; staged R; D/C receipts | `s90-r-staging.md:9-18` (byte-identical 718d71f5 R copy); `s234-r-side-parity-0020.md:1-48`; `compare-release.mjs:115,198-219`; `s89-rdc-triple.md:15-41`; `s91-byte-parity.md:3-27`; `s188-pair-rebuilt.md:34-36` | packaged HTTP, 26–27 Oct; C=231 | Fresh same-candidate triple; comparable client journeys; UI/served closure; record approval for the two additive identity keys; do not gate R16 on Run 88 | **PARTIAL** |
| R17 | J1–J6 same request/decision/provider/capture IDs through telemetry, API, rendered numeric UI, graph/payload/projection and durable restart | Evidence-only `s29a-journeys.mjs`; packaged exe + mock upstream | `s29a-tdd.json:17-30,119-128`; `s67-journeys-verified.md:5-10`; `s88-j6-contract.md:3-22`; `03-implementation-summary.md:1922` | packaged+mock, 25 Oct; no DOM/real client | Add rendered UI/numeric/SSE and graph/payload joins; run J1–J5 with a real client; J4/J6 execution or honest NOT-RUN; promote the harness to a maintained lane | **PARTIAL** |
| R18 | Private evidence stays private; PASS/FAIL/NOT RUN/INCONCLUSIVE/N/A distinct; receipts complete and refreshed after changes | docs/evidence; `03` status tables | `03:193-225` (obsolete R numbering); `03:1900-1944`; `FINAL-STATUS.md:44-49`; `s258-coverage-repair.md:9`; `s258-recheck.md:9,49-51` | docs, 27 Oct | Correct the status tables/totals; make receipts carry scenario/R/task/client/artifact/PID/IDs/cleanup; refresh after S258/S259/S260 | **PARTIAL** |
| R34 | E1 disposition before scope lock; no implicit implementation | `owner-scope-decision.md` | `owner-scope-decision.md:3-13`; `00-requirements.md:303-309,352-354`; no E1 implementation claimed | owner decision, 24 Oct | None for disposition; keep E1 out of product claims | **OWNER-DECISION** |
| R35 | E2 disposition before scope lock; no live-admission change | `owner-scope-decision.md` | `owner-scope-decision.md:3-13`; `00-requirements.md:311-317,352-354`; endpoint admission remains unimplemented (`s208-s210`) | owner decision, 24 Oct | None for disposition; keep E2 out of live claims | **OWNER-DECISION** |
| R36 | Disjoint scopes, single writer, independent current review, durable action records, backend/client join at M11 | 138 tasks / 109 subagent records; no records for S259–S263 yet; `03` self-audit | `03:1873-1883`; `s30:9-20`; `s31:24-29`; subtask/record counts above | evidence, 24–27 Oct; open | Record recent workers; independent phase review; M11 join; normalize the protected-branch bypass | **PARTIAL** |
| R37 | Exact SEA/private/UI closure; matched one-release rollback with reader/state proof; retire React only after migration; no auto-main promotion | `package-sea.ts` copies `runtime-ui-next/dist/client`; candidate 231; no selector/rollback | `package-sea.ts:152-156,435`; `s188-pair-rebuilt.md:1-36`; no rollback receipt in the run | packaging, 26 Oct; stale C | Design the reversible client selector and retained React artifact; build a matched candidate; prove state-reader compatibility and rollback; run stage/packaging gate | **MISSING** |
| R38 | Pre-agreed bytes/parse/render/update/heap and backend latency/event-loop/cancel/handles/contention budgets; owned ports/roots; no operator reset | No performance harness; only the chart latency fix | `implementation-slices.md:125-127` (proposed budgets only); `s43-latency-fixed.md:1-21`; safety receipts `s218-click-sweep.md:35-46` | none; chart-only spot check | Add the fixed-workload perf receipt and thresholds; measure startup/chunks/heap and quiet/burst/degraded/cancel/open-handle cases | **PARTIAL** |
| R39 | Maintained `runtime:verify-client-journeys` and `runtime:compare-release`; controller-owned CI; fail closed; NOT RUN distinct; ordinary client evidence not replaced | `scripts/runtime/*`; root scripts; `.github/workflows/build-binaries.yml`; `r39-scripts.test.ts` | `package.json:83-85`; `build-binaries.yml:431-451,525-569`; `r39-scripts.test.ts:12-32,86-118`; `s106-r39-hardened.md:25-33`; `s239-ui-identity-tested.md:36-42` | scripts/CI, 26 Oct; advisory | Wire the actual client; guard the CI `--static-root` against the package bytes; make one dispatch green; then flip the blocking variable | **PARTIAL** |

Path convention: `s*`, `03`, `FINAL-STATUS` and `owner-scope-decision` are under this run root (most
evidence under `evidence/other/`); product and workflow paths are repository-relative. `r39-scripts.test.ts`
is `role-model-router/apps/runtime-host-bridge/test/r39-scripts.test.ts`.

## Stale totals and misattributed R numbers

`FINAL-STATUS.md:44-49` reports **5 verified / 2 implemented / 32 blocked** across 39 rows. The
arithmetic is internally consistent, but it is not a reliable release verdict:

- `03-implementation-summary.md:193-225` is written against an obsolete numbering: it calls R15
  "diagnostics presence in UI", R16 "chart surface", R17 "client telemetry", R37 "release comparison",
  and says R26 transport is "not started" although the completion table marks R26 verified. This is not
  a stale label; it maps obligations to the wrong IDs and must not be used for release decisions.
- `03:1906-1908` says R1/R2/R3 have "no implementation or evidence", and `03:1939-1943` says
  R34/R35/R36/R37/R38 have none. R34/R35 are explicitly delivered by the owner decision; R1/R2/R3 have
  Phase-0 and TDD evidence; R37/R38 have packaging/safety evidence but not complete proof. The rows
  are boilerplate, not dispositions.
- The 32 "blocked" rows mix five different states: owner-decision (R34/R35), not-run (R15), partial
  with real evidence (R16/R17/R18/R36/R38/R39), missing (R37), and genuinely product-blocked backend
  rows not in this scope. A single blocked count hides which of those is engineering versus
  authorization.
- The verified rows themselves are slice verifications, not full-clause certification. This assessment
  did not re-audit them, but the run's own record already states bounded lanes for several of them
  (for example its R4/R6 receipts cite package/test lanes, not the full source clause). Do not repeat
  "5 verified" as a full-goal claim.

Recommended replacement vocabulary for this scope: R34/R35 = OWNER-DECISION; R15 = NOT-RUN;
R16/R17/R18/R36/R38/R39 = PARTIAL; R37 = MISSING; R1/R2/R3 = PARTIAL. Do not publish a single
"verified" total until each row is audited against its full clause.

## Invalid or stale blockers; what is genuinely external

| Claimed blocker | Assessment |
|---|---|
| "R16 needs the Run 88 package identity" | **Invalid for R16.** R16 names the owner-designated `D:/role-model-router/0.0.20`; S90 preserved its bytes and S234 compared that staged R with C. Run 88 is a separate stage/production packaging identity, not an R16 precondition. R16's real gaps are engineering plus the owner's config-seeding authorization. |
| "R34/R35 are blocked / have no evidence" | **Invalid.** The owner-approved named-follow-on decision is in `owner-scope-decision.md`; the requirement asks for the disposition, not implementation. Remove these from blocked totals. |
| "R15 has no implementation" | **Half invalid.** The verifier exists but is a fixture HTTP check, not a client. The real blocker is the isolated DSH/pi lane plus provider authorization. |
| "R39 is blocked only on a CI dispatch/toggle" | **Operationally true, technically incomplete.** A dispatch will not fix the missing client or the fact that CI passes the worktree `runtime-ui-next/dist/client` as `--static-root` (`build-binaries.yml:539`) instead of the package's `build/client`; the raw verifier has no UI-identity guard. |
| "R37 is blocked on Run 88 identity" | **Only partly true.** A stage/production candidate needs the release identity, but rollback design, retained React artifact and reader-compatibility tests are local engineering that can start now. |
| "R38 needs a provider/environment" | **Invalid.** Startup, parse, heap, event-loop, cancel, handle and contention measurements are local with a fixed workload; they do not need provider credentials. |
| "J6 needs a private trace root" | **Genuine product dependency, not a human gate.** `s88` shows the standalone artifact has no `POST /operator/trace-roots`; this needs private replay-core integration or a configured trace-root path. |
| "J4 needs effort support" | **Genuine capability gap.** No configured endpoint has non-empty effort levels; an effort-capable catalog/account is required. Paid/remote provider use then needs human authorization. |
| Protected-branch delivery | **Already breached, not merely blocked.** The run directly fast-forwarded `dev` (bypassing PR and required checks) in `s30/s31`, contradicting `00-worktree.md:44-45` and repository policy. The owner's instruction does not make the branch-protection bypass reversible; a maintainer must normalize the branch/PR state. |

Human authorization is genuinely needed for: the real-provider/client lane (R15/R17), any operator
config seeding or paid inference used by R16, the CI dispatch/variable toggle and stage/production
package (R39/R37), and the final PR/protected-branch merge (R1/R36). Everything else above is locally
solvable engineering.

## Scope drift

- The Foldkit "Blocks/Effect Layers preview" (S245/S247) is subordinate, optional upstream adoption.
  `03:1918` calls it "the path to R27 closed Layer DAG"; `s258-coverage-repair.md:38` correctly rejects
  that equation. It must not gate R27, R37 or release acceptance.
- `runtime:verify-client-journeys` has drifted semantically: §6.7/§10.1 require an ordinary DSH/pi
  client, but the script only calls `/v1/chat/completions` against a fixture backend. Keep that as a
  fixture/request-shape lane and label it so; it cannot stand in for G-LIVE.
- Click-budget and 20-route scene metrics are not R13/R14 completion. They measure test-surface
  reduction, not full route/family parity; the S258 review already found assertions lost behind a
  scene conversion and had to restore them.
- R16's reference drifted toward "a production-channel candidate" (which needs Run 88). The
  requirement's reference is the existing v0.0.20 artifact; use the staged copy and classify channel
  differences rather than requiring a new stage build to measure R.

## Next vertical slices (critical path, disjoint writes)

1. **Freeze and re-pin the paired state (R1/R2/R3/R36).**
   Write scopes: run-local `00-worktree` addendum, `evidence/router/*`, `03` audit/lock only.
   RED: a ledger check fails on a missing current SHA/tree, a worker record without
   header/config-hash/output/exit, or a Phase-3 artifact still DRAFT with Coverage FAIL. GREEN: current
   public/private paired identities recorded; every recent worker has a durable route/action record;
   independent Phase-3 audit PASS then lock; branch based on `origin/dev` and delivered by PR.
   Dependency: none; do this before any further release claim.

2. **Actual client lane (R15/R39).**
   Write scopes: `scripts/runtime/verify-client-journeys.mjs` (or a new `client-runner.mjs`) and its
   tests; no product source. RED: wrong client executable, profile, alias, endpoint, operator port, or
   missing provider auth returns NOT RUN/exit 2; a client-native fallback or silent model substitution
   fails rather than passing. GREEN: an isolated pi or DSH profile uses `ROLE_MODEL_ENDPOINT`, the
   discovered alias and an approved provider through the frozen package; request headers, active model,
   plugin version, bounded calls and exit are recorded. Dependency: slice 1 + human provider approval.

3. **J1–J6 correlation and restart (R17/R18).**
   Write scopes: new `scripts/runtime/journey-correlation.mjs` and tests; evidence receipts only.
   RED: stitched/fabricated IDs, missing capture row, reordered tool call/result, a UI number not equal
   to the API value, or a restart that reads a socket rather than durable state fails. GREEN: one real
   J1/J2/J3/J5 request chain joins client→request→decision→provider→capture→graph/payload→API→rendered
   numeric UI→restart readback; J4/J6 show configured behaviour or honest NOT-RUN. Dependency: slice 2
   (or a reviewed fixture client for the mechanical parts).

4. **Fresh R/D/C comparison and delta ledger (R16/R18).**
   Write scopes: `scripts/runtime/compare-release.mjs`, `scripts/runtime/ui-identity.mjs`, matching
   tests. RED: same binary on both sides, wrong R sha, missing manifest, cross-channel without an
   explicit rationale, or an additive/removal delta without an approval record fails. GREEN: staged R
   `718d71f5…`, D `9b0ca8bd`, and the current C run on the same fixture config and independent state
   roots; 9 API surfaces plus the applicable client journeys are classified; the two additive identity
   keys have a recorded approval and maintained regression. Dependency: slices 2–3; human decision only
   if operator config must be seeded.

5. **Cutover/rollback and performance proof (R37/R38).**
   Write scopes: `package-sea.ts`, `build-binaries-workflow.test.mjs`, new `scripts/runtime/perf-receipt.mjs`
   and UI perf fixtures. RED: no reversible client selector, no retained React artifact, an old binary
   opening new state, or a missing/unapproved perf threshold fails or reports INCONCLUSIVE. GREEN:
   switch the packaged client C→R→C with matched bytes and compatible state-reader proof; measure
   startup/gzip/chunks/first-render/repeated-mount heap and backend quiet/burst/degraded/cancel/
   open-handle/contention against pre-agreed budgets. Dependency: slices 1 and 4; stage/production
   packaging still needs the CI/release identity, but rollback and perf engineering can start now.

## Bottom line

This run has substantial partial engineering and unusually good self-critique, but it does **not**
have a release-credible closure of R1–R3, R15–R18, R37–R39. The highest-value next move is not another
UI metric or another status rewrite; it is to freeze the current pair, prove one real client journey
through the packaged router, join its IDs through storage and the rendered UI, and then refresh R/D/C
against the owner-designated v0.0.20. Keep R34/R35 as the owner's named deferral, drop the Run-88
precondition from R16, and stop treating the optional Foldkit preview as an R27 dependency.
