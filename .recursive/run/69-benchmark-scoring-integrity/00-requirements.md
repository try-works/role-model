Run: `/.recursive/run/69-benchmark-scoring-integrity/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- user guidance in chat on `2026-07-13`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\memory\benchmark-runs\f36ef687-fbce-445d-b576-4e1d36f88572\manifest.json`
- `C:\Users\erikb\AppData\Local\Role Model Runtime\standalone-runtime\memory\benchmark-runs\e898f536-8b2d-4e2e-a4e8-12880d4e97c9\manifest.json`
Outputs:
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
Scope note: This follow-on run starts from the run 68 Codex Subscription tool-call parity baseline and repairs the remaining benchmark-layer scoring and suite-integrity defects that still distort the July 13, 2026 quick benchmark and would also contaminate future full reruns. It does not re-solve the July 12, 2026 pre-run-68 GPT subject-execution failures; those are treated as explained baseline evidence rather than active benchmark-scoring bugs.

## TODO

- [x] Re-scope the work as a follow-on run instead of mutating locked run 68 artifacts
- [x] Make the run 68 worktree or branch the required implementation baseline
- [x] Preserve judge-subject overlap as allowed behavior
- [x] Capture the specific benchmark defects evidenced by the July 12 and July 13 runs
- [x] Separate remaining benchmark-layer work from already-fixed subject tool-call parity work

## Run Metadata

- Priority: `P1`
- Run type: `benchmark scoring integrity follow-up`
- Primary subsystems:
  - `role-model-router/packages/bench-routing/**`
  - `role-model-router/packages/bench-judge/**`
  - `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
  - `role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
- Secondary subsystems:
  - `role-model-router/packages/bench-routing/data/routing-capability-suite.json`
  - `role-model-router/packages/bench-routing/src/answer-format.test.ts`
  - `role-model-router/packages/bench-routing/src/index.test.ts`
- User-visible outcome:
  - benchmark results stop under-scoring GPT-5.4 on code-fence and judge-overlap cases for benchmark-internal reasons, contradictory suite cases stop depressing all models, and quick/full reruns can separate true model misses from benchmark defects
- Main risk theme:
  - a narrow patch could make one suspicious run look better while leaving asymmetric judging or contradictory suite authoring in place

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `52-codex-subscription-benchmark-tool-path` | established that benchmark failures can originate in the runtime or benchmark plumbing rather than the model |
| `68-codex-subscription-tool-call-parity` | repaired the GPT subject-side tool-call parity defect; this follow-on run must layer on top of that baseline rather than re-debugging pre-run-68 behavior |

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| user guidance in chat on `2026-07-13` | defines the desired outcome: explain July 12 and July 13 benchmark anomalies, keep judge-subject overlap permitted, and update the implementation proposal to baseline on run 68 |
| `/.recursive/STATE.md` | records run 68 as the current runtime truth: Codex non-stream and benchmark tool parity are already repaired |
| `/.recursive/DECISIONS.md` | identifies run 68 as the relevant baseline rather than `main` or pre-run-68 benchmark artifacts |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | captures durable runtime and benchmark-routing truths, including current Codex benchmark semantics |
| `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md` | constrains what run 68 owned and what remained out of scope; this run should not retroactively widen run 68 |
| July 13 quick run `f36ef687-fbce-445d-b576-4e1d36f88572` | proves the remaining issue is benchmark-layer scoring or suite integrity after subject execution parity was already repaired |
| July 12 full run `e898f536-8b2d-4e2e-a4e8-12880d4e97c9` | proves that empty GPT tool artifacts before run 68 were real subject-execution defects, but the same scoring and suite-authoring defects were still present in that run |

## Problem Summary

The current evidence splits into two categories that must not be conflated:

1. July 12, 2026 full-run GPT empty tool-case artifacts were pre-run-68 subject execution failures and are not the active benchmark-scoring bug to fix in this follow-on run.
2. July 13, 2026 quick-run GPT under-scoring still shows benchmark-layer defects after run 68:
   - `code_fence` deliverables are normalized into JSON `{"code":"..."}` and then judged against a rubric that expects a literal fenced TypeScript block
   - when the judge is also a scored subject, the judge path applies stricter self-grading than it applies to other subjects
   - at least one shipped suite case (`h15-max-signal-v3`) has an internally contradictory deliverable contract that no model can satisfy cleanly

Those remaining defects also affect future full reruns, because the July 12 full run contains the same code-fence and contradictory-suite issues even though its empty GPT tool cases were separately explained by pre-run-68 behavior.

## Requirements

### `R1` Use run 68 as the implementation baseline

Description:
This follow-on run must start from the run 68 Codex Subscription tool-call parity baseline, not from the root `main` worktree and not from pre-run-68 benchmark artifacts.

Acceptance criteria:
- Phase 0 for this run creates its isolated implementation worktree from branch `recursive/68-codex-subscription-tool-call-parity` or from a preserved snapshot of `D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity`.
- If the run 68 worktree still contains uncommitted changes when this follow-on run starts, Phase 0 records the exact snapshot mechanism used before new benchmark edits begin.
- The run explicitly classifies the July 12 empty GPT tool outputs as pre-run-68 baseline evidence, not as a fresh benchmark-scoring defect to re-diagnose.

### `R2` Keep judge-subject overlap permitted while removing asymmetric grading

Description:
Benchmarks where the judge is also a scored subject must remain allowed, but the grading path must not apply a stricter rubric to the overlapping subject than it applies to other endpoints.

