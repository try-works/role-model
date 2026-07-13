Run: `/.recursive/run/69-benchmark-scoring-integrity/`
Phase: `03 Implementation Summary`
Addendum: `upstream-gap.02-to-be-plan.01`
Status: `LOCKED`
LockedAt: `2026-07-13T13:07:25Z`
LockHash: `bac8c3f3c928272a22408a519c156b93ccd40bf65bc0a8f7f7d53f9cb3ebb4ea`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md` (DRAFT)
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-4/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/p17-tools-multi-hard.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-4/judge/openai.personal.openai-codex-subscription.global.gpt-5.4/p17-tools-multi-hard.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/e04-capitalize.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/t03-tools-agent-plan.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/judge/openai.personal.openai-codex-subscription.global.gpt-5.4/t03-tools-agent-plan/attempt-1.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/h11-decompose-code-verify.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/judge/openai.personal.openai-codex-subscription.global.gpt-5.4/h11-decompose-code-verify/attempt-1.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/moonshot.personal.kimi-code.global.kimi-k2.7-code/h11-decompose-code-verify.json`
- `/role-model-router/packages/bench-routing/src/answer-format.ts`
- `/role-model-router/packages/bench-routing/data/routing-capability-suite.json`
Outputs:
- `/.recursive/run/69-benchmark-scoring-integrity/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: Post-rerun GPT failure triage found benchmark-owned gaps that the locked Phase 2 plan did not spell out explicitly. This addendum preserves those findings as an authoritative implementation-plan delta before any further benchmark fixes land, without rewriting the locked plan artifact.

## TODO

- [x] Record the post-rerun GPT failure triage baseline
- [x] Separate true model misses from benchmark-owned failures
- [x] Translate benchmark-owned failures into concrete plan amendments
- [x] Bind the new work to strict RED/GREEN coverage
- [x] Preserve the locked Phase 2 plan and compensate forward instead of mutating history

## Effective Inputs Re-read

- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md`
- `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-4/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/p17-tools-multi-hard.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-4/judge/openai.personal.openai-codex-subscription.global.gpt-5.4/p17-tools-multi-hard.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/e04-capitalize.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/t03-tools-agent-plan.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/judge/openai.personal.openai-codex-subscription.global.gpt-5.4/t03-tools-agent-plan/attempt-1.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/openai.personal.openai-codex-subscription.global.gpt-5.4/h11-decompose-code-verify.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/judge/openai.personal.openai-codex-subscription.global.gpt-5.4/h11-decompose-code-verify/attempt-1.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/responses/moonshot.personal.kimi-code.global.kimi-k2.7-code/h11-decompose-code-verify.json`
- `/role-model-router/packages/bench-routing/src/answer-format.ts`
- `/role-model-router/packages/bench-routing/data/routing-capability-suite.json`

## Earlier Phase Reconciliation

- `02-to-be-plan.md` is `LOCKED`, so the newly discovered failure modes cannot be patched into the base plan directly.
- The locked Phase 2 plan correctly captured the original benchmark-integrity scope, but it did not enumerate the post-rerun GPT triage defects now shown by the final quick and full benchmark evidence.
- This addendum therefore acts as a current-phase upstream-gap plan amendment for the remaining implementation, verification, and closeout work.

## Gap Summary

The locked Phase 2 plan assumed the benchmark-owned scope would be satisfied by the already-landed overlap, code-fence, suite-coherence, cooldown, and Kimi-availability repairs. The final reruns proved that assumption was incomplete.

Three benchmark-owned gaps remain relevant before the GPT failures can be interpreted cleanly:

1. `t03-tools-agent-plan` still contains a benchmark-internal scaffold/schema contradiction.
2. `h11-decompose-code-verify` still allows a judge false negative even when the recorded API tool-call metadata satisfies the case.
3. `p17-tools-multi-hard` still has a brittle contract boundary between what the rubric says it wants and what the case instruction/example actually teaches.

One observed failure is explicitly **not** a benchmark-owned fix target:

4. `e04-capitalize` is a true model miss and should remain classified that way unless later evidence proves otherwise.

## Discovery Evidence

### `t03-tools-agent-plan` benchmark scaffold mismatch

- The authoritative case schema requires `plan`, `patch_summary`, and `strategy_improvements` in `/role-model-router/packages/bench-routing/data/routing-capability-suite.json`.
- The generic `tool_calls_with_summary` follow-up in `/role-model-router/packages/bench-routing/src/answer-format.ts` still hardcodes `test_snippet` instead of deriving the JSON shape from the case schema.
- The saved GPT raw response for `t03-tools-agent-plan` followed that bad scaffold and returned `test_snippet`, then the saved judge attempt failed it for missing `strategy_improvements`.

Conclusion:

- this is a benchmark-owned false-negative path, not just an arbitrary model formatting miss

### `h11-decompose-code-verify` judge false negative

- The saved GPT response artifact for `h11-decompose-code-verify` includes an extracted `tool_calls` entry with `run_tests`.
- The saved judge attempt for the same case explicitly says `Actual structured tool calls from API: run_tests`.
- The same benchmark family passed Kimi with materially the same merged deliverable shape (`tool_calls` plus `bullets`), but the GPT attempt was failed for allegedly not emitting the tool call through the API.

