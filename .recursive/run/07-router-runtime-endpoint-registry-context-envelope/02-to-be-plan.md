Run: `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T03:34:05Z`
LockHash: `ddbc041ba16786dd2f767271b78b0f63b5ad776d71947e37b14ae53ccfa1dcb4`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
Outputs:
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `07-router-runtime-endpoint-registry-context-envelope` into a narrow implementation plan. The run will add three router-owned packages (`endpoint-registry`, `context-envelope`, and `retrieval-receipt`), extend the existing SQLite-memory package with minimal supporting persistence helpers, add deterministic fixtures, and add one local validation path that exercises registry construction plus context-envelope assembly. It must not widen into protocol-driven routing, adapter execution, or host integration work.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the run-07 roadmap slice
- [x] Choose the concrete package, fixture, and validation-command surfaces for endpoint registry and context-envelope work
- [x] Define implementation steps that preserve run-07 scope discipline
- [x] Define verification commands and evidence expectations
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Package Split Decision

- User-selected package split: `endpoint-registry` + `context-envelope` + `retrieval-receipt`
- Reason this plan follows that split: the roadmap and run-08 handoff both treat candidate registry construction, bounded context assembly, and receipt/diagnostic output as distinct runtime surfaces that later routing work must consume directly without reopening run-07 boundaries.

## Planned Changes by File

- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md`: define the concrete write surface, sub-phases, validation path, and scope boundaries for run 07.
- `/role-model-router/packages/endpoint-registry/package.json`: add the new router-owned endpoint-registry package to the existing workspace package layout.
- `/role-model-router/packages/endpoint-registry/tsconfig.json`: follow the repo TypeScript package convention for source and test separation.
- `/role-model-router/packages/endpoint-registry/src/index.ts`: implement account-aware endpoint instantiation, lifecycle state handling, registry diagnostics, and stable endpoint candidate output derived from catalog metadata, provider-account records, and discovery inputs.
- `/role-model-router/packages/endpoint-registry/src/cli.ts`: add the local validation wrapper that loads the pinned fixtures, builds the runtime registry, assembles a context envelope, emits retrieval receipts, and prints deterministic JSON diagnostics.
- `/role-model-router/packages/endpoint-registry/test/index.test.ts`: add focused tests that prove registry construction, lifecycle/diagnostic behavior, and endpoint identity compatibility with the routing core.
- `/role-model-router/packages/context-envelope/package.json`: add the new router-owned context-envelope package.
- `/role-model-router/packages/context-envelope/tsconfig.json`: follow the repo package convention for the context-envelope implementation package.
- `/role-model-router/packages/context-envelope/src/index.ts`: implement session/conversation identity records, bounded context-envelope assembly, continuity/handoff selection, and deterministic envelope diagnostics over SQLite-backed state.
- `/role-model-router/packages/context-envelope/test/index.test.ts`: add focused tests that prove session/conversation identity handling, bounded envelope construction, and deterministic artifact selection.
- `/role-model-router/packages/retrieval-receipt/package.json`: add the new router-owned retrieval-receipt package.
- `/role-model-router/packages/retrieval-receipt/tsconfig.json`: follow the repo package convention for the retrieval-receipt implementation package.
- `/role-model-router/packages/retrieval-receipt/src/index.ts`: implement the receipt model, inclusion-reason vocabulary, token-budget summary, and deterministic serialization for selected local context.
- `/role-model-router/packages/retrieval-receipt/test/index.test.ts`: add focused tests that prove receipt generation and stable diagnostic output.
- `/role-model-router/packages/sqlite-memory/src/index.ts`: extend the existing package with minimal persistence helpers for session, conversation, turn, context-artifact, handoff, and retrieval-receipt records while preserving the existing run-06 schema contract instead of redesigning it.
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`: add tests for the new SQLite read/write helpers used by run 07.
- `/testdata/router-runtime/registry-sources.json`: add pinned discovery and endpoint-instantiation inputs that bind catalog data, provider-account ids, regions, availability, and lifecycle state without introducing live provider integration.
- `/testdata/router-runtime/context-envelope.json`: add pinned session/conversation/context inputs that drive deterministic envelope assembly and retrieval-receipt output.
- `/package.json`: add one narrow root script for the run-07 local validation path so Phase 4 can exercise registry construction and context-envelope assembly directly.
- `/pnpm-lock.yaml`: record the workspace importer entries required after adding the new packages and any coupled workspace dependencies.

