# S379 — F-URL (R11/R13): route-family ownership + canonical URL mapping — precise gap characterization

Read-only characterization; no product edits. Public worktree HEAD 65e28945.

## Required vs current (counts)

| Measure | Required (source census) | Current (foldkit shell) | Cite |
| --- | --- | --- | --- |
| Canonical URL patterns | **53** canonical leaf URL patterns from the original React router (75 call entries = 73 route + 2 index, 20 legacy-redirect entries, 1 layout + wildcard) | **34 distinct routable URLs (35 route patterns incl. the /local/models alias; + NotFound)** | original `apps/runtime-ui/app/routes.ts` (98 lines); census `01-as-is.md:52`; shell `apps/runtime-ui-next/src/route.ts:27-61, 65-199` |
| Original canonical patterns supported | 53 | **37** (35 static CANONICAL_TARGETS incl. /app + 2 dynamic detail patterns) | `legacy-redirects.ts:87-123, 129-144, 147-150` |
| Original canonical patterns explicitly missing | 0 required to be silently dropped | **15** named in MISSING_ORIGINAL_TARGETS (stay NotFound) | `legacy-redirects.ts:152-200` |
| Legacy redirect entries | 20 (`routes/legacy-redirect.tsx` registrations) | **20 route entries present** (+ 22 map strings, i.e. 2 added compatible aliases), 2 dynamic aliases | `legacy-redirects.ts:24-48, 58-79, 129-144` |
| History-replace Commands | one replace per legacy URL | present: `replaceLegacyUrlCommand` emitted from init as a Command | `legacy-redirects.ts:292-301`; `init.ts:173-177` |

