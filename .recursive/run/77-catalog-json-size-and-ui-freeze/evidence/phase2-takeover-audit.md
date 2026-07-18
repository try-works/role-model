# Run 77 Phase 2 Takeover Audit

Date: `2026-07-18`
Auditor: primary Codex controller (self-audit)
Worktree: `D:/DEV/role-model/.worktrees/77-catalog-json-size-and-ui-freeze`
Branch: `recursive/77-catalog-json-size-and-ui-freeze`
Normalized baseline: `7094a252b7cab222f5ff12d1753e77cef83d6a22`
Comparison: `working-tree`

## Audit Scope

This audit was requested after another agent reportedly began implementing Run 77. It checks:

- recursive phase and lock integrity
- effective requirements, root-cause artifacts, and Phase 2 addenda
- the complete normalized worktree diff
- current production code at every planned change surface
- existing test coverage and baseline results
- TDD readiness, browser/performance verification, packaging coverage, and recovery sequencing

No production code was changed during this audit.

## Executive Verdict

`FAIL` — Run 77 is not in Phase 3 and has no implementation to accept.

The legal active phase is Phase 2. `02-to-be-plan.md` and its addendum are DRAFT, lint fails, no `03-implementation-summary.md` exists, no RED/GREEN evidence exists, and the normalized diff contains no product or test files. The prior agent's Phase 2 plan claims `Audit: PASS`, `Coverage: PASS`, and readiness for Phase 3 despite multiple mechanical and technical blockers.

The worktree can be recovered safely because no production implementation needs to be reverted. Recovery must begin by repairing and locking the effective Phase 2 plan.

## Mechanical Findings

### `P0-1` — Phase 2 is the active phase; implementation was never legally started

Evidence:

- `recursive-status.py` reports Phase 2 `DRAFT`, Phase 3 `PENDING`, and `03-implementation-summary.md` missing.
- `git diff --name-status 7094a252b7cab222f5ff12d1753e77cef83d6a22` reports only the run-local requirements artifact.
- `git ls-files --others --exclude-standard` reports run artifacts/receipts only; there are no untracked product or test files.
- No staged product/test diff exists.

Impact:

- No prior implementation claim can be accepted.
- Phase 3 must not begin until the Phase 2 base artifact and every Phase-2 addendum are lock-valid.

### `P0-2` — Phase 2 lint fails while the artifact claims a passing audit

Current lint failures:

1. addendum missing from `Inputs`
2. addendum missing from `## Effective Inputs Re-read`
3. addendum missing from `## Earlier Phase Reconciliation`
4. `R10` missing from `## Requirement Mapping`
5. `R10` has no concrete implementation surface

Contradictory artifact claims:

- `## Gaps Found`: `None`
- `Audit: PASS`
- `Coverage: PASS`
- `Approval: PASS`
- TODO item `Lock the phase` is checked even though `Status: DRAFT`

Impact:

- The Phase 2 audit loop was not actually completed.
- All gates must return to FAIL until the plan is repaired and re-audited.

### `P0-3` — Locked analysis artifacts referenced missing worktree evidence

Before takeover, the worktree did not contain:

- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/requirements-investigation.md`

Yet the locked requirements, AS-IS, and root-cause artifacts cite it as primary evidence. The canonical controller copy existed at:

- `D:/DEV/role-model/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/requirements-investigation.md`
- SHA-256: `009BE0913EE843912150B9751FFDBF781907D3C58E25D7621E4A57AEF9BBFEB1`

Repair during audit:

- copied the controller evidence into the run worktree without modifying any locked artifact
- the copied file must retain the same SHA-256 before Phase 2 locks

### `P0-4` — R1's required pre-Phase-2 failing regressions were not created

Locked `00-requirements.md` R1 requires failing automated regressions before Phase 2. Locked `01.5-root-cause.md` instead marks R1 blocked because RED tests were deferred to Phase 3. Phase 2 repeats that deferral.

Impact:

- Locked upstream history contains an unresolved process gap.
- Because Phase 2 is already active and planning phases must not contain implementation/test diffs, the current phase must record an upstream-gap addendum and require the first legal Phase 3 action to capture strict RED evidence before any production edit.

## Technical Plan Findings

### `P0-5` — Proposed RED tests assert broken behavior and would pass before implementation

Invalid examples in the draft plan:

- “assert `listRecentRuntimeObservations` calls `JSON.parse`”
- “assert mutation handlers await `fetchRuntimeRequests`”
- “assert benchmark startup uses single `Promise.all`”
- “assert `normalized-catalog.json` is > 5MB”

These assert current defects rather than desired outcomes. Passing them on the baseline would violate strict TDD and provide no RED proof.

Required correction:

- write desired-behavior tests that fail on the current baseline for projection-only SQL, route-source ownership, mutation completion, progressive rendering, compact decoding, stream termination, and selected-target telemetry
- capture exact failing output under `evidence/logs/red/`
- only then edit production code

### `P1-1` — The plan contradicts R2/R3 by retaining rich-history route refreshes

R2 says no production route bootstrap or mutation path calls `fetchRuntimeRequests()`. The draft plan proposes renaming the mutation refresh and making it fire-and-forget. That still calls the forbidden rich-history endpoint and can still consume server work.

Current production calls exist at:

- `control-models.tsx:434` — route bootstrap
- `control-models.tsx:580` — mutation refresh

Required correction:

- remove rich request history from automatic route bootstrap and mutation completion
- preserve already loaded evidence through mutation
- if retained as a consumer, expose it only through an explicit bounded operator action or replace it with a projection-specific contract
- strengthen the route-source regression to scan every registered production route for both `fetchRuntimeSnapshot()` and `fetchRuntimeRequests()` calls

### `P1-2` — Models convergence plan refetches unchanged/advisory surfaces

The draft proposes reusing `loadConfiguredModelsInitialData()`, which always fetches accounts, endpoints, models, controller, role policy, and full router candidates. This violates R3/R8.

Required correction:

- Save bindings: use the returned account record or one targeted account reread; do not reread role policy, candidates, or request history
- Eject: use the structured receipt plus only the canonical surfaces not present in the receipt (accounts/endpoints/models/controller as proven necessary)
- preserve the rendered inventory during convergence
- refresh candidates independently after interactivity without gating mutation success

### `P1-3` — Benchmark plan omits the bounded endpoint projection required by R4/R5

The draft changes React sequencing but continues calling the approximately 1.97 MB full router-candidates endpoint. R4 defines a bounded runnable-endpoint identity projection as the maximum essential endpoint set.

Required correction:

- define a concrete compact benchmark-startup endpoint/API contract or prove an existing bounded contract supplies the required identity/capability fields
- render the route shell synchronously
- load suite, preferences, and bounded endpoint identities independently
- keep summary, summaries-by-mode, history, runtime summary, profiles, and rich candidates advisory
- prevent duplicate candidate construction through summary fallback

### `P1-4` — No Playwright plan despite explicit browser acceptance criteria

The draft says Playwright is not applicable. R3 and R4 explicitly require browser regressions that hold `/api/role-model/requests` and `/api/role-model/router/candidates` open while proving mutation completion, route navigation, and health responsiveness.

Required correction:

- add a Run-77 Playwright spec under the established runtime-ui `e2e/` tree
- use `@recursive:77-catalog-json-size-and-ui-freeze` and per-sub-phase tags
- define deterministic delayed/hung endpoint fixtures through the existing QA server seam
- specify Tier A and Tier B commands and evidence locations

### `P1-5` — R5 optimizes but preserves the N+1 profile architecture

Current `readEndpointProfileData()` performs one general profile read, three difficulty profile reads, a complete sample-history read, and an advisory recommendation read per endpoint. `buildBenchmarkCapabilityByEndpointId()` invokes it once per registry endpoint.

The repository already exposes `readLatestObservedProfilesByEndpointIds()`, but the draft ignores it and proposes only indexes plus a sample limit.

Required correction:

- batch latest general and difficulty profile reads across endpoint IDs
- do not load sample history during candidate capability construction
- retain bounded recent samples only for explicit endpoint-profile/detail reads
- add matching indexes for both single-endpoint and batched query shapes
- verify database setup/open count and query count scale as a bounded constant or small fixed multiple, not per endpoint

### `P1-6` — Catalog compaction plan would break direct JSON consumers

The draft changes the tracked `normalized-catalog.json` representation but only plans edits in `packages/catalog/src/index.ts` and catalog tests. Direct consumers parse the tracked file as the hydrated catalog in:

- sqlite-memory CLI/tests
- provider-account tests
- protocol-routing CLI/tests
- endpoint-registry CLI
- adapter-execution CLI
- runtime-host startup and overlap tests
- token-economics tests
- packaging/SEA copy paths

Required correction:

- define a versioned compact wire schema
- expose one canonical decode/hydrate loader
- migrate every direct consumer to that boundary or preserve a separate hydrated runtime artifact with explicit packaging ownership
- update export CLI, tracked-artifact parity, token economics, routing, account, registry, host, and packaging tests
- prove the pinned source revision does not drift

### `P1-7` — New stream-failure addendum is entirely absent from the plan

The effective plan must include addendum requirements `A1-A5` and sub-phases for:

- commit-aware chat-completions and Responses error handling
- deterministic committed-stream termination
- selected-target/partial-usage telemetry preservation
- Kimi K3 chat-completions success and first-chunk-then-error coverage
- `/proc/1513/fd/63` as a pre-execution negative control only

Current code confirms the unsafe route-local catches at:

- `runtime-host-bridge/src/index.ts:13796-13806`
- `runtime-host-bridge/src/index.ts:13930-13940`

The outer `writeUnhandledBridgeError()` guard does not protect errors consumed by those inner catches.

### `P1-8` — Existing stream test covers only the outer guard, not the incident path

`runtime-host-bridge/test/index.test.ts:7708-7731` verifies `writeUnhandledBridgeError()` does not write after commit. It does not execute a real streaming route where one chunk commits and `executeChatCompletions` or `executeResponses` then rejects.

Required correction:

- add real server/client regressions for both ingress surfaces
- assert no second headers/JSON response, bounded client termination, and no hanging body reader
- retain normal success and client-disconnect controls

### `P1-9` — Performance budgets have no executable harness

The requirements specify p95/sample-count budgets for request summaries, concurrent health, mutation completion, benchmark navigation, candidate response time, payload bytes, and scaling. The draft lists assertions but no fixture generator, measurement script, warmup policy, exact commands, or evidence paths.

Required correction:

- define deterministic representative SQLite fixtures with row count and blob-size distribution
- define 30-sample request/health and 20-navigation browser loops
- capture raw samples and computed p50/p95/max under `evidence/perf/`
- distinguish unit query-plan proof from rebuilt-runtime performance proof

### `P1-10` — R10 is vague and mechanically invalid

The draft maps R10 to “all affected packages” and “all suites + validators,” which is neither a concrete path nor a reproducible verification surface. It also omits the clean staging directory/stale asset proof and affected provider-account/endpoint-registry/packaging tests.

Required correction:

- enumerate every implementation and verification path
- name exact package commands and validators
- define clean staging/release bundle inspection
- define rebuilt-runtime development parity and final large-database query-plan evidence

### `P1-11` — Sub-phases do not satisfy recursive-mode structure

The five one-line sub-phases lack:

- implementation checklists
- exact per-sub-phase test commands
- observable acceptance criteria
- rollback/recovery notes
- Playwright Tier A/B commands
- addendum sub-phases `SP-E` through `SP-G`

Required correction:

- rewrite Phase 2 as ordered, independently green sub-phases with strict stop gates

### `P2-1` — Audit capability metadata is inaccurate

The plan records subagents as unavailable and the capability probe as N/A. The current environment exposes subagent capability, but repository execution policy for this task does not authorize spawning additional agents. A truthful self-audit record must state capability availability and the concrete policy-based override reason.

## Baseline Verification Results

Commands were executed from the real worktree path before production edits:

1. `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
   - PASS: `1` file, `40` tests, `14.40s`
