Run: `/.recursive/run/32-models-dev-metadata-coverage/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-15T22:18:47Z`
LockHash: `f6716652a31639d6aad7ea933a03ca272b44d2685b4e792e2bc529fd0bfe5c42`
Workflow version: `recursive-mode-audit-v1`
Addendum: `01`
Inputs:
- `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- credential lifecycle audit performed on `2026-05-15`
- packaged runtime OAuth readback verification performed on `2026-05-15`
Outputs:
- `/.recursive/run/32-models-dev-metadata-coverage/addenda/02-to-be-plan.credential-lifecycle-remediation.addendum-01.md`
Scope note: This addendum converts the credential-lifecycle audit findings into an authoritative remediation plan delta for the remaining run-32 work. It supplements the locked Phase 2 plan without rewriting it, and narrows the follow-up scope around provider onboarding, credential persistence, hydration, and end-to-end execution truthfulness.

## TODO

- [x] Record the credential-lifecycle audit baseline
- [x] Separate already-remediated defects from remaining gaps
- [x] Translate the remaining gaps into concrete remediation slices
- [x] Record strict TDD and end-to-end verification requirements for the remediation work
- [x] Capture updated packaged-app validation expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Audit Baseline

- The packaged runtime executable now launches with no arguments, serves the runtime UI, and restores persisted Moonshot/Kimi OAuth accounts as `active` / `healthy` after restart.
- The following defects were already reproduced and remediated in the current worktree:
  - packaged no-arg startup exited immediately instead of launching a usable runtime
  - persisted Moonshot/Kimi OAuth token files were ignored on account readback after restart
  - revisiting the Providers page and re-saving a connected Kimi Code account could downgrade it back to `credentials-missing`
- The credential lifecycle audit still found substantive remaining gaps that are within the original run-32 requirement contract because `R3`, `R5`, and `R6` require truthful auth/control-plane behavior and end-to-end proof for representative provider paths, including Moonshot OAuth when touched.

## Confirmed Implemented Surfaces

- packaged runtime bootstrap defaults now infer repo root, runtime state root, and static UI assets for the Windows executable
- backend account readback now hydrates persisted OAuth-backed accounts from stored token files before serving `/api/role-model/accounts`
- runtime UI now preserves an already-connected OAuth-backed account when the Providers form is revisited without a live in-memory `oauthState`
- packaged end-to-end verification now proves the restored Moonshot/Kimi account appears as `healthy` / `active` and survives a repeat save path

Carry-forward rule:

- do not reopen the already-fixed packaged startup and OAuth readback slices except where later remediation work needs to extend their tests or preserve their guarantees

## Remaining Requirement Delta

### `R3` Preserve truthful auth and control-plane semantics

Current disposition: `partially complete`

Confirmed gap:

- the backend and UI now restore connected OAuth accounts correctly, but pending device-code sessions still depend on in-memory UI state and are not resumable after page reload or app restart
- API-key providers still accept an env-var reference without any preflight proof that the referenced credential actually exists in the execution environment
- account lifecycle truth is still split across SQLite account rows, credential files, endpoint activation state, and form-local assumptions rather than one fully explicit credential-state contract

Required plan adjustment:

- add a repo-owned pending-OAuth restoration path and a shared credential-state contract that distinguishes:
  - `pending device authorization`
  - `connected but endpoint not yet activated`
  - `configured but credential missing`
  - `active and execution-ready`

### `R5` Runtime and UI consumer wiring

Current disposition: `partially complete`

Confirmed gap:

- Providers is the only surface that currently owns credential creation and recovery logic, while other runtime UI surfaces consume snapshot/accounts/endpoints passively and may therefore present a provider as configured even when execution preconditions are not fully satisfied
- endpoint activation remains a separate step from account save for API-key flows, so the app can land in a partially configured state where account persistence succeeded but executable readiness did not
- the downstream execution surfaces rely on snapshot/endpoints state rather than an explicit operator-facing readiness contract

Required plan adjustment:

- tighten the control-plane contract so save-time and readback-time state are consistent across Providers, Endpoints, Runtime, Workbench, and Advanced APIs
- either make account save + endpoint activation effectively atomic for the supported onboarding path or surface partial success explicitly and durably in the runtime snapshot contract

### `R6` Strict TDD, end-to-end validation, and verifiable evidence

Current disposition: `partially complete`

Confirmed gap:

- the current work proves the packaged OAuth readback regression is fixed, but the broader credential lifecycle has not yet been closed end to end for:
  - API-key preflight readiness
  - pending OAuth resume/recovery
  - save-time vs activation-time partial failure behavior
  - execution-time truthfulness across packaged operator flows
- the audit found architecture and UX gaps that are still only described in analysis, not yet converted into locked remediation slices and verification expectations

Required plan adjustment:

- require targeted RED/GREEN coverage and packaged/browser-backed end-to-end evidence for every remaining credential-lifecycle slice before this run can close

### `R1`, `R2`, and `R4`

Current disposition: `carry forward unchanged`

Carry-forward rule:

- do not widen this addendum into a new metadata-refresh or LiteLLM-coverage run
- credential remediation work must stay anchored to the original run-32 ownership split:
  - `models.dev` remains metadata authority
  - LiteLLM remains execution coverage
  - role-model remains the auth/control-plane delta layer

## Remediation Target

The next pass must make run 32 acceptable as a completed requirement by:

1. finishing the credential-state lifecycle so persisted API-key and OAuth provider configuration is truthful across reload, restart, and packaged execution
2. removing or explicitly surfacing partial-success states between provider-account save and endpoint readiness
3. proving the resulting behavior through packaged, browser-backed, and runtime-host validation rather than only unit-level fixes

## Execution Discipline

- TDD Mode: `strict`
- Non-negotiable rule:
  - no production-code remediation lands before the corresponding failing automated coverage exists
- Required RED -> GREEN -> REFACTOR loop for each remediation slice:
  1. add or tighten the failing regression test first
  2. capture the initial failing behavior
  3. implement the minimum production change that turns the slice green
  4. rerun focused validation plus the required packaged/browser-backed check
  5. only then proceed to the next slice
- Browser / packaged verification: `required`
  - every slice that changes onboarding, reload, startup, account hydration, endpoint readiness, or operator-visible credential state must be rechecked through the packaged runtime path unless the slice is provably backend-only and does not change operator behavior

## Remediation Slices

1. **SP4. Pending OAuth recovery and hydration contract**
   - Add RED coverage first for:
     - restoring an in-progress device-code session after page reload
     - preserving verification metadata and pollability across UI reload
     - backend readback that distinguishes pending device auth from connected OAuth
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
     - `role-model-router/apps/runtime-ui/app/lib/device-authorization.ts`
     - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
     - `role-model-router/apps/runtime-host-bridge/src/index.ts`
     - targeted runtime-ui and runtime-host tests
   - Goal:
     - pending device auth must be resumable and truthfully surfaced after reload/restart rather than silently collapsing back to "not connected"

2. **SP5. API-key readiness and credential preflight**
   - Add RED coverage first for:
     - env-backed account save where the referenced variable is not present
     - runtime snapshot/readback that marks such accounts as not execution-ready
     - operator-facing errors that explain credential-reference failure before chat execution
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
     - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
     - `role-model-router/apps/runtime-host-bridge/src/index.ts`
     - `role-model-router/packages/provider-account/src/index.ts`
     - targeted runtime-host and runtime-ui tests
   - Goal:
     - API-key accounts must not appear successfully configured when the runtime cannot actually resolve the referenced env credential

3. **SP6. Atomic readiness or explicit partial-success semantics**
   - Add RED coverage first for:
     - save succeeds but endpoint activation fails
     - packaged UI reload after partial setup
     - snapshot/endpoint/readiness disagreement between Providers and execution surfaces
   - Repair targets:
     - `role-model-router/apps/runtime-host-bridge/src/index.ts`
     - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
     - `role-model-router/apps/runtime-host-bridge/test/**`
   - Goal:
     - the app must either commit a fully usable onboarding outcome or expose the exact partial state durably and consistently across all operator surfaces

4. **SP7. End-to-end credential execution truthfulness**
   - Add RED coverage first for:
     - packaged API-key request path with missing vs present credential preconditions
     - packaged OAuth request path after restart, including token refresh where feasible
     - operator surfaces that should reflect execution-readiness truth before Workbench / Advanced APIs are used
   - Repair / verification targets:
     - `role-model-router/apps/runtime-host-bridge/src/index.ts`
     - `role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`
     - `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
     - run-local evidence under `/.recursive/run/32-models-dev-metadata-coverage/evidence/`
   - Goal:
     - the packaged app must prove that what operators see in the control plane matches what chat and advanced request surfaces can actually execute

## Packaged Verification Plan

The remediation pass must continue using the packaged runtime executable as a first-class acceptance surface.

Required packaged checks after the relevant slices land:

1. rebuild `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
2. launch the packaged runtime with no arguments against `%LOCALAPPDATA%\Role Model Runtime\state`
3. verify `/api/role-model/accounts`, `/api/role-model/endpoints`, `/healthz`, and `/v1/models`
4. browse `/app/control/providers` and confirm:
   - pending OAuth sessions can be resumed if that slice changed
   - connected OAuth accounts restore as `healthy` / `active`
   - API-key accounts with unresolved env refs are surfaced truthfully
   - repeat save paths do not silently downgrade connected accounts
5. use the packaged UI or packaged bridge APIs to confirm at least:
   - one API-key execution path
   - one OAuth-backed execution path if the final diff still touches Moonshot/Kimi flows

Important constraint carried forward:

- the packaged executable remains an in-place packaged runtime host and UI server, not a fully portable standalone app detached from the built repo tree

## Validation Plan

- Focused RED/GREEN commands expected during remediation:
  - targeted `@role-model-router/runtime-host-bridge` tests for account hydration, save, and endpoint activation behavior
  - targeted `@role-model-router/runtime-ui` tests for provider lifecycle and pending OAuth resume behavior
  - targeted `@role-model-router/provider-account` tests if preflight/validation contracts change
- Broader verification commands after green:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge validate-packaging`
- End-to-end checks:
  - packaged launch with no args
  - packaged `/app/control/providers`
  - packaged `/v1/chat/completions`
  - packaged `/v1/responses`
  - representative provider-account and endpoint readback probes

## Receipt And Closeout Expectations

- `03-implementation-summary.md` must explicitly separate:
  - already-remediated credential defects preserved by this addendum
  - newly completed remediation slices from this addendum
  - any intentionally deferred credential-lifecycle gaps
- `04-test-summary.md` must separate:
  - focused regression coverage
  - packaged runtime validation
  - browser-backed/operator-surface verification
- `05-manual-qa.md` must state whether QA is human, agent-operated, or hybrid and must not claim packaged OAuth or API-key completion without the concrete packaged checks above

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 32 must treat this file as an authoritative effective input together with:

- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`

This addendum narrows the remaining credential-lifecycle work. It does **not** widen the run beyond the original requirements.

## Traceability

- `R3` -> `## Remaining Requirement Delta` (`R3`) and `## Remediation Slices` SP4-SP6 | Evidence: credential audit and packaged OAuth readback verification on `2026-05-15`
- `R5` -> `## Remaining Requirement Delta` (`R5`) and `## Remediation Slices` SP5-SP7 | Evidence: provider onboarding, account persistence, endpoint readiness, and runtime consumer audit on `2026-05-15`
- `R6` -> `## Remaining Requirement Delta` (`R6`), `## Execution Discipline`, `## Packaged Verification Plan`, and `## Validation Plan` | Evidence: run-32 requires strict TDD plus end-to-end proof for touched provider paths
- `R1`, `R2`, `R4` -> `## Remaining Requirement Delta` carry-forward rule | Evidence: this addendum intentionally stays inside the original metadata/coverage ownership split

## Coverage Gate

- [x] The addendum records the credential-lifecycle audit baseline
- [x] Already-remediated defects and remaining gaps are explicitly separated
- [x] The remaining gaps are translated into concrete remediation slices
- [x] Strict TDD and packaged/browser-backed verification are explicit
- [x] The addendum narrows the remaining run scope without widening it

Coverage: PASS

## Approval Gate

- [x] The addendum is consistent with the original run-32 requirements
- [x] The next remediation pass has concrete slices and verification obligations
- [x] No locked earlier artifact needed to be rewritten
- [x] Later phases can treat this file as an authoritative effective input

Approval: PASS
