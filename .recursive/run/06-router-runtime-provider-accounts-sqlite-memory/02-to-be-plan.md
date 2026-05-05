Run: `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T03:04:34Z`
LockHash: `b43449af3cb1642593a71e8a76e5361ee60904c299261dbec6d71eed7ee99cd4`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
Outputs:
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `06-router-runtime-provider-accounts-sqlite-memory` into a narrow implementation plan. The run will add a router-owned provider-account package, a router-owned SQLite-memory package, explicit schema/migration and governance contracts, and one local validation path that exercises account configuration plus SQLite initialization. It must not widen into endpoint-registry, context-envelope assembly, routing, adapter execution, or host integration work.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the run-06 roadmap slice
- [x] Choose the concrete package, fixture, and validation-command surfaces for provider-account and SQLite-memory work
- [x] Define implementation steps that preserve run-06 scope discipline
- [x] Define verification commands and evidence expectations
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Planned Changes by File

- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md`: define the concrete write surface, sub-phases, validation path, and scope boundaries for run 06.
- `/role-model-router/packages/provider-account/package.json`: add the new router-owned provider-account package to the existing workspace package layout.
- `/role-model-router/packages/provider-account/tsconfig.json`: follow the repo TypeScript package convention for source and test separation.
- `/role-model-router/packages/provider-account/src/index.ts`: implement provider-account records, credential references, auth-mode definitions, account status/health/rotation modeling, and validation against catalog/provider metadata.
- `/role-model-router/packages/provider-account/test/index.test.ts`: add focused tests that prove supported auth families, validation failures, secret-reference handling, and account-health semantics.
- `/role-model-router/packages/sqlite-memory/package.json`: add the new router-owned SQLite-memory package.
- `/role-model-router/packages/sqlite-memory/tsconfig.json`: follow the repo package convention for the SQLite-memory implementation package.
- `/role-model-router/packages/sqlite-memory/src/index.ts`: implement the runtime state root resolver, SQLite database path contract, schema definitions, schema-version handling, migration/bootstrap flow, maintenance metadata, and redaction/retention baseline metadata.
- `/role-model-router/packages/sqlite-memory/src/cli.ts`: add a local validation path that loads sample provider accounts, initializes or migrates SQLite, emits diagnostics, and fails loudly on schema/account errors.
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`: add tests that prove schema creation, migration receipts, account persistence boundaries, store-location resolution, and maintenance-policy metadata.
- `/testdata/router-runtime/provider-accounts.json`: add a pinned sample provider-account configuration fixture that exercises multiple auth modes and explicit credential references without storing raw secrets.
- `/package.json`: add one narrow root script for the local account/SQLite validation path so Phase 4 can exercise run-06 behavior directly.

## Implementation Steps

1. Add a dedicated router-owned package at `role-model-router/packages/provider-account` rather than extending catalog or provider-detector packages ad hoc, because run 06 must make provider accounts, tenancy, credential references, and auth modes first-class runtime concepts before endpoint instantiation begins.
2. Model provider-account records in `provider-account/src/index.ts` with fields aligned to the roadmap and architecture lock, including:
   - `providerAccountId`,
   - `providerId`,
   - `providerKind`,
   - `orgScope`,
   - `accountScope`,
   - `credentialRef`,
   - `authMode`,
   - `regionPolicy`,
   - `baseUrlOverride`,
   - `allowedModels`,
   - `deniedModels`,
   - `entitlementTags`,
   - `budgetPolicyRef`,
   - `quotaPolicyRef`,
   - `status`,
   - `healthStatus`,
   - `rotationState`.
   Validation must confirm that `providerId`/`providerKind` compose cleanly with the normalized catalog from run 05 without moving secrets or concrete endpoint state into the catalog layer.
