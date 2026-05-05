Type: `domain`
Status: `CURRENT`
Scope: `Stable baseline ownership for the repo workspace, canonical protocol tree, shared packages, router family, fixtures, and validation surfaces introduced by run 00, tightened by runs 01-03, and extended through the single-host router-runtime baseline completed in runs 04-11.`
Owns-Paths:
- `/README.md`
- `/LICENSE`
- `/CLA.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/biome.json`
- `/tsconfig.base.json`
- `/rust-toolchain.toml`
- `/.github/workflows/ci.yml`
- `/docs/**`
- `/protocol/**`
- `/packages/**`
- `/role-model-router/**`
- `/testdata/**`
Watch-Paths:
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Source-Runs:
- `00-baseline`
- `01-protocol-routing-obs`
- `02-audit-remediation`
 - `03-protocol-baseline-hardening`
 - `04-router-runtime-architecture-lock`
 - `05-router-runtime-catalog-foundation`
 - `06-router-runtime-provider-accounts-sqlite-memory`
 - `07-router-runtime-endpoint-registry-context-envelope`
 - `08-router-runtime-protocol-routing`
 - `09-router-runtime-adapter-execution-plane`
 - `10-router-runtime-host-integration`
 - `11-router-runtime-observability-feedback`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-05-05T19:30:51.752+08:00`
Tags:
- `baseline`
- `workspace`
- `protocol`
- `router`
- `validation`
- `runtime`

# Role-Model Baseline

This repository now has a real product baseline rather than only recursive scaffolding.

## What This Domain Owns

- The root workspace/toolchain manifests and repo navigation docs
- The canonical JSON Schema contracts and related protocol docs
- Shared packages for protocol types, schema tooling, conformance, store contracts, and packaging
- Router packages/apps, provider scaffolds, skill READMEs, and native placeholder crates
- Fixture data and the CI workflow

## Durable Truths

- Canonical machine-readable protocol contracts live under `/protocol/schemas/`
- Generated protocol types live under `/packages/protocol-types/src/generated.ts`
- The deterministic router contract lives under `/role-model-router/packages/core/`
- Schema validation covers the canonical schema set plus the required fixture corpus
- Schema validation now covers the canonical schema set plus an expanded valid, invalid, minimal, and edge fixture corpus
- Canonical schema sources under `/protocol/schemas/` now self-identify with stable in-file `$id` values, and both schema-tools and conformance fail fast if those ids are missing or mismatched
- Fixture-driven router conformance lives under `/packages/conformance/src/router-fixture-conformance.test.ts` and is backed by `/protocol/fixtures/router-golden/cases/`
- The router now applies role/task/binding-aware eligibility, provider and endpoint policy filters, canonical compute-preference/strategy aliases, normalized weighted scoring, explicit exclusion codes, and explainable scored-candidate diagnostics
- Observed-performance aggregation now uses deterministic multi-sample semantics with `measurement_window`, `endpoint_version`, benchmark/live-request source counts, failure/error-class rates, freshness/confidence, and mixed-version rejection
- Trace and usage packages expose stable read/linkage helpers, and usage also exposes summary reducers by app, endpoint, model, and provider kind
- The smoke path exercises the hardened baseline end to end with a fixture-driven router case and validates emitted artifacts against schemas and linkage helpers before exit
- The stable config export path emits normalized ACP, MCP, and CLI endpoint inventory rather than a CLI-only snapshot
- The protocol docs now carry both the baseline role/task examples and the hardened M1-M3 contract details for profiles, traces, usage, benchmarks, and reason codes
- The current router-runtime baseline is single-host and local-machine scoped, not distributed or multi-host
- The runtime stack now includes runtime-owned provider-account, SQLite memory, endpoint registry, context envelope, retrieval receipt, protocol routing, adapter execution, provider-family adapters, a managed TypeScript runtime host bridge, and a shared runtime observability layer
- The live host path is a managed TypeScript bridge in `/role-model-router/apps/runtime-host-bridge/` over vendored `/role-model-router/vendor/llama-swap/`, with raw vendor surfaces preserved and structured role-model inspection routes added beside them
- Structured inspection now includes `/api/role-model/requests`, `/api/role-model/requests/:id`, and `/api/role-model/endpoints/:endpointId/profile`, while raw `/logs`, `/logs/stream`, `/api/events`, `/api/metrics`, and `/api/captures/:id` remain vendor-owned operator surfaces
- Runtime request observations, grouped diagnostics, capture-policy receipts, profile-feedback shaping, and deterministic OpenTelemetry GenAI export mapping are shared through `/role-model-router/packages/runtime-observability/`
- Browser, edge, and native provider families are intentionally scaffold-grade in this baseline

## Validation Path

- Prefer the repo's existing validation chain rather than ad hoc commands
- Root workspace scripts now use PATH-independent nested `corepack pnpm ...` invocations so the canonical shell-out entrypoints stay stable even when a child shell does not expose a global pnpm shim
- GitHub Actions validates this repo from a clean checkout of tracked files only; local Biome parity work should prefer a clean export or tracked-file-targeted checks instead of repo-root sweeps that also traverse nested `.worktrees/`
- On Windows, CRLF-only worktree churn can make local status noisier than the real Linux CI content diff; use `git diff` to identify the actual files that need formatter commits
- The repo-local runtime validation floor is the staged command family `runtime:validate-state`, `runtime:validate-registry`, `runtime:validate-routing`, `runtime:validate-adapter`, `runtime:validate-host`, `runtime:validate-observability`, plus `smoke`
- When validating runtime work, treat the focused runtime validators and package tests as the run-owned baseline; broader root `build` and `test` still reproduce the inherited schema-tools/Biome generated-types failure, and vendored full `go test ./...` on Windows still reproduces the upstream `sleep` PATH assumption

## Scope Boundary

- Do not overclaim provider completeness from the scaffold packages or placeholder rust crates
- Keep future runtime work honest: promote real runtime capability only when backed by implementation and validation, not by directory presence alone
