# Repository Boundaries

## Canonical ownership

- `protocol/` owns machine-readable protocol contracts and fixtures.
- `docs/` owns human-readable architecture, protocol semantics, and ADRs.
- root `packages/` owns shared protocol-wide tooling that is not router-specific.
- `role-model-router/` owns routing engines, host scaffolds, provider adapters, apps, and native crates.
- `testdata/` owns prompts, eval cases, sample traces, and endpoint metadata used for validation.

## Anti-drift rules

1. Host implementations must not redefine protocol semantics.
2. Shared protocol types must derive from canonical schemas rather than drift from them.
3. Router packages may extend host behavior, but they must not introduce incompatible protocol fields.
4. Fixtures in `testdata/` must remain representative of the canonical schemas and docs.