2. `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/control-models.test.ts app/routes/startup-bootstrap-regression.test.ts`
   - PASS: `2` files, `27` tests, `2.43s`
3. `corepack pnpm --filter @role-model-router/catalog exec vitest run test/index.test.ts`
   - PASS: `1` file, `13` tests, `3.84s`
4. `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
   - PASS: `1` file, `202` tests, `101.64s`

Interpretation:

- the checked-in baseline is green on the owning suites
- none of those existing tests cover the required Run-77 repaired behaviors
- the 100-second monolithic host test is unsuitable as the only inner RED/GREEN loop; new focused test selection must be available

## Recovery Order

1. Restore the missing investigation evidence in the worktree and verify its hash.
2. Create a Phase-2 upstream-gap addendum for the missing pre-Phase-2 RED evidence and the newly audited planning defects.
3. Rewrite `02-to-be-plan.md` to consume both addenda, map `R1-R10` and `A1-A5`, define concrete files/contracts, and provide valid TDD/Playwright/performance/packaging commands.
4. Run lint and self-audit; repair until clean.
5. Lock both Phase-2 addenda and the Phase-2 plan using the canonical lock tool.
6. Begin Phase 3 with strict RED evidence only; do not edit production code before each owning regression fails for the intended reason.
7. Add Phase 3.5 because the final scope spans SQLite, UI, runtime streaming, telemetry, catalog wire format, and packaging.

## Audit Gate

Audit: FAIL

The takeover audit is complete, but the current Phase 2 artifact is not ready to lock until the recovery order above is executed.
