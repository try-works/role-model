Run: `/.recursive/run/68-codex-subscription-tool-call-parity/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-12T14:49:25Z`
LockHash: `42d95a8b98910647da2d036f4d6db34d921c9bfc55ccdcd054c330c9ab885177`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md` (LOCKED)
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-worktree.md` (LOCKED)
- `/.recursive/run/68-codex-subscription-tool-call-parity/01-as-is.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/01.5-root-cause.md`
Outputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/02-to-be-plan.md`
Scope note: Defines the implementation plan for repairing Codex Subscription tool-call parity across request-side policy preservation, native Codex non-stream synthesis, provider-neutral continuation rendering, benchmark migration, and rebuilt-runtime verification.

## TODO

- [x] Map `R1` through `R10` to concrete file changes
- [x] Define strict RED-first test slices before any production edits
- [x] Define the native Responses versus bridge-safe replay ownership split
- [x] Define the benchmark migration and rebuilt-runtime verification floor
- [x] Audit the plan against the locked requirements

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed the `multi_agent_v1` tool family in this repository session.
Delegation Decision Basis: the requirements, current breakage, and owning code paths are directly inspectable in the worktree, and the tool policy forbids spawning sub-agents without explicit user authorization.
Delegation Override Reason: sub-agent tooling is available, but the user did not authorize delegation in this thread.
Audit Inputs Provided: locked requirements and worktree artifacts, the draft Phase 1 and Phase 1.5 analysis, and the current adapter-execution, provider-openai, host-bridge, and benchmark-runner sources.

## Effective Inputs Re-read

- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/01-as-is.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/01.5-root-cause.md`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`

## Planned Changes by File

### `/role-model-router/packages/adapter-execution/src/index.ts`

- Extend `RuntimeExecutionRequest` with a caller-controlled `parallelToolCalls?: boolean`.
- Keep the field tri-state so the runtime can preserve `true`, `false`, or unset instead of normalizing everything to one adapter-owned default.

### `/role-model-router/apps/runtime-host-bridge/src/index.ts`

- Extend Chat Completions and Responses ingress parsing to read `parallel_tool_calls`.
- Expand `OpenAIResponsesBody` and parsing helpers so the bridge can preserve typed Responses items needed for tool continuation instead of collapsing them immediately to plain messages.
- Repair native Codex non-stream transcript normalization so it preserves sibling `function_call` items, stable ids, and finish-reason truth.
- Thread those tool calls through non-stream Chat Completions and Responses response synthesis.
- Add a provider-neutral continuation transformer:
  - render typed `function_call` and `function_call_output` items for native Responses targets
  - render assistant `tool_calls` plus `role:"tool"` messages for native Chat Completions targets and bridge targets
- Preserve same-provider-only `previous_response_id` as an optimization, not as a required portable state carrier.
- Keep route-switch rendering honest by choosing the replay shape from the selected target’s verified request shape.

### `/role-model-router/packages/provider-openai/src/index.ts`

- Forward `parallel_tool_calls` on both Chat Completions and Responses requests when the execution request explicitly carries it.
- Replace the current Responses `input: toOpenAIInput(...)` fallback with typed item rendering when the execution request contains tool-turn history that must become `function_call` and `function_call_output`.
- Keep plain message-array replay available for targets or cases where that remains the correct surface.

### `/role-model-router/packages/provider-openai/test/index.test.ts`

- Add RED-first request-builder tests for `parallel_tool_calls: true`, `parallel_tool_calls: false`, and unset.
- Add RED-first tests proving Responses continuation turns render assistant tool calls and tool outputs into typed `function_call` and `function_call_output` items.
- Keep existing chat-completions continuation tests green as the bridge-safe control.

### `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

- Add RED-first coverage for:
  - native Codex non-stream `/v1/chat/completions` tool-call synthesis
  - native Codex non-stream `/v1/responses` tool-call synthesis
  - sibling multi-tool-call preservation on both non-stream surfaces
  - request-side `parallel_tool_calls` propagation to native Codex
  - bridge-managed continuation rendering for native Responses targets versus chat/bridge targets

### `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`

