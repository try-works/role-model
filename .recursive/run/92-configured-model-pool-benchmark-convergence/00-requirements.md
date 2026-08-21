Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-08-21T08:41:41Z`
LockHash: `fbe4abc4ed111ba799a04861f8e6fb9e45baf6f52a164426060ac40389a3b0e6`
Workflow version: `recursive-mode-audit-v2`
User approval: `2026-08-21` (approved creation of the next dev-targeted run)
Inputs:
- user-reported stage-RC observations and screenshots on `2026-08-21`
- `/.recursive/RECURSIVE.md`, `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, and `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-router.md`
- `/.recursive/memory/training/{requirements-scoping,frontend-implementation}.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
- `role-model-router/apps/runtime-host-bridge/**`
- `role-model-router/apps/runtime-ui/app/routes/{dashboard,control-models,control-benchmark,router-candidates,router-decisions}.tsx`
- `role-model-router/apps/runtime-ui/app/lib/{runtime-api,view-models,candidate-space,benchmark-model-cards}.ts`
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
Scope note: Repair configured-model-pool and benchmark-result convergence as one authority chain on a feature branch targeting `dev`. The existing stage release candidate is an immutable comparison baseline; this run must not mutate `stage` or `main`.

## TODO

- [x] Re-read control-plane docs, relevant memory, prior membership/benchmark runs, and affected code/test surfaces
- [x] Define one scope spanning configured membership, benchmark persistence, derived routing profiles, and consumer views
- [x] Define explicit last-controller eject semantics rather than accepting a silent UI failure
- [x] Require truthful production states instead of fixture or mock fallback rows
- [x] Require score propagation after a completed benchmark and deterministic legacy reconciliation
- [x] Require strict TDD, integration coverage, and rebuilt-runtime verification
- [x] Capture dev-only delivery, stage-RC comparison, extensibility, and out-of-scope boundaries
- [x] Record user approval for run creation
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `cross-surface lifecycle and derived-state convergence bugfix`
- Delivery target: `dev` through a reviewed feature-branch pull request
- Primary subsystems: `role-model-router/apps/runtime-host-bridge/**`, `role-model-router/apps/runtime-ui/**`, benchmark persistence, profile derivation, and runtime-config reconciliation
- User-visible outcome: the configured model pool, benchmark selection/results, overview candidate space, Models inventory, Router candidates, and routing decisions show the same real endpoint variants and current benchmark facts; ejecting the last controller-backed model produces an explicit durable empty-pool state.

## Problem Summary

The current stage candidate exposes configuration and benchmark state through several derived views that can diverge. The benchmark page can show rows that appear fixture-like or no longer match the configured pool. The overview model-pool candidate space can retain pre-benchmark values after a benchmark completes. The Models inventory and benchmark selection may not agree on the same variant endpoints. Finally, ejecting the final configured controller-backed model is not expressed as a clear lifecycle operation in the UI, leaving the operator unable to distinguish a protected controller, a failed request, and a durable empty-pool result.

This is not a set of page-local rendering fixes. It is a convergence failure between authoritative configured membership, benchmark-result ownership, derived candidate/routing profiles, cache invalidation, and UI consumption.

## Fixed Decisions

1. A configured remote endpoint variant is the unit of membership, benchmarking, profiling, routing, and display. A base model family is not a substitute for a configured variant.
2. The backend owns one authoritative read model combining configured membership and the latest valid benchmark profile for each configured endpoint. UI pages must not separately synthesize, seed, or retain competing pools.
3. Production responses and production UI must not invent fixture, preview, placeholder-score, or mock candidate rows. Honest empty, loading, unavailable, and stale states are required instead.
4. A completed benchmark updates an endpoint-bound result/profile revision atomically enough that all subsequent canonical reads converge. Failed, cancelled, stale, or endpoint-mismatched runs must not overwrite the latest valid profile.
5. Ejecting the only configured controller-backed endpoint is allowed only through explicit destructive confirmation. It clears controller assignment, leaves a durable empty configured pool, and exposes a precise no-eligible-endpoint state until the operator adds a model or selects a controller.
6. Normalized internal/routing values use `0.00–1.00`; user-facing percent metrics use `0–100%`. A missing score is never represented as `0` or `0%`.
7. `stage` and `main` remain promotion branches. Run 92 starts from and targets `dev`; the stage candidate is comparison evidence only.
8. Phase 3 uses strict TDD. Phase 5 uses agent-operated rebuilt-runtime QA, with browser evidence and live runtime API verification.

## Requirements

### `R1` Establish one canonical configured-pool projection

Description:
The runtime must expose one backend-owned, endpoint-variant-aware projection for configured model membership and its current derived facts. Every page and routing consumer in scope must obtain membership from that projection or a documented derivative of it.

Acceptance criteria:

- Phase 2 documents authoritative membership, benchmark results, derived profiles, cache/invalidation boundaries, and every read consumer in scope.
- Each configured endpoint variant has a stable canonical identity and is not collapsed into its base model family.
- Canonical reads return only configured endpoints; historical endpoint rows, disconnected accounts, stale benchmark artifacts, and catalog entries alone cannot appear as pool members.
- Overview, Models, Benchmark, Router Candidates, Router Controller/Strategy, and routing-decision detail consume the same membership revision or a documented monotonic derivative.
- The contract is provider and endpoint generic.

### `R2` Remove fixture and mock data from production model-pool and benchmark paths

Description:
Production state must be truthful. Test fixtures remain allowed only in test modules or explicitly test-only factories, never as runtime or UI fallbacks.

Acceptance criteria:

- An empty configured pool produces an explicit production empty state on Overview, Models, Benchmark, and Router pages, with no fabricated candidate, score, or benchmark-history row.
- Loading, failed, stale, and unavailable states are distinguishable from zero score and from configured-but-unbenchmarked.
- Production data loaders and host APIs do not silently fall back to fixture/mock model, benchmark, candidate-space, or score data.
- Static and behavioral regressions prove test fixtures cannot be imported or selected by shipped production paths.

### `R3` Make benchmark selection and persistence endpoint-variant exact

Description:
Starting a benchmark must select only canonical configured endpoint variants, and each result must be persisted and attributed to the exact endpoint variant that executed it.

Acceptance criteria:

- Benchmark selection shows precisely the current configured pool, including enabled effort variants, without duplicates or missing variants.
- A benchmark request records selected endpoint identities and membership revision; unconfigured, stale, or duplicate endpoint requests are refused before execution.
- A completed result is bound to endpoint identity, benchmark suite/version identity, timestamps, and profile revision; a result for one variant cannot update a sibling or the base family.
- Re-running follows a documented replacement/history policy and never merges incompatible endpoint or suite evidence into an indistinguishable score.
- API and persistence tests cover base models, sibling variants, removed endpoints, stale completion, cancellation/failure, and restart rehydration.

### `R4` Propagate completed benchmark profiles through every derived consumer

Description:
After a valid benchmark completes, the endpoint-bound profile must be visible through the canonical pool and relevant downstream products without manual restart or stale synthetic values.

Acceptance criteria:

- Completion invalidates or advances all required derived profile/candidate caches exactly once and exposes a revision/receipt for diagnostics.
- Overview Model Pool, Models inventory/detail, Benchmark score/history, Router Candidates, Router Controller/Strategy, and routing-decision detail converge to the same latest profile.
- Candidate-space quality, cost, speed, route score, coverage, and benchmark labels derive from documented current data; absent evidence is labelled honestly, not defaulted.
- Routing uses current profiles under documented freshness/eligibility rules, and a routing decision identifies the profile/benchmark revision used.
- Eject, reconnect, clear, stale completion, and restart cannot leave a ghost profile or update a non-member.

### `R5` Provide explicit, durable last-controller eject behavior

Description:
The model-pool control must make an intentional final-controller eject safe and understandable while preserving existing configured-membership authority.

Acceptance criteria:

- The UI identifies a final configured controller-backed endpoint and requires destructive confirmation before ejecting it.
- Confirmation performs authoritative eject, clears controller assignment, and renders durable empty-pool/no-eligible-endpoint state with recovery action.
- Cancellation does not mutate; a blocked eject reports the actual blocking reference and never claims success.
- Repeated eject, restart, rebuild, and reconnect are idempotent and cannot resurrect the endpoint/controller.
- Behavior remains generic across providers, models, and variants; siblings remain intact.

### `R6` Define score, freshness, and reconciliation semantics

Description:
The run must make score ownership and display coherent over new benchmarks, histories, partial telemetry, and upgrades.

Acceptance criteria:

- Code and UI use one documented score vocabulary: normalized/routing values render as `0.00–1.00`; percentage values render as `0–100%`; the representations are never silently mixed.
- The latest valid endpoint-bound profile is selected deterministically from history with suite/version compatibility, completion state, and freshness rules.
- Legacy benchmark and candidate/profile records reconcile deterministically: compatible exact-identity evidence is retained; ambiguous/stale evidence is quarantined or ignored with diagnostics; no score is fabricated.
- Clearing benchmark data, membership change, and reconnect produce predictable profile/UI state.
- The policy is extensible to future suites, capability dimensions, providers, and effort variants.

### `R7` Use strict TDD and owning integration coverage

Description:
The repair must leave durable tests for the authority chain, not only screenshots or isolated happy paths.

Acceptance criteria:

- Phase 3 declares `TDD Mode: strict`, with durable RED and GREEN evidence before each owning production change.
- Host tests cover membership/profile projection, exact variant attribution, stale/cancelled completion rejection, cache/revision convergence, last-controller eject, restart, and legacy reconciliation.
- Runtime-ui tests cover truthful states, exact configured selection, latest-profile refresh, controller-eject confirmation/result, and no production fixture fallback.
- Cross-layer integration proves a benchmark changes the candidate projection and a subsequent routing decision uses the same endpoint/profile revision.
- Negative controls cover sibling variants, another account, unbenchmarked endpoints, and existing non-controller eject.

### `R8` Verify a rebuilt runtime and browser end to end before closeout

Description:
The run cannot close on source-level tests alone. It must prove the rebuilt runtime and UI use the repaired authority path.

Acceptance criteria:

- Phase 5 rebuilds from the final run branch and records executable/artifact hash, port, state root, and source commit.
- Agent-operated browser verification covers Overview Model Pool, Models, Benchmark, Router Candidates/Controller/Strategy, and a routing-decision detail for controlled endpoint variants.
- Runtime API evidence proves current pool, exact benchmark selection/result through the production benchmark API, propagated profile revision, routing decision tied to that revision, and final-controller eject/empty-pool recovery.
- QA uses a disposable isolated state root and does not alter the stage RC, user state, credentials, or benchmark history.
- The report distinguishes automated evidence from optional human visual review and records unavailable-provider conditions honestly.

## Out of Scope

- `OOS1`: provider catalog availability, pricing, or effort-variant identity semantics owned by other approved runs
- `OOS2`: inventing benchmark scores from catalog metadata, mock data, or partial telemetry
- `OOS3`: redesigning benchmark suites or capability policy unrelated to membership/profile convergence
- `OOS4`: enabling or changing cloud extensions outside profile data they already consume
- `OOS5`: promotion to `stage` or `main`, release publishing, or modification of the current stage RC
- `OOS6`: deleting a global catalog model rather than runtime configured membership

## Constraints

- Work begins from `origin/dev` in isolated branch `recursive/92-configured-model-pool-benchmark-convergence` and targets `dev` through normal review.
- Preserve Run 76 configured-membership authority; extend it rather than creating a competing pool store.
- Keep receipts, tests, and diagnostics secret-safe.
- No direct pushes to `dev`, `stage`, or `main`; do not rewrite/delete the stage RC.
- UI changes use the RM3 runtime-ui design-system authority.
- Phase 3 strict TDD and Phase 5 rebuilt-runtime verification are completion gates.

## Required Evidence

- Phase 1 membership/result/profile/consumer source-of-truth matrix and root-cause analysis
- Phase 2 endpoint identity, replacement, invalidation, eject, score-scale, and migration plan mapped to R1–R8
- RED/GREEN logs for owning host and UI slices
- API/integration logs for exact variant selection, result persistence, candidate/route convergence, and eject lifecycle
- rebuilt-runtime/browser screenshots and source/hash-bound Phase 5 receipts
- Phase 6–8 updates covering the convergence contract and memory

## Coverage Gate

- [x] R1 covers endpoint-variant-aware configured-pool authority and all identified consumers
- [x] R2 prohibits production fixture/mock fallback while preserving test-fixture isolation
- [x] R3 covers exact selection, persistence, history, stale completion, and variant attribution
- [x] R4 covers propagation, routing use, invalidation, and restart/eject convergence
- [x] R5 defines deterministic final-controller eject semantics and recovery
- [x] R6 defines score scales, latest-valid selection, and upgrade reconciliation
- [x] R7 requires strict TDD, unit, integration, and negative-control coverage
- [x] R8 requires rebuilt-runtime and browser verification
- [x] Scope, delivery branch, extensibility, and out-of-scope boundaries are explicit

Coverage: PASS

## Approval Gate

- [x] The user approved conversion into the next dev-targeted run
- [x] Scope repairs the authority chain rather than applying page-local patches
- [x] Acceptance criteria are observable and testable
- [x] The stage RC is preserved as immutable comparison baseline
- [x] Strict TDD and rebuilt-runtime QA are mandatory
- [x] No unresolved product decision prevents Phase 1 analysis

Approval: PASS
