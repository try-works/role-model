Type: `domain`
Status: `CURRENT`
Scope: `Stable baseline ownership for the repo workspace, canonical protocol tree, shared packages, router family, fixtures, and validation surfaces introduced by run 00-baseline.`
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
Validated-At-Commit: `working-tree`
Last-Validated: `2026-04-12T04:14:11Z`
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
- The smoke path exercises the baseline end to end and emits protocol-shaped artifacts
- The stable config export path emits normalized ACP, MCP, and CLI endpoint inventory rather than a CLI-only snapshot
- The protocol docs carry concrete baseline role/task examples directly in `/docs/protocol/roles.md`, `/docs/protocol/tasks.md`, and `/docs/protocol/role-task-capability-mapping.md`
- Browser, edge, and native provider families are intentionally scaffold-grade in this baseline

## Validation Path

- Prefer the repo's existing validation chain rather than ad hoc commands
- In environments without a global pnpm shim, invoking pnpm through `corepack pnpm` is an acceptable execution fallback so long as repo semantics stay unchanged

## Scope Boundary

- Do not overclaim provider completeness from the scaffold packages or placeholder rust crates
- Keep future runtime work honest: promote real runtime capability only when backed by implementation and validation, not by directory presence alone
