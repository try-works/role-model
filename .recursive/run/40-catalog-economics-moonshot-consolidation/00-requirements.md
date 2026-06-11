Run: `/.recursive/run/40-catalog-economics-moonshot-consolidation/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-11T13:40:25Z`
LockHash: `efbee0856e65b31b14651ecb20ea773dab2f6a3af36060b717968302bd50ddd9`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- Conversation transcript: catalog economics + Moonshot consolidation design (agent transcript `43bc0f89-dfe3-4319-bcc4-aa61b8317713`)
- User clarification (2026-06-11): keep `cost_per_1k_tokens_est` — it is a **routing estimate** for budget/cost-strategy decisions, **not** endpoint-reported or live-updated per-1M token pricing
- **Post-run-39 product baseline (authoritative, merged to `main` @ `42dffbb`):**
  - `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md` (`R1`–`R15`, locked)
  - `/.recursive/run/39-runtime-session-rehydration-model-inventory/06-decisions-update.md` (locked)
  - `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` (catalog metadata baseline)
  - `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md` (OAuth seams)
- Code baseline (post-run-39 `main` @ `42dffbb`):
  - `role-model-router/packages/core/src/router.ts` (`getCostMetric`, budget gates)
  - `role-model-router/packages/catalog/src/refresh.ts`, `index.ts`, `data/normalized-catalog.json`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts` (`listProviders`, `resolveProviderVariants`, OAuth hydration)
  - `role-model-router/packages/protocol-routing/**`
  - `role-model-router/packages/runtime-observability/src/index.ts`
Outputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md`
Scope note: Run 40 fixes routing economics and Moonshot operator confusion by making catalog per-1M input/output rates the sole source for **rate tables**, deriving pre-route estimates (including retained `cost_per_1k_tokens_est`) from those rates for budget/cost-strategy decisions, consolidating Moonshot to one operator provider surface, and resolving operator-model → catalog-pricing identity for models such as `moonshot/kimi-k2.6`.

## TODO

- [x] Declare post-run-39 product baseline as implementation starting point
- [x] Document motivating gaps (dual Moonshot providers, missing Kimi pricing, neutral cost scoring)
- [x] Define stable `R#` identifiers with observable acceptance
- [x] Record catalog-only economics constraints and telemetry exclusions
- [x] Record verification discipline and operator regression baseline
- [x] Record out-of-scope boundaries
- [x] User approval of run creation and requirements draft (2026-06-11)
- [x] Complete Coverage Gate checklist (controller self-audit before lock)
- [x] Complete Approval Gate checklist (user lock approval 2026-06-11)

## Prerequisite — post-run-39 product baseline

Run 40 implementation **must branch from post-run-39 `main`**, which includes merged session rehydration, inventory-driven aliases, and startup health work.

| Field | Value |
| --- | --- |
| Baseline commit | `42dffbb` (post-run-39 `main`) |
| Run 39 branch | `recursive/39-runtime-session-rehydration-model-inventory` (merged via PR #15) |
| Packaged-runtime proof | Operator baseline on `:3456` with `lfm2.5-8b-a1b`, `moonshot/kimi-k2.6`, `mixed.local-remote`; routing regression green with **0 `BRIDGE_CRASH`** |

### What exists after run 39 (starting truths)

**Catalog metadata (run 32)**

- Normalized catalog ships `inputPer1M` / `outputPer1M` from models.dev for many providers.
- UI surfaces already display per-1M pricing where catalog rows include `pricing`.
- Operator Moonshot model `moonshot/kimi-k2.6` has `pricing: null`; models.dev row `moonshotai/kimi-k2.6` has `inputPer1M: 0.95`, `outputPer1M: 4`.

**Provider picker (runs 14, 17, 32)**

- `listProviders()` merges catalog providers with runtime presets.
- Both `moonshot` (role-model operator id) and `moonshotai` (models.dev id) appear as “Moonshot AI”.
- `resolveProviderVariants()` under `moonshot` concatenates presets, generated api-key/oauth variants, and legacy aliases — producing duplicate-looking entries.

**Routing economics today**

- `getCostMetric()` in `packages/core/src/router.ts` scores cost from `candidate.observed.cost_per_1k_tokens_est` when present.
- When that estimate is absent, cost metric defaults to neutral **0.5** for all candidates — local peer and remote Kimi tie on cost strategy.
- Today the field is often missing or was shaped as if it reflected endpoint/measured spend; it is **not** populated from catalog per-1M rates. LiteLLM can also expose per-request `response_cost` when proxied — that actual spend must not backfill routing rate tables or replace catalog economics.

### Post-run-39 gaps (motivation for run 40)

| Gap | Observed on post-run-39 `main` | Impact |
| --- | --- | --- |
| **G1** Dual Moonshot providers | `moonshot` and `moonshotai` both listed in Providers UI/API | Operator confusion; duplicate “Moonshot AI” entries |
| **G2** Moonshot variant explosion | Presets + generated `moonshot-api-key` / `moonshot-oauth` + legacy aliases | Cluttered connect flows; stale variants (e.g. `moonshot.personal.moonshot-oauth`) |
| **G3** Operator model pricing null | `moonshot/kimi-k2.6` has no `pricing`; sibling `moonshotai/kimi-k2.6` does | UI may show pricing on one id only; routing cannot use catalog rates for live Kimi endpoints |
| **G4** Missing catalog-derived estimate | `cost_per_1k_tokens_est` not computed from catalog per-1M rates | Neutral 0.5 tie when estimate absent; paid vs local indistinguishable |
| **G5** Cost strategy mis-ranks easy work | Easy/`cost` paths can select Kimi when local and remote share neutral 0.5 | Violates intended economics-first behavior for cost strategy |
| **G6** Endpoint/vendor cost mistaken for rates | Field or profiles treated as live endpoint pricing updates | Must not learn per-1M rates from telemetry or LiteLLM per-request cost |

Run 40 closes G1–G6 **without** undoing run 39 session continuity deliverables.

## Problem Summary

Operators see two Moonshot providers and redundant Moonshot variants while routing cost strategy ignores the catalog’s per-1M input/output rates already used for UI display. Live Kimi endpoints use operator model id `moonshot/kimi-k2.6`, but catalog pricing lives on `moonshotai/kimi-k2.6`. The router therefore cannot rank local-free endpoints ahead of paid remote models on cost strategy, and paid models without telemetry look artificially cheap.

Run 40 establishes **catalog-only fixed token rate tables** (per 1 million tokens, separate input and output, optional cache read/write when catalog provides them) and derives **routing cost estimates** from those rates for budget and cost-strategy decisions. The existing `cost_per_1k_tokens_est` field is retained as a normalized per-request estimate scalar for router scoring and budget gates — populated from catalog economics, not from endpoint-reported pricing. Moonshot becomes a single operator-facing provider with deduped variants; `moonshotai` remains a metadata/pricing backend only.

### Fixed decision — `cost_per_1k_tokens_est` semantics

| Aspect | Meaning |
| --- | --- |
| **What it is** | A catalog-derived **estimated cost per 1k tokens** (or equivalent normalized scalar) for the current request context, used by routing cost metric and user budget gates (`target_cost_per_request`, `max_cost_per_request`). |
| **What it is not** | Endpoint telemetry, LiteLLM `response_cost`, or any live signal that the provider’s per-1M list price changed. |
| **Rate source** | Catalog `TokenEconomics` (`inputPer1M` / `outputPer1M` [+ cache when present]) via direct row or canonical map — never learned from traffic. |
| **Actual spend** | Post-request usage/ledger may still record real spend for ops; that remains separate from pre-route estimates. |

## Requirements

### `R0` Branch from post-run-39 `main` product baseline

Description:
Implementation and verification start from merged run 39 on `main` @ `42dffbb`. Run 39 session rehydration, alias inventory, and startup health behavior must remain intact.

Acceptance criteria:
- Phase 0 worktree records `42dffbb` (or later `main` merge commit) as base commit before Phase 3.
- Restart drill from run 39 operator baseline still passes after run 40 changes (`connectedWithoutEndpointCount: 0`, alias pool includes live peer model).
- No reversion of run 39 endpoint persistence, OAuth rehydration, or inventory-driven alias behavior unless explicitly required and covered by a new requirement.

### `R1` Expose one operator Moonshot provider; hide `moonshotai` from picker surfaces

Description:
Operators must connect and manage Moonshot through the role-model operator id `moonshot` only. The models.dev provider id `moonshotai` remains in the normalized catalog for metadata and pricing lookup but must not appear as a separate connectable provider in operator APIs/UI.

Acceptance criteria:
- `GET /api/role-model/providers` returns exactly one Moonshot-family operator entry for onboarding (provider id `moonshot`), not a second `moonshotai` row.
- Runtime UI Providers list shows one Moonshot connect target; no duplicate “Moonshot AI” cards from `moonshotai`.
- Catalog refresh/normalization still retains `moonshotai` models and pricing internally.
- Non-operator catalog consumers (tests, export, merge logic) can still resolve `moonshotai/*` rows.

### `R2` Dedupe Moonshot provider variants under `moonshot`

Description:
`resolveProviderVariants()` and preset merge logic must present a minimal, non-redundant variant set for `moonshot`, with presets winning over generated duplicates.

Acceptance criteria:
- For `moonshot`, variant list includes at most one entry per distinct auth mode/intent: Open Platform api-key, Kimi Code OAuth, and any explicitly documented legacy alias required for backward compatibility.
- Generated `moonshot-api-key` / `moonshot-oauth` variants do not duplicate preset ids already declared in `provider-presets.json`.
- Documented stale variants (e.g. unused `moonshot-oauth` preset duplicates) are removed or marked non-selectable without breaking existing `moonshot.personal.kimi-code` accounts.
- Focused tests cover variant resolution before/after dedupe.

### `R3` Canonical model identity maps operator models to catalog pricing rows

Description:
Introduce a repo-owned canonical model identity layer so operator/live model ids such as `moonshot/kimi-k2.6` resolve catalog economics from the correct models.dev-aligned row (`moonshotai/kimi-k2.6`) without changing execution model ids seen by providers.

Acceptance criteria:
- A deterministic `canonicalModelId` (or equivalent alias map) resolves `moonshot/kimi-k2.6` → `moonshotai/kimi-k2.6` for metadata and economics lookup.
- Mapping is explicit, versioned in repo code or catalog supplement — not inferred silently from string heuristics alone.
- Execution and endpoint registry continue to use operator model ids accepted by live adapters (`moonshot/kimi-k2.6` on Kimi Code OAuth remains functional).
- UI model detail for operator Moonshot models shows inherited per-1M pricing after canonical resolution when the operator row’s `pricing` is null.
- Tests prove pricing lookup for Kimi and at least one additional mapped pair or documented fallback path.

### `R4` Introduce `TokenEconomics` with catalog-only per-1M rates

Description:
Add a shared `TokenEconomics` type used by routing and diagnostics: `inputPer1M`, `outputPer1M`, optional `cacheReadInputPer1M` and `cacheWriteInputPer1M` when catalog provides them, plus `source: catalog | local-free | unknown`.

Acceptance criteria:
- Type lives in a shared package surface consumed by catalog resolution, protocol-routing, and router-core inputs.
- Rates are always expressed **per 1 million tokens**, never per 1k.
- `source: catalog` is set only when rates come from normalized catalog (via direct row or canonical map).
- `source: local-free` uses `0` input and `0` output per-1M for local peer/llama-swap endpoints.
- `source: unknown` is explicit when no catalog pricing exists after canonical resolution; routing documents fallback behavior.
- `TokenEconomics` holds **rate tables** (per-1M); it does not replace `cost_per_1k_tokens_est`, which remains the normalized **request estimate** scalar derived from those rates.

### `R5` Resolve `TokenEconomics` for every routed candidate before scoring

Description:
Protocol-routing (or the bridge composition layer feeding router-core) must attach resolved `TokenEconomics` to each endpoint candidate used in a routing decision.

Acceptance criteria:
- Every candidate considered by router-core for a live route carries `tokenEconomics` (or equivalent) populated from catalog + canonical map + local-free rule.
- Resolution uses normalized catalog data shipped with the app, not live network calls at route time.
- Cache rate fields populate only when catalog `pricing` includes them; otherwise they are omitted or null without fabricating values.
- Unit/integration tests cover catalog-priced remote, local-free, unknown-pricing fallback, and Kimi canonical map cases.

### `R6` Populate routing estimates from catalog rates; score via `cost_per_1k_tokens_est`

Description:
Before router scoring, derive a catalog-based request cost estimate from `TokenEconomics`, request context token estimates, and configured output token ceiling (e.g. `max_tokens`). Expose that estimate to router-core as `cost_per_1k_tokens_est` (normalized per-1k scalar) and/or `estimatedRequestUsd` for budget gates. `getCostMetric()` continues to consume the estimate scalar for cost-strategy scoring when the user has budget policy — but the value must come from catalog economics, not endpoint measurement.

Acceptance criteria:
- For candidates with known catalog economics, `cost_per_1k_tokens_est` is populated deterministically from `TokenEconomics` + request estimates before `getCostMetric()` runs.
- Cost metric raw payload cites both rate provenance (`inputPer1M`, `outputPer1M`, `source`) and the derived estimate (`cost_per_1k_tokens_est` and/or `estimatedRequestUsd`).
- For a fixed policy snapshot and request shape, scoring is deterministic across runs.
- Local-free candidate receives a strictly better (lower) estimate than `moonshot/kimi-k2.6` when both are eligible on an easy/cost-strategy route with the post-run-39 operator baseline.
- Paid catalog-priced models rank by catalog-derived estimate, not neutral 0.5 default, when economics are known.
- Budget gate `max_cost_per_request` evaluates against the same catalog-derived estimate, not post-request actual spend.

### `R7` Do not populate routing estimates from endpoint or vendor actual cost

Description:
Telemetry, SQLite observed profiles, and LiteLLM `response_cost` / `x-litellm-response-cost` may continue to be logged for operations and post-request ledger, but must not populate `cost_per_1k_tokens_est` used for pre-route scoring or budget decisions. Endpoint responses do not update catalog per-1M rate tables.

Acceptance criteria:
- Pre-route `cost_per_1k_tokens_est` on routing candidates is sourced from catalog-derived computation (`R6`), not from persisted observed profiles that reflect past request spend unless those profiles were explicitly seeded from catalog (documented migration path if any).
- Vendor per-request cost headers/fields never write into routing candidate estimates or catalog rate tables.
- Tests fail if routing estimate population reverts to `measured` / telemetry / LiteLLM actual-cost sources.
- Request observations may still include actual spend from execution for ledger/ops, clearly separated from pre-route catalog estimates in `routingDiagnostics`.

### `R8` Refactor Kimi Code OAuth toward `authProfile` on operator `moonshot`

Description:
Reduce Moonshot-specific branches in bridge/catalog by expressing Kimi Code device OAuth as an `authProfile` on the single operator provider `moonshot`, aligned with generalized OAuth patterns from run 17.

Acceptance criteria:
- Kimi Code device OAuth remains end-to-end functional: account creation, token persistence across restart, endpoint activation for `moonshot/kimi-k2.6`.
- OAuth metadata (device endpoints, scopes, headers) is declared in catalog override or preset `authProfile` shape rather than scattered hardcoded branches where avoidable.
- `hydrateOauthProviderAccounts` and variant resolution consume the profile without duplicate Moonshot OAuth code paths introduced by run 40.
- Existing `moonshot.personal.kimi-code` accounts rehydrate without operator re-onboarding after upgrade.

### `R9` Expose catalog economics in routing diagnostics and operator readback

Description:
Operators and validators must see which catalog economics informed cost scoring for a routed request.

Acceptance criteria:
- `routingDiagnostics` (or equivalent durable observation field) includes per-selected-candidate or winner economics summary: canonical model id, `inputPer1M`, `outputPer1M`, `source`, catalog-derived `cost_per_1k_tokens_est` / `estimatedRequestUsd`, and explicit distinction from post-request actual spend when present.
- Workbench/request-detail surfaces show catalog economics readback when cost strategy or cost metric influenced selection (minimal UI wiring; no full redesign).
- `runtime:validate-host` or focused bridge tests assert diagnostics presence for a cost-strategy fixture.

### `R10` Deliver with strict TDD, automated regression, and packaged-runtime proof

Description:
Run 40 changes routing economics and provider surfaces — strict TDD and end-to-end evidence are mandatory.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict` with RED/GREEN evidence paths under `evidence/logs/`.
- Targeted tests cover `R1`–`R9` behaviors in catalog, protocol-routing, router-core, and bridge layers.
- Post-change restart drill on packaged runtime `:3456` reproduces run 39 session readiness plus cost-strategy proof: easy/cost request prefers local peer over Kimi when both are pool-eligible.
- `probe-downstream-ingress.py` or equivalent routing regression reports **0 `BRIDGE_CRASH`**.
- Phase 5 declares `QA Execution Mode: agent-operated` or `hybrid` with evidence paths.

## Out of Scope

- `OOS1`: Learning or updating token rates from live traffic, LiteLLM `model_cost`, or per-request vendor cost headers
- `OOS2`: Changing models.dev or LiteLLM upstream repositories as the primary implementation path
- `OOS3`: Full provider-picker redesign beyond Moonshot dedupe and `moonshotai` hiding
- `OOS4`: Replacing LiteLLM as execution layer or moving execution ids to `moonshotai/*`
- `OOS5`: Re-implementing run 39 session rehydration, alias inventory, or startup health (except regression protection in `R0`)
- `OOS6`: Billing/invoicing product features; ops logging of actual spend is allowed but not expanded into a billing system
- `OOS7`: Automatic deletion of operator SQLite accounts without explicit migration/requirements — stale variant cleanup is configuration/preset level only

## Constraints

- **Catalog-only fixed rate tables** for token pricing: per **1 million** tokens, separate input and output; optional cache read/write per-1M when catalog has them
- **`cost_per_1k_tokens_est` is retained** as the normalized routing **estimate** scalar for cost metric and budget gates — derived from catalog rates, not endpoint-reported pricing
- **No endpoint/telemetry/vendor actual cost** as source for pre-route estimates, rate tables, or cost-strategy selection
- Branch from post-run-39 `main`; minimize unrelated diffs
- Preserve run 39 operator baseline models (`lfm2.5-8b-a1b`, `moonshot/kimi-k2.6`, `mixed.local-remote`) for regression
- Packaged-runtime validation on `:3456` mandatory for `verified` disposition on routing economics requirements
- Moonshot execution continues to use operator model ids accepted by live endpoints

## Assumptions

- models.dev pricing in normalized catalog remains the authoritative rate source for remote models
- Canonical map scope starts with Moonshot operator ids and extensible table for future provider/id divergence
- Request token estimates for cost scoring can use existing routing inputs (`contextTokens`, `max_tokens`, role/task defaults) with documented fallbacks in Phase 2
- Local peer and llama-swap endpoints are always `local-free` regardless of observed telemetry
- Run 39 merged state on `main` is the correct baseline; no parallel ad-hoc port from old branches

## Open Unknowns (resolve in Phase 1 AS-IS)

1. Exact formula converting catalog per-1M rates + token estimates into `cost_per_1k_tokens_est` and `estimatedRequestUsd` (input-only vs input+max_output weighting) and alignment with `target_cost_per_request` policy units.
2. Whether `unknown` pricing fallback should exclude candidates on cost strategy or score neutrally with explicit diagnostics.
3. Minimum canonical map entries beyond `moonshot/kimi-k2.6` ↔ `moonshotai/kimi-k2.6` required for acceptance in `R3`.
4. ~~Whether to deprecate `cost_per_1k_tokens_est`~~ **Resolved:** keep the field; fix population semantics per Fixed decision section (catalog-derived estimate only).

## Dependencies

| Prior run | Relationship |
| --- | --- |
| **39** | **Regression baseline** — session rehydration, alias inventory, startup health |
| **32** | Catalog `inputPer1M`/`outputPer1M` metadata layer |
| **17** | OAuth generalization; `authProfile` target shape for `R8` |
| **14** | Providers UI/API surfaces for `R1`, `R2` |
| **26**, **30** | Difficulty/cost strategy consumers of new economics |
| **15** | LiteLLM vendor path — per-request actual cost must not populate routing estimates per `R7` |

## Targeted Package And File Inventory

- `role-model-router/packages/catalog/**`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/protocol-routing/**`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/**`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/apps/runtime-ui/app/**` (Providers + routing readback only)
- `role-model-router/packages/provider-account/**`
- `testdata/catalog/**` (canonical map supplements if used)
- Root validation scripts touched by economics or provider-list proofs

## Validation Expectations

- RED/GREEN tests for canonical pricing resolution, `TokenEconomics` attachment, catalog-derived `cost_per_1k_tokens_est`, and `getCostMetric()` scoring
- Regression tests ensuring `moonshotai` hidden from `listProviders` while still in catalog export
- End-to-end proof: easy/cost routing prefers local-free over Kimi when both eligible
- Restart drill + ingress probe per run 39 baseline
- If `R8` touches OAuth hydration, device OAuth flow must be revalidated after restart

## Coverage Gate

- [x] Post-run-39 baseline declared (`R0`, Prerequisite section)
- [x] Gaps G1–G6 mapped to `R1`–`R7`
- [x] Catalog-only per-1M economics constraint explicit
- [x] `cost_per_1k_tokens_est` retained as catalog-derived routing estimate (user clarification 2026-06-11)
- [x] Endpoint/vendor actual cost excluded from estimate population (`R7`)
- [x] Moonshot consolidation and canonical pricing covered (`R1`–`R3`, `R8`)
- [x] Router integration and diagnostics covered (`R5`–`R6`, `R9`)
- [x] Strict TDD and packaged-runtime proof required (`R10`)
- [x] Run 39 deliverables protected in Out of Scope and `R0`
- [x] User lock approval recorded (2026-06-11 — lock and implement in worktree)

Coverage: PASS

## Approval Gate

- [x] Requirements bounded to economics + Moonshot consolidation; run 39 not re-implemented
- [x] Acceptance criteria observable via APIs, routing diagnostics, tests, and restart drill
- [x] User approved run creation and requirements draft (2026-06-11)
- [x] Run id confirmed: `40-catalog-economics-moonshot-consolidation`
- [x] User confirmed proceeding to Phase 0 lock / Phase 1 / implementation (2026-06-11)
- [x] User approved lock and worktree implementation (2026-06-11)

Approval: PASS
