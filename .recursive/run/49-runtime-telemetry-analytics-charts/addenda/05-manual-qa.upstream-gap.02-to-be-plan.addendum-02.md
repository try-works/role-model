Run: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
Phase: `05 MANUAL QA upstream-gap addendum for 02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-06-18T10:55:31Z`
LockHash: `0daf47183ee6a8419a828ce91ad5cc7930b52e360e953aa5a0e453bf73d5713a`
Inputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/02-to-be-plan.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/03-implementation-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`
Outputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`
Scope note: This addendum amends Phase 5 after a requirements traceability audit found that the analytics implementation is structurally present but still has contract and proof gaps before run 49 can close. It defines the remaining repair plan, strict TDD slices, and rebuilt-runtime browser verification required before operator manual QA can be requested again.

## TODO

- [x] Capture the audit findings that block Phase 5 closeout
- [x] Map each finding to the affected run-49 requirement IDs
- [x] Define the remaining backend/API repair plan
- [x] Define the remaining frontend/request-detail repair plan
- [x] Define strict RED/GREEN test slices for every production repair
- [x] Define rebuilt-runtime verification with populated chart data
- [x] Define evidence paths and QA acceptance criteria

## Audit Finding Summary

### Finding 1: telemetry query validation accepts unsupported contract keys

Observed issue:

- `POST /api/role-model/telemetry/query` accepts unsupported metric and breakdown strings with `200`.
- The current parser only validates that `metrics` is a non-empty string array and that `breakdown` is a string when provided.
- Unsupported keys then flow into aggregation and produce empty or partial responses, creating false-positive QA risk.

Relevant code:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `readTelemetryAnalyticsQuery`
  - `computeTelemetryMetricValue`
  - `getTelemetryDimensionValue`
  - `queryTelemetryAnalyticsData`

Contract impact:

- Violates `R3` deterministic validation and unsupported-combination semantics.
- Undermines `R10` because browser/API verification can accidentally use non-contract names and still appear successful.

Required outcome:

- The backend must reject unsupported metrics, breakdown dimensions, ranking dimensions, ranking metrics, filter values where enumerated, invalid ranges, and invalid window/granularity combinations with `400` and a precise error message.
- Invalid query inputs may not return a nominally successful empty chart response.

### Finding 2: current rebuilt runtime does not prove populated chart QA

Observed issue:

- The current `http://127.0.0.1:3456` runtime reports zero telemetry requests through:
  - `GET /api/role-model/telemetry/summary`
  - `GET /api/role-model/telemetry/requests?limit=10`
  - `POST /api/role-model/telemetry/query`
- Existing Phase 5 notes claim populated chart verification, but the current runtime state no longer demonstrates it.
- Saved route-sweep evidence proves routes render, but not that required charts are populated by current backend query results.

Relevant artifacts:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-summary.json`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-query-models.json`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/browser-route-sweep-3456-final.json`

Contract impact:

- Blocks `R10` because every primary chart on `/app`, `/app/observe/requests`, and `/app/observe/routing` must be practically verified in-app with populated data.
- Blocks operator QA because the live browser target must be seeded and reproducible before manual review.

Required outcome:

- The QA runtime launcher must seed or replay deterministic telemetry every time the rebuilt runtime starts for Phase 5 QA, unless explicitly launched in an empty-state mode.
- Phase 5 evidence must record the exact launcher mode, seed status, request count, aggregate totals, and chart population results from the same runtime instance presented to the operator.

### Finding 3: saved Phase 5 analytics evidence used non-contract metric and breakdown names

Observed issue:

- Saved evidence uses `totalEffectiveCostUsd` and `selectedModelId` in an analytics query response.
- The run-49 analytics query contract uses `effectiveCostUsd` and `modelId`.
- `totalEffectiveCostUsd` is a summary field, not an analytics metric.
- `selectedModelId` is a persisted request-time field, but it is not in the approved analytics query dimension enum for this run.

Relevant artifacts:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/phase5-telemetry-query-models.json`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`

Contract impact:

- Blocks `R3` and `R10` until evidence is regenerated with the approved analytics query names.
- Creates ambiguity around whether model-selection charts use the approved `modelId` dimension or a route-local/legacy `selectedModelId` approximation.

Required outcome:

- All Phase 5 analytics query evidence must use approved query metric and dimension names.
- Any intentional support for `selectedModelId` as a distinct historical dimension must be added through an approved requirement update; otherwise it must not be accepted by the generic query endpoint.

### Finding 4: request-detail cost display bypasses stored authoritative effective cost

Observed issue:

- Request detail renders `actualCostUsd ?? estimatedCostUsd` from the raw usage event.
- It does not render stored `effectiveCostUsd`.
- It does not display cost calculation basis, version, baseline source, or savings support.

Relevant code:

- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`

