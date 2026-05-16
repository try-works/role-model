Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T21:23:45Z`
LockHash: `32148a31b9a76e58149a11a29d7510f16d2a2ec4a5c299f1d93e80ded959a622`
Addendum: `02`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log`
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.shell-transcript-json-reclassification.addendum-02.md`
Scope note: This addendum narrows the shell-transcript repair tactic from deletion to in-place exact-payload JSON reclassification so the tracked path remains honest, parseable, and explicitly accounted for in later audited receipts.

## TODO

- [x] Record why deletion was replaced with in-place reclassification
- [x] Confirm the tactic still satisfies the locked requirements
- [x] Keep the rest of the plan unchanged
- [x] Complete Coverage Gate and Approval Gate

## Correction

The shell-transcript artifact at `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json` should not be deleted outright in the final repair.

Instead, Phase 3 should:

1. preserve the exact original three-line payload
2. reserialize those exact lines as valid JSON at the same tracked path
3. keep the browser-probe normalization and the focused guard unchanged

## Rationale

- The locked requirements allow stray malformed evidence to be removed **or reclassified**.
- Reclassifying the exact payload as valid JSON avoids inventing new content while keeping the tracked diff explicit and accountable in later audited receipts.
- The new focused guard only requires parseable JSON, not deletion specifically.

## Unchanged Plan Surface

- `run15-real-vendor-browser-probe.json` still needs wrapper removal
- `packages/schema-tools/test/recursive-evidence-json.test.ts` remains the focused RED/GREEN guard
- local and GitHub parity validation remain required

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`

This addendum changes only the shell-transcript repair tactic from deletion to exact-payload JSON reclassification.

## Traceability

- `R2` -> the shell-transcript artifact now satisfies the allowed reclassification path instead of the earlier deletion path
- `R3` -> the focused guard remains the same regression proof
- `R5` -> the correction is recorded before Phase 3 locks

## Coverage Gate

- [x] The changed repair tactic is explicit
- [x] The tactic still stays within locked scope
- [x] The rest of the plan remains unchanged

Coverage: PASS

## Approval Gate

- [x] Later phases no longer rely on the outdated deletion-only tactic
- [x] The correction remains minimal and honest

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now correctly reflects the in-place reclassification tactic for the shell-transcript artifact.
Audit: PASS