3. Define explicit credential-reference and auth-mode abstractions instead of assuming API-key-only auth. The supported auth-mode vocabulary should cover, at minimum:
   - static API key,
   - rotating API key by secret reference,
   - OAuth2 client credentials,
   - OAuth2 device or user-grant,
   - Azure Entra-backed token acquisition,
   - Google service-account/workload identity,
   - AWS SigV4 request signing,
   - brokered session/token exchange.
   `credentialRef` values must refer to secret-provider backends such as environment lookup, local OS/keychain-backed storage, local encrypted-file storage, or managed/cloud secret storage without ever storing raw secret material in fixtures or durable runtime artifacts.
4. Add a sample provider-account fixture under `testdata/router-runtime/provider-accounts.json` that exercises multiple auth modes and health states with secret references only. This fixture becomes the stable local validation input for run 06 and a durable handoff input for run 07.
5. Add a dedicated router-owned package at `role-model-router/packages/sqlite-memory` rather than forcing the earlier generic `@role-model/store-contract` boundary to represent the whole runtime schema. The package should use the Node 24 built-in `node:sqlite` module for same-host local SQLite initialization so run 06 stays dependency-light while still implementing a real SQLite path. The known experimental warning should be surfaced explicitly in validation logs rather than suppressed.
6. Implement the SQLite memory contract in `sqlite-memory/src/index.ts` with:
   - a runtime state root resolver that keeps the database outside the git repository,
   - a default path contract equivalent to `<runtime-state-root>/<workspace-or-env>/memory/memory.sqlite`,
   - SQLite WAL-mode initialization,
   - schema-version detection and migration receipts,
   - maintenance metadata for retention markers, compaction checkpoints, and integrity/version state,
   - governance metadata for redaction level, retention class, backup policy, and deletion/export eligibility.
7. Keep the schema explicit rather than collapsing runtime state into one opaque blob. The initial schema should include tables equivalent to:
   - `provider_accounts`,
   - `provider_account_diagnostics`,
   - `sessions`,
   - `conversations`,
   - `conversation_turns`,
   - `context_artifacts`,
   - `artifact_links`,
   - `routing_handoffs`,
   - `retrieval_receipts`,
   - `memory_maintenance`,
   - `schema_version`,
   - `migration_receipts`.
   Run 06 owns the schema and persistence contract for these responsibilities; run 07 will add the higher-level endpoint-registry, session/conversation identity, context-envelope, and retrieval behavior on top of this schema instead of redesigning it.
8. Implement `sqlite-memory/src/cli.ts` so one local validation command:
   - loads the pinned provider-account fixture,
   - validates it against run-05 catalog data and the supported auth-mode/credential-reference rules,
   - creates or migrates a SQLite database in a temp or explicit runtime-state root,
   - emits deterministic diagnostics for schema version, applied migrations, maintenance defaults, and validated account summary,
   - fails loudly on invalid account configuration, invalid schema shape, migration drift, or SQLite initialization errors.
9. Add tests first in `provider-account/test/index.test.ts` and `sqlite-memory/test/index.test.ts` before production code changes, then implement to make them pass. The tests should prove:
   - provider-account records validate against catalog provider metadata,
   - supported auth modes and credential-reference backends are modeled explicitly,
   - provider-account diagnostics reflect health/status/rotation conditions without exposing secrets,
   - SQLite initialization creates the expected tables and schema-version row,
   - re-running initialization is idempotent and produces stable migration receipts,
   - retention/redaction/backup/deletion defaults are recorded as explicit metadata rather than implicit comments,
   - the local validation path fails loudly on broken account or migration input.
10. Add a narrow root script in `/package.json` for the run-06 local validation path and use it during Phase 4 alongside:
    - direct package build/test commands for `provider-account` and `sqlite-memory`,
    - the inherited broader baseline command chain (`schemas:validate`, `build`, `test`, `smoke`).
    Record the inherited schema-tools/Biome failure accurately as shared baseline state unless run-06 introduces a distinct new regression.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/provider-account test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
