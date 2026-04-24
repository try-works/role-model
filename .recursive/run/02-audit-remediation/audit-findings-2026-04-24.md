# 2026-04-24 Repo Audit Findings

## Document Status

- Status: normative source note for recursive run `02-audit-remediation`
- Source: repository audit performed on 2026-04-24
- Scope: only the concrete gaps identified during that audit

## Findings

### F1. Canonical schemas are missing in-file `$id`

The committed JSON Schema files under `protocol/schemas/` do not declare stable top-level `$id`
fields even though the current M1-M3 requirement requires canonical Draft 2020-12 schemas to carry
stable `$id` values in source.

Observed supporting evidence:

- `protocol/schemas/endpoint-identity.schema.json` and peer schema files have `$schema` and `title`
  but no top-level `$id`
- `packages/schema-tools/src/validate-schemas.ts` injects `$id: fileName` at load time, which allows
  runtime validation and type generation to work even though the canonical source files remain
  incomplete

Required remediation outcome:

- canonical schema files must carry stable in-file `$id` values
- schema tooling and conformance checks must validate the committed source, not silently patch the
  omission at runtime

### F2. Root `pnpm run` verification path is not green in the audited environment

The repository's direct command paths work, but the root command path exercised by the conformance
suite did not complete successfully in the audited Windows environment running Node `v24.11.0`.

Observed supporting evidence:

- direct schema validation via
  `node .\\node_modules\\tsx\\dist\\cli.mjs .\\packages\\schema-tools\\src\\validate-schemas.ts validate`
  completed successfully
- direct smoke execution via
  `corepack pnpm --filter @role-model-router/gateway-smoke exec tsx src/index.ts` completed
  successfully
- `cmd /c "corepack pnpm run schemas:validate"` timed out
- `cmd /c "corepack pnpm run smoke"` timed out
- `packages/conformance/src/protocol-fixture-conformance.test.ts` and
  `packages/conformance/src/gateway-smoke-observability.test.ts` shell out through the root
  `corepack pnpm run ...` path and therefore fail or time out in this environment

Required remediation outcome:

- the repository must have a reliable, supported root verification path for the schema validation and
  smoke commands used by the conformance suite
- the fix must be verified on the repository-supported Node 22 baseline, not only on the audited
  Node 24 environment
- if Node 24 remains behaviorally different, that difference must be documented explicitly rather
  than hidden behind passing direct-only commands

## Constraints

- Do not widen this run into unrelated browser/native/provider scaffold work.
- Do not widen this run into general Biome or line-ending cleanup unless a minimal targeted change is
  strictly required for the two findings above.
- Preserve the existing protocol, router, and observability behavior except where changes are needed
  to fix `F1` and `F2`.

## Desired Run Outcome

The new run should produce a narrow remediation branch that:

1. makes canonical schema `$id` data real in committed source,
2. makes the root schema/smoke verification path trustworthy again,
3. restores green conformance coverage for the affected audit-derived tests,
4. documents any remaining environment caveats precisely.
