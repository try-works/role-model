Run: `/.recursive/run/25-router-runtime-model-alias-pool/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T11:54:22Z`
LockHash: `7c058937f54eda6e4fd87c701c408a2f1a114719e05ccdb2e3fd4caaa1fcc939`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`
- `/.recursive/RECURSIVE.md`
Outputs:
- `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`
Scope note: Defines the implementation plan for alias-based model-pool routing with downstream masquerade discovery, exact-model compatibility, and local-plus-remote parity.

## TODO

- [x] Plan the RED tests that prove the alias-routing gap
- [x] Plan the config, discovery, request-mapping, diagnostics, and validation changes needed for alias-based model-pool routing
- [x] Plan the end-to-end local-plus-remote verification path
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - add RED coverage for alias config parsing, normalization, validation errors, and round-trip rendering
- `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - add RED routing tests proving an alias-expanded pool can include both local and remote endpoints and still preserve exact-model behavior
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add RED bridge tests proving `/v1/models` exposes configured aliases, alias requests expand to the intended candidate pool, and persisted diagnostics record alias resolution
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - add RED local-plus-remote validation assertions that one alias request can route across both pool members while exact-model requests remain green
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - add the repo-owned alias config contract, normalization, defaults, validation, and rendering support
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - add alias-aware `/v1/models` construction and downstream provider-config exposure
  - resolve incoming alias requests into the candidate endpoint pool before building `allowEndpoints`
  - preserve exact-model request mapping for non-alias model ids
  - emit alias-resolution diagnostics into request observations and inspection reads
- `/role-model-router/packages/runtime-observability/src/index.ts`
  - extend routing diagnostics so persisted request observations can report alias usage, pool membership, and any ignored or unavailable alias members
- `/role-model-router/packages/protocol-routing/src/index.ts`
  - thread alias-resolution metadata into runtime diagnostics while preserving existing routing-model guidance behavior
- `/role-model-router/packages/core/src/router.ts`
  - no alias-specific score math is expected, but the plan preserves existing eligibility and scoring behavior over the alias-expanded candidate set
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - extend the runtime validator to exercise at least one alias pool containing both local and remote endpoints and prove exact-model compatibility remains intact

## Implementation Steps

1. Write RED tests first in unified-runtime-config, protocol-routing, and runtime-host-bridge for alias config, alias discovery, alias request mapping, alias diagnostics, and local-plus-remote runtime proof.
2. Add the alias config contract under unified runtime config with validation for non-empty alias ids, non-empty model pools, and deterministic normalization.
3. Extend model discovery so `/v1/models` and downstream provider-config exposure can include configured alias ids while preserving real-model inspection surfaces.
4. Rework chat-completions and responses request mapping so:
   - exact-model requests continue to resolve by real `model_id`
   - alias requests expand to all registry endpoints whose `model_id` belongs to the configured alias pool
   - unavailable alias members are handled deterministically rather than crashing
5. Extend routing diagnostics to record alias usage, resolved pool membership, and any ignored or unavailable alias members.
6. Preserve existing capability, modality, tool-calling, context-window, and adaptive observed-data scoring across the alias-expanded candidate set rather than introducing alias-specific shortcuts.
7. Extend `runtime:validate-vendors` and bridge tests to prove one alias request can route across both local and remote endpoints and that exact-model requests still succeed afterward.
8. Re-run focused tests and runtime validators, then complete Phase 3 and Phase 4 receipts.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add unified-runtime-config tests that fail until `modelAliases` exists with parsing, validation, and rendering support
  - add bridge tests that fail until `/v1/models` exposes alias ids and alias requests expand to the intended pool
  - add protocol-routing or bridge tests that fail until alias diagnostics expose resolved pool membership
  - extend vendor-validation tests so local-plus-remote alias routing and exact-model compatibility fail until implemented
- GREEN plan:
  - implement config, discovery, alias expansion, and diagnostics only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/protocol-routing test`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run schemas:validate`

## Playwright Plan (if applicable)

- not applicable; verification is API-level and runtime-level rather than browser-driven in this run

## Manual QA Scenarios

1. Start the runtime host bridge from the run-25 worktree with at least one configured alias pool spanning one local model id and one remote model id.
2. Call `GET /v1/models` and confirm the alias id is visible while real endpoint and real-model inspection surfaces remain intact.
3. Send one alias-based `POST /v1/chat/completions` or `POST /v1/responses` request and confirm:
   - the request resolves to the configured pool members
   - routing selects one real endpoint from that pool
   - persisted request observations expose alias usage and pool composition