## Implementation Steps

1. Add a dedicated router-owned package at `role-model-router/packages/endpoint-registry` rather than extending `router-devtools` or the provider detector packages ad hoc, because run 07 must turn static sample endpoint fabrication into a runtime-owned candidate registry that later routing work can consume directly.
2. Model endpoint-registry records in `endpoint-registry/src/index.ts` with fields aligned to the roadmap and architecture lock, including:
   - stable endpoint identity compatible with `EndpointCandidate`,
   - provider-account binding,
   - provider id/provider kind,
   - model id and variant/base-url selection,
   - region/deployment selection,
   - serving source and runtime package family,
   - lifecycle state,
   - health/availability signal summary,
   - policy and entitlement tags,
   - registry diagnostics.
   Registry construction must compose normalized catalog entries, provider-account records, and pinned discovery inputs without moving raw credentials or routing decisions into the registry layer.
3. Keep provider detector packages as lower-level stub inputs rather than making them the runtime registry. Run 07 should consume their style only where helpful for endpoint identity defaults, but the resulting registry must be account-aware and must no longer depend on `testdata/endpoint-metadata/sample-endpoints.json` as its primary source of truth.
4. Add a dedicated router-owned package at `role-model-router/packages/context-envelope` to keep session/conversation identity and bounded continuity assembly separate from endpoint instantiation. The package should model, at minimum:
   - workspace/session/conversation identity,
   - recent turn selection,
   - pinned context selection,
   - summary/fact/artifact inclusion,
   - continuity and handoff metadata,
   - token-budget bounded assembly diagnostics.
5. Add a dedicated router-owned package at `role-model-router/packages/retrieval-receipt` to keep the “what local context was selected and why” surface stable and reusable for run 08 routing diagnostics. The receipt should summarize:
   - selected turns and artifacts,
   - inclusion reasons,
   - continuity/handoff reasons,
   - estimated token footprint,
   - omitted or trimmed context counts where relevant.
6. Extend `role-model-router/packages/sqlite-memory/src/index.ts` with minimal run-07 persistence helpers instead of redesigning the run-06 schema. The new helpers should read and write the already-declared tables for:
   - `sessions`,
   - `conversations`,
   - `conversation_turns`,
   - `context_artifacts`,
   - `artifact_links`,
   - `routing_handoffs`,
   - `retrieval_receipts`.
   The plan intentionally preserves the current schema and same-host path contract so run 08 can build on it without a second memory-layer redesign.
7. Add a pinned discovery/registry fixture under `testdata/router-runtime/registry-sources.json` that exercises:
   - catalog model/provider lookups,
   - provider-account binding by `providerAccountId`,
   - multiple regions or endpoint variants,
   - lifecycle state and availability/health differences,
   - local/cloud discovery metadata,
   - policy/entitlement tags.
8. Add a pinned context-envelope fixture under `testdata/router-runtime/context-envelope.json` that exercises:
   - session and conversation identifiers,
   - recent normalized turns,
   - pinned context blocks or summaries,
   - context artifacts,
   - handoff metadata between endpoints/models,
   - deterministic retrieval-budget inputs.
9. Implement `endpoint-registry/src/cli.ts` so one local validation command:
   - loads the tracked normalized catalog from run 05,
   - loads the pinned provider-account fixture from run 06,
   - loads the new run-07 registry and context fixtures,
   - initializes or reuses SQLite via the existing runtime-state contract,
   - seeds the needed session/conversation/context records,
   - builds the runtime registry,
   - assembles one bounded context envelope,
   - emits at least one retrieval receipt,
   - prints deterministic JSON diagnostics for registry size, lifecycle states, chosen envelope contents, and receipt summary,
   - fails loudly on invalid discovery input, invalid identity continuity, or invalid retrieval assembly.
10. Keep the root command surface narrow by adding one script such as `runtime:validate-registry` to `/package.json`. Phase 4 should then exercise:
    - direct package build/test commands for `endpoint-registry`, `context-envelope`, `retrieval-receipt`, and the affected `sqlite-memory` package,
    - the new local registry/context validation command,
    - the inherited broader baseline command chain (`schemas:validate`, `build`, `test`, `smoke`).
    Record the inherited schema-tools/Biome failure accurately as shared baseline state unless run 07 introduces a distinct new regression.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/endpoint-registry test`
  - `corepack pnpm --filter @role-model-router/context-envelope test`
  - `corepack pnpm --filter @role-model-router/retrieval-receipt test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
