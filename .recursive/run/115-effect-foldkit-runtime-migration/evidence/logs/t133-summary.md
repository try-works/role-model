# Task-133 - /system/benchmark parity with production /app/models/benchmark

## Benchmark scores
- Header values Last run / Suite / Judge (plus Completed timestamp); last-run value is the summary runId.
- Columns Match production: Model, Overall, Profile, Easy, Medium, Hard, p50, p95, Scope, Actions.
- One row per executed summary subject (never deduped by display name): Model cell shows displayName (reasoning effort
  suffix when known), a "`runId · mode`" line (or "profile-derived"), the endpoint path line and the evidence label
  ("Exact (run artifact)" / "No benchmark evidence").
- Per-row Clear dispatches the endpoint clear (same DELETE host path); disabled while running/clearing.
- Panel/summary run mismatch renders both ids; summary refresh on completion remains.

## Taxonomy dimensions
- Description "Filters switch which dimension is active."; the three filters are mutually exclusive (choosing one
  clears the other two).
- An active dimension renders only its endpoint-keyed list with eyebrow "Role/Task/Capability: value", model display
  name, endpoint path and score (no merged all-dimension table).
- Empty states use production wording: no filter -> "Select a taxonomy dimension above to see per-model benchmark
  scores."; filter without scores -> "No benchmark data for the selected taxonomy dimension."; no taxonomy data ->
  the production sentence.

## Run history
- Production list rows: runId, "mode • N cases • N models", "completedAt • suiteId", mode badge, plus the outcome and
  passed/total line from task-126 and the View details action.

## Tests
- s643: one distinct row per subject incl. same-model low/high and v4-pro; summary runId + mismatch.
- s644: filter exclusivity; single-dimension endpoint list; all three taxonomy empty states; history fields; scores
  empty-state sentence.
- s624/s622/s563/s640 updated to the production columns/empty states.
- RED t133-parity-red.log (pre-parity routes/update) -> targeted 55/55 green; tsc 0; full suite 122 files / 1027 tests
  PASS; S247 4/4.

## Packaged / fixture evidence
- Production reference DOM (:3456 /app/models/benchmark): t133-production-benchmark-dom.json + .png - current production has no scores/taxonomy data,
  and renders the same descriptions/empty-state sentences this port now uses.
- Packaged dev host (:3484, same empty-state data): t133-packaged-benchmark-dom.json + .png - matches production
  section text and endpoint column headers (Model/Path/Scope/Status plus the port's Actions column).
- 3-endpoint fixture rendered from the committed view with host-shaped summary/runs (two DeepSeek Flash efforts +
  DeepSeek V4 Pro): t133-benchmark-3-endpoints.png/html/dom.json shows 3 distinct rows
  (deepseek.flash.low / flash.high / v4-pro), production columns Model..Actions with 3 Clear actions, taxonomy
  "Role: coder" single-dimension list of 3, and history "quick • 12 cases • 3 models" + outcome 11/12.
