Run: `/.recursive/run/66-remote-providers-deferred-request-id-loading/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-11T21:48:29Z`
LockHash: `7ae47509453e3aad1e75cc58212837c5b9326a0a948b4f635c6ba2e2d74f4db7`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- user guidance in chat on `2026-07-12`:
  - `/app/remote/providers` takes more than one minute to load
  - the page should load first
  - after the page is loaded, fetch only the latest `10` request ids
  - do not start implementation yet; create a new recursive run for the fix
- root-cause investigation from the current session:
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - live standalone runtime measurements showing `/api/role-model/requests` as the blocking leg for providers-page load
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/routes/providers.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
Outputs:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
Scope note: This run fixes the remote providers page so the initial `/app/remote/providers` experience no longer blocks on request-history loading. The approved direction is to render the page from the provider/account/model surfaces first, then issue a non-blocking follow-up that fetches only the latest `10` request ids through a lightweight backend path.

## TODO

- [x] Ground the run in the current providers-route, runtime snapshot, request-ledger, and SQLite observation surfaces
- [x] Capture the approved fix direction as requirements rather than implementation chat
- [x] Keep the scope focused on providers-page load performance and lightweight recent-request id fetching
- [x] Preserve existing richer request-ledger and request-detail surfaces as separate concerns
- [x] Define deterministic verification expectations across runtime-ui and backend layers
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `runtime-ui performance bugfix with lightweight backend support`
- Primary subsystems:
  - `role-model-router/apps/runtime-ui/**`
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/packages/sqlite-memory/**`
- Secondary subsystems:
  - `role-model-router/packages/runtime-observability/**`
- User-visible outcome:
  - the remote providers page becomes visible and usable without waiting on request-history reads, and any providers-page request-history follow-up is limited to the latest `10` request ids only
- Main risk theme:
  - a shallow fix could still route the providers page through the expensive request-history path, silently regress other runtime snapshot consumers, or preserve a backend query that continues to read large `observation_json` payloads even though the page only needs request ids

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `45-observe-surface-realignment` | request-ledger and request-detail surfaces are already the canonical place for rich request history, so this run should not repurpose the providers page into a second rich request browser |
| `50-openai-codex-subscription` | remote provider flows and truthful remote-provider state are already user-visible operator surfaces and must remain intact while load behavior changes |
| `60-runtime-ui-paper-linear-review-alignment` | the providers page is part of the current runtime-ui shell baseline, so the load fix must preserve the shipped route and interaction contract rather than redesigning the page |
| `63-router-backend-regression-and-telemetry-surface-hardening` | recent runtime-ui and backend regression work already established stronger route and telemetry verification expectations that this run should extend rather than bypass |

## Problem Summary

The current providers route calls `fetchRuntimeSnapshot()` during initial load. That shared snapshot currently waits on `/api/role-model/runtime/summary`, `/providers`, `/accounts`, `/accounts/device`, `/endpoints`, `/roles`, `/requests`, and `/models` before the route can finish applying provider selection and rendering the remote-provider surface.

The current blocking leg is `/api/role-model/requests`. The backend route currently delegates to `listRecentRuntimeObservations()`, which selects `request_id`, `routing_decision_id`, `endpoint_id`, `created_at_ms`, and full `observation_json` rows from `runtime_observations`, orders them by recency, then parses each selected `observation_json` bundle to recover fields such as `clientRequestId`. The live runtime investigation showed that the table has multi-megabyte observation payloads and that the ids-only form of the same recency query is fast while the current full-row query is slow enough to hold the providers page for more than a minute.

The approved fix direction is narrower than a general request-history redesign. The page should load first from the data it actually needs for provider and account interaction. Only after the page is loaded should it issue a separate, non-blocking request for the latest `10` request ids, and that follow-up path should stay lightweight instead of dragging full request-observation payloads through the providers-page bootstrap.

## Fixed Decisions

1. Initial `/app/remote/providers` load must not wait on request-history data.
2. The providers page should issue any recent-request follow-up only after the page is already loaded.
3. The providers-page follow-up is limited to the latest `10` request ids only.
4. The providers-page follow-up should use a lightweight backend contract that matches the page need; it must not require full `observation_json` reads or parsing just to recover request ids.
5. Existing rich request-ledger and request-detail behavior for Observe or debugging surfaces remains in scope to preserve, not to replace.
6. This run may introduce a new backend path or a narrowly scoped request mode if needed, but it must not silently broaden into a generic telemetry or request-history redesign.
7. If shared `fetchRuntimeSnapshot()` behavior changes, the change must be explicit and regression-safe for other routes that still rely on the current snapshot contract.
8. Failure of the deferred recent-request-id fetch must not block the providers page from rendering or being usable.

## Requirements

### `R1` Remove request-history blocking from providers-page initial load

Description:
The initial `/app/remote/providers` route load must complete from provider/account/model/runtime readiness data only, without waiting for request-history data that is not required to make the page usable.

Acceptance criteria:
- the providers route no longer blocks its initial load on `/api/role-model/requests`
- the page can render its existing remote-provider controls, provider selection logic, account state, and role-policy-backed model interactions without waiting for recent-request data
- any shared runtime snapshot usage on this route is narrowed or replaced so that request history is not part of the critical path for first render
- if the runtime summary, providers, accounts, endpoints, roles, or models fail, the route still reports the appropriate load error for those required surfaces
- if only recent-request follow-up fails, the page remains rendered and usable

### `R2` Start a non-blocking providers-page follow-up for the latest 10 request ids after initial load

Description:
Once the providers page has finished its initial load and visible state is in place, it should begin a separate follow-up fetch for the latest `10` request ids only.

Acceptance criteria:
- the providers page triggers a follow-up request only after the initial page load has completed
- the follow-up is bounded to the latest `10` request ids
- the follow-up does not re-block initial provider selection, page readiness, or first interactive render
- an empty request ledger is treated as a successful empty result, not as a blocking error
- failure of the follow-up request does not clear the already loaded providers-page state

### `R3` Add or expose a lightweight backend recent-request-id path for the providers page

Description:
The backend must provide a lightweight way to read only the latest request ids needed by the providers page, without forcing that page through the current full recent-observation payload path.

Acceptance criteria:
- the providers-page recent-request-id path returns only the latest `10` request ids needed by the page
- the lightweight path does not require parsing `observation_json` bundles to produce its result
- the lightweight path avoids selecting multi-megabyte `observation_json` payloads when only request ids are needed
- if the existing `/api/role-model/requests` route remains the canonical rich request-history surface, its current behavior is preserved unless an approved addendum expands scope
- the new or adjusted lightweight path is covered by backend tests for ordering, limit behavior, and empty-state behavior

### `R4` Preserve rich request-ledger and request-detail behavior outside the providers-page optimization

Description:
The providers-page performance fix must not accidentally degrade richer request-history surfaces that exist for Observe, request detail, or runtime inspection.

Acceptance criteria:
- existing request-ledger and request-detail surfaces continue to return their richer data contracts
- no existing route is silently switched from rich request history to request ids only unless this run explicitly scopes that route in an approved addendum
- the providers-page optimization does not remove or weaken the current debugging and inspection paths used outside the providers page
- any shared runtime-api refactor keeps route-specific needs explicit rather than relying on an ambiguous one-size-fits-all snapshot

### `R5` Add regression coverage for the providers-page deferred-load behavior and the lightweight recent-request-id path

Description:
The fix must be protected by tests that prove the page no longer waits on request history and that the providers-page follow-up stays lightweight and bounded.

Acceptance criteria:
- runtime-ui tests prove the providers-page initial load does not require `/api/role-model/requests`
- runtime-ui tests prove the providers-page follow-up happens after initial load and is bounded to `10` request ids
- backend or SQLite tests prove the lightweight recent-request-id path returns the latest ids in recency order without parsing `observation_json`
- regression coverage preserves current rich request-ledger behavior where this run intentionally leaves it unchanged
- Phase 4 verification for this run must include impacted runtime-ui tests and impacted backend or SQLite tests; packaging verification remains conditional on packaging-affecting file changes

## Out of Scope

- `OOS1`: broad redesign of Observe request-ledger, request-detail, or telemetry analytics pages
- `OOS2`: historical backfill or cleanup of existing large `runtime_observations.observation_json` rows
- `OOS3`: generic optimization of every `fetchRuntimeSnapshot()` consumer beyond the providers-page needs required by this run
- `OOS4`: changing manual QA, benchmark, or request-detail product behavior outside the providers-page loading path

## Constraints

- the approved UX direction is fixed: load the providers page first, then load only the latest `10` request ids
- the providers-page optimization must remain truthful to current provider/account/endpoint state; it cannot replace required page data with placeholders just to appear fast
- the lightweight recent-request-id path must stay deterministic and local-runtime-safe
- no implementation in this run may depend on user refresh timing, manual warm-up, or out-of-band operator steps to achieve the load improvement
- if a shared runtime-api helper gains a new mode or route-specific variant, the naming and tests must make the route-specific behavior explicit

## Assumptions

- the providers page does not need rich request-history content to become usable on first render
- the approved providers-page follow-up only needs request ids, not full request observations or request details
- other request-history consumers still need their richer current data contracts and should be treated separately unless a later run expands scope

## Coverage Gate

- Effective inputs reviewed:
  - user guidance in chat on `2026-07-12`
  - current-session root-cause investigation notes and measured query behavior
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
  - `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
  - `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
  - `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/providers.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - `role-model-router/packages/sqlite-memory/test/index.test.ts`
- Requirement coverage check:
  - `R1`: covered in `## Requirements`
  - `R2`: covered in `## Requirements`
  - `R3`: covered in `## Requirements`
  - `R4`: covered in `## Requirements`
  - `R5`: covered in `## Requirements`
- Out-of-scope confirmation:
  - `OOS1`: unchanged
  - `OOS2`: unchanged
  - `OOS3`: unchanged
  - `OOS4`: unchanged

Coverage: PASS

## Approval Gate

- [x] Scope is concrete enough for Phase 0 and Phase 1 handoff
- [x] The approved fix direction is captured as explicit requirements
- [x] Acceptance criteria are observable and testable
- [x] Out-of-scope and constraint boundaries are explicit
- [x] User approved creating the recursive run for this fix

Approval: PASS
