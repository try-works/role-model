Run: `/.recursive/run/69-benchmark-scoring-integrity/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-13T01:55:44Z`
LockHash: `175c4d665e582ab983103efde5ea0dd7c1c9a8bab0d44e71b4a17e74e772f448`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/00-worktree.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/01-as-is.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/01.5-root-cause.md` (LOCKED)
Outputs:
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md`
Scope note: Defines the implementation plan for repairing benchmark-integrity scoring on top of the current local `main` baseline while preserving the already-landed run-68 runtime parity fixes.

## TODO

- [x] Map `R1` through `R7` to concrete file changes
- [x] Define strict RED-first test slices before any production edits
- [x] Define the minimal benchmark-owned production changes needed for each root cause
- [x] Define the quick and full runtime rerun verification loop
- [x] Audit the plan against the locked requirements and root-cause findings

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: the worktree-local recursive router resolves `analyst`, `planner`, `code-reviewer`, and `tester` to `decision: "ask-user"` because no concrete CLI or model bindings are configured in `/.recursive/config/recursive-router.json`.
Delegation Decision Basis: the recursive router does not have canonical delegated role bindings for this worktree, so Phase 2 planning proceeds as a local audited artifact.
Audit Inputs Provided:
- locked requirements, worktree, AS-IS, and root-cause artifacts
- current benchmark-runner, bench-routing, suite data, and owning tests
- historical July 12 and July 13 benchmark evidence already cited upstream

## Effective Inputs Re-read

- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
- `/.recursive/run/69-benchmark-scoring-integrity/00-worktree.md`
- `/.recursive/run/69-benchmark-scoring-integrity/01-as-is.md`
- `/.recursive/run/69-benchmark-scoring-integrity/01.5-root-cause.md`
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-compare.test.ts`
- `/role-model-router/packages/bench-routing/src/answer-format.ts`
- `/role-model-router/packages/bench-routing/src/answer-format.test.ts`
- `/role-model-router/packages/bench-routing/src/index.ts`
- `/role-model-router/packages/bench-routing/src/index.test.ts`
- `/role-model-router/packages/bench-routing/src/judge-brief.ts`
- `/role-model-router/packages/bench-routing/src/judge-brief.test.ts`
- `/role-model-router/packages/bench-routing/data/routing-capability-suite.json`

## Planned Changes by File

### `/role-model-router/packages/bench-routing/src/answer-format.ts`

- Preserve a code-fence-faithful judged deliverable for `code_fence` cases instead of serializing the canonical deliverable into JSON `{ "code": "..." }`.
- Keep internal extraction metadata rich enough for validation and completeness scoring, but make `serialized` match what the judge should actually grade.
- Preserve existing JSON and tool-call answer-format behavior for non-code-fence cases.

### `/role-model-router/packages/bench-routing/src/answer-format.test.ts`

- Add RED-first tests proving `code_fence` extraction preserves a literal fenced TypeScript deliverable.
- Add RED-first tests proving fenced-code exemplars and follow-up instructions agree with the extracted canonical deliverable.

### `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`

- Stop feeding a benchmark-internal JSON wrapper to the judge for `code_fence` cases.
- Remove or neutralize the overlap-only `strictSelfGrade` rubric branch while keeping overlap allowed and warning-visible.
- Keep compare-artifact persistence diagnostic-only and make that invariant explicit in tests.

### `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`

- Add RED-first coverage for code-fence response artifacts and judged deliverables on `h01` or `h02`.
- Add RED-first coverage proving overlap mode no longer changes the substantive judge prompt for the overlapping subject.
- Add RED-first coverage proving compare artifacts do not change endpoint case scores or overall scores.
- Update existing code-fence tests away from `JSON.parse(formattedDeliverable)` expectations.

### `/role-model-router/packages/bench-routing/src/judge-brief.ts`

- Introduce or consume a suite-coherence validation seam so contradictory `grading_criteria`, `answer_format`, and `example_deliverable` combinations can be rejected deterministically.
- Keep checklist generation authoritative once the authored case is valid.

### `/role-model-router/packages/bench-routing/src/judge-brief.test.ts`

- Add RED-first tests that fail when a `code_fence` exemplar is authored as JSON.
- Add RED-first tests that fail when a case such as `h15-max-signal-v3` combines incompatible rubric and exemplar shapes.

### `/role-model-router/packages/bench-routing/src/index.ts`

- Add a reusable benchmark-suite validation helper if that is the narrowest owning seam for the contradiction checks.
- Optionally expose the validator through the package entrypoint if tests or runtime loading need a single canonical suite-validation call.

### `/role-model-router/packages/bench-routing/src/index.test.ts`

- Add RED-first tests for suite-validation failures on contradictory authored cases.
- Keep existing benchmark-case selection and grounded-truth tests green.

### `/role-model-router/packages/bench-routing/data/routing-capability-suite.json`

- Repair `h01` and `h02` authored exemplars so they match their `code_fence` contract.
- Repair `h15-max-signal-v3` so one authoritative deliverable contract remains. The likely direction is to keep the existing structured JSON tool-workflow shape and remove the contradictory `A/B/C/D sections` requirement, unless the RED suite-validation tests show a narrower coherent alternative.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "This follow-on run must start from the local `main` branch state current at Phase 0 execution time" | Implementation Surface: `/.recursive/run/69-benchmark-scoring-integrity/00-worktree.md`; `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | Verification Surface: `/.recursive/run/69-benchmark-scoring-integrity/01-as-is.md`; `/.recursive/run/69-benchmark-scoring-integrity/01.5-root-cause.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`
- `R2` | Coverage: direct | Source Quote: "Judge-subject overlap remains a permitted run configuration" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`, `/role-model-router/packages/bench-routing/src/index.ts` | Verification Surface: `benchmark-runner-judge.test.ts` targeted overlap tests | QA Surface: quick and full runtime reruns with judge overlap still enabled
- `R3` | Coverage: direct | Source Quote: "Benchmark extraction and judging must stop penalizing code-fence subjects for a benchmark-internal serialization mismatch" | Implementation Surface: `/role-model-router/packages/bench-routing/src/answer-format.ts`, `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` | Verification Surface: `answer-format.test.ts` and `benchmark-runner-judge.test.ts` code-fence tests | QA Surface: quick and full runtime reruns on `h01` and `h02`
- `R4` | Coverage: direct | Source Quote: "The benchmark suite data must be internally coherent so the scoring contract can be satisfied by at least one valid answer shape" | Implementation Surface: `/role-model-router/packages/bench-routing/src/judge-brief.ts`, `/role-model-router/packages/bench-routing/src/index.ts`, `/role-model-router/packages/bench-routing/data/routing-capability-suite.json` | Verification Surface: `judge-brief.test.ts` and `index.test.ts` suite-validation tests | QA Surface: quick and full runtime reruns on `h15`
- `R5` | Coverage: direct | Source Quote: "The benchmark layer needs durable automated coverage for the defect family exposed by the July 12 and July 13 investigations" | Implementation Surface: `/role-model-router/packages/bench-routing/src/answer-format.test.ts`; `/role-model-router/packages/bench-routing/src/index.test.ts`; `/role-model-router/packages/bench-routing/src/judge-brief.test.ts`; `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`; `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-compare.test.ts` | Verification Surface: `/.recursive/run/69-benchmark-scoring-integrity/evidence/logs/red/`; `/.recursive/run/69-benchmark-scoring-integrity/evidence/logs/green/`; `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`
- `R6` | Coverage: direct | Source Quote: "Benchmark-owned production changes and regression fixes in this run must follow strict TDD rather than tests-after repair" | Implementation Surface: `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md` | Verification Surface: RED and GREEN evidence captured before and after each production change | QA Surface: none; this is a Phase 3 discipline requirement
- `R7` | Coverage: direct | Source Quote: "The run must close with fresh runtime evidence that distinguishes benchmark defects from true model behavior on top of the repaired local `main` baseline, and the controller must keep iterating until the benchmark-layer defects in scope are fixed or a concrete blocker is recorded." | Implementation Surface: `/role-model-router/packages/bench-routing/src/answer-format.ts`; `/role-model-router/packages/bench-routing/src/judge-brief.ts`; `/role-model-router/packages/bench-routing/src/index.ts`; `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`; `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | Verification Surface: `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`

## Implementation Steps

1. Write failing `answer-format.test.ts` cases for `code_fence` serialization truth and exemplar alignment.
2. Write failing `benchmark-runner-judge.test.ts` cases that expose:
   - fence-faithful judged deliverables
   - overlap mode no longer adding a special stricter rubric
   - compare artifacts remaining diagnostic-only
