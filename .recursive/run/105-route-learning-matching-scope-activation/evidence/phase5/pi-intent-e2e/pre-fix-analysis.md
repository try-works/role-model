# Run105 Phase5 — authoritative real Pi request analysis (pre-fix)

Boundary: development `:3458` only. Downstream provider bodies are not the intent authority; the runtime consumes `role_model.intent`.

## Result
- Recent requests analyzed: 20
- Exact role/task classified: 20/20
- Durable capture readable: 20/20
- Unclassified count from replay status: 0
- Replay jobs: 0
- Evaluation jobs: 0
- Queue rows: 0
- Learning pipeline recent/pending: 0 at all stages
- Auto replay: degraded, `route pending dispatches unavailable`

## Strongest pair
`coder|coder.edit`: five real request/capture ids:
- `req-dfd13a5b-dce2-4f96-8134-764a8cfd4610`
- `req-83f0beea-cd49-462e-92db-1ef21d892795`
- `req-ec7dfc53-937c-4fd7-9bf0-469a35282538`
- `req-3da6dcef-0be0-45f2-a631-755f11f8eac0`
- `req-a46d93d9-05c1-4831-9382-2131c9860835`

Runtime detail for `req-a46d...` records group `engineering`, role `coder`, task `coder.edit`, capabilities `code.read`, `code.write`, `reasoning.multi_step`; capture evidence is status `ok` with complete trace root.

## Root cause
The fresh queue projection returns `available:false`, reason `queue store has no rows yet`, `jobs:[]`. `readPendingRouteDispatches` interpreted every `available:false` as unavailable and returned null, aborting the first auto-replay tick.

Full machine evidence: `live-request-replay-analysis.json`, `runtime-latest-details.json`, `capture-evidence.json`, `learning-readbacks.json`.
