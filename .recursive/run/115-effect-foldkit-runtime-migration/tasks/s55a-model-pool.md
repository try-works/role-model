# S55a Overview: model-pool scatter and token-usage chart (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The reference Overview (`evidence/reference/reference-app.png`) shows a **Model pool** card - a 2D scatter where axes are Quality (up), Cost (left, inverted so higher is cheaper) and Speed (right), with markers sized by route score - and a **Token usage over time** card (input/output/total token flow across the window). Ours shows only two aggregate cards, which is the largest remaining visual difference.

## Required work

1. **Model pool card**: render a scatter from real data the host already exposes (candidates/endpoints with quality, cost and speed fields; if a field is missing, say which and drop that axis rather than inventing values). Axes labelled as in the reference, marker size proportional to the route score, hover/focus showing the model id and its values, and an accessible table equivalent for screen readers. If the host genuinely lacks a field, state it and render what exists - no fabricated points.
2. **Token usage card**: a time-bucketed chart of input/output/total tokens from the same windowed telemetry items used by the existing charts (add token fields to the bucketing), with the same empty-bucket and stale-window rules.
3. Keep the existing latency and success/failure cards; the Overview becomes four cards in the reference's order: Model pool, Token usage, Latency, Success vs failure (or state the order you chose and why).
4. Tests: point count and axis mapping for the model pool (a mutation that swaps cost/quality must fail); token series values per bucket (a mutation that sums input+output wrong must fail); four states per card; and the accessible table content.

## Verification

Rebuild, serve through the packaged executable with `--static-root` on an ephemeral port, seed a few requests so telemetry exists, screenshot at 1920x1080 and compare with `evidence/reference/reference-app.png`. Report remaining differences.

## Files
`apps/runtime-ui-next/src/**`, tests, fixtures; evidence `s55a-*` with RED logs.

NO host changes, no new dependency (use `@role-model/ui/foldkit-chart`), no recharts/ECharts, no packaging, no installs, no commits, no subagents; never POST to :3456.

## Report
How each axis and series maps to a host field, the card order, fixtures with provenance, the REDs, the screenshot comparison, counts and typecheck.