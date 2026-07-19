Run: `/.recursive/run/65-codex-subscription-prompt-cache-parity/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-12T00:01:05Z`
LockHash: `856b345cb25384f28b945cc3a9a59e55031f20a1d369213b49f58a16004aae11`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md` (LOCKED)
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-worktree.md` (LOCKED)
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01-as-is.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01.5-root-cause.md`
Outputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/02-to-be-plan.md`
Scope note: Defines the implementation plan for repairing Codex Subscription prompt-cache parity across provider normalization, native Codex response shaping, continuity-ledger state, telemetry support truth, and rebuilt-runtime Pi verification.

## TODO

- [x] Map `R1` through `R8` to concrete file changes
- [x] Define strict RED-first test slices before any production edits
- [x] Define the continuity-ledger ownership and downstream proof surfaces
- [x] Record the verification floor and rebuilt-runtime QA plan
- [x] Audit the plan against the locked requirements

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed the `multi_agent_v1` tool family in this repository session.
Delegation Decision Basis: the requirements, current breakage, and owning code paths are directly inspectable in the worktree, and the tool policy forbids spawning sub-agents without explicit user authorization.
Delegation Override Reason: sub-agent tooling is available, but the user did not authorize delegation in this thread.
Audit Inputs Provided: locked requirements and worktree artifacts, the locked Phase 1 and Phase 1.5 analysis, and the current provider, bridge, routing, telemetry, persistence, and runtime-UI sources.

## Effective Inputs Re-read

- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01-as-is.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01.5-root-cause.md`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`

## Planned Changes by File

### `/role-model-router/packages/provider-openai/src/index.ts`

- Make the OpenAI-family capability matrix truth-based for prompt caching instead of hardcoded unsupported.
- Normalize cache facts from documented OpenAI nested usage detail fields and Kimi top-level `usage.cached_tokens`.
- Preserve supported-zero semantics and only surface cache-write facts when the upstream truth exposes them.
- Keep downstream token totals OpenAI-native while populating canonical prompt-cache and usage support fields.

### `/role-model-router/packages/provider-openai/test/index.test.ts`

- Add RED-first coverage for nested Responses cache fields, nested Chat Completions cache fields, top-level Kimi `usage.cached_tokens`, cache-write truthfulness, and additive vendor metadata preservation.
- Convert current zero-default assertions into truth-based supported-zero assertions where appropriate.

### `/role-model-router/apps/runtime-host-bridge/src/index.ts`

- Extend Chat Completions ingress so `prompt_cache_key` can enter the shared execution request on current OpenAI-compatible surfaces.
- Extend native Codex transcript normalization to capture cache facts when present and preserve supported-zero semantics when the upstream surface supports the metric.
- Thread cache facts through:
  - `CodexResponsesNormalizedTranscript`
  - bridge execution result structures
  - synthetic downstream Chat Completions bodies and SSE finish chunks
  - synthetic downstream Responses bodies
  - generic bridge JSON response creators
- Add a bridge-owned continuity-ledger state that records cache-domain identity, whether a request restored or created a record, and warmed-domain advisory preference separately from hard continuity constraints.
- Expose continuity-ledger and cache-support truth through canonical request-detail and analytics surfaces rather than a side channel.

### `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

- Add RED-first coverage for:
  - Chat Completions `prompt_cache_key` ingress mapping
  - native Codex streamed and non-streamed cache-fact serialization
  - supported-zero native Codex serialization
  - continuity-ledger create versus restore behavior
  - request-detail or analytics surfaces that distinguish supported-zero from unsupported Codex rows

### `/role-model-router/packages/protocol-routing/src/index.ts`

- Replace the current generic `cacheAffinity` heuristic with a richer input that can consume per-domain warmed-cache hints without claiming cross-provider cache sharing.
- Keep continuity preference advisory so stronger capability, policy, health, or performance rules can still override it.

### `/role-model-router/packages/protocol-routing/test/index.test.ts`

- Add RED-first coverage for at least one `A -> B -> A` route sequence that preserves endpoint `A`'s continuity identity and restores `A`'s warmed-domain state when routing returns.

