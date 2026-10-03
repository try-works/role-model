Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-10-01T08:54:40Z`
LockHash: `6b516655e1f57a01b3dceedd5c933cc91ec80facc4e323f6257c3b14c7c7295d`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-worktree.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-catalog-lineage.addendum-02.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-benchmark-value.addendum-03.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/queue-stall.md`
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
Scope note: This document defines the implementation and validation plan.

## TODO

- [x] Read Phase 1 (AS-IS) and Phase 0 (Requirements) artifacts
- [x] If Phase 1.5 exists: incorporate root cause findings (Phase 1.5 is not required; the queue-stall section
  carries the causal analysis)
- [x] Define sub-phases (SP1..SP10)
- [x] Specify concrete file changes (what, where, how)
- [x] Define implementation steps in sequence
- [x] Design testing strategy (new + regression + guardrail)
- [x] Document Playwright test plan (if applicable) - not applicable; UI checks are vitest component tests plus the Phase 5 live pass
- [x] Define manual QA scenarios
- [x] Review relevant prior recursive evidence for the affected area
- [x] Assemble audit context bundle
- [x] Run phase audit
- [x] Repair gaps and re-audit until `Audit: PASS`
- [x] Create traceability mapping (R# -> changes -> validation)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: Replay candidate eligibility mirrors the router | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP1`
- R2 | Coverage: direct | Source Quote: Named replay refusal semantics | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/contribution-outcome.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/` | QA Surface: `sub-phase SP2`
- R3 | Coverage: direct | Source Quote: Model lineage and modality metadata for the DeepSeek flash line | Implementation Surface: `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/src/refresh.ts`, `testdata/catalog/` | Verification Surface: `role-model-router/packages/catalog/test/` | QA Surface: `sub-phase SP3`
- R4 | Coverage: direct | Source Quote: Catalog drift guard for alias and base modalities | Implementation Surface: `role-model-router/packages/catalog/src/index.ts` | Verification Surface: `role-model-router/packages/catalog/test/` | QA Surface: `sub-phase SP3`
- R5 | Coverage: direct | Source Quote: PDF and attachment modality policy | Implementation Surface: `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/core/src/router.ts` (test only) | Verification Surface: `role-model-router/packages/core/test/` | QA Surface: `sub-phase SP3`
- R6 | Coverage: direct | Source Quote: Taxonomy fidelity into captures, observations and learning rows | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/`, `role-model-router/apps/runtime-ui/app/` | QA Surface: `sub-phase SP4`
- R7 | Coverage: direct | Source Quote: Promotion-gate visibility | Implementation Surface: the private operator learning readback server, `role-model-router/apps/runtime-ui/app/routes/learning.tsx` | Verification Surface: the private Track B test tree, `role-model-router/apps/runtime-ui/app/` | QA Surface: `sub-phase SP5`
- R8 | Coverage: direct | Source Quote: Learner validation unblock | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/cli.ts`, the private evaluation-core module, the private profile-learner module, the private operator server | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/`, the private Track B test tree | QA Surface: `sub-phases SP10 and SP5`
- R9 | Coverage: direct | Source Quote: Arm comparability: effort match and judge-order evidence | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, the private capture-classification module | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/`, the private Track B test tree | QA Surface: `sub-phase SP6`
- R10 | Coverage: direct | Source Quote: Sidecar robustness under replay load | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`, the private extension-host tuning module | Verification Surface: before/after live measurement | QA Surface: `sub-phase SP7`
- R11 | Coverage: direct | Source Quote: Private conformance unblocker | Implementation Surface: the private activation-policy module and its published JSON; the public consumer root `role-model-router/apps/runtime-host-bridge/src/` | Verification Surface: the private conformance lane | QA Surface: `sub-phase SP8`
- R12 | Coverage: direct | Source Quote: Strict TDD for every behaviour change | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/` | Verification Surface: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/` | QA Surface: `Phase 3 TDD log`
- R13 | Coverage: direct | Source Quote: Phase 5 live verification of the rebuilt runtime | Implementation Surface: `role-model-router/`, private distribution | Verification Surface: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/` | QA Surface: `Phase 5 live matrix`
- R14 | Coverage: direct | Source Quote: Traffic classes and aggregate hygiene | Implementation Surface: `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | Verification Surface: bridge/sqlite-memory/runtime-ui tests | QA Surface: `sub-phase SP9`
- R15 | Coverage: direct | Source Quote: Effect-first implementation with a run-specific primitive map | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/queue-runtime/index.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay-runtime.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/effect-primitive-audit.md` + the import/manifest check | QA Surface: `all sub-phases`

## Planned Changes by File

Public worktree:

- `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`: add a request-requirements reader
  (modalities/capabilities from the capture's decision, inference fallback) and filter candidates through the
  router's exported rules; record rejected arms with reasons.
- `role-model-router/apps/runtime-host-bridge/src/cli.ts` and `track-b-auto-replay.ts`: pass the capture's
  requirements into candidate selection at both call sites; add the pre-dispatch re-check and the new refusal
  class; fix the branch-append receipt gate that produces `durable replay branch append has no host dispatch
  receipt`.
- `role-model-router/apps/runtime-host-bridge/src/contribution-outcome.ts`: classify the new refusal class.
- `role-model-router/packages/catalog/src/index.ts` + `refresh.ts`: lineage modelling (base + deprecated alias),
  override `modalities` support, provenance refresh, drift guard.
- `testdata/catalog/`: refreshed supplier inputs and the pinned upstream commit.
- `role-model-router/apps/runtime-host-bridge/src/index.ts`: task-family fallback in
  `buildRequestClassification` at all four capture paths (including the observation bundle); traffic-class
  vocabulary, producer markers, the telemetry class filter and the class-aware summary predicate.
- `role-model-router/packages/runtime-observability/src/index.ts`: sample builder stops hardcoding
  `live_request` and consumes the declared class.
- `role-model-router/packages/sqlite-memory/src/index.ts`: `request_class` vocabulary/backfill extension,
  `trafficWindowWhere` class predicate, the analytics filter dimension.
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `sidebar-footer.ts`, `runtime-api.ts`: live-only
  aggregates, visible excluded counts, the class filter control, latest-live sampling.
- `role-model-router/apps/runtime-ui/app/routes/learning.tsx`: promote-gate progress rendering.
- `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`,
  `track-b-runtime.ts`: bounded contribution upload with a tagged timeout and the shared retry schedule.

Private worktree:

- private scripts/track-b/runtime-operations-server.mjs: accept a real evaluation handoff for
  `awaiting_evaluation` jobs; expose the learning receipt floors; keep the operator readback responsive.
- private extensions/evaluation-core/index.mjs: finalization/liveness fix for stranded jobs and the bounded sweep.
- private extensions/profile-learner/index.mjs: receipt/floor plumbing only if the readback needs a field it does not
  already return.
- private shared/route-learning/activation-policy.mjs + private shared/route-learning-activation-policy.json: wire or remove
  `perArmOutputEvidence` and `perArmOutputExclusionBound`.
- private shared/runtime/extension-host-tuning.mjs: per-invoke budget for the production contribution path.
- private shared/capture/classification.mjs: judge-order/effort dimensions in the comparability tuple (only if the
  receipt-family propagation needs it).

## Implementation Steps

1. `W1`: SP3 (catalog inputs/export), SP9 (telemetry typing and aggregates), SP8 (private conformance fields).
2. `W2`: SP1 (replay eligibility), SP4 (taxonomy fidelity), SP7 (sidecar upload budget).
3. `W3`: SP2 (refusal semantics and disposition terminality), SP6 (arm comparability).
4. `W4`: SP10 (replay -> evaluation handoff), then SP5 (learner finalization and gate visibility).
5. `W5`: Phase 3.5 review and Phase 4 audits on the frozen diff.

## Testing Strategy

- New behavior tests: replay eligibility filter (image/text/capability matrices), refusal classes, catalog
  lineage/override/drift, classification fallback at all four capture paths, traffic-class derivation and
  live-only aggregates, sidecar timeout classification, conformance ratchet, effort-matched arms.
- Regression tests: `core`, `sqlite-memory`, `catalog`, `runtime-ui`, focused bridge files, private tracks.
- Guardrail tests: the class-filter arithmetic test, the observed-data live-only test, the R15 manifest check,
  the conformance ratchet.
- Commands:
  - `corepack pnpm --filter effect build` (dependency closure before bridge lanes)
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run <changed test files>`
  - `corepack pnpm --filter @role-model-router/core test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm --filter @role-model-router/catalog test`
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - private: `node --test tests/track-b/<lane>.test.mjs`

## Manual QA Scenarios

1. Scenario: image-bearing request through a posture alias on the rebuilt runtime.
   - Steps: build the SEA + private distribution, start on the designated channel, `pi --no-session --provider
     role-model --model <posture alias> -p "<image prompt>"`.
   - Expected: the decision receipt and telemetry name the DeepSeek flash endpoint; no `MODALITY_UNSUPPORTED`
     dispatch.
2. Scenario: text-only and PDF controls.
   - Steps: same runtime, text prompt and a PDF-bearing prompt.
   - Expected: text selects normally; the PDF request never selects a model without the `pdf` modality.
3. Scenario: operator aggregates under replay + benchmark load.
   - Steps: run the 30-minute monitor window while replays and benchmarks run.
   - Expected: Observe/Overview headline metrics stay live-only, excluded counts reconcile, `no_eligible_target`
     is zero, the new refusal class is countable, learner promotions progress, sidecar degradations are zero.
4. Scenario: learning surfaces.
   - Steps: open Learning and Observe on the live channel.
   - Expected: receipt floors render as progress; a null floor shows honestly; the latest-request sample is live.

## Playwright Plan (if applicable)

Not applicable to this run: the UI changes (live-only aggregates, excluded counts, the class filter, the
learning progress rendering) are covered by `runtime-ui` vitest component tests plus the Phase 5 live pass on
the rebuilt runtime. No Playwright lane is added; if a browser-level check becomes necessary it runs as
`@recursive:104 @sp9 @smoke` with evidence under `playwright-report/` and `test-results/`.

## Idempotence and Recovery

- Catalog export and the vendor ledger are regenerated from pinned inputs; re-running the export is idempotent.
- SQLite changes are additive columns/indexes plus backfills guarded by migrations; re-running is a no-op.
- Queue/handoff changes must be safe to replay: a duplicate evaluation handoff for the same replay job is a
  no-op keyed by the replay job id.
- Rollback: revert the product commits and regenerate the catalog; no destructive migration is planned.

## Implementation Sub-phases

### `SP1` Replay candidate eligibility
Covers: `R1`.
Implementation checklist:
- [ ] add the request-requirements reader and candidate filter in `track-b-replay-policy.ts`
- [ ] pass requirements at `cli.ts` and `track-b-auto-replay.ts`
- [ ] add the pre-dispatch re-check with recorded reasons
- [ ] RED test: image capture vs `[text-only]` and `[text-only, image]` pools
Tests: `runtime-host-bridge/test/` focused suite. Pass criteria: ineligible arms never dispatch; reasons recorded.
Acceptance: `R1` acceptance criteria verified by the RED/GREEN pair and the Phase 5 image request.

### `SP2` Refusal semantics and disposition terminality
Covers: `R2`.
Implementation checklist:
- [ ] add the named refusal class and classify it in `contribution-outcome.ts`
- [ ] terminal-vs-deferrable rule per refusal
- [ ] disposition rows reach a terminal outcome
Tests: refusal unit tests + tick integration. Pass criteria: one terminal refusal, zero dispatch.
Acceptance: `no_eligible_target` at zero for replays in the monitored window.

### `SP3` Catalog lineage and modality metadata
Covers: `R3`, `R4`, `R5`.
Implementation checklist:
- [ ] refresh the pinned upstream provenance and model the v4.1 base + deprecated alias
- [ ] allow overrides to set `modalities`
- [ ] add the alias/base drift guard test
- [ ] export + ledger regeneration
Tests: catalog export tests, alias inheritance, override modalities, PDF policy.
Acceptance: the entry the runtime calls carries corrected metadata; no DeepSeek `pdf`.

### `SP4` Taxonomy fidelity
Covers: `R6`.
Implementation checklist:
- [ ] add the task-family fallback in `buildRequestClassification`
- [ ] apply it at all four capture paths, including the observation bundle
- [ ] render the task family in the learning decisions table
Tests: fallback chain unit tests + capture integration test.
Acceptance: a fresh capture reads back with a non-null task family equal to the computed value.

### `SP5` Learner finalization and gate visibility
Covers: `R7`, `R8` (after `SP10`).
Implementation checklist:
- [ ] fix the finalization boundary so candidates get receipts
- [ ] expose the receipt floors in the learning readback
- [ ] render progress against the floor
Tests: readback tests, UI progress test, queue integration test.
Acceptance: no terminal `candidate_not_validatable`; at least one comparison finalizes in the window.

### `SP6` Arm comparability
Covers: `R9`.
Implementation checklist:
- [ ] effort-matched arms (or a recorded comparability dimension)
- [ ] comparability dimensions in the validation receipt family evidence
Tests: arm selection tests + receipt test.
Acceptance: the live luna/sol comparison is explained with matched effort or the recorded confound.

### `SP7` Sidecar robustness
Covers: `R10`.
Implementation checklist:
- [ ] bound the contribution upload with a tagged timeout and the shared retry schedule
- [ ] reduce/relocate the 293 KB `evaluation:list-groups` polling load
Tests: timeout classification test + before/after live measurement.
Acceptance: zero degradations under the monitored load; operator readbacks answer under 1 s.

### `SP8` Private conformance unblocker
Covers: `R11`.
Implementation checklist:
- [ ] wire or remove `perArmOutputEvidence` and `perArmOutputExclusionBound`
- [ ] keep `KNOWN_UNWIRED` empty
Tests: the private conformance lane.
Acceptance: the lane is green at the pinned baseline.

### `SP9` Traffic classes and aggregate hygiene
Covers: `R14`.
Implementation checklist:
- [ ] vocabulary + producer markers (reconciled with `executionTrafficClass`)
- [ ] telemetry writer carries the declared class; observation and telemetry agree
- [ ] class predicate in the summary path; class filter in the query/analytics path
- [ ] live-only UI aggregates with visible excluded counts and latest-live sampling
Tests: derivation, producer markers, arithmetic aggregate test, storage live-only test, UI tests.
Acceptance: a replay cannot change the live cache-hit rate, counts, latency or cost.

### `SP10` Replay -> evaluation handoff
Covers: `R8` (leading dependency), `R2`.
Implementation checklist:
- [ ] make the private evaluation handoff real (or replace the inert seam) for `awaiting_evaluation` jobs
- [ ] fix the branch-append receipt gate that strands replays
- [ ] prove a completed replay enqueues exactly one evaluation job (idempotent)
Tests: private handoff integration test + a tick test.
Acceptance: a replay reaches evaluation; the disposition plane shows terminal outcomes.

## File-Ownership Matrix

## Plan Drift Check

- Every requirement in `00-requirements.md` (as amended by addenda 01-03) maps to exactly one primary
  sub-phase, with `R8` split across `SP10` (handoff) and `SP5` (finalization) and `R15` cross-cutting by design.
- Deviation from the locked requirement's suggested wave table: the plan adds `SP10` (replay -> evaluation
  handoff) and serializes `SP10` before `SP5`. Rationale: the Phase 1 live evidence shows the evaluation and
  learner queues are starved because no replay reaches evaluation; without the handoff fix, `R8`'s acceptance
  criteria cannot be met. No requirement is dropped or narrowed.
