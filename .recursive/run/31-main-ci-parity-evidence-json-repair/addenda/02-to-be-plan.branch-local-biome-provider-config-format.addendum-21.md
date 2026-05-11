Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T23:22:26Z`
LockHash: `d532bc1454151d03d81b34f43a2b605314234e54d673b8e891501246db9537e1`
Addendum: `21`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-provider-config-format.addendum-20.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-local-biome-after-router-config-format.red.log`
- User direction: continue fixing locally until ci passes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-local-biome-provider-config-format.addendum-21.md`
Scope note: This addendum plans the next provider/config formatter batch exposed after the preceding local role-model-router config/JSON slice cleared.

## TODO

- [x] Record the provider/config file scope from the repo-wide local repro
- [x] Define the bounded formatter cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the provider/config formatter blocker:

1. format the bounded 20-file provider/config set
2. rerun a focused regression and focused Biome check over the same 20 files
3. rerun repo-wide local Biome only after the bounded batch is green

## Planned Changes by File

- `role-model-router/packages/adapter-execution/package.json`
- `role-model-router/packages/openai-compat/tsconfig.json`
- `role-model-router/packages/process-supervisor/package.json`
- `role-model-router/packages/process-supervisor/tsconfig.json`
- `role-model-router/packages/profile-aggregator/package.json`
- `role-model-router/packages/profile-aggregator/tsconfig.json`
- `role-model-router/packages/protocol-routing/package.json`
- `role-model-router/packages/protocol-routing/tsconfig.json`
- `role-model-router/packages/provider-account/package.json`
- `role-model-router/packages/provider-account/tsconfig.json`
- `role-model-router/packages/provider-acp/package.json`
- `role-model-router/packages/provider-acp/tsconfig.json`
- `role-model-router/packages/provider-anthropic/package.json`
- `role-model-router/packages/provider-anthropic/tsconfig.json`
- `role-model-router/packages/provider-cli/package.json`
- `role-model-router/packages/provider-cli/tsconfig.json`
- `role-model-router/packages/provider-litellm/package.json`
- `role-model-router/packages/provider-mcp/package.json`
- `role-model-router/packages/provider-mcp/tsconfig.json`
- `role-model-router/packages/provider-openai/tsconfig.json`

## Implementation Steps

1. Preserve `phase4-local-biome-after-router-config-format.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact 20-file provider/config set.
3. Run the regression first and preserve its RED output.
4. Apply Biome-managed formatting to the full 20-file set.
5. Re-run the focused regression and the bounded file-set Biome check and capture GREEN evidence.
6. Re-run repo-wide local Biome to expose the next remaining layer only after this bounded batch is green.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-local-biome-after-router-config-format.red.log`
  - add and run `packages/schema-tools/test/recursive-biome-local-provider-config-format.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-biome-local-provider-config-format.test.ts` from `packages/schema-tools`
  - run `corepack pnpm exec biome check role-model-router/packages/adapter-execution/package.json role-model-router/packages/openai-compat/tsconfig.json role-model-router/packages/process-supervisor/package.json role-model-router/packages/process-supervisor/tsconfig.json role-model-router/packages/profile-aggregator/package.json role-model-router/packages/profile-aggregator/tsconfig.json role-model-router/packages/protocol-routing/package.json role-model-router/packages/protocol-routing/tsconfig.json role-model-router/packages/provider-account/package.json role-model-router/packages/provider-account/tsconfig.json role-model-router/packages/provider-acp/package.json role-model-router/packages/provider-acp/tsconfig.json role-model-router/packages/provider-anthropic/package.json role-model-router/packages/provider-anthropic/tsconfig.json role-model-router/packages/provider-cli/package.json role-model-router/packages/provider-cli/tsconfig.json role-model-router/packages/provider-litellm/package.json role-model-router/packages/provider-mcp/package.json role-model-router/packages/provider-mcp/tsconfig.json role-model-router/packages/provider-openai/tsconfig.json`
  - rerun repo-wide local `corepack pnpm exec biome check .`
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe role-model-router/packages/adapter-execution/package.json role-model-router/packages/openai-compat/tsconfig.json role-model-router/packages/process-supervisor/package.json role-model-router/packages/process-supervisor/tsconfig.json role-model-router/packages/profile-aggregator/package.json role-model-router/packages/profile-aggregator/tsconfig.json role-model-router/packages/protocol-routing/package.json role-model-router/packages/protocol-routing/tsconfig.json role-model-router/packages/provider-account/package.json role-model-router/packages/provider-account/tsconfig.json role-model-router/packages/provider-acp/package.json role-model-router/packages/provider-acp/tsconfig.json role-model-router/packages/provider-anthropic/package.json role-model-router/packages/provider-anthropic/tsconfig.json role-model-router/packages/provider-cli/package.json role-model-router/packages/provider-cli/tsconfig.json role-model-router/packages/provider-litellm/package.json role-model-router/packages/provider-mcp/package.json role-model-router/packages/provider-mcp/tsconfig.json role-model-router/packages/provider-openai/tsconfig.json`
  - focused green check: `corepack pnpm exec biome check role-model-router/packages/adapter-execution/package.json role-model-router/packages/openai-compat/tsconfig.json role-model-router/packages/process-supervisor/package.json role-model-router/packages/process-supervisor/tsconfig.json role-model-router/packages/profile-aggregator/package.json role-model-router/packages/profile-aggregator/tsconfig.json role-model-router/packages/protocol-routing/package.json role-model-router/packages/protocol-routing/tsconfig.json role-model-router/packages/provider-account/package.json role-model-router/packages/provider-account/tsconfig.json role-model-router/packages/provider-acp/package.json role-model-router/packages/provider-acp/tsconfig.json role-model-router/packages/provider-anthropic/package.json role-model-router/packages/provider-anthropic/tsconfig.json role-model-router/packages/provider-cli/package.json role-model-router/packages/provider-cli/tsconfig.json role-model-router/packages/provider-litellm/package.json role-model-router/packages/provider-mcp/package.json role-model-router/packages/provider-mcp/tsconfig.json role-model-router/packages/provider-openai/tsconfig.json`

## Idempotence and Recovery

- Once the 20-file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the extracted 20-file set unless the next repo-wide local run surfaces an additional explicit blocker.
- Because the diagnostics are format-only, no manual logic fixes are planned for this batch.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-provider-config-format.addendum-20.md`

This addendum adds the bounded provider/config formatter cleanup to the run.

## Traceability

- `R4` -> the widened local parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit local evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the extracted 20-file surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] No manual logic repair is required for this batch

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded provider/config formatter batch needed to move local parity past the next exposed layer.
Audit: PASS