Count reconciliation: 37 supported app-scope originals + 15 explicit missing = 52; the 53rd canonical leaf is the root index `/` (outside the `/app` layout). Reserved: the shell also serves newer bare URLs not in the original table (/diagnostics/:id, /control/queues-config, /system/peers, //dashboard, /requests...).

## Current routable families (shell) — URL shapes

| Family | Shell paths (route.ts) | Notes |
| --- | --- | --- |
| Index / dashboard | `/`, `/dashboard` (`route.ts:29,30,85,86`) | canonical app entry |
| Diagnostics / observability | `/diagnostics/:id`, `/observe/observability-snapshot`, `/observe/store-degradation-receipts`, `/observe/queues`, `/observe/activity`, `/observe/logs`, `/observe/routing`, `/requests`, `/requests/:requestId` (`:31-43, 65-100`) | 2 parameterized read families |
| Router | `/router`, `/router/candidates`, `/router/decisions`, `/router/decisions/:requestId` (`:44-49`) | strategy/workloads/config/agent-strategy missing |
| Local | `/local/choose`, `/local/models` (alias), `/local/peer-models`, `/local/peers`, `/local/logs`, `/local/swap` (`:50,54-63`) | llama-swap models/policy/matrix missing |
| Integrations | `/integrations/downstream`, `/integrations/upstream` (`:51-58`) | |
| Studio | `/studio` + `?tab=chat|images|audio|rerank|advanced` (`:59`; all 5 canonical targets) | tab carried as query alias (`init.ts:40-42`) |
| Models | `/models`, `/system/benchmark` (`:67-69`) | /models/roles missing |
| Runtime / system | `/runtime`, `/session-readiness`, `/system/peers`, `/system/storage-retention` (`:53,70-76`) | runtime-config merged into /runtime (documented `legacy-redirects.ts:81-86`) |
| Learning | `/learning` (`:67`) | 5 child panels missing |
| Control | `/control/providers`, `/control/endpoints`, `/control/controller`, `/control/queues-config` (`:55-57,60-62,77-84`) | |
| Diagnostics route | NotFound fallback preserves the path | `route.ts:199`; `legacy-redirects.ts:152-156, 284-289` |

## Exact missing canonical patterns (15, explicit NotFound)

From `legacy-redirects.ts:157-200`:
1. /app/local/llama-swap/models — llama-swap catalogue page not implemented
2. /app/local/llama-swap/policy — policy page not implemented
3. /app/local/llama-swap/matrix — compatibility matrix page not implemented
4. /app/learning/configuration — Learning configuration panel not implemented
5. /app/learning/decisions — Learning decisions panel not implemented
6. /app/learning/evidence — Learning evidence panel not implemented
7. /app/learning/history — Learning history panel not implemented
8. /app/learning/packs — Learning packs panel not implemented
9. /app/models/roles — model role eligibility not implemented
10. /app/router/agent-strategy — agent strategy editing not implemented
11. /app/router/config — router config editing not implemented
12. /app/router/strategy — routing strategy editing not implemented
13. /app/router/workloads — workload control not implemented
14. /app/system/extensions — extensions surface not implemented
15. /app/system/operator — operator controls not implemented

Missing families are never redirected to a generic success page: `canonicalTargetForPath` returns undefined, `legacyRedirectForUrl` returns undefined, and the URL parses to `NotFound` (`legacy-redirects.ts:213-224, 284-289`; `route.ts:195-199`).

## Legacy redirect state

- **20 route entries** (the original `routes/legacy-redirect.tsx` registrations): `legacy-redirects.ts:58-79` — local/swap, local/policy, local/logs, local/matrix, local/peers, control/providers, control/routing-strategy, control/runtime-config, control/controller, endpoints, control/endpoints, control/roles, control/benchmark, control/models, observe, endpoints/downstream, integrations/downstream, endpoints/upstream, integrations/upstream, control/session-readiness.
- **22 map strings**: `legacy-redirects.ts:24-48` = the 20 + 2 compatible aliases (/app/local/models, /app/router/config).
- **2 dynamic detail aliases**: /app/observe/requests/:requestId and /app/router/decisions/:requestId (`:129-144`) — request IDs preserved by construction.
- **Resolution**: map → canonical target table → dynamic prefixes, at most one hop; query and hash preserved, canonical query wins ordering (`canonicalHref` `:262-278`); Studio tab canonicalised via `?tab=` (`init.ts:40-42`).
- **History-replace**: emitted as the `ReplaceLegacyUrl` Command (`legacy-redirects.ts:292-301`), issued from init with `Navigation.replaceUrl` semantics and a pending-redirect marker (`init.ts:173-177`); no extra back-button stop.
- **Dead-target redirects (explicit, not fake)**: /app/control/routing-strategy → /app/router/strategy, /app/control/roles → /app/models/roles, /app/router/config → /app/router/strategy all point at currently-missing patterns, so they remain NotFound until the owning family lands; they are NOT redirected to a nearby implemented page.

## Named first slice: S379a — Models/roles family (smallest genuine missing family)

Bounded, test-first: add the one canonical pattern and its legacy redirect to an implemented surface.
- Add `ModelsRoles` to the route union + router `/models/roles` (`route.ts:27-61, 65-159, 161-199`).
- Add `"/app/models/roles": "/models/roles"` to CANONICAL_TARGETS and remove the entry from MISSING_ORIGINAL_TARGETS (`legacy-redirects.ts:87-123, 157-200`); /app/control/roles then resolves through the existing map and emits the history-replace Command (no new mapping logic).
- Minimal read-only roles surface (eligibility readback) + nav entry; no mutation/wiring changes.
- Tests: typed parse/build for /models/roles; /app/models/roles canonicalises to /models/roles via `ReplaceLegacyUrl`; /app/control/roles resolves (legacy map → canonical) with query/hash preserved; requestId detail families unchanged; remaining 14 missing families still parse NotFound (never generic success).

Caller/region table:

| Region | Role | Cite |
| --- | --- | --- |
| route union + routers | add ModelsRoles + /models/roles | `route.ts:27-61, 65-159, 161-199` |
| canonical target table | /app/models/roles → /models/roles | `legacy-redirects.ts:87-123` |
| missing inventory | remove /app/models/roles | `legacy-redirects.ts:157-200` |
| legacy resolver / Command | unchanged; /app/control/roles already maps | `legacy-redirects.ts:24-48, 213-224, 284-301`; `init.ts:173-177` |
| view/nav | roles readback page + nav item | `view.ts:788 (Learning page pattern), :177 nav` |
| tests | URL conformance | `test/s269-canonical-url.test.ts`, `test/s269-canonical-url.scene.test.ts` |

## State

No product edits, no RED/GREEN (characterization), no commit. Follow-ons after S379a: router-strategy/workloads/config/agent-strategy family, learning child panels, llama-swap models/policy/matrix, system operator/extensions.
