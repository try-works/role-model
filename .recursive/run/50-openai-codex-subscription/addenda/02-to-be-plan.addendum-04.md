Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `04`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-04.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-04.md`
- future implementation changes in runtime-host bridge and tests
Scope note: This addendum defines the implementation plan for provider-wide OpenAI Codex Subscription support for the `5.3+` family, with a shared model manifest and an explicit verification matrix.

## Objective

Promote Codex Subscription from a GPT-5.4-centric implementation to a maintained OpenAI provider policy:

- support only OpenAI `5.3+` subscription models for this run
- include supported current variants such as `mini`, `nano`, and `pro` where officially documented
- encode model lifecycle and capability expectations in one source of truth
- use that source of truth for provider synthesis and for automated verification

## Target Model Matrix

Planned supported matrix for this run:

| Model id | Lifecycle posture | Minimum capability expectation in role-model |
| --- | --- | --- |
| `chatgpt/gpt-5.3-codex` | supported | request execution, function tools, hosted web search |
| `chatgpt/gpt-5.3-codex-spark` | supported | request execution, function tools, hosted web search |
| `chatgpt/gpt-5.3-chat-latest` | deprecated-but-recognized | request execution only if explicitly configured; lifecycle surfaced truthfully |
| `chatgpt/gpt-5.4` | supported | request execution, function tools, hosted web search |
| `chatgpt/gpt-5.4-mini` | supported | request execution, function tools, hosted web search |
| `chatgpt/gpt-5.4-nano` | supported | request execution, function tools, hosted web search |
| `chatgpt/gpt-5.4-pro` | supported | request execution, hosted web search |
| `chatgpt/gpt-5.5` | supported | request execution, function tools, hosted web search |
| `chatgpt/gpt-5.5-pro` | supported | request execution, hosted web search |

Not in scope for this run:

- `5.1` and `5.2` family Codex Subscription rows
- broader `5.0` family support
- speculative undocumented aliases or snapshots

## Implementation Plan

### Phase 1: Shared OpenAI subscription model manifest

1. Replace `OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS` with a structured manifest.
2. Each row should encode:
   - model id
   - display or short id
   - lifecycle posture
   - capability expectations used by runtime tests
3. Derive the provider variant `modelIds` from the manifest instead of hand-maintained arrays.

Acceptance:
- Codex Subscription model inventory is driven by a single structured source

### Phase 2: Runtime and validation alignment

1. Remove baked-in `gpt-5.4` assumptions where they incorrectly stand in for the whole OpenAI provider policy.
2. Keep existing routing-alias tests where they are about generic alias behavior rather than provider policy.
3. Update OpenAI-specific validation fixtures/helpers to consume the new matrix or to declare explicitly when they are single-model tests.

Acceptance:
- OpenAI provider validation is no longer accidentally equivalent to `gpt-5.4` only

### Phase 3: TDD-first matrix tests

RED tests must come first for:

1. Codex Subscription variant inventory includes all required `5.3+` rows and excludes `5.1` / `5.2`
2. model lifecycle metadata is emitted truthfully for deprecated rows retained in the matrix
3. supported models can be activated into endpoints from a saved Codex Subscription account
4. capability expectations are represented consistently for every supported row

Acceptance:
- every supported model row is covered by at least one automated assertion

### Phase 4: Verification matrix

The verification matrix for this run must be committed into tests and reflected in the implementation summary:

| Slice | Coverage |
| --- | --- |
| inventory exposure | every supported `5.3+` model row |
| excluded inventory | `5.1` and `5.2` rows absent |
| lifecycle posture | deprecated `5.3-chat-latest` truthfully marked if retained |
| endpoint activation | representative sample from `5.3`, `5.4`, and `5.5` families |
| hosted web search | representative sample from each supported family |
| request-scoped function tools | representative sample from each supported family that is expected to support them |
| browser verification | rebuilt runtime still exposes the widened model picker truthfully |

Representative live/manual runtime probes after rebuild:

1. `chatgpt/gpt-5.3-codex`
2. `chatgpt/gpt-5.4-mini`
3. `chatgpt/gpt-5.5`

If local Codex transport rejects any row in practice, the row must either:

- be downgraded in the manifest with a truthful lifecycle/capability note, or
- be removed from the supported matrix for this run

It may not remain as an unverified optimistic entry.

## Recommendation

Implement this as a data-driven provider contract, not a sequence of one-off GPT model exceptions.
The OpenAI subscription model manifest should become the single source for:

- provider variant inventory
- supported-model filtering
- capability expectations
- OpenAI-specific regression tests