4. Send one exact-model request for a real model id from the same runtime and confirm exact-model routing still works.
5. Read `/api/role-model/requests/:id` after both requests and confirm the chosen endpoint remains real while alias diagnostics explain the expanded pool.

## Idempotence and Recovery

- Parsing or rendering the new alias config is deterministic and side-effect free.
- Alias expansion is derived from current registry membership and current config, so unavailable alias members should be reported deterministically and not persisted as hidden mutable state.
- If RED tests show that alias diagnostics widen beyond request observations and `/v1/models`, narrow the change before closing Phase 3.
- If alias exposure threatens real-model inspection or exact-model request mapping, stop and narrow the change before closing Phase 3.

## Implementation Sub-phases

### `SP1` RED tests for alias config and discovery

- add failing config tests for `modelAliases`
- add failing bridge tests for `/v1/models` alias exposure and downstream provider-config model guidance

### `SP2` RED tests for alias request mapping and diagnostics

- add failing bridge or protocol-routing tests for alias-expanded candidate pools and exact-model backward compatibility
- add failing diagnostics tests for alias usage, pool membership, and unavailable members

### `SP3` Alias config and bridge implementation

- implement alias parsing and rendering
- implement alias-aware model discovery
- implement alias request expansion to `allowEndpoints`
- implement alias diagnostics in persisted request observations

### `SP4` Local-plus-remote runtime proof

- extend runtime vendor validation to prove one alias can route across both local and remote pool members
- capture final validation evidence that exact-model requests still work after alias support lands

## Prior Recursive Evidence Reviewed

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 2 planning needed controller-owned mapping from the locked requirements to the exact config, discovery, request-mapping, diagnostics, and validator changes that will implement alias-based model-pool routing.`
- Delegation Override Reason: `The implementation plan is tightly bound to the already-read runtime surfaces, so delegation would add more overhead than value.`
- Audit Inputs Provided:
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`
  - `/.recursive/RECURSIVE.md`

## Effective Inputs Re-read

- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`
- `/.recursive/RECURSIVE.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the missing alias config surface, real-model-only `/v1/models`, exact-model-only request mapping, and missing alias diagnostics without widening into difficulty or controller routing.
- `00-worktree.md`: the plan stays inside the isolated run-25 branch and the baseline captured from the committed run-24 commit.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each requirement to concrete config, protocol-routing, bridge, runtime-observability, and validator file changes
  - checked that the planned validation set covers alias parsing, discovery exposure, alias-expanded candidate pools, diagnostics, and runtime-level local-plus-remote proof
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `fd5efdee275589db7d10bcd6ac7749ec780e4466`
- Comparison reference: `working-tree`
- Normalized baseline: `fd5efdee275589db7d10bcd6ac7749ec780e4466`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only fd5efdee275589db7d10bcd6ac7749ec780e4466`
- Base branch: `recursive/24-router-runtime-recency-bias-throughput-sla`
- Worktree branch: `recursive/25-router-runtime-model-alias-pool`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/04-test-summary.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/05-manual-qa.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/06-decisions-update.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/07-state-update.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/requirements-artifact-lint.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/requirements-lock.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-post-baseline-status.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-artifact-lint.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-lock.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase1-artifact-lint.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase1-lock.log`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface to alias config, alias discovery, alias request expansion, diagnostics, and runtime validation required for run 25

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans the alias config contract; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans alias exposure through `/v1/models` and downstream provider config; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: alias-pool request expansion is planned but not yet implemented in the bridge request-mapping path. | Blocking Evidence: `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: exact-model compatibility under the new alias layer is planned but not yet re-proved by implementation and tests. | Blocking Evidence: `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: alias diagnostics are planned but not yet wired into persisted request observations. | Blocking Evidence: `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests and end-to-end alias runtime proof are planned but not yet executed. | Blocking Evidence: `/.recursive/run/25-router-runtime-model-alias-pool/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, test-first, and narrow enough to add alias-based model-pool routing without widening into later difficulty or controller runs.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP3`
- `R2` -> `SP1`, `SP3`
- `R3` -> `SP2`, `SP3`, `SP4`
- `R4` -> `SP2`, `SP3`, `SP4`
- `R5` -> `SP2`, `SP3`
- `R6` -> `SP1`, `SP2`, `SP4`

## Coverage Gate

- [x] Every in-scope requirement is covered by concrete files and sub-phases
- [x] RED, GREEN, and end-to-end validation are explicit
- [x] Expected changed files are specific enough for later diff reconciliation

Coverage: PASS

## Approval Gate

- [x] The Phase 2 plan is specific enough for implementation
- [x] No unresolved ambiguity remains about alias-routing ownership or validation

Approval: PASS