Acceptance criteria:
- Judge-subject overlap remains a permitted run configuration.
- The benchmark may still emit a manifest warning or metadata flag for overlap risk, but overlap no longer changes the substantive grading rubric.
- The stricter self-grade path or equivalent asymmetric prompt shaping is removed or neutralized so the overlapping subject and non-overlapping subjects are graded under the same checklist.
- Regression coverage proves an overlap run no longer produces a special-case zero solely because the subject is also the judge.

### `R3` Preserve code-fence deliverable truth for grading

Description:
Benchmark extraction and judging must stop penalizing code-fence subjects for a benchmark-internal serialization mismatch.

Acceptance criteria:
- `code_fence` extraction preserves the literal fenced-code deliverable for judging, or another format-neutral representation that is judged identically across all subjects and does not contradict the authored answer format.
- Code-fence cases no longer teach subjects to emit JSON `{"code":"..."}` when the authoritative answer format requires a single fenced TypeScript block.
- Regression coverage proves a correct code-fence answer is not zeroed purely because the benchmark wrapped or normalized it into a non-authoritative shape.
- The fix applies to both quick and full suites.

### `R4` Repair contradictory suite contracts and exemplars

Description:
The benchmark suite data must be internally coherent so the scoring contract can be satisfied by at least one valid answer shape.

Acceptance criteria:
- `h15-max-signal-v3` has one authoritative deliverable contract instead of simultaneously requiring `A/B/C/D` sections and a conflicting JSON summary shape.
- Authored exemplars for `code_fence` cases align with their answer format rather than contradicting it.
- A suite-level validation path fails when `answer_format`, `example_deliverable`, and `grading_criteria` disagree in materially contradictory ways.
- The remediation covers both the quick and full benchmark suites because they share the same authored case data.

### `R5` Add benchmark-integrity regression coverage

Description:
The benchmark layer needs durable automated coverage for the defect family exposed by the July 12 and July 13 investigations.

Acceptance criteria:
- Tests cover judge-overlap parity, code-fence extraction and grading shape, and contradictory suite-data validation.
- Benchmark-runner or bench-routing tests prove compare artifacts remain diagnostic only and do not control the overall endpoint score.
- The owning regression floor lives in benchmark-owned test files, not only in ad hoc runtime probes.

### `R6` Revalidate quick and full benchmark truth after the benchmark-layer repair

Description:
The run must close with fresh evidence that distinguishes benchmark defects from true model behavior on top of the run 68 baseline.

Acceptance criteria:
- The July 13 quick benchmark slice is rerun after this benchmark-layer repair on top of the run 68 baseline.
- A full benchmark is rerun after this repair on top of the run 68 baseline, unless Phase 5 records a concrete environment blocker.
- Final evidence explicitly classifies any remaining low scores as true model misses, benchmark-suite issues, or other isolated causes.
- The closeout distinguishes three things cleanly:
  - pre-run-68 subject execution failures
  - run-68 runtime parity repairs
  - this run's benchmark-layer scoring and suite-integrity repairs

## Out of Scope

- `OOS1`: re-implementing the Codex subject-side tool-call parity work already owned by run 68
- `OOS2`: broad benchmark redesign unrelated to the identified overlap, code-fence, and contradictory-suite defects
- `OOS3`: changing the selected judge model solely to mask benchmark defects
- `OOS4`: altering model answers, benchmark prompts, or runtime routing behavior for reasons unrelated to benchmark integrity

## Constraints

- The implementation baseline for this run is the run 68 worktree or a preserved branch or commit snapshot of that worktree state, not the root `main` worktree.
- Do not edit locked run 68 phase artifacts to absorb this follow-on scope; create a separate run and separate receipts instead.
- Judge-subject overlap must stay permitted; the fix is parity, not prohibition.
- Treat the July 12 GPT empty tool-case artifacts as already explained by pre-run-68 behavior unless new evidence disproves that classification.
- Keep the fix benchmark-owned where possible: bench-routing, bench-judge, benchmark-runner, suite data, and their tests.

## Assumptions

- The run 68 implementation state is the correct functional baseline for future benchmark reruns even if its branch still needs a clean snapshot before follow-on edits begin.
- The quick and full benchmark suites share enough authored data that fixing the identified suite contradictions once will improve both.
- Remaining GPT low scores on the July 13 quick run will not all disappear after the benchmark-layer repair; some cases are still expected to remain true model misses.

## Coverage Gate

Coverage: PASS

- `R1` fixes the implementation-baseline ambiguity by binding the work to run 68 rather than `main`.
- `R2` captures the user-approved overlap policy: allowed, warning-only, no asymmetric strictness.
- `R3` covers the code-fence extraction and grading-shape defect observed in both July 12 and July 13 evidence.
- `R4` covers the contradictory-suite defect, especially `h15-max-signal-v3` plus code-fence exemplars.
- `R5` requires durable regression protection in benchmark-owned tests.
- `R6` requires fresh quick and full reruns that separate pre-run-68 defects from post-run-68 benchmark integrity.

## Approval Gate

Approval: PASS

- The proposal now scopes only the remaining benchmark-layer work and does not reopen the already-explained pre-run-68 GPT subject failures.
- The run 68 worktree baseline is explicit and actionable for later Phase 0 execution.
- The user-requested policy change is preserved: judge-subject overlap stays permitted, and the repair targets parity rather than blocking.