- Direct run-06 validation path:
  - `corepack pnpm run runtime:validate-state`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/provider-account build`
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`
- Regression checks:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\06-router-runtime-provider-accounts-sqlite-memory --run-id 06-router-runtime-provider-accounts-sqlite-memory`
  - `git diff --name-only 484880cd8766fc81b20b0b5abfcc1a588521bbe6`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 06 adds runtime-owned account and SQLite-memory packages plus a CLI-driven validation path only; it introduces no browser UI surface.

## Manual QA Scenarios

1. **Provider-account fixture sanity check**
   - Steps:
     - inspect `testdata/router-runtime/provider-accounts.json`
     - inspect `role-model-router/packages/provider-account/src/index.ts`
   - Expected:
     - sample accounts use explicit auth modes and secret references only
     - no raw secret material appears in tracked fixtures or package data

2. **Catalog/account boundary sanity check**
   - Steps:
     - inspect `role-model-router/packages/catalog/src/index.ts`
     - inspect `role-model-router/packages/provider-account/src/index.ts`
   - Expected:
     - catalog still owns provider metadata enrichment only
     - provider-account now owns runtime account, tenancy, and credential-reference semantics without mutating catalog artifacts

3. **SQLite schema and maintenance sanity check**
   - Steps:
     - inspect `role-model-router/packages/sqlite-memory/src/index.ts`
     - run `corepack pnpm run runtime:validate-state`
   - Expected:
     - initialization reports the runtime-state path, schema version, migration receipt, and explicit maintenance/governance defaults
     - SQLite is initialized in WAL mode and outside the git repository

4. **Scope-boundary sanity check**
   - Steps:
     - inspect the final run diff
     - compare against run `07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
   - Expected:
     - no endpoint-registry, conversation identity, context-envelope assembly, or retrieval-logic implementation is added in run 06
     - run 06 stops at provider-account state plus SQLite schema/store contract

## Idempotence and Recovery

- Re-running `corepack pnpm run runtime:validate-state` is safe and should deterministically validate the sample accounts plus initialize or migrate the same SQLite schema without duplicating migration receipts.
- Re-running the package tests is safe and should remain green once account validation and SQLite initialization behavior are implemented.
- If the diff grows into endpoint-registry, session/conversation identity behavior, context-envelope assembly, retrieval logic, or routing code, stop and trim the widening before closing Phase 3.
- If `node:sqlite` emits its expected experimental warning during validation, record it explicitly but do not treat it as a reason to add silent fallbacks or suppress diagnostics.
- If the inherited schema-tools/Biome failure still appears in root `build` or `test`, record it accurately as unchanged broader baseline state unless run 06 introduces a distinct new failure.

## Implementation Sub-phases

### SP1. Provider-account model and validation

Scope and purpose:
Create the router-owned provider-account package, auth-mode vocabulary, credential-reference abstraction, and sample validated account fixture.

Requirement mapping: `R1`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/provider-account/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/provider-accounts.json`
- [ ] Add tests that describe the desired provider-account and auth/credential behavior before implementing production code
- [ ] Implement deterministic provider-account validation, secret-reference abstractions, and health/status/rotation diagnostics in `src/index.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/provider-account test`
- `corepack pnpm --filter @role-model-router/provider-account build`

Sub-phase acceptance:
- The repo can load the pinned provider-account fixture, validate it against the run-05 catalog output, and produce deterministic account records plus diagnostics without exposing secret values.

### SP2. SQLite schema, migration, and governance baseline

Scope and purpose:
Create the router-owned SQLite-memory package and define the first explicit runtime schema/store contract for same-host local state.

Requirement mapping: `R2`, `R3`

Implementation checklist:
- [ ] Add `role-model-router/packages/sqlite-memory/` with workspace package metadata and TypeScript config
- [ ] Add tests that describe schema creation, migration receipts, store-location resolution, and maintenance metadata before implementing production code
- [ ] Implement the SQLite path resolver, schema definitions, WAL-mode initialization, schema-version handling, and maintenance/governance metadata in `src/index.ts`
- [ ] Keep the schema explicit enough for later session/conversation/context work without implementing run-07 retrieval logic yet

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/sqlite-memory test`
- `corepack pnpm --filter @role-model-router/sqlite-memory build`