- Deviation from the locked requirement's `SP7` scope: the plan moves the evaluation-core sweep work out of
  `SP7` into `SP10`'s file ownership (same private file as the handoff) so no wave has two writers on one file.
- Deviation from the locked requirement's `R11`: the corrected, measured scope is two fields (addendum-01).
- The `T2.5` Effect audit is controller-executed, not delegated, because the dispatched child produced nothing;
  the failure is preserved and the override recorded.

| Sub-phase | Owned files (public unless marked) | Wave |
| --- | --- | --- |
| `SP3` | `packages/catalog/src/index.ts`, `packages/catalog/src/refresh.ts`, `testdata/catalog/*`, `vendor-version-ledger.json` | W1 |
| `SP9` | `packages/runtime-observability/src/index.ts`, `packages/sqlite-memory/src/index.ts`, `apps/runtime-ui/app/lib/*`, `apps/runtime-host-bridge/src/index.ts` (telemetry/summary/filter functions only) | W1 |
| `SP8` | private activation-policy module + published JSON, private Track B conformance lane | W1 |
| `SP1` | `apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `cli.ts` (selection call site), `track-b-auto-replay.ts` | W2 |
| `SP4` | `apps/runtime-host-bridge/src/index.ts` (classification functions only), `apps/runtime-ui/app/routes/learning.tsx` | W2 |
| `SP7` | `apps/runtime-host-bridge/src/track-b-operations.ts`, `track-b-runtime.ts` (upload path), private extension-host tuning module | W2 |
| `SP2` | `track-b-replay-policy.ts` (refusal codes), `contribution-outcome.ts`, private operator server (failure classes) | W3 (after SP1) |
| `SP6` | `cli.ts` (judge order), `track-b-runtime.ts` (comparability), private capture-classification module | W3 |
| `SP10` | private operator server (handoff), `cli.ts` (branch append) | W4 (after SP2) |
| `SP5` | private operator server (learning readback), private evaluation-core module, private profile-learner module, `apps/runtime-ui/app/routes/learning.tsx` | W4 (after SP10) |

Disjointness notes: `SP9` and `SP4` both touch `apps/runtime-host-bridge/src/index.ts` but never in the same wave
(W1 vs W2), and `SP9`'s ownership is limited to the telemetry/summary/filter functions while `SP4`'s is limited
to the classification functions. `SP5` and `SP10` both own the private operations server file and are
serialized. `SP2` and `SP1` share `track-b-replay-policy.ts` and are serialized. Every same-wave pair above is
file-disjoint.

## Effect Primitive Audit

Executed by the controller after the `sp104_t25_effect_audit` child produced nothing (attempt preserved at
`evidence/retries/sp104_t25_effect_audit-attempt-01.md`). Full results:
`evidence/other/effect-primitive-audit.md`.

- All eight sketches pass: `Schema.Literals` decode/reject, `Match.exhaustive` over the string union,
  `Data.TaggedError` + `Effect.timeoutOrElse` (and `Effect.timeout` + `Effect.catchTag("TimeoutError", ...)`),
  `Semaphore` + `SynchronizedRef` concurrency, `Effect.retry` + `Schedule.min([exponential, spaced])`, the three
  metric kinds, `Config`/`ConfigProvider` resolution, and the `effect/unstable/persistence` import path.
- Three corrections that bind every sub-phase: (1) `Effect.retry` retries **typed failures only** - retried work
  must fail through `Effect.fail`/`Data.TaggedError`, never by throwing a defect; (2) `Metric.histogram`
  requires `{ boundaries }` in rc.117; (3) `Config.string` does not exist - use
  `Config.schema(Schema.String, path)`.
- The R15 manifest check remains: one manifest row per changed file importing `effect`/`effect-mq`, derived from
  the diff basis, with the controller-run script failing on an unmapped import, a relative `vendor/**` import,
  or a dependency change.

## Delegation and Risk Register

- Implementation waves follow `## File-Ownership Matrix`; one implementer subagent per sub-phase, controller
  acceptance, controller fallback (the Codex protocol in `00-requirements.md`).
- Delegated read-only audits: per-sub-phase `code-reviewer`, the Phase 3.5 bundle review, the Phase 4 tester
  audit, and the Phase-5 matrix/monitor testers.
- Risks: (1) the private operations server is the most contended file - serialized by design; (2) the stage
  runtime is in active operator use - Phase 5 uses a separate channel/state root; (3) subagent stalls - the
  controller executes any slot that exceeds its box; (4) the catalog export changes a generated artifact - the
  export command is the only writer.

## Audit Context

Subagent Capability Probe: `spawn_agent` accepted the Phase 2 `T2.5` child, but the child recovered neither its task nor its brief and produced nothing; the controller executed `T2.5` directly
Subagent Availability: available
Delegation Override Reason: the `T2.5` child returned without starting work (attempt preserved at `evidence/retries/sp104_t25_effect_audit-attempt-01.md`), so the controller ran the sketches itself under `self-audit`
Audit Execution Mode: self-audit
Delegation Decision Basis: the plan was drafted in-session and the delegated `T2.5` slot failed; the controller executed that slot and verified it against the vendored source, and the traceability audit is dispatched to a second planner per the run's delegation plan
Audit Inputs Provided:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-worktree.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` (LOCKED)
- the three locked requirement addenda
- Changed files: run-folder artifacts only at plan time; the product files are listed under `## Planned Changes by File`
- Targeted code references: `role-model-router/apps/runtime-host-bridge/src/`, `role-model-router/packages/`, `role-model-router/apps/runtime-ui/app/`, the private Track B scripts and extensions

## Effective Inputs Re-read

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-catalog-lineage.addendum-02.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-benchmark-value.addendum-03.md`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md` (runs 97, 98, 100, 101, 103 sections)

## Earlier Phase Reconciliation

- `00-requirements.md`: every in-scope `R1`-`R15` is planned; `R12`/`R13` are process gates; the three addenda are
  effective inputs.
- `01-as-is.md`: current behaviour reconciled; the queue-stall handoff is sequenced as `SP10` before `SP5`.
- `01.5-root-cause.md`: not present; Phase 1.5 is not required for this run.

## Subagent Contribution Verification

Reviewed Action Records: none for this phase - the only delegated slot (`sp104_t25_effect_audit`) produced no artifact, and its failure is preserved at `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/retries/sp104_t25_effect_audit-attempt-01.md`

Main-Agent Verification Performed: executed the `T2.5` sketches directly against `role-model-router/packages/effect`, the vendored `D:\DEV\role-model\vendor\effect` tree, and the worktree toolchain; the commands and outputs are recorded in `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/effect-primitive-audit.md`; traceability across `R1`-`R15` checked against `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` and `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`; planned surfaces checked against existing files; diff-owned scope reconciled with `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`

Acceptance Decision: accepted

Refresh Handling: the plan was refreshed after the `T2.5` results landed; no material change to the reviewed scope otherwise

Repair Performed After Verification: applied the `T2.5` corrections recorded in `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/effect-primitive-audit.md`

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Verification Surface: `runtime-host-bridge` tests | QA Surface: `SP1`
- R2 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Verification Surface: `runtime-host-bridge` tests | QA Surface: `SP2`
- R3 | Status: planned | Implementation Surface: `role-model-router/packages/catalog/src/index.ts` | Verification Surface: `catalog` tests | QA Surface: `SP3`
- R4 | Status: planned | Implementation Surface: `role-model-router/packages/catalog/src/index.ts` | Verification Surface: `catalog` tests | QA Surface: `SP3`
- R5 | Status: planned | Implementation Surface: `role-model-router/packages/catalog/src/index.ts` | Verification Surface: `core` tests | QA Surface: `SP3`
- R6 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: bridge and runtime-ui tests | QA Surface: `SP4`
- R7 | Status: planned | Implementation Surface: the private operator learning readback server, `role-model-router/apps/runtime-ui/app/routes/learning.tsx` | Verification Surface: private tests and runtime-ui tests | QA Surface: `SP5`
- R8 | Status: planned | Implementation Surface: the private operator server, `role-model-router/apps/runtime-host-bridge/src/cli.ts` | Verification Surface: bridge and private tests | QA Surface: `SP10`, `SP5`
- R9 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/cli.ts` | Verification Surface: bridge tests | QA Surface: `SP6`
- R10 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Surface: live measurement | QA Surface: `SP7`
- R11 | Status: planned | Implementation Surface: the private activation-policy module, `role-model-router/apps/runtime-host-bridge/src/` | Verification Surface: private conformance lane | QA Surface: `SP8`
- R12 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/` | Verification Surface: `evidence/logs/` | QA Surface: Phase 3 TDD log
- R13 | Status: planned | Implementation Surface: `role-model-router/` | Verification Surface: Phase 5 evidence tree | QA Surface: Phase 5 live matrix
- R14 | Status: planned | Implementation Surface: `role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: sqlite-memory and runtime-ui tests | QA Surface: `SP9`
- R15 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/queue-runtime/index.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay-runtime.ts`, `role-model-router/packages/runtime-observability/src/index.ts` | Verification Surface: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/effect-primitive-audit.md` | QA Surface: all sub-phases

## Verification Handoff

- Inspect first: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- Upstream: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`
- Effect audit: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/effect-primitive-audit.md`
- Diff basis command: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `84d5996cb156217d37801943831762bc734ae21f`
- Comparison reference: `working-tree`
- Normalized baseline: `84d5996cb156217d37801943831762bc734ae21f`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`
- Base branch: `origin/dev`
- Worktree branch: `recursive/104-replay-eligibility-and-evidence-fidelity`
- Planned or claimed changed files: the files listed under `## Planned Changes by File`
- Actual changed files reviewed: run-folder artifacts only so far; product changes start in Phase 3

## Gaps Found

- none unresolved for this phase; the `T2.5` audit is folded into `## Effect Primitive Audit` before lock

## Repair Work Performed

- none yet; `T2.5` corrections (if any) are applied to `## Effect Primitive Audit` and the sub-phase checklists

## Audit Verdict

Audit: PASS

Every requirement maps to a sub-phase and a concrete surface; the ten sub-phases are sequenced with a
file-ownership matrix that keeps every wave disjoint; the testing and QA strategies name exact commands and
evidence paths; the Effect primitive audit is executed, not asserted.

Self-audit detail (controller, because the delegated `T2.5` slot produced nothing and this phase ran in
`self-audit` mode): every `R1`-`R15` appears in `## Requirement Mapping`, `## Requirement Completion Status`
and `## Traceability` with matching sub-phase/QA surfaces; every sub-phase maps to at least one requirement and
no sub-phase is unmapped; the same-wave pairs in `## File-Ownership Matrix` are file-disjoint (the shared files
`track-b-replay-policy.ts`, `apps/runtime-host-bridge/src/index.ts`, `track-b-runtime.ts`, `cli.ts` and the
private operations server are serialized across waves); the testing commands exist (`catalog`, `core`,
`sqlite-memory`, `runtime-observability`, `runtime-ui` all declare a `test` script, and the private
`tests/track-b/` tree exists); the `T2.5` sketches were executed against the vendored
`effect@4.0.0-rc.117` and their three corrections are folded into `## Effect Primitive Audit`; the run-folder
diff contains no product change at plan time.

## Traceability

- R1 -> `SP1` -> `runtime-host-bridge` filter tests -> Phase 5 image request
- R2 -> `SP2` -> refusal tests + the monitored window's refusal count
- R3 -> `SP3` -> catalog export tests + the live flash metadata check
- R4 -> `SP3` -> alias/base drift guard test
- R5 -> `SP3` -> PDF policy test
- R6 -> `SP4` -> classification fallback tests + live readback
- R7 -> `SP5` -> readback/UI tests + live Learning surface
- R8 -> `SP10`, `SP5` -> handoff test + queue integration + monitored window
- R9 -> `SP6` -> arm selection tests + live comparison receipt
- R10 -> `SP7` -> before/after live measurement
- R11 -> `SP8` -> private conformance lane
- R12 -> Phase 3 TDD log -> Phase 4 audit
- R13 -> Phase 5 matrix + monitored window
- R14 -> `SP9` -> arithmetic aggregate test + live metric check
- R15 -> `T2.5` + the manifest check -> per-wave `code-reviewer`

## Coverage Gate

- [x] Every requirement maps to a sub-phase and a verification surface
- [x] Every sub-phase has a RED test plan, an acceptance criterion and an evidence path
- [x] The file-ownership matrix proves every wave is disjoint (serialized where files overlap)
- [x] Delegation, risks, idempotence and rollback are recorded

Coverage: PASS

## Approval Gate

- [x] The plan is ready for Phase 3 implementation in wave order

Approval: PASS