- Add route-shape matrix coverage for:
  - `codex -> kimi`
  - `codex -> deepseek`
  - `kimi -> codex`
  - `deepseek -> codex`
  - at least one generic LiteLLM-backed classification row if the deterministic fixture surface can represent it
- Encode whether the selected path is `native Responses upstream`, `native Chat Completions upstream`, or `Responses ingress -> Chat Completions upstream bridge`.

### `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`

- Add a Responses-based benchmark subject execution path for Codex tool-bearing cases.
- Keep the existing Chat Completions path available where required for non-Codex or legacy cases.
- Preserve benchmark answer extraction, tool-follow-up enforcement, and persisted artifacts while changing the subject execution surface.

### `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`

- Add RED-first benchmark tests for:
  - Responses subject execution on Codex tool-bearing cases
  - sibling tool-call preservation on the benchmark subject path
  - tool-follow-up enforcement after a Responses tool turn
- Keep the existing judge path stable unless a narrower reason appears during implementation.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "the native `chatgpt-codex-responses` execution path preserves OpenAI-compatible tool semantics across non-stream and streaming downstream surfaces" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: host-bridge non-stream Codex tests | QA Surface: direct `/v1/chat/completions` and `/v1/responses` tool-call probes on rebuilt runtime
- `R2` | Coverage: direct | Source Quote: "non-stream `/v1/chat/completions` replies can return an empty assistant message instead of `message.tool_calls`" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: host-bridge chat-completions and responses synthesis tests | QA Surface: canonical request-detail receipts plus direct runtime probe outputs
- `R3` | Coverage: direct | Source Quote: "continuation turns are not faithfully represented because assistant tool calls and `role:"tool"` follow-up messages are not converted into Responses-native `function_call` and `function_call_output` items" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: provider-openai typed Responses continuation tests plus host-bridge continuation tests | QA Surface: cross-provider continuation proof cases in `05-manual-qa.md`
- `R4` | Coverage: direct | Source Quote: "the adapter may forward or default supported controls, but it must not silently force `parallel_tool_calls: true`" | Implementation Surface: `/role-model-router/packages/adapter-execution/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: request-builder and Codex request-shaping tests | QA Surface: rebuilt-runtime receipts that record requested `parallel_tool_calls` state
- `R5` | Coverage: direct | Source Quote: "route-switch matrix regressions are owned in `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` | Verification Surface: RED and GREEN evidence logs | QA Surface: `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/logs/`
- `R6` | Coverage: direct | Source Quote: "The repaired contract must be verified against a rebuilt live runtime, not only against mocked unit transcripts." | Implementation Surface: `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md` | Verification Surface: Phase 5 exact-model and routing-alias proofs | QA Surface: Pi CLI and direct runtime command transcripts recorded in `05-manual-qa.md`
- `R7` | Coverage: direct | Source Quote: "benchmark execution no longer depends exclusively on `executeChatCompletions(...)` for Codex tool-bearing cases" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` | Verification Surface: benchmark-runner Responses-path tests | QA Surface: rebuilt-runtime benchmark artifacts
- `R8` | Coverage: direct | Source Quote: "GPT-5.4 no longer loses benchmark credit solely because the runtime dropped tool calls on a non-stream compatibility surface" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`, `/.recursive/run/68-codex-subscription-tool-call-parity/04-test-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md` | Verification Surface: post-fix benchmark artifacts | QA Surface: rerun benchmark receipts plus classification narrative in `04-test-summary.md`
- `R9` | Coverage: direct | Source Quote: "the canonical internal continuation model is provider-neutral and can be rendered to both Responses and Chat Completions targets without losing tool-call semantics" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: route-switch matrix tests and live proofs | QA Surface: named Codex/Kimi/DeepSeek continuation proofs in `05-manual-qa.md`
- `R10` | Coverage: direct | Source Quote: "when the selected route is `Responses ingress -> Chat Completions upstream bridge`, the runtime renders portable history into a bridge-safe Responses request shape" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts` | Verification Surface: explicit route-shape classification tests and proof receipts | QA Surface: live proof receipts that name ingress surface plus verified upstream shape

## Implementation Steps