Contract impact:

- Violates `R8` request-detail cost auditability.
- Violates the backend-frontend alignment rule that any cost surface derives from the stored authoritative per-request calculated cost field.

Required outcome:

- Request detail must render stored `effectiveCostUsd` when available.
- The detail copy must expose calculation basis and version in a concise operator-readable form.
- If selected uncached cost, baseline max eligible cost, routing savings, cache savings, total avoided cost, baseline source, and support status are present, request detail should expose them in a compact cost-audit panel or facts group.
- Raw usage actual/estimated cost may remain visible only as supporting provenance, not as the displayed authoritative cost.

### Finding 5: cache hit token rate ignores trustworthy denominator semantics

Observed issue:

- `cacheHitTokenRate` is computed from `cacheReadTokens / (inputTokens + cacheReadTokens)` whenever the numeric denominator is non-zero.
- The computation does not require that cache-read token semantics are supported/trustworthy for the selected slice.

Relevant code:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `computeTelemetryMetricValue`

Contract impact:

- Violates `R3` and the No-Data/Unavailable contract for `cacheHitTokenRate`.
- Can show a misleading cache hit percentage for providers or slices where cache token reporting is unavailable or mixed.

Required outcome:

- `cacheHitTokenRate` must return an explicit unavailable/null result unless the selected slice has trustworthy denominator semantics.
- The API must preserve enough information for the frontend to distinguish:
  - no cache-hit activity
  - cache telemetry unsupported
  - filtered slice with no matching cache-token denominator
- Chart empty/unavailable copy must reflect that distinction.

## Amended Remaining Work Plan

### Slice 1: harden telemetry query contract validation

Production targets:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`

Required changes:

- Define runtime-owned arrays or sets for supported analytics metrics and dimensions.
- Validate every requested metric against the supported metric set.
- Validate `breakdown` against the supported dimension set.
- Validate `ranking.dimension` and `ranking.metric` against the supported sets.
- Validate `ranking.limit` as a bounded positive integer.
- Validate `windowMs`, `startAtMs`, `endAtMs`, and granularity combinations so impossible or negative windows reject deterministically.
- Ensure unsupported query keys return `400` from the HTTP endpoint with actionable error messages.
- Align frontend TypeScript types and tests to the same allowed metric/dimension names.

Acceptance criteria:

- `totalEffectiveCostUsd` is rejected as an analytics metric.
- `selectedModelId` is rejected as an analytics breakdown unless explicitly approved later as a new dimension.
- Valid queries for `effectiveCostUsd` and `modelId` still return deterministic data.

### Slice 2: make cache hit token rate support-aware

Production targets:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`

Required changes:

- Compute `cacheHitTokenRate` only when all records contributing to the denominator have trustworthy cache-read token support, or when an explicitly documented mixed-support rule is implemented.
- Return `null` for unsupported/unavailable slices instead of a misleading percentage.
- Preserve `cacheHitTokens` and `cacheReadTokens` as numeric metrics where values are directly known.
- Update frontend chart view models so `null` rate values produce unavailable/empty-state copy instead of zero-valued chart lines.
- Ensure empty-state copy distinguishes unsupported cache token semantics from no cache activity.