- Direct run-07 validation path:
  - `corepack pnpm run runtime:validate-registry`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/endpoint-registry build`
  - `corepack pnpm --filter @role-model-router/context-envelope build`
  - `corepack pnpm --filter @role-model-router/retrieval-receipt build`
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`
- Regression checks:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\07-router-runtime-endpoint-registry-context-envelope --run-id 07-router-runtime-endpoint-registry-context-envelope`
  - `git diff --name-only 0868ec67f734a019af88ed8871aad239bb550dd7`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 07 adds runtime-owned TypeScript packages, fixtures, and a CLI-driven validation path only; it introduces no browser UI surface.

## Manual QA Scenarios

1. **Registry fixture sanity check**
   - Steps:
     - inspect `testdata/router-runtime/registry-sources.json`
     - inspect `role-model-router/packages/endpoint-registry/src/index.ts`
   - Expected:
     - registry inputs bind concrete endpoint candidates to catalog metadata and provider-account ids without raw credential material
     - lifecycle state and region/base-url selection are explicit rather than inferred by hidden defaults

2. **SQLite continuity boundary check**
   - Steps:
     - inspect `role-model-router/packages/sqlite-memory/src/index.ts`
     - inspect `role-model-router/packages/context-envelope/src/index.ts`
   - Expected:
     - run 07 builds on the existing SQLite schema instead of introducing a second continuity store
     - session/conversation/context assembly stays bounded and deterministic

3. **Receipt and envelope sanity check**
   - Steps:
     - run `corepack pnpm run runtime:validate-registry`
     - inspect the JSON output
   - Expected:
     - the command reports registry diagnostics, one assembled context envelope, and at least one retrieval receipt with deterministic inclusion reasons
     - no routing decision or adapter execution behavior appears in the output

4. **Scope-boundary sanity check**
   - Steps:
     - inspect the final run diff
     - compare against run `08-router-runtime-protocol-routing/00-requirements.md`
   - Expected:
     - no protocol-driven routing projection, routing-model selection, adapter execution, or host-integration behavior is added in run 07
     - run 07 stops at registry/context/retrieval surfaces needed by run 08

## Idempotence and Recovery

- Re-running `corepack pnpm run runtime:validate-registry` is safe and should deterministically rebuild the same registry diagnostics and context-envelope/retrieval summary from the pinned fixtures without duplicating schema-version state.
- Re-running the package tests is safe and should remain green once registry construction, context-envelope assembly, and retrieval receipt generation are implemented.
- If the diff grows into routing-core ranking logic, protocol-driven request projection, adapter request building, or host integration, stop and trim the widening before closing Phase 3.
- If the inherited schema-tools/Biome failure still appears in root `build` or `test`, record it accurately as unchanged broader baseline state unless run 07 introduces a distinct new failure.
- If SQLite helper changes imply a schema redesign rather than a thin API addition over the existing tables, stop and re-scope the change back to run-07’s boundary.

## Implementation Sub-phases

### SP1. Endpoint registry construction and diagnostics

Scope and purpose:
Create the router-owned endpoint-registry package, deterministic endpoint-instantiation model, and registry diagnostics from catalog, account, and pinned discovery inputs.

Requirement mapping: `R1`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/endpoint-registry/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/registry-sources.json`
- [ ] Add tests that describe the desired registry and lifecycle behavior before implementing production code
- [ ] Implement deterministic endpoint-registry construction and diagnostics in `src/index.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/endpoint-registry test`
- `corepack pnpm --filter @role-model-router/endpoint-registry build`

Sub-phase acceptance:
- The repo can derive a concrete runtime registry from tracked catalog metadata, provider-account records, and discovery inputs and emit deterministic lifecycle/diagnostic output.

### SP2. Context-envelope assembly over SQLite-backed continuity state

Scope and purpose:
Create the context-envelope package and minimal SQLite helper expansion needed to assemble bounded runtime continuity state for later routing.

