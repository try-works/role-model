Run: `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-17T07:22:52Z`
LockHash: `dc5c188e338eae39588278f2295a3ad25eb81e4cb906fe45649f0c4929973dee`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-worktree.md` (LOCKED)
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01-as-is.md` (LOCKED)
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/01.5-root-cause.md` (LOCKED)
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `packages/pi-role-model/src/**`
- `packages/pi-role-model/test/**`
- `packages/pi-role-model/README.md`
- `packages/pi-role-model/skills/role-model/SKILL.md`
- `apps/docs-site/content/docs/integrations/pi.mdx`
- Local Pi docs/types under `D:/pi/node_modules/@earendil-works/pi-coding-agent/**`
Outputs:
- This file.

Scope note: This artifact defines the run-75 repair plan for truthful Pi command guidance, canonical provider-relative model-id guidance, and deterministic invalid endpoint/model diagnostics while preserving the currently healthy explicit provider prompt path.

## TODO

- [x] Re-read locked requirements, AS-IS, and root-cause artifacts
- [x] Reconcile the plan with prior Pi package runs
- [x] Map each requirement to implementation, verification, and QA surfaces
- [x] Define RED-first implementation slices
- [x] Define docs and real-Pi QA work
- [x] Confirm the plan stays inside repo-owned boundaries
- [x] Complete audited-phase gates

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: no delegated route inventory is active in this worktree and this phase is planning-only.
- Delegation Decision Basis: self-audit is sufficient because the plan is bounded to the locked run-75 package/docs surfaces.
- Delegation Override Reason: N/A
- Audit Inputs Provided:
  - locked run-75 requirements, worktree, AS-IS, and root-cause artifacts
  - current package source/tests/docs
  - local Pi docs/type declarations

## Effective Inputs Re-read

- `00-requirements.md` fixes the target behavior: provider-relative ids are canonical for explicit provider calls, unsupported noninteractive slash-command paths must be documented rather than implied, deterministic base diagnostics must exist without controller help, and live Pi QA is mandatory.
- `01-as-is.md` proves the current matrix: interactive command path only, valid provider path healthy, foreign-id provider failures generic, docs/tests still prefixed-id-heavy, and current local Pi install not yet worktree-local.
- `01.5-root-cause.md` reduces the run to five root causes: interactive-only command emission, canonical-id drift, missing provider-prompt error ownership, command-only endpoint/mode diagnostics, and non-worktree-local Pi QA.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md` — original package/runtime ownership boundary, initial command surfaces, and external-runtime scope limits remain valid.
- `/.recursive/run/56-pi-role-model-gap-closure/02-to-be-plan.md` — trust/auth fail-closed behavior, richer discovery, and provider registration patterns remain valid; run 75 builds on them rather than replacing them.
- `/.recursive/run/59-observe-taxonomy-analytics-completion/01.5-root-cause.md` — relevant only for local environment context because the current Pi install still points at that worktree path and must be replaced in Phase 5.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: Establish the real Pi command and provider surface matrix | Implementation Surface: `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/README.md`, `packages/pi-role-model/skills/role-model/SKILL.md`, `apps/docs-site/content/docs/integrations/pi.mdx` | Verification Surface: `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/docs-and-safety.test.ts` | QA Surface: interactive slash-command transcript plus unsupported `pi -p "/role-model status"` proof
- `R2` | Coverage: direct | Source Quote: Repo-owned command paths must be truthful and non-silent | Implementation Surface: `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/src/types.ts`, `packages/pi-role-model/README.md`, `packages/pi-role-model/skills/role-model/SKILL.md`, `apps/docs-site/content/docs/integrations/pi.mdx` | Verification Surface: `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/docs-and-safety.test.ts` | QA Surface: interactive command transcript showing visible output and docs proving noninteractive slash-command path unsupported
- `R3` | Coverage: direct | Source Quote: Canonical Role-Model model-id guidance must be consistent | Implementation Surface: `packages/pi-role-model/src/downstream-openai.ts`, `packages/pi-role-model/test/fixtures.ts`, `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/downstream-openai.test.ts`, `packages/pi-role-model/test/extension.test.ts`, `packages/pi-role-model/README.md`, `packages/pi-role-model/skills/role-model/SKILL.md`, `apps/docs-site/content/docs/integrations/pi.mdx` | Verification Surface: unit tests plus docs assertions | QA Surface: `pi --list-models role-model` and valid provider prompt using provider-relative id
- `R4` | Coverage: direct | Source Quote: Invalid model selection must fail with actionable guidance | Implementation Surface: `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/src/types.ts`, `packages/pi-role-model/test/extension.test.ts`, `packages/pi-role-model/test/commands.test.ts` | Verification Surface: focused unit tests for unknown id, foreign id, and known-alias/no-eligible-target formatting | QA Surface: invalid foreign-id prompt transcript
- `R5` | Coverage: direct | Source Quote: The working provider execution path must remain healthy | Implementation Surface: `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/src/downstream-openai.ts` | Verification Surface: unit tests proving valid provider-relative requests continue through existing seams | QA Surface: valid provider prompt transcript and runtime receipt cross-check
- `R6` | Coverage: direct | Source Quote: `status` and `doctor` diagnostics must expose a minimum actionable fact set | Implementation Surface: `packages/pi-role-model/src/commands.ts` | Verification Surface: `packages/pi-role-model/test/commands.test.ts` | QA Surface: `status` and `doctor` transcripts proving canonical id guidance, recommended alias, invocation-mode truth, and remediation categories
- `R7` | Coverage: direct | Source Quote: Docs and skill guidance must match real behavior | Implementation Surface: `packages/pi-role-model/README.md`, `packages/pi-role-model/skills/role-model/SKILL.md`, `apps/docs-site/content/docs/integrations/pi.mdx` | Verification Surface: `packages/pi-role-model/test/docs-and-safety.test.ts` | QA Surface: docs diff review plus manual command/prompt usage against updated instructions
- `R8` | Coverage: direct | Source Quote: Invalid endpoint and model selections must fail with actionable guidance | Implementation Surface: `packages/pi-role-model/src/config.ts`, `packages/pi-role-model/src/runtime-discovery.ts`, `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/test/runtime-discovery.test.ts`, `packages/pi-role-model/test/extension.test.ts`, `packages/pi-role-model/test/commands.test.ts` | Verification Surface: `packages/pi-role-model/test/runtime-discovery.test.ts`, `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/extension.test.ts` | QA Surface: invalid endpoint transcript plus invalid model transcript
- `R9` | Coverage: direct | Source Quote: Real Pi QA must cover both command truth and prompt truth | Implementation Surface: `05-manual-qa.md` and Phase-5 evidence | Verification Surface: worktree-local install proof, Pi transcripts, runtime receipts | QA Surface: real local Pi reinstall and end-to-end command/prompt checks

## Plan Drift Check

- The plan stays inside repo-owned surfaces: package source, tests, package docs/skill guidance, docs-site guidance, and run artifacts.
- No upstream Pi core fix is planned.
- No Role-Model routing semantics change is planned.
- No raw HTTP fallback is promoted to the primary supported path.
- The healthy provider-relative prompt path remains the reference success case.
- Optional controller-generated help remains out of the critical path.

## Planned Changes by File

- `packages/pi-role-model/src/types.ts`
  - Expand local Pi event/context typings to cover command mode, event context model access, and any message-end hook usage needed by the package.
- `packages/pi-role-model/src/commands.ts`
  - Add canonical provider-call model-id guidance and recommended alias output.
  - Add explicit supported command-path and prompt-path guidance.
  - Add richer doctor/status remediation categories, including unsupported noninteractive slash-command usage and stale/removed alias states.
  - Improve alias selection error text for unknown/foreign ids.
- `packages/pi-role-model/src/downstream-openai.ts`
  - Keep provider-relative ids authoritative.
  - Add helper(s) for canonical provider-call model examples if needed.
- `packages/pi-role-model/src/extension.ts`
  - Integrate provider-request validation before Role-Model provider calls are sent.
  - Integrate provider error-message normalization for known alias/no-eligible-target and related provider-owned failures if Pi hook behavior permits.
  - Keep taxonomy intent injection only for valid Role-Model provider requests.
- `packages/pi-role-model/src/config.ts`
  - Reuse existing endpoint-trust classification helpers in improved diagnostics.
- `packages/pi-role-model/src/runtime-discovery.ts`
  - Preserve existing typed discovery failures and expose them through improved command/provider diagnostics.
- `packages/pi-role-model/test/fixtures.ts`
  - Update canonical sample ids to provider-relative forms.
- `packages/pi-role-model/test/commands.test.ts`
  - Add RED coverage for status/doctor command-path truth, canonical id guidance, and unsupported-mode guidance.
- `packages/pi-role-model/test/downstream-openai.test.ts`
  - Update canonical id expectations to provider-relative ids.
- `packages/pi-role-model/test/extension.test.ts`
  - Add RED coverage for provider-request validation and error normalization integration.
- `packages/pi-role-model/test/docs-and-safety.test.ts`
  - Assert docs/skill mention provider-relative ids, interactive command path, unsupported `pi -p "/role-model ..."` path, and debug-only raw HTTP fallback.
- `packages/pi-role-model/README.md`
  - State the supported interactive command path, supported provider prompt path, canonical provider-relative ids, compatibility-only prefixed ids, and debug-only raw HTTP fallback.
- `packages/pi-role-model/skills/role-model/SKILL.md`
  - Align troubleshooting and command/prompt guidance with real behavior.
- `apps/docs-site/content/docs/integrations/pi.mdx`
  - Replace prefixed-id primary guidance with provider-relative guidance and document unsupported print-mode slash-command use.

## Implementation Steps

1. **Slice 1: Canonical model-id and fixture alignment**
   - Write failing tests that expect provider-relative ids in downstream mapping, command output, and extension integration.
   - Update fixtures/tests first, then update any code paths that still assume prefixed canonical ids.
2. **Slice 2: Command-path truth and diagnostics**
   - Write failing tests for `status` / `doctor` minimum fact set, supported command-path guidance, unsupported print-mode guidance, and alias-state diagnostics.
   - Update `commands.ts` and any minimal supporting types/helpers.
3. **Slice 3: Provider prompt preflight validation**
   - Write failing tests for provider-request rejection of unknown and foreign model ids using the existing `before_provider_request` seam and event context model/provider.
   - Implement deterministic repo-owned error formatting with recommended alias recovery guidance.
4. **Slice 4: Provider error normalization for known aliases**
   - Write failing tests for rewriting or classifying known-alias `no_eligible_target` failures and stale/removed alias diagnostics when the provider path or current selection is otherwise valid.
   - Implement the smallest seam that works: message-end rewrite first, only escalating to a custom provider stream wrapper if RED proves hooks are insufficient.
5. **Slice 5: Docs and skill truth**
   - Write failing docs assertions.
   - Update README, skill, and docs-site page together.
6. **Slice 6: Final package checks and Phase 5 setup**
   - Run full package build/tests.
   - Prepare worktree-local Pi reinstall and transcript plan for Phase 5.

## Implementation Sub-phases

- Sub-phase 1: provider-relative canonical-id contract (`R3`, supporting `R4`, `R7`)
- Sub-phase 2: command-path truth and rich diagnostics (`R1`, `R2`, `R6`)
- Sub-phase 3: provider prompt invalid-model and provider-error help (`R4`, `R5`, `R8`)
- Sub-phase 4: docs/skill alignment (`R7`)
- Sub-phase 5: real Pi reinstall and QA (`R9`)

## Testing Strategy

- TDD Mode: `strict`
- No production edits before a failing targeted test exists for the next slice.
- Favor focused package tests during RED/GREEN, then run the full package suite at the end of Phase 3.
- Separate unit tests for pure classification/formatting helpers from integration-style extension tests.

## Playwright Plan (if applicable)

Not applicable. This run validates CLI command and provider behavior through package tests plus real Pi CLI transcripts in Phase 5, not browser automation.

## Focused RED/GREEN Commands

```powershell
corepack pnpm --filter @try-works/pi-role-model test -- test/downstream-openai.test.ts
corepack pnpm --filter @try-works/pi-role-model test -- test/commands.test.ts
corepack pnpm --filter @try-works/pi-role-model test -- test/extension.test.ts
corepack pnpm --filter @try-works/pi-role-model test -- test/runtime-discovery.test.ts
corepack pnpm --filter @try-works/pi-role-model test -- test/docs-and-safety.test.ts
```

Final package checks:

```powershell
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm --filter @try-works/pi-role-model test
```

## Manual QA Scenarios

- Scenario 1: Interactive Pi command path
  - Run `/role-model status`, `/role-model doctor`, `/role-model alias list`, `/role-model alias recommended` in interactive Pi.
  - Verify visible output, canonical provider-relative guidance, recommended alias, and invocation-mode truth.
- Scenario 2: Unsupported noninteractive slash-command path
  - Run `pi --no-session -p "/role-model status"`.
  - Verify the docs now mark this unsupported and do not teach it as a supported diagnostic path.
- Scenario 3: Valid provider prompt path
  - Run `pi --no-session --provider role-model --model baseline.remote-only -p "Reply with ok."`
  - Verify success and runtime receipt correlation.
- Scenario 4: Invalid foreign-id provider prompt path
  - Run `pi --no-session --provider role-model --model gpt-4o -p "Reply with ok."`
  - Verify deterministic repo-owned guidance references valid alias discovery and recommended alias.
- Scenario 5: Invalid endpoint path
  - Point the package at a blocked, malformed, or unavailable endpoint.
  - Verify `status`/`doctor` classify the failure and provide concrete remediation.
- Scenario 6: Worktree-local Pi install proof
  - Reinstall the local package from `D:\DEV\role-model\.worktrees\75-pi-role-model-cli-ux-and-model-id-hardening\packages\pi-role-model`.
  - Verify `pi list` shows this worktree path before final transcripts are collected.

## Idempotence and Recovery

- Canonical provider-relative id guidance is idempotent because it derives from live discovery and recommended alias state.
- Provider-request preflight validation is read-only and can block invalid requests without mutating runtime or auth state.
- If message-end normalization proves insufficient for provider failures, the plan allows escalation to a custom provider stream wrapper without widening scope; that decision must still start with RED.
- If local Pi reinstall fails in Phase 5, the package must not claim QA completion; the run returns to remediation or environment-fix evidence.

## Gaps Found

None. The locked Phase 1 and 1.5 artifacts already close the analysis problem. The remaining work is implementation and verification.

## Earlier Phase Reconciliation

- `00-requirements.md`, `00-worktree.md`, `01-as-is.md`, and `01.5-root-cause.md` are all locked and mutually consistent.
- No new scope was introduced while planning.

## Subagent Contribution Verification

- No subagent was used for this phase.
- Main-agent verification consisted of direct reconciliation against the locked earlier-phase artifacts and current source/docs.
- Acceptance Decision: N/A
- Repair Performed After Verification: none

## Repair Work Performed

- No production code was changed in this phase.
- This artifact defines the implementation plan only.

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/README.md`, `packages/pi-role-model/skills/role-model/SKILL.md`, `apps/docs-site/content/docs/integrations/pi.mdx` | Verification Surface: `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/docs-and-safety.test.ts` | QA Surface: interactive command transcript plus unsupported print-mode proof
- `R2` | Status: planned | Implementation Surface: `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/src/types.ts` | Verification Surface: `packages/pi-role-model/test/commands.test.ts` | QA Surface: visible interactive output and truthful unsupported-path docs
- `R3` | Status: planned | Implementation Surface: `packages/pi-role-model/src/downstream-openai.ts`, `packages/pi-role-model/test/fixtures.ts`, `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/downstream-openai.test.ts`, `packages/pi-role-model/test/extension.test.ts`, `packages/pi-role-model/README.md`, `packages/pi-role-model/skills/role-model/SKILL.md`, `apps/docs-site/content/docs/integrations/pi.mdx` | Verification Surface: `packages/pi-role-model/test/downstream-openai.test.ts`, `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/extension.test.ts`, `packages/pi-role-model/test/docs-and-safety.test.ts` | QA Surface: provider-relative `--list-models` and valid provider prompt transcript
- `R4` | Status: planned | Implementation Surface: `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/src/types.ts`, `packages/pi-role-model/test/extension.test.ts`, `packages/pi-role-model/test/commands.test.ts` | Verification Surface: focused invalid-model tests plus extension integration tests | QA Surface: invalid foreign-id prompt transcript
- `R5` | Status: planned | Implementation Surface: `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/src/downstream-openai.ts` | Verification Surface: extension/downstream tests | QA Surface: valid provider prompt transcript and runtime receipt cross-check
- `R6` | Status: planned | Implementation Surface: `packages/pi-role-model/src/commands.ts` | Verification Surface: `packages/pi-role-model/test/commands.test.ts` | QA Surface: `status` and `doctor` transcript review
- `R7` | Status: planned | Implementation Surface: `packages/pi-role-model/README.md`, `packages/pi-role-model/skills/role-model/SKILL.md`, `apps/docs-site/content/docs/integrations/pi.mdx`, `packages/pi-role-model/test/docs-and-safety.test.ts` | Verification Surface: `packages/pi-role-model/test/docs-and-safety.test.ts` | QA Surface: manual instruction-following check against updated docs
- `R8` | Status: planned | Implementation Surface: `packages/pi-role-model/src/config.ts`, `packages/pi-role-model/src/runtime-discovery.ts`, `packages/pi-role-model/src/extension.ts`, `packages/pi-role-model/src/commands.ts`, `packages/pi-role-model/test/runtime-discovery.test.ts`, `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/extension.test.ts` | Verification Surface: `packages/pi-role-model/test/runtime-discovery.test.ts`, `packages/pi-role-model/test/commands.test.ts`, `packages/pi-role-model/test/extension.test.ts` | QA Surface: invalid endpoint and invalid model transcripts
- `R9` | Status: planned | Implementation Surface: `05-manual-qa.md` and Phase-5 evidence | Verification Surface: worktree-local install proof and transcripts | QA Surface: real local Pi reinstall and end-to-end validation

## Traceability

- `R1`, `R2`, `R6`, `R7` -> `RC1` command-path truth
- `R3`, `R4`, `R7`, `R9` -> `RC2` canonical-id alignment
- `R4`, `R5`, `R6`, `R8` -> `RC3` provider prompt error ownership
- `R6`, `R8` -> `RC4` endpoint/mode diagnostic coverage
- `R9` -> `RC5` worktree-local Pi QA

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `788c18eec021230a5c0c925931d610875993f65c`
- Comparison reference: `working-tree`
- Normalized baseline: `788c18eec021230a5c0c925931d610875993f65c`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 788c18eec021230a5c0c925931d610875993f65c`
- Planned or claimed changed files:
  - `packages/pi-role-model/src/types.ts`
  - `packages/pi-role-model/src/commands.ts`
  - `packages/pi-role-model/src/downstream-openai.ts`
  - `packages/pi-role-model/src/extension.ts`
  - `packages/pi-role-model/src/config.ts`
  - `packages/pi-role-model/src/runtime-discovery.ts`
  - `packages/pi-role-model/test/fixtures.ts`
  - `packages/pi-role-model/test/commands.test.ts`
  - `packages/pi-role-model/test/downstream-openai.test.ts`
  - `packages/pi-role-model/test/extension.test.ts`
  - `packages/pi-role-model/test/docs-and-safety.test.ts`
  - `packages/pi-role-model/README.md`
  - `packages/pi-role-model/skills/role-model/SKILL.md`
  - `apps/docs-site/content/docs/integrations/pi.mdx`
- Actual changed files reviewed: none (planning-only phase)
- Unexplained drift: none

## Audit Verdict

Audit: PASS

The TO-BE plan maps every run-75 requirement to concrete package, test, doc, and live-Pi QA surfaces while keeping the implementation smaller than a speculative custom-provider rewrite.

## Coverage Gate

- [x] Every in-scope requirement is mapped to implementation, verification, and QA surfaces
- [x] The plan stays inside repo-owned boundaries and preserves the healthy valid-id provider path
- [x] Strict TDD slices are defined before Phase 3
- [x] Worktree-local Pi reinstall is explicitly required before final QA

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough for Phase 3 implementation
- [x] No unresolved plan gaps remain
- [x] Audit passed

Approval: PASS
