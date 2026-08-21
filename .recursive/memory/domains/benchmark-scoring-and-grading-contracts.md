Type: `domain`
Status: `CURRENT`
Scope: `Durable benchmark-suite contract truth for deliverable extraction, suite coherence, judge grading expectations, and runtime benchmark closeout rules.`
Owns-Paths:
- `/role-model-router/packages/bench-routing/**`
- `/role-model-router/packages/bench-judge/**`
Watch-Paths:
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/.recursive/BENCHMARK-WORKFLOW.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Source-Runs:
- `36-runtime-consumption-telemetry-remediation`
- `52-codex-subscription-benchmark-tool-path`
- `68-codex-subscription-tool-call-parity`
- `69-benchmark-scoring-integrity`
- `92-configured-model-pool-benchmark-convergence`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-07-13`
Tags:
- `benchmark`
- `grading`
- `scoring`
- `suite-contract`
- `tools`

# Benchmark Scoring And Grading Contracts

This shard owns the durable benchmark truth for how answer formats, suite data, grading prompts, and runtime benchmark closeout should behave.

## What This Domain Owns

- benchmark answer-format instructions, deliverable extraction, and scaffold follow-up construction
- suite-data coherence between `answer_format`, authored exemplars, heuristics, and grading criteria
- judge-prompt expectations for tool-required and structured-output cases
- the benchmark-specific verification rules that distinguish benchmark defects from real model misses

## Durable Truths

- Judge-subject overlap is allowed. Overlap may be warned about, but it must not change the substantive grading rubric or add overlap-only strictness.
- `code_fence` deliverables preserve the authored fence truth for judging. Do not replace a valid fenced deliverable with a benchmark-owned JSON wrapper that contradicts the answer format.
- Structured `tool_calls_with_summary` scaffolds derive from the authoritative per-case schema. Do not hardcode follow-up keys such as `test_snippet` when the case schema defines a different contract.
- Deliverable validation must enforce required keys plus `minItems`, `minLength`, and `additionalProperties` constraints against the extracted deliverable while ignoring benchmark-owned merged `tool_calls` metadata.
- Suite loading fails closed when `answer_format`, `example_deliverable`, heuristic clues, and grading criteria encode materially contradictory contracts.
- Judge prompts treat the recorded API `tool_calls` list as authoritative benchmark metadata for tool execution. A valid tool-required case is not a failure only because the extracted deliverable also repeats a `tool_calls` field.
- Compare artifacts are diagnostic receipts. They help explain divergence, but they do not rewrite the overall endpoint score.
- Benchmark investigations must distinguish historical pre-fix subject execution failures from current benchmark-layer defects on the active repaired baseline. Do not reopen a historical runtime bug as if it were a fresh scoring defect when the current worktree already carries the earlier runtime repair.
- Classify a miss as model-caused only after a `VALID` rerun shows complete parse, compare, and progress receipts for the same run.
- Benchmark-owned subject, judge, compare, and judge-probe executions may request a benchmark-only cooldown bypass so reruns see the real endpoint outcome instead of a stale deny-list decision. Ordinary runtime traffic must keep the normal cooldown policy.

## Honest Scoring Truths (run 92)

- Missing score is never `0`/`0%`. Internal routing uses `0.00–1.00` fractions; user-facing display uses `0–100%`; absent evidence renders `—`/`n/a`. A zero is reserved for "executed, zero-credit".
- The unit of benchmark attribution is the endpoint variant; a completed benchmark updates only the exact variant that executed it and never overwrites a sibling or base endpoint.
- Benchmark samples carry a `membership_revision` and `completion_state`; samples whose revision mismatches the current membership revision, and samples marked `stale`, are quarantined from latest-valid profile reads.
- The benchmark-only profile fallback (`latency_ms_p50: 0`) is presented as absent (masked `—`) rather than "fastest"; non-null `ObservedPerformanceProfile` fields are not force-nulled without a migration path.

## Runtime Closeout Expectations

- Final release evidence requires both a quick rerun and a full rerun unless a concrete environment blocker is recorded.
- If the run requires GPT and Kimi, both must appear in the final quick and full receipts unless Phase 5 records a concrete blocker.
- Benchmark-owned production fixes in this repo should reach closeout with strict TDD evidence before live reruns are treated as authoritative release proof.
- When provider availability is in doubt, capture a fresh runtime snapshot and a direct endpoint probe before treating a benchmark miss as a scoring issue.
- Inspect judge-attempt artifacts before concluding that a failure is model-caused; malformed benchmark-owned deliverable shaping and contradictory suite data can mimic model misses.
- Run `validate-benchmark-run.py` against a live run id or a full runtime artifact root. Copied result-only folders can miss compare or grading-brief gates and are not authoritative closeout evidence.

## Validation Path

- Start with focused `bench-routing`, `bench-judge`, and runtime-host-bridge benchmark tests for the owned contract.
- Rerun the quick benchmark after each meaningful benchmark-layer repair until the in-scope defect stops reproducing or a blocker is recorded.
- Rerun the full benchmark after the repair stabilizes and again after any later change that could affect full-suite truth.
- A closeout rerun is only benchmark-valid when `workflowVerdict`, parse success, compare artifact count, and progress receipts all complete cleanly.

## Scope Boundary

- Do not ban judge-subject overlap merely to avoid grading asymmetry.
- Do not patch prompts or expectations solely to inflate one model's score.
- Do not treat frozen score tables as durable truth; benchmark-backed quality is run-config dependent.
- Do not let compare artifacts or heuristic shortcuts replace the judge-owned grading contract when full receipts are available.
