# STATE.md

## Current State

- The repository is a pnpm workspace with shared TypeScript and Rust baselines, canonical JSON Schemas under `/protocol/schemas/`, shared root packages under `/packages/`, router packages/apps under `/role-model-router/`, fixtures under `/protocol/fixtures/` and `/testdata/`, and CI under `/.github/workflows/ci.yml`.
- Schema validation and protocol type generation are handled by `/packages/schema-tools/` and `/packages/protocol-types/`; the canonical validation path now validates `19` schema files plus `12` required fixture files.
- The deterministic routing core lives in `/role-model-router/packages/core/` and now applies role/task-aware eligibility, provider/endpoint policy filters, canonical `computePreference` and strategy aliases, normalized weighted scoring, unknown-metric redistribution, and deterministic fallback ordering.
- Fixture-driven routing conformance now lives in `/packages/conformance/src/router-fixture-conformance.test.ts` and is backed by the router golden corpus under `/protocol/fixtures/router-golden/cases/`.
- The observed-performance aggregation path in `/role-model-router/packages/profile-aggregator/` now uses deterministic multi-sample semantics with `sample_window`, `sources`, median/p95 latency, failure/error-class rates, freshness/confidence, and mixed `endpoint_version` rejection.
- The smoke path in `/role-model-router/apps/gateway-smoke/` emits linked router-decision, trace, usage, config-export, and observed-performance artifacts under `/runtime-output/` using run-01 linkage ids and canonical trace/event/span shapes.
- The stable config export under `/role-model-router/apps/router-devtools/` emits a normalized ACP/MCP/CLI endpoint inventory with endpoint identity fields plus declared capability metadata in `runtime-output/router-devtools/config-export.json`.
- The protocol docs under `/docs/protocol/` now include stricter run-01 routing-policy, profile, trace, usage, role, task, and role-task-capability details in addition to the baseline role/task examples added in run 00.
- Future browser, edge, and native runtime families are still represented as scaffold-grade package/crate boundaries rather than production-complete implementations.
- The current validated run-01 command chain is:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Operational caveats:
  - unsupported-engine warnings persist because the repo expects `Node >=22 <23` while this environment is running `Node v24`
  - `corepack pnpm exec biome check .` still reports pre-existing Windows formatting drift in tracked baseline files and was intentionally kept out of run-01 scope
