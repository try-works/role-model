Type: `episode`
Status: `CURRENT`
Scope: Run 43 benchmark display, routing quality, dashboard latency, global clear, addendum UI IA, env credential refs
Owns-Paths:
Watch-Paths:
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`
- `role-model-router/apps/runtime-host-bridge/src/credential-ref-env.ts`
Source-Runs:
- `/.recursive/run/43-benchmark-routing-display/`
Validated-At-Commit: `WORKTREE-UNCOMMITTED`
Last-Validated: `2026-06-14T00:00:00Z`
Tags:
- `benchmark`
- `routing-quality`
- `credential-hygiene`
- `packaged-runtime-qa`

# Run 43 — Benchmark Routing Display

Trust: operator-verified on packaged SEA `:3456` scope `run43-verify`

## Benchmark operator loop (core run)

- Per-mode API: `GET /api/role-model/benchmark/summaries/by-mode` keeps full and quick runs separate.
- Routing quality: `resolveRoutingBenchmarkQuality` in `benchmark-routing-quality.ts` — case-weighted overall, `hardBlend` when full+quick hard samples exist.
- Candidates API exposes `routingBenchmarkQuality` and `routingQualityScore` distinct from artifact `benchmarkCapability`.
- Global clear: `DELETE /api/role-model/benchmark/data` removes sqlite benchmark samples **and** artifact history.
- Dashboard Overview latency card must pass FactCard `detail` for p95 context (run 41 completion).

## Addendum 01 — Models → Benchmark IA (F1–F3)

- **Do not** use a page-level “Last runs by mode” section; render **Last full run** and **Last quick run (12 hard)** inside each model card.
- Section order: model scores → run benchmark → run history (bottom).
- Persist `benchmark_mode` on benchmark sqlite samples (`quick` | `full`); without it, quick samples count as full and `hardBlend` will not appear.
- Re-verify `hardBlend` on candidates after a **new quick run** on rebuilt SEA when migrating old state.

Evidence: `addenda/05-manual-qa.addendum-01.md`, logs `sp43-r1*.log`, `sp43-r3*.log`, `phase5-addendum-q5-hardblend.log`.

## Addendum 02 — Env credential refs (S1–S3)

- External `runtime-config.yaml` should use `api_key: ${DEEPSEEK_API_KEY}` (not inline `sk-…`).
- Set provider keys in host environment (user or process env before starting SEA).
- `credential-ref-env.ts`: inline `sk-` values must never become `provider_accounts.credential_ref`; normalize to `{PROVIDER}_API_KEY`.
- QA sqlite checks must target the **active scope** db (e.g. `run43-verify/memory/memory.sqlite`), not legacy scope folders in the same state root.

Evidence: `addenda/05-manual-qa.addendum-02.md`, `evidence/scripts/migrate-deepseek-env-credential.ps1`, `sp43-s3-env-credential-live.green.log`.

## Packaged verification notes

- Full + quick coexistence: full 55-case run can remain while quick 12-case run updates quick panel and quick-tagged samples.
- SEA rebuild required after bridge/UI changes; record SHA256 in Phase 5 logs.
