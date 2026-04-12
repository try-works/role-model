Type: `domain`
Status: `CURRENT`
Scope: `Stable baseline ownership for the repo workspace, canonical protocol tree, shared packages, router family, fixtures, and validation surfaces introduced by run 00 and tightened by run 01 protocol-routing-observability refinements.`
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
Validated-At-Commit: `working-tree`
Last-Validated: `2026-04-12T21:46:55Z`
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
- Fixture-driven router conformance lives under `/packages/conformance/src/router-fixture-conformance.test.ts` and is backed by `/protocol/fixtures/router-golden/cases/`
- The router now applies role/task-aware eligibility, provider and endpoint policy filters, canonical compute-preference/strategy aliases, normalized weighted scoring, and unknown-metric redistribution
- Observed-performance aggregation now uses deterministic multi-sample semantics with `sample_window`, `sources`, failure/error-class rates, freshness/confidence, and mixed-version rejection
- The smoke path exercises the baseline end to end and emits run-01 protocol-shaped artifacts
- The stable config export path emits normalized ACP, MCP, and CLI endpoint inventory rather than a CLI-only snapshot
- The protocol docs carry concrete baseline role/task examples directly in `/docs/protocol/roles.md`, `/docs/protocol/tasks.md`, and `/docs/protocol/role-task-capability-mapping.md`
- Browser, edge, and native provider families are intentionally scaffold-grade in this baseline

## Validation Path

- Prefer the repo's existing validation chain rather than ad hoc commands
- In environments without a global pnpm shim, invoking pnpm through `corepack pnpm` is an acceptable execution fallback so long as repo semantics stay unchanged
- GitHub Actions validates this repo from a clean checkout of tracked files only; local Biome parity work should prefer a clean export or tracked-file-targeted checks instead of repo-root sweeps that also traverse nested `.worktrees/`
- On Windows, CRLF-only worktree churn can make local status noisier than the real Linux CI content diff; use `git diff` to identify the actual files that need formatter commits

## Scope Boundary

- Do not overclaim provider completeness from the scaffold packages or placeholder rust crates
- Keep future runtime work honest: promote real runtime capability only when backed by implementation and validation, not by directory presence alone