Requirement mapping: `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/context-envelope/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/context-envelope.json`
- [ ] Add tests that describe session/conversation identity, bounded selection, and continuity behavior before implementing production code
- [ ] Extend `role-model-router/packages/sqlite-memory/src/index.ts` with the minimal helper functions needed by run 07
- [ ] Implement deterministic context-envelope assembly in `context-envelope/src/index.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/context-envelope test`
- `corepack pnpm --filter @role-model-router/sqlite-memory test`
- `corepack pnpm --filter @role-model-router/context-envelope build`

Sub-phase acceptance:
- The repo can seed and read the needed SQLite continuity rows and assemble a bounded context envelope without widening into routing or provider execution.

### SP3. Retrieval-receipt modeling and run-local validation path

Scope and purpose:
Create the retrieval-receipt package and one deterministic local validation command that proves registry construction plus context-envelope assembly end to end.

Requirement mapping: `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/retrieval-receipt/` with workspace package metadata and TypeScript config
- [ ] Add tests that describe receipt generation before implementing production code
- [ ] Implement deterministic receipt generation in `retrieval-receipt/src/index.ts`
- [ ] Add `role-model-router/packages/endpoint-registry/src/cli.ts`
- [ ] Add `/package.json` script `runtime:validate-registry`
- [ ] Make the CLI load the tracked inputs, initialize/read SQLite, build the registry, assemble one context envelope, and emit at least one retrieval receipt

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/retrieval-receipt test`
- `corepack pnpm run runtime:validate-registry`
- `git diff --name-only 0868ec67f734a019af88ed8871aad239bb550dd7`

Sub-phase acceptance:
- The run has one deterministic local validation path that proves registry construction, bounded context-envelope assembly, and retrieval receipt output without widening into routing or execution.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/03-implementation-summary.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/04-test-summary.md`
- `/.recursive/run/04-router-runtime-architecture-lock/03-implementation-summary.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 2 is an ExecPlan synthesis artifact that must stay tightly aligned to the locked Phase 1 findings, the run-07 roadmap slice, the user-selected three-package split, and the exact intended no-widening write surface before strict TDD starts.`
Delegation Override Reason: `A delegated planning pass would add overhead without improving fidelity because the controller already holds the locked Phase 1 inventory, the relevant roadmap slices, the downstream run-08 handoff requirements, and the package-boundary decision that now drives the implementation shape.`
Audit Inputs Provided:
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- Changed files:
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md`
- Targeted code references:
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/provider-account/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/cli.ts`
  - `/role-model-router/apps/router-devtools/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`

## Earlier Phase Reconciliation

- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`:
  - `R1`-`R4` remain blocked because the repo has only static endpoint stubs, sample endpoint export, provider-account primitives, and SQLite schema placeholders rather than a runtime-owned registry/context layer.
  - the plan responds directly by introducing three runtime packages plus minimal SQLite helper expansion instead of widening into routing or execution.
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`:
  - claim carried forward: all later audited phases must stay anchored to diff basis `0868ec67f734a019af88ed8871aad239bb550dd7`.
  - current reconciliation: the planned write surface is limited to run-07 artifacts, three new packages, deterministic fixtures, the affected SQLite-memory helpers, the root validation script, and the coupled lockfile update.
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`:
  - claim carried forward: run 08 must consume earlier registry/context outputs instead of inventing a second candidate source or continuity model.
  - current reconciliation: the run-07 plan explicitly produces stable registry, context-envelope, and retrieval-receipt outputs sized for that handoff.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/provider-account/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/cli.ts`
  - `/role-model-router/apps/router-devtools/src/index.ts`
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `0868ec67f734a019af88ed8871aad239bb550dd7`
- Comparison reference: `working-tree`
- Normalized baseline: `0868ec67f734a019af88ed8871aad239bb550dd7`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 0868ec67f734a019af88ed8871aad239bb550dd7`
- Diff basis used: `git diff --name-only 0868ec67f734a019af88ed8871aad239bb550dd7`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/07-router-runtime-endpoint-registry-context-envelope`
- Planned changed files reviewed:
  - `.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
  - `.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
  - `.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
  - `.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md`
  - `package.json`
  - `pnpm-lock.yaml`
  - `testdata/router-runtime/registry-sources.json`
  - `testdata/router-runtime/context-envelope.json`
  - `role-model-router/packages/endpoint-registry/package.json`
  - `role-model-router/packages/endpoint-registry/tsconfig.json`
  - `role-model-router/packages/endpoint-registry/src/index.ts`
  - `role-model-router/packages/endpoint-registry/src/cli.ts`
  - `role-model-router/packages/endpoint-registry/test/index.test.ts`
  - `role-model-router/packages/context-envelope/package.json`
  - `role-model-router/packages/context-envelope/tsconfig.json`
  - `role-model-router/packages/context-envelope/src/index.ts`
  - `role-model-router/packages/context-envelope/test/index.test.ts`
  - `role-model-router/packages/retrieval-receipt/package.json`
  - `role-model-router/packages/retrieval-receipt/tsconfig.json`
  - `role-model-router/packages/retrieval-receipt/src/index.ts`
  - `role-model-router/packages/retrieval-receipt/test/index.test.ts`
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - `role-model-router/packages/sqlite-memory/test/index.test.ts`
- Unexplained drift:
  - none; the intended run-07 write surface stays limited to the new registry/context packages, deterministic fixtures, minimal SQLite-memory helper extensions, and the coupled root-script/lockfile changes

## Gaps Found

- none beyond the explicitly planned implementation decisions; the package split, validation path, and SQLite-memory extension boundary are specific enough to begin Phase 3

## Repair Work Performed

- Converted the Phase 1 gap into a concrete three-package implementation plan instead of leaving endpoint-registry, context-envelope, and receipt behavior bundled into one vague runtime surface.
- Scoped the plan so run 07 extends the existing SQLite-memory package with thin helper APIs rather than redesigning the run-06 schema contract.
- Added one deterministic validation command to cover both registry construction and context-envelope assembly so Phase 4 can distinguish run-07 behavior from the inherited broader baseline failure.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines a dedicated endpoint-registry package, deterministic registry diagnostics, and pinned discovery inputs, but none of those runtime endpoint-instantiation surfaces exist yet. | Blocking Evidence: `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md` | Audit Note: Phase 3 will add account-aware endpoint registry construction without widening into routing or execution.
- R2 | Status: blocked | Rationale: the plan now defines a dedicated context-envelope package plus the minimal SQLite helper expansion needed for session/conversation identity and bounded continuity assembly, but those runtime surfaces do not exist yet. | Blocking Evidence: `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md` | Audit Note: Phase 3 will assemble bounded context envelopes over the existing run-06 SQLite contract rather than redesigning the store.
- R3 | Status: blocked | Rationale: the plan now defines a dedicated retrieval-receipt package and stable handoff output for downstream routing, but no retrieval-receipt model or deterministic receipt generation path exists yet. | Blocking Evidence: `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md` | Audit Note: Phase 3 will keep registry/context handoff explicit so run 08 can consume it directly.
- R4 | Status: blocked | Rationale: the plan now defines one deterministic local validation command and the broader regression chain, but the registry/context validation path has not been implemented or exercised yet. | Blocking Evidence: `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`, `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/02-to-be-plan.md` | Audit Note: Phase 4 will run `runtime:validate-registry` plus the inherited broader baseline chain and will distinguish unchanged schema-tools failures from new run-07 regressions.

## Audit Verdict

- Audit summary: the plan stays tightly aligned to the locked Phase 1 gaps, the roadmap slice, the user-selected three-package split, and the downstream run-08 handoff needs without widening into routing or execution.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> planned through `## Planned Changes by File`, `## Implementation Steps`, `SP1`, and `## Requirement Completion Status`.
- `R2` -> planned through `## Planned Changes by File`, `## Implementation Steps`, `SP2`, and `## Requirement Completion Status`.
- `R3` -> planned through `## Planned Changes by File`, `## Implementation Steps`, `SP3`, and `## Requirement Completion Status`.
- `R4` -> planned through `## Testing Strategy`, `## Manual QA Scenarios`, `SP3`, and `## Requirement Completion Status`.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-worktree.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/01-as-is.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- Requirement coverage check:
  - `R1`-`R4`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Manual QA Scenarios`, `## Implementation Sub-phases`, and `## Requirement Completion Status`
- Out-of-scope confirmation:
  - `OOS1`-`OOS3`: preserved; no protocol-driven routing projection, adapter execution, host integration, or replacement of the run-06 provider-account/SQLite contract is planned here

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to drive strict TDD implementation
- [x] The write surface and validation strategy stay within run-07 scope

Approval: PASS
