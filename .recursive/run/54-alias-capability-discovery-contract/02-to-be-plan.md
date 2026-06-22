Run: `/.recursive/run/54-alias-capability-discovery-contract/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-22T04:40:06Z`
LockHash: `9396580047feb76e66cc8aeec48b66c2565245970f6de24d724c516a0c342b44`
Inputs:
- `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`
- `/.recursive/run/54-alias-capability-discovery-contract/00-worktree.md`
- `/.recursive/run/54-alias-capability-discovery-contract/01-as-is.md`
- `/.recursive/run/54-alias-capability-discovery-contract/01.5-root-cause.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- `/docs/architecture/10-runtime-testing-architecture.md`
- `/docs/operations/04-runtime-testing-matrix.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/packages/schema-tools/src/validate-schemas.ts`
Outputs:
- `/.recursive/run/54-alias-capability-discovery-contract/02-to-be-plan.md`
Scope note: This plan defines the strict-TDD implementation path for rich alias capability discovery, GPT metadata resolution, capability-aware routing, downstream/Pi verification, and durable documentation.

## TODO

- [x] Incorporate locked requirements, AS-IS findings, and root-cause analysis
- [x] Define the target contract and implementation seams
- [x] Define strict TDD slices with RED and GREEN commands
- [x] Define updated-runtime and Pi verification procedure
- [x] Define documentation and schema/fixture updates
- [x] Audit plan against every requirement
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Root Cause Reference

Root cause identified in `01.5-root-cause.md`:

- metadata is resolved through split exact-id lookup paths rather than one shared canonical resolver
- downstream discovery reuses minimal OpenAI model-list data rather than a versioned role-model capability contract
- request routing hard-codes text-only requirements rather than inferring modalities and hard capabilities before alias scoring

Phase 3 must fix those root causes directly. Numeric overrides alone are not sufficient.

## Target Architecture

### Shared Model And Alias Capability Resolver

Add a shared runtime-host capability resolver, preferably under:

- `/role-model-router/apps/runtime-host-bridge/src/model-capability-resolver.ts`

Responsibilities:

- resolve exact runtime model IDs to canonical metadata, including `chatgpt/gpt-5.* -> openai/gpt-5.*` where the canonical OpenAI row exists
- preserve runtime model ID and canonical metadata ID separately
- derive limits, input modalities, output modalities, tools, structured-output, reasoning, hosted-tool posture, and advisory cache posture
- preserve source/provenance by metadata category: catalog, LiteLLM fixture/provider metadata when available, runtime Codex Subscription matrix, runtime endpoint readiness, operator override, or fallback
- represent unknown metadata explicitly rather than converting unknown limits to `0`
- produce target summaries reusable by exact records, alias records, diagnostics, and request filtering

### Versioned Downstream Discovery Contract

Extend `/api/role-model/downstream/openai` so it remains provider setup guidance but also includes a rich, schema-backed discovery payload.

Target shape:

- `contractVersion`, for example `role-model.downstream.openai.v1`
- `generatedAt`
- `freshness`, including runtime config/inventory revision or hash, catalog source/version, and schema version
- existing provider setup fields: `kind`, `providerId`, `displayName`, `baseUrl`, `endpoints`, `authentication`, `setup`
- `models`, where each entry is either:
  - exact model record with `type: "model"`
  - alias record with `type: "alias"`
- exact model records include metadata, endpoint IDs, declared capability layer, currently routable capability layer, limits, modalities, capabilities, provenance, and safe downstream fields only
- alias records include `routingMode`, configured model IDs, resolved model IDs, endpoint IDs, target summaries, aggregate limits, guaranteed/available/conditional modalities and capabilities, unknown targets, declared layer, currently routable layer, and Pi-style mapping hints

The existing `/v1/models` endpoint remains OpenAI-compatible and may stay minimal.

### Aggregate Alias Semantics

For each alias:

- `safeContextWindow`: minimum known positive context window across the selected target set
- `maxContextWindow`: maximum known context window across the selected target set
- `safeMaxOutputTokens`: minimum known positive max output tokens across the selected target set
- `maxOutputTokens`: maximum known max output tokens across the selected target set
- `guaranteedInput`: intersection of input modalities across the selected target set
- `availableInput`: union of input modalities across the selected target set
- `conditionalInput`: modalities available only on a subset, with target IDs
- same guaranteed/available/conditional structure for output modalities and capability families
- `unknownTargets`: target model or endpoint IDs with missing metadata categories

The contract must state whether each aggregate is computed from configured targets, currently routable targets, or both. The plan is to expose both where useful:

- `declared` / configured target capability layer
- `routable` / currently eligible endpoint capability layer

### Downstream Sanitization And Freshness

Downstream discovery must not expose:

- API keys
- bearer tokens
- raw credential references
- local filesystem paths
- auth-cache locations
- private account internals

It may expose stable safe identifiers such as provider IDs, endpoint IDs, model IDs, and sanitized readiness categories.

Freshness must advance when relevant runtime state changes. At minimum, compute deterministic revisions from:

- normalized runtime alias config
- current registry endpoint IDs/readiness
- catalog source metadata
- contract version

### Request Capability Inference And Filtering

Add a shared request capability inference layer, preferably under:

- `/role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`

Responsibilities:

- infer required input modalities from Chat Completions and Responses payloads
- detect `input.image` from image content parts and image URL parts
- detect `input.video` when video content parts are representable, or return unsupported-input when not safely supported
- infer `tools.function_calling` for function tools
- infer hosted-tool requirements separately from ordinary function tools
- infer `structured.output` from strict JSON schema or equivalent response-format controls
- infer reasoning-control requirements from explicit `reasoning`, `reasoning_effort`, `thinking`, or provider-specific controls supported by current request parsing
- return advisory preferences separately from hard requirements

Filtering order:

1. exact model or alias membership resolution
2. endpoint override filter
3. capability/modality eligibility filter
4. difficulty routing
5. controller routing
6. role/task policy
7. final router scoring

Stable failure error shape:

```json
{
  "error": {
    "type": "capability_eligibility_error",
    "code": "no_eligible_target",
    "message": "No target behind hybrid.hybrid can satisfy the requested capabilities.",
    "requested_model": "hybrid.hybrid",
    "inferred_requirements": {
      "required_input_modalities": ["image"],
      "required_capabilities": []
    },
    "excluded_targets": [
      {
        "endpoint_id": "deepseek.personal.primary.global.deepseek-v4-flash",
        "model_id": "deepseek/deepseek-v4-flash",
        "reasons": ["missing_input.image"]
      }
    ]
  }
}
```

The exact field names may be adjusted during implementation, but tests must lock the stable machine-readable semantics.

## Planned File Changes

Expected product files:

- add `/role-model-router/apps/runtime-host-bridge/src/model-capability-resolver.ts`
- add `/role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`
- update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- update `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts` only if the existing alias resolution type needs capability exclusion detail
- add or update host-bridge tests under `/role-model-router/apps/runtime-host-bridge/test/`
- add `/protocol/schemas/downstream-openai-discovery.schema.json`
- add downstream discovery fixtures under `/protocol/fixtures/downstream-openai/`
- update `/packages/schema-tools/src/validate-schemas.ts` fixture manifest
- regenerate `/packages/protocol-types/src/generated.ts`
- add `/docs/architecture/12-downstream-alias-capability-discovery.md`
- update `/docs/architecture/09-runtime-routing-strategy-interactions.md` to link to the downstream contract and preserve existing run 50 hosted-tool boundaries

Expected evidence files:

- `/.recursive/run/54-alias-capability-discovery-contract/evidence/logs/red/*.log`
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/logs/green/*.log`
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/runtime/*.json`
- `/.recursive/run/54-alias-capability-discovery-contract/evidence/pi/*.json`

## Strict TDD Plan

TDD Mode for Phase 3: `strict`

No production code may be written before the corresponding failing test has been run and recorded.

### TDD Slice A: Schema And Golden Contract Fixtures

RED:

- Add a schema fixture or schema-tools test expecting `downstream-openai-discovery.schema.json` and representative fixtures.
- Run `corepack pnpm run schemas:validate`.
- Expected RED: missing schema/fixture fields or validation failure.

GREEN:

- Add the schema, fixtures, and manifest entries.
- Run `corepack pnpm run schemas:validate`.
- Run `corepack pnpm run types:generate`.

Required fixture coverage:

- exact GPT model
- `hybrid.hybrid` mixed alias
- alias with unknown target metadata
- configured-but-not-routable target
- no-eligible-target error
- Pi-style downstream mapping

### TDD Slice B: Model Capability Resolver

RED:

- Add `model-capability-resolver.test.ts`.
- Assert `chatgpt/gpt-5.4` resolves to runtime ID `chatgpt/gpt-5.4`, canonical metadata ID `openai/gpt-5.4`, `1050000 / 128000`, image input, text output, tool support, structured-output support, and reasoning support.
- Assert DeepSeek targets resolve as text-only.
- Assert Kimi resolves text/image/video input and `262144 / 262144`.
- Assert unknown metadata stays unknown and does not become `0`.
- Run:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/model-capability-resolver.test.ts`

GREEN:

- Implement the shared resolver and source/provenance model.
- Re-run the same test until green.

### TDD Slice C: Rich Downstream Discovery

RED:

- Add `downstream-openai-discovery.test.ts`.
- Assert `/api/role-model/downstream/openai` helper output or backend HTTP route includes:
  - contract version
  - freshness metadata
  - all downstream-visible aliases
  - exact model records
  - `hybrid.hybrid` target summaries
  - safe limits `262144 / 128000`
  - text guaranteed input
  - image and video available conditional inputs
  - tool, structured-output, reasoning, and caching summaries
  - declared versus routable layers
  - sanitized output with no credential refs or local paths
  - Pi mapping fields
- Run:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/downstream-openai-discovery.test.ts`

GREEN:

- Extend `createDownstreamOpenAIProviderConfig()` or introduce a new builder that receives registry, inventory, catalog/resolver, and aliases.
- Keep `/v1/models` compatibility intact.
- Re-run the same test until green.

### TDD Slice D: Request Capability Inference

RED:

- Add `request-capability-inference.test.ts`.
- Assert equivalent Chat Completions and Responses payloads infer the same hard requirements for image input and function tools.
- Assert structured-output and explicit reasoning controls become hard requirements when present.
- Assert unsupported video representation returns a stable unsupported-input requirement/error path if not safely supported.
- Run:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/request-capability-inference.test.ts`

GREEN:

- Implement shared inference helpers and use them from both request mappers.
- Re-run the same test until green.

### TDD Slice E: Capability-Aware Alias Routing And Errors

RED:

- Add or extend routing tests, likely in `alias-capability-routing.test.ts`.
- Assert image requests through `hybrid.hybrid` exclude DeepSeek targets before scoring.
- Assert video requests route only to video-capable targets or return stable unsupported/no-eligible-target errors.
- Assert tool requests require `tools.function_calling`.
- Assert strict structured-output requests require `structured.output`.
- Assert unsupported reasoning controls exclude incompatible targets.
- Assert no-eligible-target responses include stable machine-readable error details.
- Run:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/alias-capability-routing.test.ts`

GREEN:

- Filter endpoints by inferred hard requirements after alias/endpoint override filtering and before difficulty/controller routing.
- Add routing diagnostics for required capabilities/modalities and excluded targets.
- Use `BridgeHttpError` for stable HTTP errors.
- Re-run the same test until green.

### TDD Slice F: Documentation Contract

RED:

- Add a docs/link assertion or focused documentation test if an existing docs test can cheaply enforce the new page and cross-link.
- If no meaningful docs test exists, record a strict-code TDD exception only for documentation text, while still requiring docs build in verification.

GREEN:

- Add downstream alias capability resolution documentation.
- Update routing strategy interactions doc with a clear link and boundary notes.
- Run:
  - `corepack pnpm run docs:build`

## Verification Plan

### Automated Verification

Focused commands:

- `corepack pnpm run schemas:validate`
- `corepack pnpm run types:generate`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/model-capability-resolver.test.ts test/downstream-openai-discovery.test.ts test/request-capability-inference.test.ts test/alias-capability-routing.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run test`
- `corepack pnpm --filter @role-model-router/runtime-ui run test:critical`

Baseline caveat:

- `corepack pnpm run runtime:test-critical` currently has inherited host validator timeouts in `test/validate-observability.test.ts` and `test/validate-ui.test.ts`.
- Phase 4 must rerun the command or the relevant fixed/targeted validator slices and explicitly distinguish inherited timeout behavior from Run 54 regressions.

### Updated Runtime Verification

Start an updated runtime from the worktree, not the older installed runtime:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx src/cli-entry.ts --host 127.0.0.1 --port 3456 --repo-root D:\DEV\role-model\.worktrees\54-alias-capability-discovery-contract --runtime-state-root <temp-run54-state> --scope-id run54-updated-runtime --unified-runtime-config "C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml"
```

If `:3456` is occupied, use an alternate port and record that Pi’s current config still points to `:3456`; for Pi verification, prefer freeing/using `:3456` because that is the configured downstream base URL.

Runtime probes:

- `GET /healthz`
- `GET /v1/models`
- `GET /api/role-model/models`
- `GET /api/role-model/downstream/openai`
- text-only `POST /v1/chat/completions` to `hybrid.hybrid`
- capability-constrained request, preferably image or tool input, to `hybrid.hybrid`
- request detail or diagnostics endpoint proving inferred requirements and excluded targets

Evidence to capture:

- corrected `chatgpt/gpt-5.4` metadata
- `hybrid.hybrid` safe limits and conditional modalities
- declared versus routable layers
- source/provenance and freshness metadata
- stable no-eligible-target or unsupported-input error if applicable

### Pi Verification

Inspect Pi config:

- `D:\pi\agent\models.json`

Drive Pi if a local command/API is discoverable under `D:\pi\agent`. Phase 3/4 should inspect package scripts or command files there before deciding.

Required evidence:

- Pi configured provider/base URL/model ID
- Pi obtains or can consume rich discovery from role-model
- mapped values for `contextWindow`, `maxTokens`, input modalities, tool/structured/reasoning feature flags
- proof that stale `128000 / 16384` is no longer the only available information

If Pi has no built-in discovery command:

- record the exact Pi integration gap
- capture deterministic bridge mapping from role-model discovery to Pi model fields
- record a follow-up needed in Pi rather than claiming full Pi-side discovery support

## Manual QA Plan

QA Execution Mode: `agent-operated`

Scenarios:

1. Start the updated runtime on the configured Pi port when available.
2. Confirm downstream discovery returns a rich contract for `hybrid.hybrid`.
3. Confirm Pi config points at that runtime and that the discovery-to-Pi mapping is deterministic.
4. Send text-only and capability-constrained alias requests and inspect diagnostics.
5. Confirm docs explain exact models, aliases, endpoint IDs, declared/routable layers, aggregate limits, modalities, tools, reasoning, caching, freshness, sanitization, and stable errors.

Human sign-off is not required unless live Pi behavior requires manual UI interaction unavailable to the agent.

## Out Of Scope In Implementation

- Do not implement Pi changes inside this repository.
- Do not break `/v1/models` OpenAI-compatible shape.
- Do not add live credential requirements to CI-safe tests.
- Do not turn role-model into a generic hosted browser/tool executor.
- Do not redesign routing strategy families beyond the capability eligibility layer required before scoring.
- Do not broaden into runtime UI redesign except small readback/diagnostic additions if necessary.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `557e48b63e1c75839f1b818c980daf56b72f9a5d`
- Comparison reference: `working-tree`
- Normalized baseline: `557e48b63e1c75839f1b818c980daf56b72f9a5d`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 557e48b63e1c75839f1b818c980daf56b72f9a5d`
- Planned product paths are listed above.
- Current phase-owned changes are recursive artifacts only.

## Audit Execution

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed `multi_agent_v1.spawn_agent`.
- Delegation Decision Basis: Recursive-mode prefers delegated audits when available, but the active subagent tool contract says not to spawn subagents unless the user explicitly asks for subagents, delegation, or parallel agent work.
- Delegation Override Reason: User did not explicitly authorize subagents; this Phase 2 audit therefore uses self-audit.
- Audit Inputs Provided: locked requirements, worktree, AS-IS, root-cause artifact, testing architecture docs, runtime source files, and diff basis.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: direct review of locked upstream artifacts, runtime testing docs, CLI startup path, and source seams.
- Acceptance Decision: `accepted`
- Refresh Handling: not applicable.
- Repair Performed After Verification: none.

## Requirement Completion Status

- `R1`: `planned`; resolver test and implementation slice B.
- `R2`: `planned`; shared resolver architecture and provenance model.
- `R3`: `planned`; rich downstream discovery slice C.
- `R3.1`: `planned`; schema and golden fixtures slice A.
- `R3.2`: `planned`; declared/routable layers in slices A-C.
- `R3.3`: `planned`; freshness and sanitization in slices A-C.
- `R4`: `planned`; aggregate alias semantics in slice C.
- `R5`: `planned`; modality summaries in slices B-C.
- `R6`: `planned`; modality-aware filtering in slices D-E.
- `R6.1`: `planned`; shared inference and stable errors in slices D-E.
- `R7`: `planned`; tool and structured-output discovery/enforcement in slices B-E.
- `R8`: `planned`; reasoning discovery/control filtering in slices B-E.
- `R9`: `planned`; advisory cache posture in slices B-C.
- `R10`: `planned`; Pi mapping and verification plan.
- `R11`: `planned`; diagnostics in slice E and runtime probes.
- `R12`: `planned`; strict TDD and automated/runtime/Pi verification.
- `R13`: `planned`; docs slice F.

## Traceability

- `R1`, `R2` -> TDD slice B and runtime model metadata probes
- `R3`, `R3.1`, `R3.2`, `R3.3`, `R4`, `R5`, `R9`, `R10` -> TDD slices A-C
- `R6`, `R6.1`, `R7`, `R8`, `R11` -> TDD slices D-E
- `R12` -> strict TDD log, automated verification, updated runtime, and Pi verification
- `R13` -> TDD slice F and docs build

## Coverage Gate

- [x] Root cause is addressed directly
- [x] Every requirement maps to planned code, tests, verification, or docs
- [x] Strict RED/GREEN evidence is planned for all code-bearing changes
- [x] Updated-runtime and Pi verification are explicitly planned
- [x] Downstream documentation is explicitly planned
- [x] Backward compatibility and out-of-scope boundaries are preserved

Coverage: PASS

## Approval Gate

- [x] Plan is implementation-ready
- [x] Plan is systematic and extensible rather than a one-off `hybrid.hybrid` patch
- [x] Plan starts from the locked worktree baseline and preserves main branch protection
- [x] Plan defines enough test evidence for Phase 3 and Phase 4 to audit TDD compliance

Approval: PASS

## Audit Gate

- [x] Effective inputs re-read
- [x] Plan reconciled with AS-IS and root-cause findings
- [x] Plan reconciled with testing matrix and known baseline timeout caveat
- [x] Requirement traceability complete

Audit: PASS
