Run: `/.recursive/run/26-router-runtime-difficulty-guided-routing/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T12:38:08Z`
LockHash: `1911f7e9e70aa498aa32a504b421206bf0cd855633d4f136f6afb1924c6c7716`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`
- `/.recursive/RECURSIVE.md`
Outputs:
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`
Scope note: Defines the implementation plan for explicit difficulty-rubric routing with classifier-driven alias mode, strategy mapping, `maxDifficulty` gating, and persisted difficulty diagnostics.

## TODO

- [x] Plan the RED tests that prove the difficulty-routing gap
- [x] Plan the config, classifier, routing, diagnostics, and validation changes needed for difficulty-guided routing
- [x] Plan the end-to-end local-plus-remote verification path
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - add RED coverage for the runtime-owned difficulty rubric, classifier config, alias mode `difficulty`, `maxDifficulty` defaults, validation errors, and config round-trip rendering
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add RED bridge tests proving difficulty classification, safe fallback behavior, difficulty-to-strategy mapping, request-observation diagnostics, and alias-pool gating across both chat-completions and responses
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - add RED local-plus-remote validation assertions that representative easy/medium/hard requests route differently and that `maxDifficulty` excludes weaker endpoints
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - add the repo-owned difficulty rubric, classifier config contract, alias mode/options support, deterministic defaults, and rendering support
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - add request-feature extraction for the locked rubric signals
  - add classifier execution plus deterministic fallback behavior
  - map classified difficulty to routing strategy and alias-pool gating before final route selection
  - emit difficulty diagnostics and rubric summaries into persisted request observations
- `/role-model-router/packages/core/src/types.ts`
  - extend routing inputs for assigned difficulty, selected strategy profile, and endpoint or candidate difficulty ceilings
- `/role-model-router/packages/core/src/router.ts`
  - enforce `maxDifficulty` eligibility and consume the already-selected strategy profile without widening into later controller or hybrid logic
- `/role-model-router/packages/protocol-routing/src/index.ts`
  - thread the new difficulty and gating inputs into live route selection while preserving the existing alias-pool and observed-data baseline
- `/role-model-router/packages/runtime-observability/src/index.ts`
  - extend routing diagnostics so persisted request observations can report assigned difficulty, classifier fallback outcome, rubric-signal summaries, and difficulty-gating effects
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - extend the runtime validator to prove easy/medium/hard routing divergence plus local-and-remote `maxDifficulty` gating in the live runtime

## Implementation Steps

1. Write RED tests first for the difficulty rubric contract, classifier config, alias mode `difficulty`, routing diagnostics, and `maxDifficulty` gating.
2. Add the runtime-owned config contract for:
   - the shared easy/medium/hard rubric and normalized signal fields
   - classifier endpoint or model selection, timeout, and fallback behavior
   - per-alias routing mode plus mode-local options such as `maxDifficulty`
3. Add a bridge-owned request-feature extractor that derives the rubric signals from request messages, tools, bounded history, and other already-available request fields.
4. Implement classifier execution or compatible additive classification flow that:
   - can target local or remote execution
   - returns a normalized difficulty bucket and optional signal summary
   - falls back deterministically when the classifier is missing, invalid, or timed out
5. Rework alias request mapping so difficulty mode:
   - classifies the request before scoring
   - maps the resulting bucket to the intended canonical routing strategy profile
   - applies `maxDifficulty` gating uniformly across local and remote candidates
   - preserves the existing additive exact-model path for non-alias requests
6. Extend core routing inputs and diagnostics so the chosen difficulty, applied strategy, and gated candidates are observable without introducing controller or hybrid logic early.
7. Extend `runtime:validate-vendors` and bridge tests to prove representative easy/medium/hard requests with and without tools produce different route outcomes across local-plus-remote pools.
8. Re-run focused tests and runtime validators, then complete Phase 3 and Phase 4 receipts.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add unified-runtime-config tests that fail until the difficulty rubric, classifier config, alias mode, and `maxDifficulty` defaults exist with parsing and validation support
  - add bridge tests that fail until requests can be classified, safe fallback behavior is explicit, and observations expose difficulty diagnostics
  - add routing tests that fail until difficulty changes the selected strategy profile and `maxDifficulty` excludes underpowered candidates
  - extend vendor-validation tests so easy/medium/hard local-plus-remote routing and gating fail until implemented
- GREEN plan:
  - implement config, classification, difficulty strategy mapping, gating, and diagnostics only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/protocol-routing test`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run schemas:validate`

## Playwright Plan (if applicable)

- not applicable; verification is API-level and runtime-level rather than browser-driven in this run

## Manual QA Scenarios

1. Start the runtime host bridge from the run-26 worktree with one alias pool that spans at least one local model and one remote model and uses routing mode `difficulty`.
2. Send one representative `easy` request without tools and confirm:
   - the request is classified as `easy` or falls back deterministically
   - the chosen strategy profile matches the planned easy behavior
   - local-and-remote candidates above the configured floor remain eligible
