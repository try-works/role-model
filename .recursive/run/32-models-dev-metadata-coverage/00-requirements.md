Run: `/.recursive/run/32-models-dev-metadata-coverage/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-15T03:44:39Z`
LockHash: `788a059c1041a779e0f26ce0cb41eb26bd3c8ab00fd736c8c3d321a2a643118d`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\.copilot\session-state\ee1d35dd-7095-420a-b4d8-009eea9d20b3\plan.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
Outputs:
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
Scope note: This run upgrades the app so `models.dev` becomes the primary source for provider and model metadata, while LiteLLM remains the execution-coverage layer and role-model keeps only the auth/control-plane overrides that upstream metadata does not fully express.

## TODO

- [x] Convert the session plan into stable recursive requirements
- [x] Define numbered requirements and observable acceptance criteria
- [x] Make strict TDD, end-to-end validation, and verifiable evidence mandatory
- [x] Record scope boundaries for `models.dev`, LiteLLM, and role-model override responsibilities
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Add an explicit live `models.dev` refresh path that rewrites pinned repo artifacts

Description:
The repository must gain a deterministic, explicit command that refreshes the pinned `models.dev` snapshot used by the catalog pipeline.

Acceptance criteria:
- the run introduces a repo-owned command that fetches the live `models.dev` API and rewrites pinned snapshot artifacts under repo control
- refresh is explicit and operator-invoked; it does not run automatically during normal `build`, `test`, packaging, or app startup
- refreshed artifacts are deterministic enough to review and commit as pinned inputs for later runs
- refresh output records enough upstream provenance to keep the vendor-version ledger verifiable

### `R2` Make the normalized catalog the authoritative source for provider and model metadata shipped with the app

Description:
The packaged and dev runtime must consume a non-empty normalized catalog generated from refreshed `models.dev` inputs plus role-model overrides.

Acceptance criteria:
- `role-model-router\packages\catalog\data\normalized-catalog.json` and `vendor-version-ledger.json` are regenerated from the refreshed snapshot and no longer remain placeholder-grade
- the normalized catalog includes provider metadata needed by the app, including provider name, env vars, docs, npm/api compatibility metadata, and base API endpoint metadata where available
- the normalized catalog includes model metadata needed by the app, including specifications, pricing, capabilities, context limits, and modalities where available
- the generated catalog artifacts are the same artifacts consumed by runtime, validation, and packaging flows

### `R3` Use `models.dev` as the default metadata layer without losing role-model auth and control-plane semantics

Description:
`models.dev` must become the default source for metadata, but role-model must preserve the runtime-specific semantics that `models.dev` does not fully express.

Acceptance criteria:
- provider defaults such as display name, env vars, docs, npm compatibility, and base API endpoint metadata come from the normalized `models.dev` catalog by default
- model defaults such as specs, pricing, capabilities, context limits, and modalities come from the normalized `models.dev` catalog by default
- role-model preserves or layers runtime-owned fields that are not fully expressed by `models.dev`, including supported auth modes, OAuth device-code metadata, required headers, onboarding requirements, or other control-plane constraints
- special cases such as Moonshot/Kimi OAuth remain functional without forcing the entire provider system back to handwritten metadata

### `R4` Preserve full LiteLLM endpoint and model coverage when `models.dev` is incomplete or identifiers diverge

Description:
The app must continue to expose every endpoint and model provided by LiteLLM, even when `models.dev` has missing entries, different identifiers, or slower coverage.

Acceptance criteria:
- any provider or model available through LiteLLM remains discoverable to the runtime and UI after this integration
- when `models.dev` lacks a provider or model entry, the app synthesizes or preserves a fallback metadata representation instead of dropping coverage
- when `models.dev` and LiteLLM identifiers diverge, the run defines an explicit merge or mapping strategy rather than silently assuming perfect alignment
- the merged catalog/runtime behavior does not regress endpoint activation, provider-account validation, model selection, or execution-path coverage

### `R5` Wire all metadata consumers so the app visibly uses `models.dev` provider and model metadata

Description:
The repo surfaces that read provider and model metadata must be updated so the new catalog actually drives the app rather than existing only as generated files.

Acceptance criteria:
- runtime and UI surfaces that show or depend on provider metadata, pricing, capabilities, specs, context limits, or related catalog-derived labels read from the normalized catalog or a direct derivative of it
- packaged runtime assets include the regenerated normalized catalog so the Windows executable and dev/runtime-host paths observe the same metadata layer
- the implementation preserves existing execution ownership boundaries: metadata comes from the catalog layer, execution coverage from LiteLLM, and auth/control-plane deltas from role-model overrides
- representative provider paths, including standard API-key providers and the existing Moonshot OAuth path, continue to function after metadata wiring changes

