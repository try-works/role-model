Type: `domain`
Status: `CURRENT`
Scope: `Stable baseline ownership for the repo workspace, canonical protocol tree, shared packages, router family, fixtures, and validation surfaces introduced by run 00, tightened by run 01 and run 02, and hardened to the M1-M3 protocol baseline in run 03.`
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
Validated-At-Commit: `working-tree`
Last-Validated: `2026-04-25T06:13:00+08:00`
Tags:
- `baseline`
- `workspace`
- `protocol`
- `router`
- `validation`

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
- Browser, edge, and native provider families are intentionally scaffold-grade in this baseline

## Validation Path

- Prefer the repo's existing validation chain rather than ad hoc commands
- Root workspace scripts now use PATH-independent nested `corepack pnpm ...` invocations so the canonical shell-out entrypoints stay stable even when a child shell does not expose a global pnpm shim
- GitHub Actions validates this repo from a clean checkout of tracked files only; local Biome parity work should prefer a clean export or tracked-file-targeted checks instead of repo-root sweeps that also traverse nested `.worktrees/`
- On Windows, CRLF-only worktree churn can make local status noisier than the real Linux CI content diff; use `git diff` to identify the actual files that need formatter commits

## Scope Boundary

- Do not overclaim provider completeness from the scaffold packages or placeholder rust crates
- Keep future runtime work honest: promote real runtime capability only when backed by implementation and validation, not by directory presence alone