Acceptance criteria:

- A slice with cache unsupported returns unavailable/null for `cacheHitTokenRate`.
- A slice with supported cache-read tokens returns the expected rate.
- The cache chart does not display fake zero-rate data for unsupported slices.

### Slice 3: align request-detail cost with authoritative stored cost

Production targets:

- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

Required changes:

- Ensure request-detail API types expose:
  - `effectiveCostUsd`
  - `costCalculationBasis`
  - `costCalculationVersion`
  - `selectedUncachedCostUsd`
  - `baselineMaxEligibleCostUsd`
  - `routingCostSavingsUsd`
  - `cacheCostSavingsUsd`
  - `totalAvoidedCostUsd`
  - `costBaselineSource`
  - `costSavingsSupport`
- Render `effectiveCostUsd` as the primary cost value.
- Render concise cost-audit metadata in request detail.
- Keep raw actual/estimated cost as subordinate provenance if useful.
- Do not add charting to request detail unless the optional contextual mini-chart scope is explicitly implemented and verified.

Acceptance criteria:

- Request detail primary cost equals stored authoritative `effectiveCostUsd`.
- Calculation basis/version are visible without opening raw JSON.
- No request-detail cost surface uses `actualCostUsd ?? estimatedCostUsd` as the authoritative displayed cost.

### Slice 4: make Phase 5 QA data seeding reproducible for rebuilt runtime review

Production or QA targets:

- `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/phase5-qa-launch.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`

Required changes:

- Ensure the launcher used for operator review starts the rebuilt runtime with seeded telemetry by default.
- Ensure seeding is idempotent enough for repeated starts during Phase 5.
- Log seed status, request count, first/last timestamp, and seeded scenario coverage.
- Provide a distinct empty-state QA mode only if explicitly needed; do not silently start an empty runtime when Phase 5 populated chart QA is pending.
- Regenerate Phase 5 API evidence from the same runtime instance shown in the browser.

Acceptance criteria:

- Immediately after QA runtime startup, `GET /api/role-model/telemetry/summary` returns the expected seeded request count.
- Valid `POST /api/role-model/telemetry/query` calls for overview, requests, and routing chart slices return non-zero populated results.
- The current browser target and saved evidence agree on telemetry count and aggregate totals.

### Slice 5: regenerate populated chart proof for every required chart

Verification targets:

- `/app`
- `/app/observe/requests`
- `/app/observe/routing`
- `/app/observe/activity`
- `/app/observe/logs`
- one `/app/observe/requests/:requestId` detail route
- representative route sweep paths from addendum 01

Required changes:

- Rebuild runtime UI after the code repairs.
- Restart the QA runtime in seeded mode.
- Verify with API probes before browser QA:
  - summary request count
  - request ledger count
  - overview token/cost/cache/latency/failure query totals
  - requests chart query totals and ranking
  - routing difficulty/role/model/strategy/cost-savings query totals
  - invalid query rejections
  - cache unsupported/null semantics where applicable
- Verify in browser that all required chart containers render with populated data, not just headings.
- Verify no-data/unavailable states for at least one unsupported or filtered slice.
- Verify request-detail cost audit metadata.
- Verify route sweep still passes after repairs.
- Verify light and dark theme chart behavior and at least one narrow viewport pass.

Acceptance criteria:

- `/app` visibly renders the six required overview charts with populated seeded data.
- `/app/observe/requests` visibly renders all required request analytics charts with populated seeded data and the ledger below.
- `/app/observe/routing` visibly renders cost avoided, decision volume, difficulty distribution, strategy selection, role demand, and model selection with populated seeded data.
- API evidence and browser evidence are generated from the same runtime process.

## Strict TDD Requirements

TDD Mode: `strict`

Every production repair must be preceded by a failing test.

Required RED/GREEN slices:

1. `analytics-query-invalid-metric-red`
   - failing test: unsupported metric such as `totalEffectiveCostUsd` returns `400`
   - green: backend validates metric enum and valid metrics still pass