Conclusion:

- the judge prompt or grading normalization is still weak enough to produce a benchmark-owned false negative on tool-required summary cases

### `p17-tools-multi-hard` brittle contract

- The quick GPT failure rationale says the answer did not acknowledge router schema or test clues from the file under inspection.
- The case instruction and answer format still teach a short JSON `answer` note, and the GPT full-run pass used a near-identical response shape.
- This makes the current benchmark contract too brittle to distinguish a benchmark defect from normal model variance.

Conclusion:

- the case needs one coherent contract: either demand router-specific clue acknowledgment explicitly, or relax grading to the simpler schema-validation note it currently invites

### `e04-capitalize` true model miss

- The saved GPT response is `HELLO WORLD`.
- The case expects `Hello World`.

Conclusion:

- do not spend benchmark-owned implementation effort on `e04` unless new evidence shows the benchmark itself is wrong

## Plan Amendment

### `R4` extend suite-coherence repair to summary scaffolds and brittle tool-note cases

Required amendment:

- add a benchmark-owned repair so `tool_calls_with_summary` follow-up instructions and validation are derived from the authoritative case schema rather than a hardcoded `test_snippet` payload
- review `p17-tools-multi-hard` and align its authored instruction, example deliverable, and grading expectation so one coherent answer shape is accepted consistently

Implementation surface:

- `/role-model-router/packages/bench-routing/src/answer-format.ts`
- `/role-model-router/packages/bench-routing/data/routing-capability-suite.json`

### `R5` extend regression coverage to the post-rerun GPT failure family

Required amendment:

- add RED tests for `t03-tools-agent-plan` proving the follow-up scaffold matches the case schema and the extracted deliverable validation honors the required keys
- add RED tests for `h11-decompose-code-verify` proving required API tool calls are treated as authoritative benchmark metadata and cannot be zeroed solely because merged deliverables also contain a `tool_calls` field
- add RED tests for `p17-tools-multi-hard` proving the final accepted contract is stable across the intended answer shape

Implementation surface:

- `/role-model-router/packages/bench-routing/src/answer-format.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
- `/role-model-router/packages/bench-routing/src/judge-brief.test.ts`
- `/role-model-router/packages/bench-routing/src/index.test.ts`

### `R7` preserve classification truth during reruns

Required amendment:

- later reruns and closeout receipts must classify `t03` and `h11` as benchmark-owned until the above fixes prove otherwise
- later reruns and closeout receipts must classify `e04` as a true model miss unless a new benchmark defect is demonstrated
- `p17` must be called out explicitly as either a repaired benchmark contract issue or a remaining model-variance case after the contract is tightened

## Additional Implementation Slices

1. `SP8` Summary-schema parity
   - RED first:
     - schema-derived follow-up prompt for `tool_calls_with_summary`
     - required-key validation for `strategy_improvements`
   - GREEN target:
     - `t03-tools-agent-plan` can no longer be failed because the benchmark scaffold asked for the wrong key

2. `SP9` Tool-call-authoritative judge normalization
   - RED first:
     - tool-required summary cases pass when the benchmark has already recorded the required API tool calls
     - merged deliverables do not create a false "tool call missing" verdict
   - GREEN target:
     - `h11-decompose-code-verify` no longer permits the observed false negative

3. `SP10` `p17` contract coherence
   - RED first:
     - whichever contract is kept is encoded consistently across instruction, exemplar, and rubric
   - GREEN target:
     - near-identical acceptable answers do not oscillate between pass and fail because of benchmark wording drift

4. Carry-forward non-remediation classification
   - `e04-capitalize` remains outside benchmark-owned implementation scope

## Compensation In Current Phase

- Preserve the missing plan detail in this repo-owned addendum instead of chat-only context.
- Treat this addendum as part of the effective Phase 2 plan input for the remaining implementation and verification work.
- Do not mutate `02-to-be-plan.md`; compensate forward through this addendum and later Phase 3/4/5 receipts.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later work for run 69 must treat this file as an authoritative effective input together with:

- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md`
- `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md`

## Traceability

- `R4` -> `## Plan Amendment` (`R4`) and `SP8`, `SP10` | Evidence: `t03-tools-agent-plan` schema mismatch and `p17-tools-multi-hard` contract drift
- `R5` -> `## Plan Amendment` (`R5`) and `SP8` through `SP10` | Evidence: post-rerun GPT failure artifacts and judge attempts
- `R7` -> `## Plan Amendment` (`R7`) and `Carry-forward non-remediation classification` | Evidence: final quick and full rerun classification of `t03`, `h11`, `p17`, and `e04`

## Coverage Gate

- [x] The post-rerun GPT failure triage baseline is recorded
- [x] Benchmark-owned failures are separated from the true model miss
- [x] The missing implementation work is translated into concrete plan amendments
- [x] Required RED/GREEN additions are explicit
- [x] The addendum preserves locked Phase 2 history instead of rewriting it

Coverage: PASS

## Approval Gate

- [x] The addendum is consistent with the original run-69 benchmark-integrity scope
- [x] The remaining benchmark-owned work is concrete enough to implement under TDD
- [x] Later phases can treat this file as an authoritative effective input
- [x] The locked Phase 2 plan remains intact while the gap is compensated forward

Approval: PASS