1. Write failing `provider-openai` tests for `parallel_tool_calls` forwarding and typed Responses continuation replay.
2. Write failing host-bridge tests for native Codex non-stream tool-call synthesis on `/v1/chat/completions` and `/v1/responses`, including sibling multi-tool turns.
3. Write failing host-bridge matrix tests for the named route-shape cases and their required rendering classifications.
4. Write failing benchmark-runner tests for Responses-based Codex tool-bearing subject execution.
5. Extend `RuntimeExecutionRequest` and ingress parsing to preserve `parallel_tool_calls`.
6. Repair native Codex non-stream transcript normalization and downstream non-stream synthesis.
7. Add the Responses-native continuation transformer and route-shape-based replay selection.
8. Update provider-openai Responses request building to emit typed replay where required.
9. Migrate Codex tool-bearing benchmark subject execution to `/v1/responses`.
10. Rerun the focused regression floor, then execute the rebuilt-runtime and Pi CLI proof plan.

## Testing Strategy

### RED tests

- `provider-openai`
  - Responses request builder forwards `parallel_tool_calls: true`
  - Responses request builder forwards `parallel_tool_calls: false`
  - Responses request builder omits `parallel_tool_calls` when unset
  - Responses continuation replay emits `function_call` plus `function_call_output` items
- `runtime-host-bridge`
  - native Codex non-stream Chat Completions returns `message.tool_calls`
  - native Codex non-stream Responses returns `output` items containing sibling `function_call` entries
  - bridge-managed continuation picks native Responses replay for Responses targets and chat replay for chat/bridge targets
  - Codex request builder preserves explicit `parallel_tool_calls` true/false and leaves it unset when the caller left it unset
- `openai-codex-subscription-matrix`
  - route-shape classification is explicit for the named Codex/Kimi/DeepSeek cases
  - at least one case proves bridge-safe rendering is chosen for a bridge target
- `benchmark-runner`
  - Codex tool-bearing subject turns can execute through a Responses seam
  - sibling tool calls and post-tool follow-up still survive benchmark extraction

### Verification Floor

- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/adapter-execution test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/openai-codex-subscription-matrix.test.ts test/benchmark-runner-judge.test.ts`
- any focused typecheck or build command required by the rebuilt runtime path

## Playwright Plan (if applicable)

Not applicable. This run is backend-, request-contract-, and CLI-proof-focused. Browser automation is unnecessary unless an existing operator surface becomes the only truthful way to inspect a required receipt.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

Planned scenarios:

1. Rebuild the runtime from the run-68 implementation commit and start it with the exact startup command recorded in Phase 5.
2. Send direct runtime requests to the exact model id `chatgpt/gpt-5.4` on both `/v1/chat/completions` and `/v1/responses` for:
   - one tool-emitting turn
   - one continuation turn that returns tool output
3. Send Pi CLI requests to:
   - the exact model id under investigation
   - a routing alias that resolves to the Codex Subscription family
4. Prove at least one cross-provider continuation replay between:
   - Codex and direct Kimi code
   - Codex and direct Kimi OAuth / Kimi for Coding
   - Codex and LiteLLM-backed DeepSeek
5. Record exact request ids, selected endpoint ids, ingress surface, and verified upstream-shape classification for each proof.
6. Rerun the affected benchmark cases and separate remaining misses into adapter, benchmark, or upstream-native buckets.

## Idempotence and Recovery

- The focused Vitest suites are deterministic and safe to rerun.
- The benchmark Responses-path tests should remain fixture-backed and offline-safe.
- Runtime rebuild and Pi CLI verification commands must be recorded verbatim so they can be rerun after any reopened phase.
- If a later step reopens Phase 1, 1.5, or 2, relock from the earliest reopened phase so later receipts chain from the repaired plan.

## Implementation Sub-phases

1. RED: provider-openai request-builder and typed Responses continuation tests
2. RED: host-bridge non-stream Codex parity and `parallel_tool_calls` tests
3. RED: route-shape matrix tests
4. RED: benchmark-runner Responses subject-path tests
5. GREEN: shared contract and ingress repair
6. GREEN: native Codex non-stream repair
7. GREEN: Responses-native continuation transformer and provider-openai request-builder repair
8. GREEN: benchmark-runner migration
9. REFACTOR: tighten any shared helpers while keeping all tests green
10. Phase 5 prep: rebuilt-runtime and Pi CLI verification capture

## Plan Drift Check

- No replacement of the native Codex Subscription execution family
- No broad provider-ranking or routing-policy redesign unrelated to tool-call parity
- No flattening of native Responses continuation into one chat-style replay path
- No shallow benchmark-only fix that leaves `/v1/chat/completions` compatibility broken
- No unsupported claims that every provider in the matrix has identical multi-tool or built-in-tool behavior

## Known Unknowns Carried Forward

- The exact minimum typed-item shape needed for cross-provider Responses replay may need one implementation iteration once RED tests pin the owned cases.
- The current deterministic runtime matrix may or may not expose an extra generic LiteLLM-backed provider route beyond DeepSeek; if not, Phase 5 must record the exact limitation.
- The rebuilt runtime may require selective environment setup before Kimi or DeepSeek live proofs can run; those blockers, if any, must be recorded exactly in Phase 5.

## Gaps Found

None beyond the already-documented Phase 1 and Phase 1.5 defects that this plan is intended to close.

## Repair Work Performed

None. This artifact defines the implementation plan only.

## Audit Verdict

Audit: PASS

## Earlier Phase Reconciliation

- `01-as-is.md` established the concrete baseline and identified the missing contract seams.
- `01.5-root-cause.md` reduced those gaps to five concrete root causes.
- This plan addresses each root cause directly without widening into unrelated provider, UI, or routing redesign.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct plan construction and reconciliation against the locked requirements plus current worktree code
- Acceptance Decision: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Comparison reference: `working-tree`
- Normalized baseline: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Base branch: `main`
- Worktree branch: `recursive/68-codex-subscription-tool-call-parity`
- Active worktree path: `D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity\`

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: native Codex non-stream tests | QA Surface: direct rebuilt-runtime probes
- `R2` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: downstream synthesis tests | QA Surface: canonical request-detail receipts
- `R3` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: typed Responses continuation tests | QA Surface: cross-provider continuation proofs in `05-manual-qa.md`
- `R4` | Status: planned | Implementation Surface: `/role-model-router/packages/adapter-execution/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: request-builder and Codex request-shaping tests | QA Surface: rebuilt-runtime receipts showing preserved `parallel_tool_calls`
- `R5` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` | Verification Surface: RED and GREEN evidence logs | QA Surface: `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/logs/`
- `R6` | Status: planned | Implementation Surface: `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md` | Verification Surface: exact-model and alias proofs | QA Surface: recorded Pi CLI and direct runtime commands
- `R7` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` | Verification Surface: benchmark-runner Responses-path tests | QA Surface: rebuilt-runtime benchmark artifacts
- `R8` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`, `/.recursive/run/68-codex-subscription-tool-call-parity/04-test-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md` | Verification Surface: post-fix benchmark artifacts | QA Surface: rerun benchmark receipts and classification notes
- `R9` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: route-switch matrix tests and live proofs | QA Surface: named Codex/Kimi/DeepSeek proof cases
- `R10` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts` | Verification Surface: route-shape classification tests and proof receipts | QA Surface: ingress/upstream shape receipts

## Traceability

- `R1`: native Codex non-stream parity repair planned
- `R2`: downstream non-stream synthesis repair planned
- `R3`: Responses-native continuation transformer planned
- `R4`: request-side `parallel_tool_calls` preservation planned
- `R5`: explicit regression-floor expansion planned
- `R6`: rebuilt-runtime exact-model and alias verification planned
- `R7`: benchmark-runner Responses migration planned
- `R8`: post-fix benchmark truth closure planned
- `R9`: provider-neutral route-switch rendering planned
- `R10`: upstream-shape classification and bridge-safe replay planned

## Coverage Gate

- [x] `R1` through `R10` are mapped to concrete implementation and verification surfaces
- [x] RED-first test slices are defined before any production edits
- [x] The plan includes benchmark migration, route-shape coverage, and rebuilt-runtime verification

Coverage: PASS

## Approval Gate

- [x] The plan is concrete enough to begin strict TDD implementation
- [x] The plan does not widen into unrelated provider or UI redesign
- [x] The artifact is ready for Phase 3 execution

Approval: PASS