3. Send one representative `medium` request with moderate constraints or bounded tool use and confirm the assigned difficulty and resulting route differ from the easy request when the pool supports it.
4. Send one representative `hard` request with stronger decomposition, history, or tool burden and confirm:
   - the assigned difficulty is `hard`
   - `maxDifficulty` excludes endpoints limited to `easy` or `medium`
   - the remaining route comes from an eligible local or remote endpoint
5. Read `/api/role-model/requests/:id` after each request and confirm the observation shows the assigned difficulty, rubric-signal summary, chosen strategy profile, and difficulty-related gating context.

## Idempotence and Recovery

- Parsing or rendering the difficulty config is deterministic and side-effect free.
- Difficulty feature extraction is derived from request content and bounded runtime config, so it should not require hidden mutable state in this run.
- Classifier failure must degrade deterministically to a safe default difficulty rather than block inference entirely.
- If RED tests show the classification surface wants wider caching or controller integration, stop and narrow the change before closing Phase 3 because those belong to later runs.

## Implementation Sub-phases

### `SP1` RED tests for rubric and config ownership

- add failing config tests for the explicit difficulty rubric, classifier config, alias mode `difficulty`, and `maxDifficulty`
- add failing bridge tests for missing difficulty diagnostics and fallback behavior

### `SP2` RED tests for strategy mapping and gating

- add failing routing or bridge tests for difficulty-specific strategy selection
- add failing tests proving `hard` and `medium` requests exclude candidates whose `maxDifficulty` is too low

### `SP3` Config, classifier, and bridge implementation

- implement rubric and classifier parsing/rendering
- implement request-feature extraction and deterministic classification
- implement difficulty-mode request mapping, routing strategy assignment, and difficulty diagnostics

### `SP4` Local-plus-remote runtime proof

- extend runtime vendor validation to prove easy/medium/hard route divergence and `maxDifficulty` gating across mixed local and remote pools
- capture final validation evidence that exact-model requests still work after difficulty mode lands

## Prior Recursive Evidence Reviewed

- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/04-test-summary.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/05-manual-qa.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 2 planning needed controller-owned mapping from the locked requirements to the exact config, classification, routing, diagnostics, and validator changes that will implement difficulty-guided routing.`
- Delegation Override Reason: `The implementation plan is tightly bound to the already-read runtime surfaces and strategy lock, so delegation would add more overhead than value.`
- Audit Inputs Provided:
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`
  - `/.recursive/RECURSIVE.md`

## Effective Inputs Re-read

- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`
- `/.recursive/RECURSIVE.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the missing rubric ownership, classifier path, difficulty-to-strategy mapping, `maxDifficulty` gating, and persisted difficulty diagnostics without widening into later cache, controller, or hybrid runs.
- `00-worktree.md`: the plan stays inside the isolated run-26 branch and the baseline captured from the committed run-25 commit.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each requirement to concrete config, bridge, core routing, runtime-observability, and validator file changes
  - checked that the planned validation set covers rubric modeling, classifier fallback, strategy switching, gating, and runtime-level local-plus-remote proof
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Comparison reference: `working-tree`
- Normalized baseline: `38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Base branch: `recursive/25-router-runtime-model-alias-pool`
- Worktree branch: `recursive/26-router-runtime-difficulty-guided-routing`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/05-manual-qa.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/06-decisions-update.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/07-state-update.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-post-baseline-status.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-lock.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase1-lock.log`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface to rubric ownership, classifier-driven difficulty assignment, strategy mapping, gating, diagnostics, and runtime validation required for run 26

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans the shared difficulty rubric contract; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans alias mode `difficulty` and classifier execution; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: difficulty-to-strategy mapping is planned but not yet implemented in bridge request mapping or core routing inputs. | Blocking Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: `maxDifficulty` gating is planned but not yet implemented across local and remote candidates. | Blocking Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: difficulty diagnostics are planned but not yet wired into persisted request observations. | Blocking Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests and end-to-end difficulty runtime proof are planned but not yet executed. | Blocking Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, test-first, and narrow enough to add difficulty-guided routing without widening into later cache, controller, or hybrid runs.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP3`
- `R2` -> `SP1`, `SP3`
- `R3` -> `SP2`, `SP3`, `SP4`
- `R4` -> `SP2`, `SP3`, `SP4`
- `R5` -> `SP1`, `SP3`
- `R6` -> `SP1`, `SP2`, `SP4`

## Coverage Gate

- [x] Every in-scope requirement is covered by concrete files and sub-phases
- [x] RED, GREEN, and end-to-end validation are explicit
- [x] Expected changed files are specific enough for later diff reconciliation

Coverage: PASS

## Approval Gate

- [x] The Phase 2 plan is specific enough for implementation
- [x] No unresolved ambiguity remains about difficulty-routing ownership or validation

Approval: PASS