3. Write failing `judge-brief.test.ts` and or `index.test.ts` cases for contradictory suite definitions, including `h15-max-signal-v3`.
4. Repair `answer-format.ts` so `code_fence` canonical serialization matches the authored deliverable contract.
5. Repair `benchmark-runner.ts` so overlap no longer changes the substantive judge rubric and code-fence judge input remains faithful.
6. Add suite-validation logic and repair authored case data in `routing-capability-suite.json`.
7. Rerun the focused regression floor until all RED tests turn GREEN.
8. Run the broader benchmark-owned package suites already recorded in `00-worktree.md`.
9. Execute runtime quick benchmark reruns after each meaningful benchmark-owned repair until the in-scope defects stop reproducing or a blocker is recorded.
10. Execute a full runtime benchmark rerun once the quick rerun is stable, and again if any later repair could change full-suite truth.

## Testing Strategy

TDD Mode: `strict`

### RED tests

- `answer-format.test.ts`
  - `code_fence` extraction preserves a literal fenced TypeScript judged deliverable
  - `code_fence` authored exemplar must agree with the fence contract
- `benchmark-runner-judge.test.ts`
  - code-fence benchmark artifacts preserve a fence-faithful judged deliverable
  - judge-subject overlap does not inject a stricter prompt branch for the overlapping endpoint
  - compare artifacts persist separately and do not alter endpoint scores
- `judge-brief.test.ts`
  - contradictory authored exemplars are rejected for `code_fence` cases
  - `h15-max-signal-v3` fails validation until its data is coherent
- `index.test.ts`
  - suite-validation helper rejects contradictory case definitions before benchmark execution

### Verification Floor

- `corepack pnpm --filter @role-model-router/bench-routing test`
- `corepack pnpm --filter @role-model-router/bench-judge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/benchmark-runner-judge.test.ts test/benchmark-runner-compare.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/benchmark-artifacts.test.ts test/benchmark-candidates-routing-quality.test.ts test/benchmark-data-clear.test.ts test/benchmark-judge-runtime.test.ts test/benchmark-progress.test.ts test/benchmark-start-guards.test.ts test/benchmark-summary.test.ts test/benchmark-validation-metrics.test.ts`

## Playwright Plan (if applicable)

Not applicable. This run is benchmark-backend and runtime-verification focused.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

Planned scenarios:

1. Start the runtime from the run-69 worktree using the repo’s current runtime startup path.
2. Rerun the July 13 quick benchmark slice through `POST /api/role-model/benchmark/runs` with overlap still enabled and the current local benchmark-owned code.
3. Inspect quick artifacts for `h01`, `h02`, and `h15` and classify any remaining low scores as:
   - true model miss
   - benchmark-owned issue
   - other isolated cause
4. Repeat the quick rerun after each meaningful benchmark-owned repair until the in-scope issues stop reproducing or a blocker is recorded.
5. Run a full benchmark through the same runtime after the quick rerun stabilizes.
6. If a post-quick repair changes full-suite-relevant code or suite data again, rerun the full benchmark before closeout.

## Idempotence and Recovery

- The focused Vitest suites are deterministic and safe to rerun after each RED or GREEN step.
- The benchmark-owned package suites from `00-worktree.md` are safe to rerun repeatedly.
- Runtime benchmark reruns create new run artifacts and can be repeated without mutating the product code.
- If later work reopens Phase 1, 1.5, or 2, later-phase artifacts must be invalidated and recreated from the earliest reopened phase.

## Implementation Sub-phases

1. RED: code-fence serialization and exemplar-alignment tests
2. RED: overlap-parity and compare-diagnostic-only tests
3. RED: suite-coherence validation tests
4. GREEN: answer-format and benchmark-runner repair
5. GREEN: suite-validation helper and authored data repair
6. REFACTOR: tighten shared helpers without changing behavior
7. Verification: focused suites, benchmark-owned package suites, quick runtime reruns, full runtime reruns

## Plan Drift Check

- No reopening of the run-68 runtime transport parity scope
- No benchmark redesign unrelated to code-fence truth, overlap parity, or suite coherence
- No judge-model change intended only to mask benchmark defects
- No changes to runtime routing policy or provider selection unrelated to benchmark integrity
- No closeout based on package tests alone without runtime quick and full reruns

## Known Unknowns Carried Forward

