# AS-IS Evidence — runtime-ui consumers + fixtures (Run 92 Phase 1)

Captured by delegated subagent `9f70f7ef` on `2026-08-21`, verified against source in
`role-model-router/apps/runtime-ui/app/`.

## Key findings

- `fetchRuntimeModels` (lib/runtime-api.ts:1639-1647) silently falls back from
  `/api/role-model/models` to `/v1/models` (OpenAI contract) — the "configured pool" can be
  populated from a non-membership source with no UI provenance signal.
- `buildConfiguredModelCards` (lib/view-models.ts:1926-2142) emits dual identities: merged model
  cards (`modelId`) vs effort-instance cards (`identityKey = endpointId`); consumers must key
  `identityKey ?? modelId` (control-models.tsx:488-490) or the two diverge.
- Candidate-space synthesis (lib/candidate-space.ts): quality fallback `0.55` (line 102), speed
  fallback `0` (line 120), cost fallback `0.88` local / `0.58` remote (lines 163/165), `clamp01`
  coerces non-finite to `0` (60-65). The dashboard "Model pool" scatter can place an un-scored
  candidate at Q=55%/C=58%/S=0% with no "no data" marker.
- Missing-score-as-zero leaks: `control-benchmark.tsx:232` (`benchmark_samples ?? 0`), and
  `control-benchmark.tsx:258-267` (per-bucket `score ?? 0` / `cases ?? 0`); `view-models.ts:1040`
  (`p95LatencyMs ?? 0 ms`); plus dead-code `?? 0` in control-models.tsx:906/917 and
  local-model-role-picker.tsx:362/370.
- `fetchBenchmarkSummary`/`fetchBenchmarkPortfolio` are endpoint-id-keyed; benchmark join uses
  `endpointId` only (control-benchmark.tsx buildModelScoreRows 196-278).
- Eject: active controller CANNOT be ejected (control-models.tsx:368, 1303-1307 — disabled with
  "Assign another primary controller before removing this model"); `eject-configured` requires
  2-click confirmation but `unload-local` executes immediately (1325-1327); controller reassignment
  picks `endpointIds[0]` blindly (1269) with no confirmation.
- `fetchRuntimeModels` /v1/models fallback + candidate-space synthesis + missing-latency-as-zero are
  the top three production truthfulness defects in the UI layer.