Sub-phase acceptance:
- The repo can initialize or migrate a SQLite runtime-state database outside the git repository and emit explicit schema-version plus maintenance metadata with no silent fallback behavior.

### SP3. Local validation path and run-local diagnostics

Scope and purpose:
Make the new provider-account and SQLite-memory contracts runnable and inspectable through one local validation command that produces explicit diagnostics for Phase 4 and manual QA.

Requirement mapping: `R1`, `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/sqlite-memory/src/cli.ts`
- [ ] Add `/package.json` script `runtime:validate-state`
- [ ] Make the CLI load sample provider accounts, initialize/migrate SQLite, and emit deterministic diagnostics
- [ ] Keep the diff limited to the two new packages, the sample fixture, the root validation script, and recursive artifacts

Tests for this sub-phase:
- `corepack pnpm run runtime:validate-state`
- `git diff --name-only 484880cd8766fc81b20b0b5abfcc1a588521bbe6`

Sub-phase acceptance:
- The run has one deterministic local validation path that proves account configuration plus SQLite initialization/migration without widening into endpoint registry or routing execution.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/03-implementation-summary.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/04-test-summary.md`
- `/.recursive/run/04-router-runtime-architecture-lock/03-implementation-summary.md`
- `/.recursive/run/04-router-runtime-architecture-lock/04-test-summary.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 2 is an ExecPlan synthesis artifact that must stay tightly aligned to the locked Phase 1 findings, the run-06 roadmap slice, the package-layout evidence, and the exact intended no-widening write surface before strict TDD starts.`
Delegation Override Reason: `A delegated planning pass would add overhead without improving fidelity because the controller already holds the locked Phase 1 inventory, the roadmap slice, the two-package user decision, and the exact intended validation/hand-off boundary for Phase 3.`
Audit Inputs Provided:
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Changed files:
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md`
- Targeted code references:
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/packages/store-contract/src/index.ts`
  - `/role-model-router/packages/catalog/package.json`
  - `/role-model-router/packages/catalog/tsconfig.json`
  - `/docs/architecture/05-memory-model.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`

## Effective Inputs Re-read

- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`

## Earlier Phase Reconciliation

- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`:
  - the current repo baseline has catalog metadata enrichment, provider endpoint stubs, and an unused generic store contract, but no provider-account or SQLite-memory implementation package
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`:
  - the selected in-repo worktree and inherited broader-baseline validation caveat remain the execution context for later phases
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`:
  - Phase 3 must add provider-account records, auth/credential abstractions, the SQLite schema/store contract, governance defaults, and a local validation path without widening into endpoint-registry or routing implementation

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md`
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/packages/store-contract/src/index.ts`
  - `/role-model-router/packages/catalog/package.json`
  - `/role-model-router/packages/catalog/tsconfig.json`
  - `/docs/architecture/05-memory-model.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/00-requirements.md`
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `484880cd8766fc81b20b0b5abfcc1a588521bbe6`
- Comparison reference: `working-tree`
- Normalized baseline: `484880cd8766fc81b20b0b5abfcc1a588521bbe6`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 484880cd8766fc81b20b0b5abfcc1a588521bbe6`
- Diff basis used: `git diff --name-only 484880cd8766fc81b20b0b5abfcc1a588521bbe6`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/06-router-runtime-provider-accounts-sqlite-memory`
- Planned or claimed changed files:
  - `.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md`
  - `package.json`
  - `testdata/router-runtime/provider-accounts.json`
  - `role-model-router/packages/provider-account/package.json`
  - `role-model-router/packages/provider-account/tsconfig.json`
  - `role-model-router/packages/provider-account/src/index.ts`
  - `role-model-router/packages/provider-account/test/index.test.ts`
  - `role-model-router/packages/sqlite-memory/package.json`
  - `role-model-router/packages/sqlite-memory/tsconfig.json`
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - `role-model-router/packages/sqlite-memory/src/cli.ts`
  - `role-model-router/packages/sqlite-memory/test/index.test.ts`
- Actual changed files reviewed:
  - `.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
  - `.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`
  - `.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`
  - `.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md`
