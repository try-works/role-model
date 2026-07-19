Run: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-16T20:36:18Z`
LockHash: `1f53babcd69f541a71d2dc7436390b79bbe3122f6d6657522b32fbf6ec075d7f`
User approval: `2026-07-16` (requirements approved for implementation)
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/skills/usage/recursive-mode-skill-and-subskills.md`
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md`
- `/.recursive/run/44-kimi-k2.7-code-catalog/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `role-model-router/packages/catalog/src/litellm-catalog.ts`
- `role-model-router/packages/catalog/src/token-economics.ts`
- `role-model-router/packages/catalog/test/index.test.ts`
- `role-model-router/packages/catalog/test/token-economics.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `testdata/catalog/models-dev-local-supplement.json`
- `testdata/catalog/models-dev-local-overrides.json`
- Kimi K3 Quickstart: `https://platform.kimi.ai/docs/guide/kimi-k3-quickstart`
- Kimi Models Overview: `https://platform.kimi.ai/docs/api/models-overview`
- Kimi Code third-party agents: `https://www.kimi.com/code/docs/en/third-party-tools/other-coding-agents.html`
- models.dev Kimi K3: `https://models.dev/models/moonshotai/kimi-k3/`
Outputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/00-requirements.md`
Scope note: Add first-class Kimi K3 support to the existing Kimi Code OAuth provider path by updating canonical catalog metadata, provider surfaces, alias and economics mappings, canonical-to-upstream execution behavior, strict TDD regression coverage, and live Kimi OAuth-backed verification. Do not add a new provider or a parallel OAuth flow.

## TODO

- [x] Ground the run in the current recursive control-plane docs, relevant memory, and Kimi/Moonshot code surfaces
- [x] Define the fixed K3 identity, context-window policy, and source-precedence rules
- [x] Define canonical catalog, alias, provider-surface, execution, TDD, regression, and live-verification requirements
- [x] Record non-goals, compatibility constraints, and extensibility rules
- [x] Capture explicit user approval of run creation and requirements on `2026-07-16`
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `backend feature`
- Primary subsystems:
  - `role-model-router/packages/catalog/**`
  - `role-model-router/packages/provider-openai/**`
  - `role-model-router/apps/runtime-host-bridge/**`
  - `testdata/catalog/**`
- Secondary subsystems:
  - `role-model-router/apps/runtime-ui/**`
  - `protocol/fixtures/downstream-openai/**`
- User-visible outcome:
  - operators can select and execute `moonshot/kimi-k3` through the existing Kimi Code OAuth provider path, with truthful catalog limits and verified real-request behavior

## Relevant Prior Runs

- `40-catalog-economics-moonshot-consolidation`
  - established the hidden `moonshotai/*` pricing authority, operator `moonshot/*` aliases, and Moonshot provider-surface invariants
- `44-kimi-k2.7-code-catalog`
  - added the earlier Kimi Code model through the Moonshot/Kimi catalog path and is the closest structural baseline for K3
- `51-runtime-testing-architecture-and-regression-matrix`
  - established the repo testing layers, named commands, and rebuilt-runtime verification expectations
- `68-codex-subscription-tool-call-parity`
  - captured the current cross-provider tool-call and continuation semantics on the shared OpenAI-compatible execution path

## Problem Summary

The current Kimi integration is still K2.x-shaped. The repo exposes K2.x Moonshot/Kimi models, K2.x alias maps, and K2.x request assumptions, but it does not fully support K3 as a first-class model across catalog, provider surfaces, routing aliases, token economics, and the live Kimi Code OAuth-backed execution path.

The strongest current Kimi Code documentation states that the coding endpoint accepts provider-local model id `k3`, while the operator and catalog surfaces in this repo conventionally expose Moonshot models as `moonshot/<model-id>`. Without an explicit canonical-to-upstream mapping contract, K3 support would remain partial or would leak provider-local ids into user-facing surfaces.

K3 also introduces a harder metadata and compatibility requirement than the earlier K2.7 work:

1. the catalog must publish the correct K3 limits and capabilities
2. alias and economics tables must understand K3 alongside existing Moonshot conventions
3. K3 request shaping must avoid inheriting incompatible K2.x-only controls
4. completion proof must include real API calls through the actual OAuth-backed repo execution path, not just static request serialization or mocked tests

## Source Precedence

1. Kimi Code docs are authoritative for coding-endpoint upstream model ids and provider-path behavior.
2. Kimi platform docs are authoritative for K3 limits and request-control semantics.
3. models.dev is supporting evidence for canonical pricing/model mapping and catalog reconciliation.
4. Local supplement and override fixtures are repo-controlled inputs, not primary external truth.

## Fixed Decisions

1. The canonical operator-facing model id for this run is `moonshot/kimi-k3`.
2. The canonical pricing and upstream-catalog alias for this run is `moonshotai/kimi-k3`.
3. The upstream Kimi Code request model id for this run is `k3`.
4. The catalog publishes documented provider-maximum K3 limits of `1,048,576` context tokens and `131,072` max output tokens.
5. Tier-specific smaller K3 limits described in Kimi Code docs are entitlement/runtime concerns and are not encoded as the canonical catalog limit in this run.
6. User-facing catalog, runtime, and provider outputs must prefer `moonshot/kimi-k3`; provider-local ids such as `k3` may be accepted for normalization where existing alias surfaces already support that pattern.
7. The required provider surface is the existing `kimi-code` OAuth variant. This run does not add a new provider, a new variant family, or a new OAuth flow.
8. K3 request payloads must follow K3 semantics and must not inherit incompatible K2.x-only request fields.
9. Phase 3 must use `TDD Mode: strict`; production code may not be written before failing owning tests are demonstrated.
10. This run is not complete on unit or fixture evidence alone; it requires live API verification against the real Kimi Code OAuth-backed execution path with credentials entitled to exercise K3.
11. If valid Kimi OAuth credentials or K3 entitlement are unavailable, the run cannot be marked complete unless the user explicitly rescopes the live-verification obligation.
12. The implementation must be data-driven: catalog rows, alias maps, pricing maps, and provider-local model-id mappings belong in shared metadata tables or centralized translation seams, not scattered K3-only branches.

## Requirements

### `R1` Canonical catalog metadata must expose K3 with the correct limits and fixture authority

Description:
Add `moonshot/kimi-k3` to the repo’s authoritative catalog inputs and normalized catalog output using one clear metadata authority, with the documented K3 limits and the strongest capability/modality metadata the current schema can represent.

Acceptance criteria:
- the chosen catalog fixture authority clearly owns the K3 metadata, with no second competing K3 truth introduced in parallel
- normalized catalog output exposes `moonshot/kimi-k3` with `contextWindow = 1048576` and `maxOutputTokens = 131072`
- K3 capability and modality metadata are added consistently with the current schema for documented K3 behavior, including tool use, reasoning, and structured output where those capability flags already exist in the catalog model
- the implementation records the provider-maximum-versus-tier-caveat decision in later run receipts so future Kimi model additions do not silently reinterpret the published K3 context size

### `R2` Alias normalization and token economics must treat K3 as a first-class Moonshot model

Description:
The runtime and catalog seams that already normalize and price Moonshot models must understand K3 through the same canonical patterns used for earlier Moonshot/Kimi models.

Acceptance criteria:
- token economics maps `moonshot/kimi-k3` to `moonshotai/kimi-k3`
- the intended normalization surfaces can reconcile `moonshot/kimi-k3`, `moonshotai/kimi-k3`, and provider-local `k3` without leaking provider-local ids into outward-facing catalog or provider surfaces
- comparable-model and remote-probe alias handling is extended where needed so K3 participates in the same routing and health-probe equivalence logic as existing Kimi models
- regression coverage proves K3 alias resolution works and existing `moonshot/kimi-k2.7-code` alias/economics behavior remains intact

### `R3` Moonshot and Kimi Code provider surfaces must expose K3 without adding a new provider

Description:
K3 must appear on the intended Moonshot/Kimi provider surfaces through the existing catalog-driven variant flow, with no duplicate provider row and no orphaned variant entry.

Acceptance criteria:
- the canonical provider listing for `moonshot` exposes `moonshot/kimi-k3` on the expected provider and variant surfaces, including the existing `kimi-code` OAuth variant
- no new operator-facing provider id is introduced for K3
- provider and model discovery surfaces remain internally consistent, including any downstream model-list or discovery contracts already fed by the normalized catalog
- existing K2.5 and K2.7 Moonshot/Kimi rows remain additive and unchanged except for the intentional K3 addition

### `R4` Canonical K3 selections must execute through the Kimi Code OAuth path using upstream id `k3`

Description:
The runtime must translate canonical K3 selections into the provider-local upstream id expected by the Kimi Code endpoint exactly once, while preserving canonical outward model identity for users and downstream runtime surfaces.

Acceptance criteria:
- execution selected as `moonshot/kimi-k3` through the Kimi OAuth-backed path resolves upstream to `k3`
- the translation happens in one centralized seam rather than being duplicated across multiple call sites
- user-facing receipts, summaries, and model surfaces continue to report the canonical id `moonshot/kimi-k3` rather than leaking upstream `k3`
- regression coverage proves the K3 translation works and does not break existing `moonshot/kimi-k2.7-code` execution behavior

### `R5` K3 request shaping must be compatible with K3 semantics and must not regress K2.7 behavior

Description:
Audit the current Kimi-specific request shaping and repair any K2.x-only assumptions so K3 requests use a compatible payload while preserving supported tool-calling and structured-output behavior.

Acceptance criteria:
- K3 requests do not send incompatible K2.x-only fields when the official K3 control surface differs
- the shared OpenAI-compatible request path still preserves function calling, structured output, and current Kimi built-in hosted-tool behavior where those surfaces are supported
- any K3-specific behavior change is minimal, documented, and covered by focused regression tests
- existing `moonshot/kimi-k2.7-code` request shaping and provider behavior remain non-regressed

### `R6` Implementation must follow strict TDD with failing regression tests before production changes

Description:
Phase 3 must add or extend failing automated tests first, then implement the smallest production change needed to pass, with non-regression coverage for both K3 and existing Kimi Code behavior.

Acceptance criteria:
- `03-implementation-summary.md` records `TDD Mode: strict`
- failing owning tests are demonstrated before each production implementation slice that satisfies `R1` through `R5`
- automated regression coverage includes catalog normalization, alias normalization, token economics aliasing, provider-surface exposure, canonical-to-upstream translation, K3 request-shaping compatibility, and explicit non-regression of `moonshot/kimi-k2.7-code`
- automated tests remain deterministic and do not require live network access in normal CI

### `R7` Completion requires live Kimi OAuth-backed verification through the real repo execution path

Description:
Post-implementation verification must make real API calls through the actual Kimi Code OAuth-backed execution path used by this repo, rather than relying only on mocks, fixtures, or isolated request-shape assertions.

Acceptance criteria:
- Phase 5 uses the repo’s real runtime execution path and configured Kimi OAuth provider flow, not an ad hoc standalone script that bypasses runtime behavior
- live verification proves that authenticated K3 requests can execute successfully when `moonshot/kimi-k3` is selected through the intended provider path
- live verification proves the runtime-produced request shape is accepted upstream and that canonical K3 selection resolves to upstream `k3`
- if the current Kimi surface in this repo exposes tool-calling or structured-output behavior for Kimi Code, at least one live verification scenario exercises one of those supported paths
- Phase 5 records the exact verification timestamp, selected canonical model id, upstream model id, and any observed entitlement caveat such as a lower effective context tier

### `R8` The K3 implementation must stay backward-compatible and extensible for future Kimi models

Description:
This run must improve the shared Moonshot/Kimi model path rather than leaving a one-off K3 exception that future model additions have to duplicate.

Acceptance criteria:
- adding a future Kimi model should require updates to shared metadata tables and at most one centralized provider-local model-id mapping location, not multiple scattered `if model == ...` branches
- existing Kimi OAuth control-plane requirements, existing Moonshot/Kimi provider rows, and existing non-K3 model behavior remain unchanged except where a targeted compatibility repair is explicitly required and tested
- new K3 tests are structured so future Moonshot/Kimi model additions can extend the same cases or tables rather than cloning bespoke one-off tests
- if official sources conflict, the implementation and closeout artifacts follow the source-precedence rule and record the conflict explicitly instead of silently guessing

## Out of Scope

- `OOS1`: adding a new provider, a new provider variant family, or a new OAuth flow for K3
- `OOS2`: account-tier detection or runtime entitlement logic to publish different catalog context sizes such as `262144` versus `1048576`
- `OOS3`: broad Moonshot catalog cleanup or a general provider-variant architecture rewrite unrelated to the K3 requirement
- `OOS4`: new user-facing controls for `reasoning_effort` beyond what current product surfaces already expose
- `OOS5`: CI-live network tests that require real Kimi credentials on every automated run

## Constraints

- keep changes localized to the smallest set of catalog, runtime-host, provider-openai, fixture, and test files required
- prefer shared metadata tables and centralized translation seams over per-call K3 special cases
- preserve existing `moonshot/kimi-k2.7-code` behavior and existing Kimi OAuth control-plane requirements unless an explicit compatibility repair is required and covered
- live verification must use the existing repo execution path and actual Kimi OAuth-backed provider configuration
- automated regression tests must remain CI-safe and deterministic; live verification is a separate manual or gated proof obligation
- when official Kimi sources disagree, follow the source-precedence rules above and document the discrepancy in run receipts before closeout

## Coverage Gate

- [x] `R1` covers canonical K3 catalog metadata, fixture authority, and the context-window policy
- [x] `R2` covers alias normalization, pricing aliasing, and comparable-model/probe behavior
- [x] `R3` covers Moonshot/Kimi provider-surface exposure without adding a new provider
- [x] `R4` covers canonical-to-upstream execution mapping from `moonshot/kimi-k3` to `k3`
- [x] `R5` covers K3 request-shaping compatibility and K2.7 non-regression
- [x] `R6` covers strict TDD and automated regression-test obligations
- [x] `R7` covers mandatory live OAuth-backed API verification
- [x] `R8` covers backward compatibility and future extensibility
- [x] `OOS1` through `OOS5` are explicit and consistent with the fixed decisions and constraints

Coverage: PASS

## Approval Gate

- [x] the run is scoped to the K3 catalog-plus-execution support required for the existing Kimi Code OAuth path
- [x] the model-identity, context-window, alias, and upstream-mapping decisions are explicit rather than implicit
- [x] TDD, automated regression coverage, and live real-provider verification are mandatory completion gates
- [x] acceptance criteria are observable and suitable for later audited phases
- [x] the user approved the creation of this run and the requirements artifact on `2026-07-16`

Approval: PASS