### `/role-model-router/packages/runtime-observability/src/index.ts`

- Preserve canonical cache observability fields while threading continuity-ledger metadata needed for request-detail proof.
- Keep supported-zero and unsupported semantics distinct in canonical observations.

### `/role-model-router/packages/sqlite-memory/src/index.ts`

- Persist any new continuity-ledger and support-truth fields needed for canonical request-detail, telemetry, and restored-runtime verification.
- Keep analytics aggregation compatible with run 53 semantics: supported-zero remains visible as `0`, unsupported remains unsupported.

### `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`

- Update cache-posture expectations only if required by repaired support-truth semantics. The intent is to make existing surfaces consume the repaired backend truth, not to redesign the UI.

### Verification helpers and evidence artifacts

- Reuse existing runtime and Pi validation commands from prior runs where applicable.
- Add run-65 evidence logs and scripts only as needed to capture RED logs, GREEN logs, rebuilt-runtime startup, live Pi CLI commands, and canonical receipt cross-checks.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "native Codex Responses normalization preserves cached-read token counts whenever upstream usage exposes them" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: host-bridge tests for streamed and non-streamed native Codex serialization | QA Surface: canonical request-detail receipt plus Pi CLI live request pair
- `R2` | Coverage: direct | Source Quote: "Responses replies always use the documented OpenAI cache-read location `usage.input_tokens_details.cached_tokens`, with a non-zero value for a hit and `0` for a supported miss or sub-`1024` request" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: host-bridge and provider-openai tests | QA Surface: downstream payload capture consumed by Pi
- `R3` | Coverage: direct | Source Quote: "provider-openai capability and normalization truthfulness" | Implementation Surface: `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: provider-openai RED tests | QA Surface: canonical telemetry support flags and request-detail cache facts
- `R4` | Coverage: direct | Source Quote: "Responses ingress continues to map `prompt_cache_key` into the shared execution request and the provider request body" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: host-bridge and protocol-routing tests | QA Surface: `A -> B -> A` continuity proof and live request-detail restore/create state
- `R5` | Coverage: direct | Source Quote: "Codex Subscription telemetry rows set cache-support flags truthfully when cached-token accounting is available" | Implementation Surface: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.ts` | Verification Surface: analytics and runtime-UI contract tests plus host-bridge tests | QA Surface: runtime overview and Observe cache metrics
- `R6` | Coverage: direct | Source Quote: "preserve parity with existing LiteLLM and non-Codex OpenAI behavior" | Implementation Surface: `/role-model-router/packages/provider-openai/src/index.ts`, `/role-model-router/packages/provider-litellm/src/index.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: existing LiteLLM tests stay green plus new generic OpenAI-family regression tests | QA Surface: LiteLLM/DeepSeek control and direct non-Codex OpenAI control
- `R7` | Coverage: direct | Source Quote: "every deterministic behavior changed under R1 through R6 must have an explicit automated RED-first case" | Implementation Surface: `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/protocol-routing/test/index.test.ts` | Verification Surface: RED and GREEN evidence logs | QA Surface: Phase 3 TDD compliance log
- `R8` | Coverage: direct | Source Quote: "final verification against the rebuilt runtime must prove the actual user symptom is repaired in the downstream client that exhibited it" | Implementation Surface: `/packages/pi-role-model/src/commands.ts`, `/packages/pi-role-model/src/runtime-discovery.ts`, `/packages/pi-role-model/src/runtime-inspection.ts` | Verification Surface: Phase 5 live logs and canonical receipt captures | QA Surface: Pi runtime CLI cache percentage cross-check

## Implementation Steps

1. Write failing `provider-openai` tests for cache capability truth, nested OpenAI cache fields, Kimi top-level `usage.cached_tokens`, and cache-write handling.
2. Write failing host-bridge tests for Chat Completions `prompt_cache_key` ingress, native Codex cache-fact transcript shaping, streamed and non-streamed downstream serialization, and supported-zero semantics.
3. Write failing routing and continuity tests for per-domain cache-ledger persistence and `A -> B -> A` restore behavior.
4. Repair `provider-openai` capability and normalization logic.
5. Repair native Codex transcript/result/response cache-fact preservation in the host bridge.
6. Add continuity-ledger ownership and telemetry-support truth propagation.
7. Update any existing analytics or runtime-UI expectations that currently encode false unsupported semantics.
8. Rerun the focused regression floor, then build the runtime and execute live Pi CLI verification against the rebuilt commit.

## Testing Strategy

### RED tests

- `provider-openai`
  - Responses nested `usage.input_tokens_details.cached_tokens`
  - Chat nested `usage.prompt_tokens_details.cached_tokens`
  - supported-zero misses remain supported and equal `0`
  - top-level Kimi `usage.cached_tokens`
  - cache-write truthfulness and additive vendor metadata preservation
- `runtime-host-bridge`
  - Chat Completions ingress maps `prompt_cache_key`
  - native Codex non-streamed downstream bodies preserve cache facts
  - native Codex streamed finish usage preserves cache facts
  - supported-zero native Codex serialization remains structurally present
  - request-detail or analytics views preserve supported-zero versus unsupported distinctions
- `protocol-routing`
  - two warmed domains persist for one logical session
  - `A -> B -> A` restores endpoint `A` continuity identity
  - warmed-domain preference is advisory, not absolute

### Verification floor

- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/protocol-routing test`
- `corepack pnpm --filter @role-model-router/runtime-observability test`
- `corepack pnpm --filter @role-model-router/sqlite-memory test`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/lib/telemetry-analytics.test.ts app/lib/telemetry-chart-config.test.ts app/lib/telemetry-route-models.test.ts`
- any focused typecheck or build command required by the runtime rebuild path

## Playwright Plan (if applicable)

Not applicable. This run is backend- and CLI-contract-focused. Browser proof, if any, is limited to existing runtime overview or Observe surfaces and can be satisfied by canonical request-detail and analytics evidence unless a browser check becomes necessary.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

Planned scenarios:

1. Rebuild the runtime from the run-65 implementation commit and start it with the exact startup command recorded in Phase 5.
2. Run a live Pi runtime CLI Codex Subscription request pair with a repeated `1024+` token prefix and capture:
   - the cold request CLI output
   - the warmed request CLI output
   - the downstream payload or request-detail receipt
   - the displayed cache percentage for both requests
3. Cross-check the warmed Pi CLI percentage against canonical runtime cache facts for the same request pair.
4. Capture one supported-zero control request and prove it remains `0`, not unsupported.
5. Run a LiteLLM or DeepSeek parity control through Pi and confirm the existing non-zero cache display still works.
6. Run a direct non-Codex OpenAI-compatible control, live where feasible and deterministic otherwise.
7. Record any exact live blockers, commands attempted, and deterministic substitutes if an upstream or credential constraint prevents one verification case.

## Idempotence and Recovery

- The focused Vitest suites are deterministic and safe to rerun.
- The continuity-ledger tests should use explicit fixture state so create versus restore behavior stays reproducible.
- Runtime rebuild and Pi CLI verification commands must be recorded verbatim so they can be rerun after any reopened phase.
- If a later step reopens Phase 1, 1.5, or 2, relock from the earliest reopened phase so the later receipts chain from the repaired plan.

## Implementation Sub-phases

1. RED: provider-openai cache capability and normalization tests
2. RED: host-bridge ingress and native Codex serialization tests
3. RED: continuity-ledger and routing tests
4. GREEN: provider-openai repair
5. GREEN: native Codex transcript/result/response repair
6. GREEN: continuity-ledger and telemetry-support repair
7. REFACTOR: update any dependent analytics or runtime-UI expectations and rerun the regression floor
8. Phase 5 prep: rebuilt-runtime and Pi CLI verification capture

## Plan Drift Check

- No replacement of the native Codex Subscription execution family
- No cross-provider synthetic shared cache
- No downstream Pi patch to compensate for incorrect upstream serialization
- No new cache-only analytics silo or dashboard
- No broad provider-pricing redesign

## Known Unknowns Carried Forward

- The exact native Codex raw response field names for cache-write facts may still need implementation-time discovery. This does not block starting with supported-zero and read-token preservation.
- The exact continuity-ledger storage surface may land in host-bridge-only state, sqlite continuity state, or both, depending on the smallest truthful implementation that satisfies `R4` and `R8`.
- The exact live Kimi verification case may be limited by environment credentials. If so, Phase 5 must record the exact blocker and deterministic substitute evidence.

## Traceability

- `R1`: native Codex transcript, result, and downstream response cache-fact preservation
- `R2`: downstream OpenAI-compatible total-plus-cache-detail wire contract
- `R3`: provider-openai capability and normalization truth
- `R4`: prompt-cache-key parity and per-domain continuity-ledger ownership
- `R5`: canonical telemetry, persistence, analytics, and runtime-UI parity
- `R6`: LiteLLM and generic non-Codex regression preservation
- `R7`: strict RED-first test matrix and evidence logging
- `R8`: rebuilt-runtime Pi CLI verification and cache-percentage cross-check

## Gaps Found

None beyond the already-documented Phase 1 and Phase 1.5 gaps that this plan is intended to close.

## Repair Work Performed

None. This artifact defines the implementation plan only.

## Audit Verdict

Audit: PASS

## Earlier Phase Reconciliation

- `01-as-is.md` established the concrete baseline and identified the current gaps.
- `01.5-root-cause.md` reduced those gaps to five root causes.
- This plan addresses each root cause directly without widening into unrelated provider, pricing, or downstream-app redesign.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct plan construction and reconciliation against the locked requirements plus current worktree code
- Acceptance Decision: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `6b3850470de5c37a7d005838aa2fb91afadd214e`
- Comparison reference: `working-tree`
- Normalized baseline: `6b3850470de5c37a7d005838aa2fb91afadd214e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 6b3850470de5c37a7d005838aa2fb91afadd214e`
- Base branch: `main`
- Worktree branch: `recursive/65-codex-subscription-prompt-cache-parity`
- Active worktree path: `D:\DEV\role-model\.worktrees\65-codex-subscription-prompt-cache-parity\`

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: host-bridge streamed and non-streamed Codex cache tests | QA Surface: canonical request-detail and Pi CLI proof
- `R2` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: provider-openai and host-bridge tests | QA Surface: downstream payload capture
- `R3` | Status: planned | Implementation Surface: `/role-model-router/packages/provider-openai/src/index.ts` | Verification Surface: provider-openai RED tests | QA Surface: support flags and cache-detail facts
- `R4` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: host-bridge and protocol-routing continuity tests | QA Surface: `A -> B -> A` continuity proof
- `R5` | Status: planned | Implementation Surface: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.ts` | Verification Surface: analytics and runtime-UI tests | QA Surface: runtime overview and Observe proof
- `R6` | Status: planned | Implementation Surface: `/role-model-router/packages/provider-openai/src/index.ts`, `/role-model-router/packages/provider-litellm/src/index.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: existing LiteLLM tests plus new generic OpenAI controls | QA Surface: LiteLLM and direct OpenAI controls
- `R7` | Status: planned | Implementation Surface: `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/protocol-routing/test/index.test.ts` | Verification Surface: RED and GREEN evidence logs | QA Surface: Phase 3 TDD compliance log
- `R8` | Status: planned | Implementation Surface: `/packages/pi-role-model/src/commands.ts`, `/packages/pi-role-model/src/runtime-discovery.ts`, `/packages/pi-role-model/src/runtime-inspection.ts` | Verification Surface: Phase 5 live logs and canonical receipt captures | QA Surface: CLI cache percentage cross-check

## Audit Gate

- [x] All requirements mapped to owned files
- [x] RED-first verification defined
- [x] Continuity, telemetry, and rebuilt-runtime proof surfaces specified

Audit: PASS

## Coverage Gate

- [x] provider-openai changes defined
- [x] native Codex bridge changes defined
- [x] continuity-ledger changes defined
- [x] verification floor and live QA plan defined

Coverage: PASS

## Approval Gate

- [x] Plan is specific enough to implement without new scope decisions
- [x] Plan remains inside the locked requirements
- [x] Ready for Phase 3

Approval: PASS
