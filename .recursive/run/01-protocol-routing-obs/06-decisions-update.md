Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-04-12T11:58:28Z`
LockHash: `de889d393e89c81f32ad14835d7ae5367733d4b26c7eb0a3f8c527ca0308e7fc`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/02-to-be-plan.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-02.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/04-test-summary.addendum-01.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
Scope note: This document records the exact `DECISIONS.md` updates made for the completed run-01 protocol-routing-observability baseline.

## TODO

- [x] Read the Phase 5 manual-QA receipt
- [x] Update `/.recursive/DECISIONS.md` with the run outcome
- [x] Record a concise delta summary of the `DECISIONS.md` edits
- [x] Document the rationale for the ledger change
- [x] Verify late-phase links and run references
- [x] Audit the receipt against the run folder and repo state
- [x] Record any repair work
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Decisions Changes Applied

- Updated path or section: `/.recursive/DECISIONS.md#recursive-run-index`
- Run entry added or edited: added a new `01-protocol-routing-obs` entry beneath the established `00-baseline` run record
- Structural edits: retained the existing run-index structure and appended the stricter run-01 contract refinement as its own durable run outcome

## Rationale

- Why these ledger changes were needed: the repository now has a second completed recursive run that materially tightens the M1-M3 protocol, router, and observability contract relative to the original baseline.
- Why this run belongs in this section/index: it is the canonical durable record of the repo's first post-baseline contract refinement and must be discoverable alongside the baseline run history.

## Resulting Decision Entry

```md
### Run `01-protocol-routing-obs`

- Run folder: `/.recursive/run/01-protocol-routing-obs/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - tightened the canonical protocol schemas, fixtures, and directly coupled docs to the stricter run-01 M1-M3 contract
  - added fixture-driven router conformance, canonical compute-preference and strategy aliases, normalized weighted scoring, provider/endpoint policy filters, and deterministic fallback ordering
  - upgraded observed-performance aggregation to deterministic multi-sample semantics with `sample_window`, `sources`, freshness/confidence, failure/error-class rates, and mixed-version rejection
- Why:
  - to move the repo from the initial stable baseline to a stricter audited protocol-routing-observability contract without widening into deferred provider/runtime work
- How:
  - implemented the changes with strict RED/GREEN evidence, delegated Phase 3.5 code review, and a final `schemas:validate` + build + test + smoke validation chain
- What was not done:
  - production-grade daemon/browser/native runtimes, hosted providers, and other deferred run-00 out-of-scope surfaces remain out of scope
- Known issues / follow-ups:
  - unsupported-engine warnings persist under `Node v24`
  - repo-wide Biome formatting drift remains a pre-existing Windows-baseline issue and was intentionally not widened into this run
```

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `subagent support remained available, but the ledger update itself was controller-owned`
Delegation Decision Basis: `the global decisions ledger is short, high-impact, and best updated directly from the controller-owned late-phase receipts`
Delegation Override Reason: `a delegated edit would not improve confidence for this compact run-index delta`
Audit Inputs Provided:
- `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`
- `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/02-to-be-plan.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-02.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/04-test-summary.addendum-01.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/DECISIONS.md`
  - `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`

## Effective Inputs Re-read

- `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`
- `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/02-to-be-plan.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-02.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/04-test-summary.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- Manual QA outcome reflected: yes
- Run outcome and scope reflected: yes
- Follow-ups and out-of-scope items reflected: yes
- Relevant addenda incorporated: `/.recursive/run/01-protocol-routing-obs/addenda/02-to-be-plan.addendum-01.md`, `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-01.md`, `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-02.md`, `/.recursive/run/01-protocol-routing-obs/addenda/04-test-summary.addendum-01.md`

## Subagent Contribution Verification