- Unexplained drift:
  - none; the current working diff is still limited to run-06 recursive artifacts before product implementation begins

## Gaps Found

- none; the implementation plan is concrete enough to start strict TDD without widening the run.

## Repair Work Performed

- Chose two explicit router-owned packages (`provider-account` and `sqlite-memory`) so account semantics and persistence contract stay composable without collapsing into one opaque runtime-state module.
- Chose a pinned provider-account fixture plus one local validation command so Phase 4 can exercise account configuration and SQLite initialization deterministically.
- Chose to use the Node 24 built-in `node:sqlite` module for the first same-host SQLite path rather than introducing a new external dependency in this run; the known experimental warning will be treated as explicit validation output instead of hidden behavior.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines a provider-account package, supported auth-mode vocabulary, secret-reference abstraction, and validation fixture, but those runtime account surfaces do not exist yet. | Blocking Evidence: `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md` | Audit Note: Phase 3 will add provider-account records plus deterministic validation without widening into endpoint instantiation.
- R2 | Status: blocked | Rationale: the plan now defines the SQLite store path, schema tables, schema-version contract, and migration/bootstrap flow, but the router-owned SQLite-memory package does not exist yet. | Blocking Evidence: `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md` | Audit Note: Phase 3 will add the first same-host SQLite schema/store contract without implementing run-07 retrieval logic.
- R3 | Status: blocked | Rationale: the plan now defines maintenance and governance metadata for retention, redaction, backup, and deletion, but those persistence and policy surfaces are not implemented yet. | Blocking Evidence: `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md` | Audit Note: Phase 3 will keep governance defaults explicit in code and diagnostics rather than leaving them only in architecture prose.
- R4 | Status: blocked | Rationale: the plan now defines a deterministic local validation command and the broader regression chain, but the validation path has not been implemented or exercised yet. | Blocking Evidence: `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`, `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md` | Audit Note: Phase 4 will run `runtime:validate-state` plus the inherited broader baseline chain and will distinguish unchanged schema-tools failures from new run-06 regressions.

## Audit Verdict

- Audit summary: the plan is concrete enough to implement explicit provider-account semantics, the first router-owned SQLite schema/store contract, and one local validation path while keeping run 06 out of endpoint-registry, context-envelope, and routing work.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> provider-account scope is planned in `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R2` -> SQLite schema/store contract scope is planned in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, and `## Requirement Completion Status`.
- `R3` -> retention/redaction/backup/deletion and maintenance semantics are planned in `## Implementation Steps`, `## Manual QA Scenarios`, `## Idempotence and Recovery`, and `## Requirement Completion Status`.
- `R4` -> local validation and inherited-baseline handling are planned in `## Testing Strategy`, `## Manual QA Scenarios`, `## Idempotence and Recovery`, and `## Requirement Completion Status`.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-worktree.md`
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/01-as-is.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Requirement coverage check:
  - `R1`-`R4`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Implementation Sub-phases`, `## Requirement Completion Status`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS3`: preserved; the planned write scope stops at provider-account/runtime-memory packages, a sample fixture, and a local validation path, with no endpoint-registry, routing, host-integration, or raw-secret storage behavior

Coverage: PASS

## Approval Gate

- [x] The implementation plan is specific enough to start strict TDD
- [x] No unresolved planning ambiguity remains about package boundaries, fixture inputs, or validation commands

Approval: PASS
