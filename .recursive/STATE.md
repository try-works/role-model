# STATE.md

## Current State

- The repository is now a pnpm workspace with shared TypeScript and Rust baselines, canonical JSON Schemas under `/protocol/schemas/`, shared root packages under `/packages/`, router packages/apps under `/role-model-router/`, fixtures under `/testdata/`, and CI under `/.github/workflows/ci.yml`.
- The deterministic routing core lives in `/role-model-router/packages/core/` and is covered by `/packages/conformance/src/router-conformance.test.ts`.
- Schema validation and protocol type generation are handled by `/packages/schema-tools/` and `/packages/protocol-types/`.
- The smoke path in `/role-model-router/apps/gateway-smoke/` emits router decision, trace, usage, config-export, and observed-performance artifacts under `/runtime-output/`.
- The stable config export under `/role-model-router/apps/router-devtools/` now emits a normalized ACP/MCP/CLI endpoint inventory with endpoint identity fields plus declared capability metadata in `runtime-output/router-devtools/config-export.json`.
- The protocol docs under `/docs/protocol/` now include explicit baseline role/task examples rather than only thin enumerations, matching the stricter external audit interpretation for `R19`.
- Future browser, edge, and native runtime families are represented as scaffold-grade package/crate boundaries rather than production-complete implementations.
- The validated baseline command chain is:
  - `corepack pnpm --filter @role-model/schema-tools exec tsx src/validate-schemas.ts validate`
  - `corepack pnpm --filter @role-model/schema-tools exec tsx src/validate-schemas.ts generate-types`
  - `corepack pnpm exec biome check .`
  - `corepack pnpm -r --if-present build`
  - `corepack pnpm -r --if-present test`
  - `cargo fmt --manifest-path role-model-router/rust/Cargo.toml --all --check`
  - `cargo clippy --manifest-path role-model-router/rust/Cargo.toml --workspace --all-targets -- -D warnings`
  - `cargo test --manifest-path role-model-router/rust/Cargo.toml --workspace`
  - `corepack pnpm --filter @role-model-router/gateway-smoke exec tsx src/index.ts`