- Reviewed Action Records: `run01-closeout-template-audit`
- Main-Agent Verification Performed: `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`, `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/DECISIONS.md`
- Acceptance Decision: the controller-authored ledger delta is current and internally consistent
- Refresh Handling: no delegated ledger edit existed to refresh
- Repair Performed After Verification: `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`, `/.recursive/DECISIONS.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Comparison reference: `working-tree`
- Normalized baseline: `c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Diff basis used: `git diff --name-only c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/01-protocol-routing-obs`
- Actual changed files reviewed:
  - `.recursive/DECISIONS.md`
  - `.recursive/STATE.md`
  - `.recursive/memory/domains/role-model-baseline.md`
  - `.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`
  - `packages/conformance/package.json`
  - `packages/conformance/src/gateway-smoke-observability.test.ts`
  - `packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `packages/conformance/src/protocol-schema-conformance.test.ts`
  - `packages/conformance/src/router-conformance.test.ts`
  - `packages/conformance/src/router-fixture-conformance.test.ts`
  - `packages/conformance/src/router-role-task-eligibility.test.ts`
  - `packages/conformance/src/schema-test-helpers.ts`
  - `packages/protocol-types/src/generated.ts`
  - `packages/schema-tools/package.json`
  - `packages/schema-tools/src/index.ts`
  - `packages/schema-tools/src/validate-schemas.ts`
  - `packages/schema-tools/test/generate-protocol-types.test.ts`
  - `pnpm-lock.yaml`
  - `protocol/fixtures/example-endpoint-identity.json`
  - `protocol/fixtures/example-router-decision.json`
  - `protocol/fixtures/example-usage-event.json`
  - `protocol/fixtures/profile-golden/observed-performance-basic.json`
  - `protocol/fixtures/role-task-golden/role-binding-basic.json`
  - `protocol/fixtures/role-task-golden/role-definition-basic.json`
  - `protocol/fixtures/role-task-golden/task-definition-basic.json`
  - `protocol/fixtures/role-task-golden/task-execution-profile-basic.json`
  - `protocol/fixtures/router-golden/router-decision-basic.json`
  - `protocol/fixtures/router-golden/cases/capability-missing.json`
  - `protocol/fixtures/router-golden/cases/cost-strategy-lower-cost-wins.json`
  - `protocol/fixtures/router-golden/cases/endpoint-id-tie-break.json`
  - `protocol/fixtures/router-golden/cases/fallback-chain-ordering.json`
  - `protocol/fixtures/router-golden/cases/inactive-role-binding.json`
  - `protocol/fixtures/router-golden/cases/insufficient-context.json`
  - `protocol/fixtures/router-golden/cases/local-preference-near-tie.json`
  - `protocol/fixtures/router-golden/cases/modality-unsupported.json`
  - `protocol/fixtures/router-golden/cases/preferred-capability-selection.json`
  - `protocol/fixtures/router-golden/cases/privacy-remote-deny.json`
  - `protocol/fixtures/router-golden/cases/provider-kind-allow-list-basic.json`
  - `protocol/fixtures/router-golden/cases/quality-strategy-measured-vs-declared.json`
  - `protocol/fixtures/router-golden/cases/role-task-unsupported.json`
  - `protocol/fixtures/router-golden/cases/tools-unsupported.json`
  - `protocol/fixtures/router-golden/cases/unknown-metric-redistribution.json`
  - `protocol/fixtures/trace-golden/trace-event-basic.json`
  - `protocol/fixtures/trace-golden/trace-span-basic.json`
  - `protocol/fixtures/usage-golden/usage-event-basic.json`
  - `protocol/schemas/declared-capability-profile.schema.json`
  - `protocol/schemas/endpoint-identity.schema.json`
  - `protocol/schemas/observed-performance-profile.schema.json`
  - `protocol/schemas/role-binding.schema.json`
  - `protocol/schemas/router-decision.schema.json`
  - `protocol/schemas/routing-policy.schema.json`
  - `protocol/schemas/task-execution-profile.schema.json`
  - `protocol/schemas/trace-event.schema.json`
  - `protocol/schemas/trace-span.schema.json`
  - `protocol/schemas/usage-event.schema.json`
  - `role-model-router/apps/gateway-smoke/src/index.ts`
  - `role-model-router/packages/core/src/reason-codes.ts`
  - `role-model-router/packages/core/src/router.ts`
  - `role-model-router/packages/core/src/types.ts`
  - `role-model-router/packages/profile-aggregator/src/index.ts`
  - `role-model-router/packages/provider-acp/src/index.ts`
  - `role-model-router/packages/provider-cli/src/index.ts`
  - `role-model-router/packages/provider-mcp/src/index.ts`
  - `role-model-router/packages/trace/src/index.ts`
  - `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- Added the durable run-index entry for `01-protocol-routing-obs` and synchronized this receipt to the final ledger text.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R2 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R3 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R4 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R5 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R6 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R7 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R8 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R9 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R10 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R11 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R12 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R13 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R14 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R15 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R16 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R17 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R18 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R19 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R20 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R21 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R22 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R23 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R24 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R25 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R26 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R27 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R28 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R29 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R30 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R31 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R32 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- R33 | Status: verified | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`

## Audit Verdict

- Decisions ledger outcome: PASS
- Run reference hygiene: PASS
- Remaining blockers: none

Audit: PASS

## Traceability

- `R1`-`R33` -> the durable decisions ledger now records the completed run-01 contract refinement, its scope boundary, and its validation posture. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R2` -> the durable decisions ledger now records the repo-level run-01 outcome and why the refinement matters. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R4` -> the durable decisions ledger preserves the run-01 source-of-truth framing for the refined contract. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R5` -> the durable decisions ledger records the repo decision to keep the stricter protocol/router/observability contract canonical. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R6` -> the durable decisions ledger records the validated fixture-backed schema surface as part of the run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R7` -> the durable decisions ledger records the stricter schema discipline as current repo history. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R8` -> the durable decisions ledger records the repaired capability-aware schema/router contract. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R9` -> the durable decisions ledger records the refined endpoint-identity contract as completed run history. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R10` -> the durable decisions ledger records the object-form `tool_calling` repair as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R11` -> the durable decisions ledger records the deterministic observed-performance contract as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R12` -> the durable decisions ledger records the refined routing-policy semantics as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R13` -> the durable decisions ledger records the repaired role/task execution semantics as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R14` -> the durable decisions ledger records the canonical router-decision structure as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R15` -> the durable decisions ledger records the linked trace/usage contract as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R16` -> the durable decisions ledger records M1 acceptance as completed run history. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R17` -> the durable decisions ledger records the router package outcome as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R18` -> the durable decisions ledger records the role/task-aware router input surface as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R19` -> the durable decisions ledger records the repaired eligibility pipeline as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R20` -> the durable decisions ledger records the normalized scoring model as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R21` -> the durable decisions ledger records deterministic selection reasoning as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R22` -> the durable decisions ledger records fixture-driven router conformance as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R23` -> the durable decisions ledger records M2 acceptance as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R24` -> the durable decisions ledger records the smoke-path observability model as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R25` -> the durable decisions ledger records the multi-sample aggregation model as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R26` -> the durable decisions ledger records deterministic aggregation rules as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R27` -> the durable decisions ledger records freshness/confidence/version invalidation semantics as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R28` -> the durable decisions ledger records the required smoke span/linkage behavior as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R29` -> the durable decisions ledger records the M3 observability/aggregation baseline as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R30` -> the durable decisions ledger records the stable validation path and operational caveats as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R31` -> the durable decisions ledger records the guarded verification surface as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`
- `R32` -> the durable decisions ledger records the repo's non-placeholder baseline truth as part of the completed run outcome. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/01-protocol-routing-obs/06-decisions-update.md`

## Coverage Gate

- [x] The manual-QA receipt was reread before updating the decisions ledger
- [x] The exact run-index delta is recorded
- [x] Out-of-scope and follow-up notes are preserved
- [x] The receipt is reconciled to the final ledger text

Coverage: PASS

## Approval Gate

- [x] The decisions ledger reflects the completed run
- [x] No unresolved decision-ledger drift remains
- [x] The next late-phase state update can proceed from the updated ledger

Approval: PASS
