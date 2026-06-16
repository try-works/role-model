Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-15T20:41:08Z`
LockHash: `dbb02df176f5036df4b5fd1e5a08b4959673534307b00cfa5ce2bd59c7591362`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/03-implementation-summary.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/04-test-summary.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md`
Scope note: This addendum records the Phase 5 packaged-runtime defects that remained after the locked Phase 3 implementation receipt and the strict-TDD repairs required before run 47 could close.

## TODO

- [x] Record the packaged-runtime defects discovered during Phase 5
- [x] Tie the defects back to the locked implementation receipt and affected requirements
- [x] Capture the current-phase compensation path and repair file set
- [x] Attach RED/GREEN and rebuild evidence for the repairs
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - The locked `03-implementation-summary.md` remained historically accurate for the focused Phase 3 slices that were implemented and validated before closeout, but it was incomplete as the final implementation story required by the locked packaged-runtime QA plan.
  - Phase 5 packaged-runtime proof exposed three real product gaps that blocked acceptance:
    - `apps/runtime-ui/app/routes/providers.tsx` still contained a nullability path that failed `tsc --noEmit` during `corepack pnpm run runtime:package-sea`.
    - `apps/runtime-host-bridge/src/cli.ts` did not forward `reconnectProviderAccount` and `updateProviderApiKey` into the packaged CLI server options, so the packaged runtime returned `404` for `/api/role-model/accounts/repair/update-key`.
    - `apps/runtime-host-bridge/src/index.ts` did not advertise `update-api-key` for healthy remote persisted-local API-key accounts, so the saved-account maintenance UI disappeared exactly where the requirements demanded in-place key rotation.
  - The affected locked-requirement surface was primarily:
    - `R5` credential maintenance UX
    - `R6` explicit API-key storage mode and normalized maintenance posture
    - `R10` rebuilt packaged-runtime proof
    - `R12` backend maintenance mutation contract
- How the gap was discovered:
  - The first packaged-runtime rebuild attempt during Phase 5 failed at the runtime-ui typecheck floor.
  - After repairing the build break and rebuilding, live browser QA against the packaged runtime at `http://127.0.0.1:64186` exposed the missing packaged repair-endpoint wiring and the missing `Update API key` action for an otherwise healthy remote API-key account.
- Implications for locked history:
  - The locked Phase 3 artifact must remain unchanged.
  - This addendum becomes the canonical record that the packaged-runtime maintenance path was not actually complete at the first Phase 3 lock point.
  - The locked Phase 4 receipt remains the historical record for the focused automated suites it ran, but it did not replace the Phase 5 rebuilt-runtime proof required by the locked plan.
- Compensation path in the current phase:
  - Repair the packaged-runtime defects under strict TDD without editing the locked Phase 3 artifact.
  - Rebuild the SEA runtime again after the repairs.
  - Rerun the live maintenance-path QA on the rebuilt packaged runtime and record the final summary, accounts, health, and browser evidence in Phase 5.
- Remediation applied:
  - Narrowed the nullable saved-account handlers in `apps/runtime-ui/app/routes/providers.tsx` so the packaged runtime build can complete.
  - Wired packaged CLI repair endpoints through `apps/runtime-host-bridge/src/cli.ts`.
  - Restored the canonical `update-api-key` available action for ready remote persisted-local API-key accounts in `apps/runtime-host-bridge/src/index.ts`.
  - Extended the focused regression coverage in:
    - `apps/runtime-host-bridge/test/index.test.ts`
    - `apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- Changed files:
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- Repair evidence:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-phase3-providers-typecheck.red.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-providers-typecheck.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-phase3-cli-repair-wiring.red.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-cli-repair-wiring.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-phase3-api-key-available-actions.red.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-api-key-available-actions.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase5-runtime-package-sea-rerun.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase5-runtime-package-sea-rerun-2.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase5-runtime-package-sea-rerun-3.green.log`

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/03-implementation-summary.md`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/04-test-summary.md`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
- Gap categories captured:
  - packaged build failure that blocked Phase 5 proof
  - packaged repair-endpoint wiring omission
  - packaged maintenance-action lifecycle omission
- Current-phase compensation captured:
  - strict-TDD repair evidence
  - rebuilt-runtime rerun evidence
  - downstream Phase 5 live verification handoff

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The locked Phase 3 gap is recorded without rewriting prior artifacts
  - [x] The concrete packaged-runtime defects are named explicitly
  - [x] The repaired file set is attached
  - [x] The RED/GREEN and rebuild evidence paths are attached
  - [x] The Phase 5 compensation path is explicit
- Remaining blockers:
  - none at the addendum level; final run acceptance depends on the paired `05-manual-qa.md` receipt locking cleanly

Approval: PASS
