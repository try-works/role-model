Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-17T23:41:53Z`
LockHash: `047a803d6847af511f434e3eb4f5d9df07b2cc763712c218b361024c0ce0ce8f`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- user report that `/app/models` freezes for roughly a minute after `Save bindings` or `Eject from pool`
- user report that navigating to `/app/models/benchmark` also takes roughly one minute
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/requirements-investigation.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/role-model-router/packages/catalog/src/index.ts`
Outputs:
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md`
Scope note: Eliminate the server-wide freeze affecting Models mutations and navigation to the Models benchmark route by repairing recent-request query performance, isolating route transitions from advisory work, and bounding benchmark startup reads. Separately reduce the shipped normalized catalog artifact without introducing catalog persistence.

## TODO

- [x] Reproduce the server-wide stall without mutating live runtime state
- [x] Trace `Save bindings` and `Eject from pool` through UI, HTTP, backend, SQLite, and post-mutation refresh
- [x] Reproduce benchmark navigation while the Models background history read blocks the runtime
- [x] Trace benchmark bootstrap and inspect candidate/profile query plans
- [x] Inspect the live database size, schema columns, indexes, and current request-list query plan
- [x] Separate the confirmed Models mutation freeze from unrelated providers-page findings
- [x] Define stable requirements, acceptance criteria, out-of-scope boundaries, and constraints
- [x] Complete the Coverage Gate
- [x] Obtain explicit user approval before locking the requirements

## Goal

`Save bindings` and `Eject from pool` on `/app/models` must complete without freezing the runtime or waiting on advisory request-history and router-candidate reads. Navigating to `/app/models/benchmark` must remain responsive even if Models advisory work is pending, and benchmark controls must not wait on full historical/candidate enrichment. The same run should safely reduce the tracked and packaged normalized catalog size, but catalog storage is not the cause of either freeze manifestation.

## Investigation Summary

The mutation itself is followed by a synchronous rich-history refresh that causes the minute-scale freeze:

1. both UI handlers await the canonical mutation;
2. both refetch the complete Models-page primary data, including a roughly `1.97 MB` router-candidates response;
3. both then await `GET /api/role-model/requests` before clearing `Saving…` or `Removing…`;
4. the request-list backend performs an unindexed sort over `runtime_observations`, selects `observation_json`, and synchronously parses it to recover `clientRequestId`;
5. the live database is approximately `6.90 GB`, while `client_request_id` already exists as a dedicated column;
6. the query plan reports a full scan plus a temporary B-tree sort;
7. while one read-only request-list probe ran, unrelated `/healthz` requests timed out, confirming a server event-loop stall.

A projection-only version of the query, still without the missing ordering index, completed in approximately `293-305 ms`. This proves that the large observation JSON read is the dominant minute-scale cost.

The benchmark route's own endpoints are fast when the server is idle, but a cross-route reproduction proved they queue behind the Models history read. With `GET /api/role-model/requests` active, both that call and concurrent `/healthz` received no bytes for `90` seconds. After recovery, benchmark suite returned in `4.17 seconds` and the remaining inspected benchmark reads returned in under one second. The Models cleanup flag suppresses stale React state updates but does not cancel the fetch or interrupt synchronous backend work.

Benchmark candidate enrichment has a separate scaling risk: profile and sample queries are executed repeatedly per endpoint, and the inspected query plans all report table scans plus temporary B-tree sorts. This is not the confirmed minute-scale cause on the current three-candidate inventory, but benchmark startup must not depend on unbounded full-history reads.

The normalized catalog remains `5,434,995` bytes. Simulated safe field omission reduced it to `2,709,413` bytes and reduced isolated median parse time from `32.17 ms` to `16.67 ms`. That is a useful package/startup optimization but is not the Models mutation root cause.

## Fixed Decisions

1. Mandatory Phase 1.5 must revalidate the Models mutation root cause before Phase 2.
2. Rich request history and router-candidate refresh are advisory and must not gate mutation completion.
3. Recent-request summaries must use projected SQLite columns; list operations must not read or parse `observation_json`.
4. The recent-request ordering query must have an index matching `created_at_ms DESC, request_id DESC`.
5. Benchmark route rendering and navigation must not be gated by Models request evidence or full benchmark enrichment.
6. Benchmark profile/sample access must be indexed and bounded; complete historical samples are not a startup contract.
7. Run 76 configured-membership authority, explicit-reference conflicts, atomic config replacement, rollback, indeterminate-error, and reconciliation receipts remain authoritative.
8. SQLite changes are limited to existing observation/performance query and index repairs. Catalog tables or catalog migrations are not part of this run.
9. Earlier findings about duplicate `/app/remote/providers` bootstrap, provider payload duplication, and large provider selectors are valid but are not the reported Models/benchmark freeze and are deferred from this run.
10. No current production route other than `/app/models` calls the rich request-list endpoint; stale release artifacts that still use the retired full-snapshot bootstrap must not be shipped.

## Requirements

### R1 — Lock a complete Models and benchmark-navigation root-cause analysis

Phase 1 and mandatory Phase 1.5 must reproduce and isolate each stage of the affected mutations and route transition before implementation planning.

Acceptance criteria:

- reproduce `Save bindings` and `Eject from pool` using a disposable or safely isolated runtime state
- record separate timings for mutation HTTP response, essential convergence reads, router candidates, rich request history, UI pending duration, and concurrent health checks
- reproduce navigation from Models to benchmark both with an idle server and while Models request evidence is in flight
- record the benchmark route's essential-content time, each startup endpoint time/bytes, duplicate backend work, and concurrent health behavior
- capture schemas, indexes, query plans, row counts, and payload distributions for benchmark profile/sample reads
- cover both account-managed and runtime-config-managed eject paths, plus a representative role-binding save
- verify that mutation persistence completes before the rich request-history wait begins
- capture the current `runtime_observations` schema, indexes, query plan, row count, database size, and representative observation sizes without committing live data
- confirm whether any mutation path performs vendor restart or other necessary work that remains legitimately long-running
- create failing automated regressions for the confirmed critical-path and query-plan defects before Phase 2
- revise downstream scope through an approved addendum if any current-session root-cause claim fails to reproduce

### R2 — Make recent-request summaries indexed and projection-only

`GET /api/role-model/requests` must return the existing summary shape without scanning or parsing large observation blobs.

Acceptance criteria:

- `listRecentRuntimeObservations()` selects `client_request_id` directly and does not select `observation_json`
- the list function performs no `JSON.parse` of persisted observation bundles
- an idempotent migration adds an index supporting `ORDER BY created_at_ms DESC, request_id DESC LIMIT ?`
- migration application is recorded through the existing migration-receipt mechanism
- `EXPLAIN QUERY PLAN` for the production list query uses the new ordering index and reports neither a full table scan nor a temporary B-tree sort
- null historical `client_request_id` values remain `null`; the list path does not fall back to blob parsing
- full request-detail reads continue to load `observation_json` only when an individual request is explicitly opened
- latest-ID reads retain their lightweight projection behavior
- request-list p95 is at most `100 ms` across at least `30` post-warmup samples on a representative large-observation fixture
- concurrent `/healthz` p95 remains at most `250 ms` while request-list reads execute, with no sample exceeding `1 second`
- regression tests include large out-of-row observation blobs so a future accidental blob projection is detectable
- no production route bootstrap or mutation path calls `fetchRuntimeRequests()`; the legacy summary endpoint remains available only for explicit bounded consumers until separately retired
- `fetchRuntimeSnapshot()` is either removed, made projection-specific without rich requests, or guarded as non-route infrastructure so it cannot silently restore full-ledger startup fanout
- a route-source regression scans every registered route, not only a hand-maintained P0 subset, and fails if a route imports/calls `fetchRuntimeSnapshot()` or `fetchRuntimeRequests()`
- providers continue to use request-ID-only projection, Observe/dashboard continue to use telemetry contracts, and individual request detail remains explicit drill-in

### R3 — Remove advisory reads from Models mutation completion

The UI must finish each mutation after canonical mutation truth and essential model state converge, without awaiting rich request history or the full router-candidate inventory.

Acceptance criteria:

- `Save bindings` does not call or await `fetchRuntimeRequests()` as part of mutation completion
- `Eject from pool` and peer-backed eject do not call or await `fetchRuntimeRequests()` as part of mutation completion
- mutation completion does not await the full router-candidates response unless Phase 1.5 proves a specific canonical field requires it
- mutation responses or targeted reads provide enough canonical truth to update accounts, endpoints, models, controller selection, and the selected card
- prior request evidence and router-candidate evidence remain visible as stale/advisory or refresh independently; they do not clear the loaded page
- advisory refresh failure produces a bounded warning and does not turn a successful mutation into an error
- buttons leave `Saving…` or `Removing…` within `500 ms` after the canonical mutation/convergence response settles
- end-to-end UI action p95 is at most `3 seconds` on the defined QA environment for mutation paths that do not intentionally restart an external vendor
- if a required vendor restart exceeds the budget, the runtime remains responsive and the UI shows named progress rather than an undifferentiated frozen state
- a browser regression holds `/api/role-model/requests` and `/api/role-model/router/candidates` open indefinitely and proves both mutation actions can still complete

### R4 — Make Models-to-benchmark navigation independently responsive

The benchmark route must expose its essential controls and loading states without waiting for Models request evidence, full router candidates, or complete benchmark history enrichment.

Acceptance criteria:

- navigating from `/app/models` to `/app/models/benchmark` renders the benchmark page shell and essential controls within `500 ms` on the defined QA environment
- benchmark essential data and advisory enrichment are explicitly classified in Phase 1.5
- initial rendering does not use a single `Promise.all` whose slowest advisory request gates every state update
- suite metadata, saved preferences, and a bounded runnable-endpoint identity projection form the maximum essential startup set unless Phase 1.5 proves a smaller set
- latest summary, summaries by mode, run history, runtime summary, detailed capability profiles, and full router-candidate enrichment load independently with truthful loading/error states
- leaving `/app/models` aborts its client-side advisory request when possible and prevents any stale state update; backend responsiveness does not rely on client abort succeeding
- a browser regression holds `/api/role-model/requests` open indefinitely, navigates from Models to benchmark, and proves the benchmark shell/controls render and remain usable
- the same regression proves `/healthz` and an unrelated lightweight API respond within `1 second`
- benchmark route essential-content p95 is at most `1 second`, and all initial advisory sections settle or show a bounded error within `3 seconds`, across at least `20` post-warmup navigations
- navigation must not start duplicate router-candidate construction through both the explicit candidates request and empty-summary fallback

### R5 — Index and bound benchmark profile enrichment

Benchmark startup and candidate listing must not scan and sort entire performance tables once per endpoint or return complete sample history when only aggregates/recent evidence are needed.

Acceptance criteria:

- Phase 1.5 inventories every SQLite read executed by `readEndpointProfileData()` and states which consumers require latest profile, difficulty profiles, recent samples, or aggregates
- idempotent migrations add indexes matching endpoint/difficulty filters and timestamp/sample or measured-at/snapshot ordering
- production query plans for general samples, difficulty samples, general profiles, and difficulty profiles use their matching indexes and report neither full scans nor temporary B-tree sorts
- startup reads use a documented recent-sample limit or precomputed aggregate; complete endpoint sample history remains available only through an explicit detail/export contract if still required
- router-candidate construction opens/reuses database access in a bounded way rather than repeatedly opening SQLite for every field of every endpoint
- candidate response time p95 is at most `500 ms` on the representative fixture, with linear or better scaling evidence across endpoint counts
- benchmark essential startup does not transfer the current roughly `2 MB` full candidate representation when a bounded identity/capability projection suffices
- tests include enough endpoints and historical samples to fail if per-endpoint full scans, unbounded history, or N-times repeated database setup returns

### R6 — Preserve Save bindings correctness and idempotence

The responsiveness repair must not weaken persisted model-role semantics.

Acceptance criteria:

- save persists the selected account/model assignment using the existing role assignment modes and normalization rules
- the UI reports success only after persisted account truth is confirmed by the mutation receipt or targeted reread
- repeated identical saves are idempotent and do not trigger redundant full-page refreshes
- empty explicit include, all roles, include, exclude, and custom assignments retain their current semantics
- saving one account/model does not alter sibling account membership or bindings
- validation errors leave the previous visible and persisted binding state intact
- tests distinguish mutation failure from advisory refresh failure

### R7 — Preserve Eject from pool authority, safety, and receipts

The responsiveness repair must preserve all Run 76 configured-membership convergence behavior.

Acceptance criteria:

- exact `{providerAccountId, modelId}` identity remains the eject target
- account-managed and runtime-config-managed membership follow their existing authorities
- explicit alias, controller, role, or other blocking references still return the typed conflict before mutation
- successful eject still prunes the applicable bindings, endpoints, remote activations, generated aliases, and empty account state
- atomic YAML replacement, rollback, indeterminate failure, and reconciliation receipts remain intact
- an already-absent target remains an idempotent success
- the UI consumes the eject receipt and converges the selected model/card without requiring rich request history
- a failed or rolled-back eject does not disappear from the visible configured inventory
- tests cover account-managed success, config-managed success, conflict, rollback, indeterminate failure, already-absent convergence, and last-model account deletion

### R8 — Reduce avoidable Models post-mutation payload and refresh work

Essential mutation convergence must use bounded, purpose-specific data rather than replaying the entire initial page bootstrap.

Acceptance criteria:

- Phase 1.5 classifies accounts, endpoints, models, controller, role policy, router candidates, and request history as canonical or advisory for each mutation
- only canonical changed surfaces are reread after mutation when the mutation response does not already carry them
- unchanged role policy is not refetched solely because a binding was saved or a model was ejected
- full router candidates, currently measured at roughly `1.97 MB`, are deferred or incrementally refreshed after the UI becomes interactive
- post-mutation request counts and payload bytes are captured in an automated regression
- successful save and eject do not remount or clear the Models inventory
- selected-model fallback after eject is deterministic and tested

### R9 — Compact and hydrate the normalized catalog safely

Reduce the tracked and packaged normalized catalog size without claiming it fixes the Models mutation stall.

Acceptance criteria:

- define a versioned compact serialized catalog type and canonical hydration/decoder boundary
- omit model `upstreamProvenance` when catalog-level `source` is authoritative
- omit provider `upstreamProvenance` when identical to catalog-level `source`
- omit empty/default `experimentalModes`, `requestShapeHints`, `localNotes`, `localOverrideApplied`, and `extendsProvenance` values
- either retain model `providerKind` and `authFamily` or remove them only after every consumer receives typed provider context
- hydration restores exact documented defaults for every omitted field
- non-default optional data remains serialized and round-trips through hydration
- a pinned fixture proves semantic equivalence by stable provider/model identity and hydrated values
- the tracked compact artifact is at least `40%` smaller than the `5,434,995`-byte investigation baseline
- fixture regression may assert `5,270` models and `146` normalized providers for the pinned source revision, but production code does not assume those counts are permanent
- catalog export and schema validation pass without silently advancing the upstream source revision

### R10 — Verify rebuilt-runtime responsiveness and compatibility

Acceptance criteria:

- affected sqlite-memory, runtime-host, runtime-ui, provider-account, endpoint-registry, catalog, and packaging suites pass
- `schemas:validate`, `runtime:validate-routing`, `runtime:validate-host`, `runtime:validate-vendors`, `runtime:validate-ui`, and `runtime:validate-packaging` pass
- rebuilt SEA startup applies the request-list index migration idempotently
- rebuilt-runtime QA covers Save bindings, every Eject outcome required by R7, and Models-to-benchmark navigation
- during each mutation and benchmark-navigation QA scenario, health and an unrelated lightweight API remain responsive
- rebuilt-runtime browser evidence records mutation response time, essential convergence time, button pending time, benchmark essential-content time, advisory refresh behavior, request counts, transferred bytes, and long tasks
- development and rebuilt runtimes return equivalent recent-request summary shapes and mutation receipts
- final before/after evidence includes the representative large database/query plan, not only a small QA fixture
- final catalog evidence records bytes and parse timing separately from mutation responsiveness
- rebuilt `apps/runtime-ui/build`, staged release package, and platform release bundles contain no obsolete route bundle that imports the retired full-snapshot request fanout
- packaging validation starts from a clean staging directory and proves stale hashed assets are removed rather than overlaid

## Out of Scope

### OOS1 — Providers-page startup and selector optimization

Duplicate `/app/remote/providers` bootstrap, provider payload duplication, provider autocomplete, and its large model selector are deferred to a separate performance run. They are not the reported Models mutation freeze.

### OOS2 — Catalog persistence migration

No `catalog_providers`, `catalog_models`, catalog metadata tables, or startup catalog import is included.

### OOS3 — General telemetry redesign or destructive cleanup

This run repairs the recent-request summary projection and ordering index needed to stop the freeze. It does not purge live history, redesign the telemetry ledger, or rewrite full request-detail storage.

### OOS4 — Unreviewed upstream catalog refresh

This run does not silently change the models.dev source commit or accept unrelated provider/model content drift.

### OOS5 — Breaking API removal

Recent-request, full request-detail, provider, model, discovery, and `/v1/models` contracts are not removed.

### OOS6 — Broader Models-page redesign

Model inventory layout, benchmark visual design, controller design, and role taxonomy remain unchanged except for truthful mutation/navigation progress, convergence, and advisory refresh states.

## Constraints

- Phase 1.5 systematic root-cause analysis is mandatory; no production fix begins before it locks.
- Phase 3 uses strict RED-GREEN TDD for every production behavior change.
- Performance evidence records environment, database/fixture size, row count, observation-size distribution, sample count, warmup policy, and measurement method.
- Live runtime data may be probed read-only but must not be copied into committed evidence.
- Mutation verification uses disposable or explicitly isolated state; it must not eject or rewrite the user's live configured models.
- Windows Node/Vite/Vitest/Playwright commands run from the real worktree path.
- Request summary reads and individual request-detail reads remain separate contracts.
- Catalog source revision, serialized catalog schema, and runtime database migration identity remain distinct.
- Existing unrelated modifications to vendored llama-swap binaries must not be changed, staged, reverted, or claimed by this run.
- Human or hybrid Phase 5 QA requires explicit user sign-off; agent-operated QA must not claim human approval.

## Coverage Gate

- [x] R1 covers formal mutation and cross-route root-cause confirmation
- [x] R2 covers the projection, index, query-plan, and server-responsiveness defect
- [x] R3 covers mutation critical-path responsiveness and advisory-data isolation
- [x] R4 covers independent Models-to-benchmark navigation and progressive startup
- [x] R5 covers indexed and bounded benchmark profile enrichment
- [x] R6 covers Save bindings correctness and idempotence
- [x] R7 covers Eject authority, safety, rollback, and receipts
- [x] R8 covers bounded post-mutation convergence and payload work
- [x] R9 preserves the separate catalog-size objective without misattributing the freeze
- [x] R10 covers rebuilt-runtime verification and compatibility
- [x] OOS1-OOS6 prevent unrelated providers, persistence, telemetry, upstream, API, and UI expansion

Coverage: PASS

## Approval Gate

- [x] The draft reflects the user's exact Models mutation and benchmark-navigation reproduction steps
- [x] The shared freeze mechanism is grounded in UI, backend, SQLite, query-plan, cross-route, and live health evidence
- [x] Catalog compaction is separated from mutation responsiveness
- [x] Run 76 authority and failure semantics remain protected
- [x] User explicitly approved this rewritten scope and its performance budgets on `2026-07-18`

Approval: PASS