- Whether preserving literal fenced text or re-fencing extracted code is the narrower `R3` implementation once the RED tests are written.
- Whether suite validation should run eagerly when loading the benchmark suite or only through a dedicated validator used by tests and benchmark startup.
- Whether quick or full reruns will surface any additional authored contradictions beyond the currently known `h01`, `h02`, and `h15` family.

## Gaps Found

None beyond the already-documented Phase 1 and Phase 1.5 defects that this plan is intended to close.

## Repair Work Performed

None. This artifact defines the implementation plan only.

## Audit Verdict

Audit: PASS

## Earlier Phase Reconciliation

- `01-as-is.md` established the benchmark-owned integrity baseline on top of local `main`.
- `01.5-root-cause.md` reduced that baseline to four benchmark-owned root causes and separated the historical July 12 subject-execution defect family.
- This plan addresses those root causes directly without widening into provider, routing, or UI redesign.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct reconciliation of the locked requirements and root-cause findings against the current code and planned test surfaces
- Acceptance Decision: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c8215896a60b6a6aea64dd8d945d37f720da4605`
- Comparison reference: `working-tree`
- Normalized baseline: `c8215896a60b6a6aea64dd8d945d37f720da4605`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c8215896a60b6a6aea64dd8d945d37f720da4605`
- Base branch: `main`
- Worktree branch: `recursive/69-benchmark-scoring-integrity`
- Active worktree path: `D:\DEV\role-model\.worktrees\69-benchmark-scoring-integrity\`

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `/.recursive/run/69-benchmark-scoring-integrity/00-worktree.md`; `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | Verification Surface: `/.recursive/run/69-benchmark-scoring-integrity/01-as-is.md`; `/.recursive/run/69-benchmark-scoring-integrity/01.5-root-cause.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`
- `R2` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`; `/role-model-router/packages/bench-routing/src/index.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`
- `R3` | Status: planned | Implementation Surface: `/role-model-router/packages/bench-routing/src/answer-format.ts`; `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` | Verification Surface: `/role-model-router/packages/bench-routing/src/answer-format.test.ts`; `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`
- `R4` | Status: planned | Implementation Surface: `/role-model-router/packages/bench-routing/src/judge-brief.ts`; `/role-model-router/packages/bench-routing/src/index.ts`; `/role-model-router/packages/bench-routing/data/routing-capability-suite.json` | Verification Surface: `/role-model-router/packages/bench-routing/src/judge-brief.test.ts`; `/role-model-router/packages/bench-routing/src/index.test.ts` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`
- `R5` | Status: planned | Implementation Surface: `/role-model-router/packages/bench-routing/src/answer-format.test.ts`; `/role-model-router/packages/bench-routing/src/index.test.ts`; `/role-model-router/packages/bench-routing/src/judge-brief.test.ts`; `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`; `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-compare.test.ts` | Verification Surface: `/.recursive/run/69-benchmark-scoring-integrity/evidence/logs/red/`; `/.recursive/run/69-benchmark-scoring-integrity/evidence/logs/green/`; `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`
- `R6` | Status: planned | Implementation Surface: `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md` | Verification Surface: `/.recursive/run/69-benchmark-scoring-integrity/evidence/logs/red/`; `/.recursive/run/69-benchmark-scoring-integrity/evidence/logs/green/`; `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`
- `R7` | Status: planned | Implementation Surface: `/role-model-router/packages/bench-routing/src/answer-format.ts`; `/role-model-router/packages/bench-routing/src/judge-brief.ts`; `/role-model-router/packages/bench-routing/src/index.ts`; `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`; `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | Verification Surface: `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`; `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` | QA Surface: `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`

## Traceability

- `R1`: local `main` baseline and historical classification preserved
- `R2`: overlap parity repair planned
- `R3`: code-fence judged-deliverable repair planned
- `R4`: suite-coherence repair and validation planned
- `R5`: benchmark-owned regression-floor expansion planned
- `R6`: strict TDD execution planned
- `R7`: iterative quick and full runtime reruns planned

## Coverage Gate

- [x] `R1` through `R7` are mapped to concrete implementation and verification surfaces
- [x] RED-first test slices are defined before any production edits
- [x] The plan includes both focused automated verification and runtime quick and full benchmark reruns

Coverage: PASS

## Approval Gate

- [x] The plan is concrete enough to begin strict TDD implementation
- [x] The plan stays inside the benchmark-owned integrity scope of run 69
- [x] The artifact is ready for Phase 3 execution

Approval: PASS