### `R6` The run must be delivered with strict TDD, end-to-end validation, and verifiable evidence

Description:
This run is not complete when the code merely compiles. It must be implemented under strict TDD discipline and proven through end-to-end, evidence-backed validation.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict`
- every production change in this run is preceded by failing automated coverage before the implementation turns green, and RED plus GREEN evidence paths are recorded under the run evidence folder
- validation includes targeted automated coverage for catalog refresh, normalization, merge behavior, and any runtime or UI consumers changed by the run
- validation includes end-to-end proof that the app still works through representative runtime flows after the metadata integration, including at least one packaged or live runtime path and at least one API-key provider flow; if Moonshot OAuth is touched by the final diff, end-to-end validation must include that flow as well
- the final run artifacts cite concrete commands, logs, screenshots or traces where applicable, and distinct verification evidence rather than asserting success without receipts

## Out of Scope

- `OOS1`: replacing LiteLLM as the execution-coverage layer or moving runtime request execution fully to `models.dev`
- `OOS2`: changing upstream `models.dev` or LiteLLM repositories as the primary implementation path for this run
- `OOS3`: unrelated UI redesign beyond the surfaces needed to expose truthful provider and model metadata
- `OOS4`: inventing new auth flows beyond the override and preservation work required to keep existing provider onboarding and execution behavior working

## Constraints

- `models.dev` is the default source for provider metadata and model metadata in this run
- LiteLLM remains the source for runtime execution coverage across providers, endpoints, and models
- role-model must keep only the thin override layer needed for auth and control-plane semantics that upstream metadata does not fully encode
- the refresh workflow must be explicit rather than automatic during normal build or packaging
- the merged result must preserve full app coverage for every provider, endpoint, and model the LiteLLM-backed app can currently expose
- packaged-runtime behavior matters; the generated catalog cannot be correct only in local dev and wrong in the Windows executable
- strict TDD, end-to-end validation, and verifiable evidence are mandatory for this run

## Assumptions

- the live `models.dev` API is accessible during refresh-command execution
- pinned snapshot artifacts remain acceptable repo inputs after refresh rather than requiring live network access at app runtime
- at least the majority of provider identifiers can be aligned directly between `models.dev` and LiteLLM, with explicit fallback handling for mismatches
- the existing catalog foundation from run `05`, runtime UI/operator surfaces from run `14`, and OAuth/LiteLLM seams from run `17` provide enough baseline to extend rather than replace

## Sequence Integration

- Roadmap slot: `new follow-on run for models.dev metadata integration and coverage hardening`
- Previous repo dependencies:
  - `05-router-runtime-catalog-foundation`
  - `14-router-runtime-ui-foundation`
  - `15-unified-vendor-execution`
  - `17-oauth-litellm-generalization`
- Next repo dependency: none required by default; any remaining provider-specific gaps should become explicit follow-up runs only if this run leaves them intentionally out of scope
- Required handoff: refreshed pinned `models.dev` artifacts, regenerated normalized catalog outputs, explicit merge rules with LiteLLM coverage, and evidence-backed validation proving the app still works end to end

## Targeted Package And File Inventory

- `role-model-router\packages\catalog\**`
- `testdata\catalog\**`
- `role-model-router\apps\runtime-host-bridge\src\index.ts`
- `role-model-router\apps\runtime-host-bridge\src\package-sea.ts`
- `role-model-router\apps\runtime-host-bridge\test\**`
- `role-model-router\apps\runtime-ui\app\**`
- `role-model-router\packages\provider-account\**`
- `role-model-router\packages\endpoint-registry\**`
- `role-model-router\packages\adapter-execution\**`
- root `package.json` scripts and any repo-owned validation entrypoints needed for refresh/export verification

## Validation Expectations

- focused RED/GREEN tests are required for each new refresh, normalization, merge, or metadata-consumer behavior slice introduced by the run
- validation must prove the normalized catalog artifacts are regenerated and actually consumed by runtime and packaging paths
- end-to-end validation must prove representative runtime behavior after metadata integration, not only artifact generation
- evidence must be durable and repo-run scoped, including logs under `/.recursive/run/32-models-dev-metadata-coverage/evidence/`
- if the run changes packaged-asset inputs, verification must include the packaged-asset path rather than assuming dev-runtime parity

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] The boundary between `models.dev`, LiteLLM, and role-model override responsibilities is explicit
- [x] Strict TDD, end-to-end validation, and verifiable evidence requirements are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream Phase 1 AS-IS analysis
- [x] The requirements are concrete about refresh workflow, metadata ownership, coverage preservation, and validation obligations
- [x] No unresolved ambiguity remains about the requirement to keep LiteLLM execution coverage while moving provider and model metadata to `models.dev`

Approval: PASS
