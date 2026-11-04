# Seeded review telemetry

The review UI charts read `runtime_telemetry_records` plus the bounded
`runtime_observations` page from the instance's
`<state-root>/standalone-runtime-dev/memory/memory.sqlite`. Live fixture traffic only
creates a handful of rows, so most 24h buckets render empty.

## Run

The host must be STOPPED while the script writes SQLite.

```powershell
# 1. Start the review host once so the schema exists, then stop it.
# 2. Seed a deterministic day (320 raw requests, 50-point chart sweep).
node scripts/runtime/seed-review-telemetry.mjs --state-root D:/DEV/rm-clean/ui-review9 --count 320 --seed 20261104
# 3. Start the host again.
```

The script is idempotent: every generated request id starts with `seed-review-`, and a
re-run deletes and replaces only those rows in `runtime_telemetry_records` and
`runtime_observations`.

## Dataset

- 320 raw requests over the last 24h, 4 models/endpoints.
- 12% failures (429/500/503), 58% cache hits, input/output/total tokens and cache-read tokens.
- Latency 110-900ms with an 8% high-latency tail (1.8-4.5s), giving a visible p95.
- 48 observation rows positioned on the newest 50 raw rows, swept across ~23h so the
  activity/overview charts draw all buckets. This is required because the chart readback
  pages the newest 50 raw requests before joining observations.

The seeder asserts a deterministic layout in
`scripts/runtime/seed-review-telemetry.test.mjs`:

```powershell
node --test scripts/runtime/seed-review-telemetry.test.mjs
```

## Capture chart evidence

```powershell
node scripts/runtime/chart-dom-probe.mjs --url http://127.0.0.1:3480 --out-dir <evidence-dir>
```

It drives its own headless Chrome (the shared browser is contested), records SVG path and
series counts per route, and writes `overview.png`, `requests.png`, `routing.png`, and
`probe.json`.

## Benchmark endpoint and suite preconditions

The review host is launched with `--fixture-root testdata/router-runtime/fixtures`; that
fixture registry is the endpoint seed. It provides three runnable endpoints - two subjects
(`openai.personal.primary.us-east-1.fast`, `cli.local.coder`) plus a dedicated judge
(`anthropic.team.shared.us-east-1.default`) that is distinct from both subjects.
The seeder's test asserts that inventory and the bundled benchmark suite's eligible
`quick_benchmark` case before a review run. The seeder does not rewrite fixture files.
