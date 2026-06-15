Run: `/.recursive/run/44-kimi-k2.7-code-catalog/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-15T03:07:41Z`
LockHash: `06dcb4b2075e043d8c3ad19a9d6d0ca1526a3c39aa4bcbae20de745416b1ca4a`
User approval: `2026-06-14` (requirements approved for implementation)
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md` (catalog pipeline baseline)
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md` (`CANONICAL_MODEL_ID_ALIASES`, operator `moonshot` only)
- models.dev canonical model page: https://models.dev/models/moonshotai/kimi-k2.7-code/
- models.dev API: `https://models.dev/api.json` (`moonshotai.models.kimi-k2.7-code`)
- Audit transcript: Kimi K2.7 missing from Connect UI when Moonshot AI + Kimi Code selected (`43bc0f89-dfe3-4319-bcc4-aa61b8317713`)
- **Post-run-43 product baseline (authoritative):**
  - `main` @ `fa9f3d1` (run 43 closeout merged via PR #17)
Outputs:
- `/.recursive/run/44-kimi-k2.7-code-catalog/00-requirements.md`
Scope note: Add `moonshotai/kimi-k2.7-code` to the existing catalog pipeline and expose operator id `moonshot/kimi-k2.7-code` on the existing `moonshot` provider (Moonshot Open Platform + Kimi Code variants). **Do not add new providers.** Rebuild packaged runtime so Connect and provider APIs reflect the updated catalog.

## TODO

- [ ] Declare post-run-43 product baseline as implementation starting point
- [ ] Document motivating gap (K2.7 absent from repo + SEA despite models.dev availability)
- [ ] Define stable `R#` identifiers with observable acceptance
- [ ] Record canonical model id mapping from models.dev
- [ ] Record TDD and verification discipline
- [ ] Define implementation slices with RED/GREEN evidence paths
- [ ] Define packaged-runtime QA matrix (Connect + API)
- [ ] Record out-of-scope boundaries
- [ ] User approval of run creation and requirements draft
- [ ] Complete Coverage Gate checklist (controller self-audit before lock)
- [ ] Complete Approval Gate checklist (user lock approval)

## Prerequisite — post-run-43 product baseline

Run 44 implementation **must branch from post-run-43 `main`**.

| Field | Value |
| --- | --- |
| Baseline commit | `fa9f3d1` (post-run-43 `main`) |
| Packaged-runtime proof surface | `:3456` SEA built from `main` |
| Catalog entrypoints | root `catalog:refresh`, `catalog:export`, `runtime:validate-catalog-economics` |

### What exists after run 43 (starting truths)

**Catalog / Moonshot operator slice**

- Normalized catalog ships `moonshot/kimi-k2.5` and `moonshot/kimi-k2.6` under operator provider `moonshot`.
- `moonshotai/kimi-k2.6` exists as a hidden pricing/metadata row; `CANONICAL_MODEL_ID_ALIASES` maps `moonshot/kimi-k2.6` → `moonshotai/kimi-k2.6`.
- `testdata/catalog/models-dev-local-supplement.json` defines operator-facing Moonshot model rows (k2.5, k2.6 only).
- Pinned models.dev snapshot provenance in normalized catalog is stale (May 2026); live API already includes `kimi-k2.7-code`.

**Provider picker / Connect UI**

- `GET /api/role-model/providers` → `moonshot.modelIds` and `kimi-code` variant `modelIds` are both `[moonshot/kimi-k2.5, moonshot/kimi-k2.6]`.
- Connect model dropdown is a faithful projection of variant `modelIds` (`providers.tsx` → `buildAvailableModels`); no K2.7-specific filter exists.

**Model id resolution**

- `listProviders()` → `resolveModelIds("moonshot")` returns catalog models for provider `moonshot` when any exist; LiteLLM `model_prices` is **not** consulted once catalog has moonshot rows.

### Motivating gap (audit summary)

| Gap | Observed on `main` @ `fa9f3d1` | Impact |
| --- | --- | --- |
| **G1** K2.7 never committed | Zero repo matches for `k2.7`, `kimi-k2.7-code`, or `k2p7` | Prior session catalog work did not land on `main` |
| **G2** Stale normalized catalog | Only k2.5/k2.6 under `moonshot` | Runtime + SEA omit K2.7 from Connect and `/v1/models` |
| **G3** Missing pricing alias | `CANONICAL_MODEL_ID_ALIASES` has k2.6 only | Operator id would resolve to unknown economics even if row existed |
| **G4** LiteLLM fixture gap | `litellm-model-prices.json` has `moonshot/kimi-k2.6`, not k2.7 | Downstream execution/economics validators may not recognize new id |
| **G5** Catalog blocks LiteLLM backfill | `resolveModelIds` short-circuits on non-empty catalog | Adding LiteLLM alone would not fix picker without normalized catalog update |

## Canonical model identity (fixed decision)

Source: [models.dev — Kimi K2.7 Code](https://models.dev/models/moonshotai/kimi-k2.7-code/)

| Layer | Model id | Role |
| --- | --- | --- |
| models.dev provider row | `moonshotai/kimi-k2.7-code` | Upstream pricing + capability metadata (`inputPer1M: 0.95`, `outputPer1M: 4`, 262144 ctx, tools/reasoning/structured) |
| Operator connect id | `moonshot/kimi-k2.7-code` | Same pattern as `moonshot/kimi-k2.5` / `moonshot/kimi-k2.6`; shown on Moonshot Open Platform **and** Kimi Code variants |
| Kimi Code API id (models.dev “Kimi For Coding”) | `k2p7` | Reference only for OAuth endpoint family; **do not** introduce a new provider — execution continues through existing `moonshot` + `kimi-code` OAuth path using operator model id unless bridge tests prove a mapping is required |

**Constraint:** Do not add a new catalog provider. Extend existing `moonshot` operator slice and retain `moonshotai` as hidden metadata/pricing backend per run 40.

## Requirements

### `R0` Branch from post-run-43 `main` product baseline

Description:
Implementation and verification start from merged run 43 on `main` @ `fa9f3d1`.

Acceptance criteria:
- Phase 0 worktree records `fa9f3d1` (or later `main` merge commit) as base commit before Phase 3.
- Run 43 benchmark routing display and credential hygiene behavior remain intact.
- No unrelated catalog or Connect UI refactors beyond K2.7 scope.

### `R1` Refresh pinned models.dev snapshot to include `moonshotai/kimi-k2.7-code`

Description:
Run the repo-owned catalog refresh so the pinned snapshot captures the live models.dev row for Kimi K2.7 Code.

Acceptance criteria:
- `pnpm catalog:refresh` succeeds from repo root.
- `testdata/catalog/models-dev-snapshot.json` contains `moonshotai.models.kimi-k2.7-code` with expected limit/cost/modality fields matching live API (262144 context, $0.95/$4.00 per 1M, tools + reasoning + structured_output).
- Refresh provenance (commit sha, capturedAt) updates in exported artifacts.
- If `deriveCapabilities()` lacks `structured_output` → `structured.output` mapping, add it so upstream rows match models.dev capability table (compensating test required).

**TDD slice:** catalog package unit test for `deriveCapabilities` with `structured_output: true` → includes `structured.output`.

### `R2` Add operator slice `moonshot/kimi-k2.7-code` via existing supplement (no new provider)

Description:
Extend the role-model operator Moonshot model list using the established supplement pattern.

Acceptance criteria:
- `testdata/catalog/models-dev-local-supplement.json` adds `moonshot/kimi-k2.7-code` under provider `moonshot` (mirror k2.6 fields: display name, version from release_date, capabilities including `structured.output`, context/output limits, request shape hints).
- `testdata/catalog/models-dev-local-overrides.json` adds a local note for Kimi Code OAuth onboarding (same family as k2.5 note) if applicable.
- No new `providers[]` entry; no new operator provider id.

**TDD slice:** catalog normalization test asserting exported row exists with `providerId: "moonshot"` and expected capabilities.

### `R3` Register canonical pricing alias for operator economics

Description:
Operator model id must resolve catalog token economics through the hidden `moonshotai/*` pricing row per run 40.

Acceptance criteria:
- `role-model-router/packages/catalog/src/token-economics.ts` adds `"moonshot/kimi-k2.7-code": "moonshotai/kimi-k2.7-code"` to `CANONICAL_MODEL_ID_ALIASES`.
- `pnpm runtime:validate-catalog-economics` passes with non-null input/output rates for `moonshot/kimi-k2.7-code`.
- `resolveTokenEconomics({ modelId: "moonshot/kimi-k2.7-code", ... })` returns `inputPer1M: 0.95`, `outputPer1M: 4`, `source: "catalog"`.

**TDD slice:** extend `token-economics.test.ts` (or catalog economics test) for k2.7 alias resolution.

### `R4` Re-export normalized catalog and vendor ledger

Description:
Regenerate durable shipped artifacts consumed by runtime, validation, and SEA packaging.

Acceptance criteria:
- `pnpm catalog:export` succeeds.
- `role-model-router/packages/catalog/data/normalized-catalog.json` includes:
  - `moonshotai/kimi-k2.7-code` (upstream row with pricing)
  - `moonshot/kimi-k2.7-code` (operator row)
- `vendor-version-ledger.json` reflects refreshed models.dev provenance.
- Catalog package tests pass (`pnpm --filter @role-model-router/catalog test`).

### `R5` Expose K2.7 on Moonshot provider API and Connect UI surfaces

Description:
After catalog export, runtime provider listing must include K2.7 on both Moonshot variants without Connect UI code changes.

Acceptance criteria:
- Dev bridge `GET /api/role-model/providers` (moonshot):
  - `modelIds` includes `moonshot/kimi-k2.7-code`
  - `variants[].variantId === "moonshot-open-platform"` → `modelIds` includes k2.7
  - `variants[].variantId === "kimi-code"` → `modelIds` includes k2.7
- Packaged SEA rebuilt via `pnpm runtime:package-sea` shows the same provider payload on `:3456`.
- Connect → Moonshot AI → Kimi Code model dropdown lists `moonshot/kimi-k2.7-code`.
- `/v1/models` includes `moonshot/kimi-k2.7-code` when moonshot remote execution is configured.

**Verification evidence:** log under `/.recursive/run/44-kimi-k2.7-code-catalog/evidence/logs/` capturing provider API JSON snippet and Connect QA note.

### `R6` LiteLLM model-prices awareness (execution readiness)

Description:
Ensure the repo’s LiteLLM price fixture recognizes the operator model id so economics validation and remote execution paths do not treat k2.7 as unknown.

Acceptance criteria:
- Add `moonshot/kimi-k2.7-code` entry to `testdata/catalog/litellm-model-prices.json` aligned with models.dev rates (or refresh from upstream LiteLLM when available).
- If vendored LiteLLM submodule still lacks k2.7 at implementation time, document the gap in Phase 3 implementation summary and confirm dev/test fixture suffices for bridge validation.
- Optional live verification (hybrid QA): one authenticated Kimi Code OAuth chat against `moonshot/kimi-k2.7-code` when operator credentials are available; record pass/fail in Phase 5 evidence without blocking catalog-only merge on credential absence.

**Out of blocking scope:** Upgrading vendored LiteLLM submodule solely for upstream parity unless execution fails in QA.

### `R7` Preserve run 40 Moonshot consolidation invariants

Description:
K2.7 work must not regress single-operator Moonshot UX or hidden `moonshotai` semantics.

Acceptance criteria:
- `GET /api/role-model/providers` still returns exactly one Moonshot connect target (`moonshot`), not a separate `moonshotai` picker row.
- `OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS` unchanged in behavior (`moonshotai` remains hidden).
- Existing k2.5/k2.6 rows, aliases, and variant dedupe behavior unchanged except for additive k2.7 listing.

## Implementation plan (phases)

### Phase 0 — Worktree

- Create worktree from `main` @ `fa9f3d1` → branch `recursive/44-kimi-k2.7-code-catalog`.
- Record diff basis in `00-worktree.md`.

### Phase 1 — AS-IS confirmation

- Confirm live `:3456` (if running) and dev bridge omit k2.7 (baseline evidence).
- Confirm grep baseline: no k2.7 in catalog/supplement/aliases.

### Phase 2 — TO-BE design (locked in this requirements doc)

- Files in scope:

| File | Change |
| --- | --- |
| `testdata/catalog/models-dev-snapshot.json` | Refresh (via `catalog:refresh`) |
| `testdata/catalog/models-dev-local-supplement.json` | Add `moonshot/kimi-k2.7-code` |
| `testdata/catalog/models-dev-local-overrides.json` | Kimi Code local note |
| `role-model-router/packages/catalog/src/token-economics.ts` | Alias k2.7 |
| `role-model-router/packages/catalog/src/refresh.ts` | Optional: `structured_output` capability |
| `role-model-router/packages/catalog/test/*.test.ts` | RED/GREEN for R1–R3 |
| `role-model-router/packages/catalog/data/normalized-catalog.json` | Export |
| `role-model-router/packages/catalog/data/vendor-version-ledger.json` | Export |
| `testdata/catalog/litellm-model-prices.json` | Add k2.7 row (R6) |

- **No changes expected** unless QA proves otherwise:
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts` (`resolveModelIds` — catalog fix is sufficient)

### Phase 3 — Implementation (strict TDD)

Order:

1. **RED:** capability + alias tests fail without k2.7 rows.
2. **GREEN:** supplement + alias + refresh/export.
3. **REFACTOR:** only if duplicate metadata between supplement and snapshot can be trimmed without behavior change.

TDD Mode: `strict` — RED/GREEN log paths required under `evidence/logs/`.

### Phase 4 — Test floor

- `pnpm --filter @role-model-router/catalog test`
- `pnpm runtime:validate-catalog-economics`
- Targeted bridge test if added for `listProviders` moonshot modelIds (optional; API QA may suffice).

### Phase 5 — QA (agent-operated)

QA Execution Mode: `agent-operated`

| Step | Check |
| --- | --- |
| Rebuild SEA | `pnpm runtime:package-sea` from worktree |
| Start runtime | `:3456`, isolated state root |
| API | `GET /api/role-model/providers` lists k2.7 on moonshot + kimi-code |
| API | `GET /v1/models` includes k2.7 |
| Connect UI | Moonshot AI → Kimi Code → model dropdown shows K2.7 |
| Economics | `runtime:validate-catalog-economics` green |
| Optional | Kimi Code OAuth chat smoke for k2.7 when creds available |

### Phase 6–8 — Closeout

- Decisions receipt if alias/capability mapping is durable pattern.
- STATE.md: note K2.7 operator availability.
- Memory: catalog refresh discipline for new models.dev Moonshot releases.

## Out of scope

- New providers (`kimi-for-coding` as connect target, etc.).
- Rewriting `resolveModelIds` to union catalog + LiteLLM (follow-up hardening only if recurring stale-catalog pain).
- Benchmark case content, routing strategy, or dashboard work (run 43 domain).
- Automatic periodic catalog refresh in CI/build.
- Committing `runtime-ui/build/` or llama-swap dist assets.

## Risk register

| Risk | Mitigation |
| --- | --- |
| LiteLLM upstream lacks `moonshot/kimi-k2.7-code` | Add test fixture entry (R6); optional live OAuth chat in Phase 5 |
| Kimi Code API expects `k2p7` not operator id | Compare with k2.6 OAuth path; add unified-config model mapping only if chat fails |
| Large snapshot diff from refresh | Review diff is models.dev pin update + k2.7; avoid unrelated manual edits |
| SEA not rebuilt after catalog change | R5 explicitly requires `runtime:package-sea` + `:3456` verification |

## Requirement traceability preview

| R# | Primary verification |
| --- | --- |
| R0 | `00-worktree.md` base commit |
| R1 | snapshot contains `kimi-k2.7-code`; capability test |
| R2 | supplement + normalization test |
| R3 | `runtime:validate-catalog-economics` |
| R4 | exported normalized-catalog rows |
| R5 | provider API + Connect QA log |
| R6 | litellm fixture + optional chat log |
| R7 | provider list regression check |

## Approval gates (pre-lock)

- [ ] User confirms run id `44-kimi-k2.7-code-catalog` and scope (catalog + SEA verify, no new providers)
- [ ] User confirms baseline `fa9f3d1`
- [ ] Controller completes Coverage Gate self-audit on this artifact
- [ ] User approves lock