2. `analytics-query-invalid-dimension-red`
   - failing test: unsupported breakdown such as `selectedModelId` returns `400`
   - green: backend validates breakdown/ranking dimensions and valid dimensions still pass
3. `analytics-query-ranking-validation-red`
   - failing test: invalid ranking metric/dimension/limit rejects
   - green: ranking validation is deterministic
4. `cache-hit-token-rate-support-red`
   - failing test: unsupported cache-read denominator returns null/unavailable
   - green: supported denominator computes expected rate
5. `request-detail-authoritative-cost-red`
   - failing test: request detail source/render path must prefer `effectiveCostUsd` and expose calculation basis/version
   - green: request detail uses authoritative cost metadata
6. `phase5-seeded-runtime-red`
   - failing test or launcher probe: QA launcher starts without seeded telemetry or produces zero summary
   - green: seeded runtime summary and query totals are non-zero immediately after startup
7. `phase5-query-contract-red`
   - failing test or script: Phase 5 evidence generation uses only approved metric/dimension names
   - green: generated evidence uses `effectiveCostUsd`, `modelId`, `requestedRoleId`, `difficultyBucket`, and `selectedStrategy`
8. `populated-routing-chart-model-red`
   - failing frontend/view-model test: routing chart definitions must produce populated chart models for seeded difficulty/role/model/strategy data
   - green: all routing chart models are non-empty for the seeded response fixture

Evidence requirements:

- Save RED logs under `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/red/`.
- Save GREEN logs under `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/green/`.
- Save rebuilt-runtime build logs under `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/build/`.
- Save Phase 5 browser/API evidence under `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/logs/qa/`.

No production edit in this addendum may be treated as visual-only or small enough to bypass RED.

## Browser Verification Plan

After all GREEN evidence exists:

1. Rebuild runtime UI:
   - `corepack pnpm --filter @role-model-router/runtime-ui build`
2. Restart QA runtime on `127.0.0.1:3456` using the seeded Phase 5 launcher.
3. Capture API proof from the live runtime:
   - `GET /api/role-model/telemetry/summary`
   - `GET /api/role-model/telemetry/requests?limit=10`
   - valid `POST /api/role-model/telemetry/query` for each chart family
   - invalid `POST /api/role-model/telemetry/query` for unsupported metric/dimension
4. Verify in the browser:
   - `/app`
   - `/app/observe/requests`
   - `/app/observe/routing`
   - `/app/observe/activity`
   - `/app/observe/logs`
   - one request detail URL from the seeded ledger
   - full route sweep from `/role-model-router/apps/runtime-ui/app/routes.ts`
5. Verify themes:
   - dark mode populated charts
   - light mode populated charts
   - persisted theme after reload
6. Verify responsive behavior:
   - one narrow viewport pass on `/app/observe/requests`
   - one narrow viewport pass on `/app/observe/routing`

Phase 5 may not be marked ready for operator sign-off until this verification is recorded.

## Traceability

- `R3` -> query enum validation, invalid query semantics, cache-rate unavailable semantics
- `R8` -> request-detail authoritative cost and cost-audit metadata
- `R9` -> strict RED/GREEN test slices for every production repair
- `R10` -> reproducible seeded runtime, populated chart proof, rebuilt-runtime browser QA, route sweep, light/dark and responsive checks

## Coverage Gate

- [x] all five audit findings are captured
- [x] each finding maps to concrete repair slices
- [x] backend/API validation gaps are covered
- [x] frontend request-detail cost gap is covered
- [x] cache-rate support semantics are covered
- [x] Phase 5 populated runtime evidence gap is covered
- [x] strict TDD requirements are explicit
- [x] rebuilt-runtime browser verification is explicit

Coverage: PASS

## Approval Gate

- [x] addendum is specific enough to guide implementation after user approval
- [x] addendum does not modify locked prior artifacts
- [x] addendum preserves run 49 chart scope and addendum 01 route/design-system repairs

Approval: PASS
