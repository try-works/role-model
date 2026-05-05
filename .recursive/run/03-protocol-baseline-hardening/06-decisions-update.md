Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-05-05T00:44:59Z`
LockHash: `67dabca896d84361f742e589c79f634041bdb0d8081cd308e9ec9ef26d4c11ee`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
Scope note: This document records the exact `DECISIONS.md` updates made for the completed `03-protocol-baseline-hardening` run.

## TODO

- [x] Read the Phase 5 manual-QA receipt
- [x] Update `/.recursive/DECISIONS.md` with the run outcome
- [x] Record the ledger delta and rationale
- [x] Complete the audited-phase sections and gates

## Decisions Changes Applied

- Updated path or section: `/.recursive/DECISIONS.md#recursive-run-index`
- Run entry added or edited: added a new `03-protocol-baseline-hardening` entry after `02-audit-remediation`
- Structural edits: retained the existing run-index structure and appended the new baseline-hardening run as the next durable repo decision

## Rationale

- Why these ledger changes were needed: the repository now has a completed M1-M3 baseline-hardening run whose product changes materially alter the durable protocol, router, observability, and smoke-harness contract.
- Why this run belongs in this section/index: it is the authoritative record of the first post-run-02 expansion that moved the repo from a structural baseline to a hardened, explainable, schema-validated protocol baseline.

## Resulting Decision Entry

```md
### Run `03-protocol-baseline-hardening`

- Run folder: `/.recursive/run/03-protocol-baseline-hardening/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - froze the M1 protocol baseline by expanding fixture coverage to valid, invalid, minimal, and edge families, tightening the router-decision and observed-performance schemas, and enforcing the full fixture manifest through schema-tools
  - hardened the TypeScript router into an explainable role, task, and binding-aware reference implementation with explicit exclusion codes, scored-candidate diagnostics, and deterministic tie-break metadata
  - added stable observability linkage helpers plus a fixture-driven, self-validating `gateway-smoke` harness that validates router, trace, usage, and observed-performance artifacts against the canonical schemas
- Why:
  - to complete the next baseline-hardening block for M1-M3 before widening into deferred native-host, package-loading, or browser/runtime expansion
- How:
  - used a strict RED/GREEN loop driven by router and observability conformance failures, extended schema-tools to validate the expanded fixture corpus, and revalidated the repo through root `schemas:validate`, `test`, and `smoke`
- What was not done:
  - native hosts, memory/backend integration, package/model-pack loading, and real browser-local inference integrations remain out of scope
- Known issues / follow-ups:
  - unsupported-engine warnings still persist under `Node v24`
  - repo-wide CRLF/Biome drift remains an existing Windows hygiene issue and was intentionally not widened into this run
```

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `delegation remained unavailable for this run because no explicit user authorization for subagents was provided in the session.`
Delegation Decision Basis: `the global decisions ledger is concise, high-impact, and best updated directly from the validated Phase 4 and Phase 5 receipts.`
Audit Inputs Provided:
- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/DECISIONS.md`
  - `/docs/protocol/benchmarks.md`
  - `/docs/protocol/profiles.md`
  - `/docs/protocol/reason-codes.md`
  - `/docs/protocol/role-task-capability-mapping.md`
  - `/docs/protocol/roles.md`
  - `/docs/protocol/tasks.md`
  - `/docs/protocol/traces.md`
  - `/docs/protocol/usage.md`
  - `/packages/conformance/package.json`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`
  - `/packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `/packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `/packages/conformance/src/protocol-schema-conformance.test.ts`
  - `/packages/conformance/src/router-conformance.test.ts`
  - `/packages/conformance/src/router-fixture-conformance.test.ts`
  - `/packages/conformance/src/router-role-task-eligibility.test.ts`
  - `/packages/schema-tools/src/index.ts`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/schema-tools/test/validate-schemas.test.ts`
  - `/packages/protocol-types/src/generated.ts`
  - `/protocol/fixtures/**`
  - `/protocol/schemas/router-decision.schema.json`
  - `/protocol/schemas/observed-performance-profile.schema.json`
  - `/protocol/schemas/role-binding.schema.json`
  - `/role-model-router/**`

## Effective Inputs Re-read

- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- Manual QA outcome reflected: yes
- Run outcome and scope reflected: yes
- Known caveats reflected: yes

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
  - `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
  - `/.recursive/DECISIONS.md`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
  - `/.recursive/DECISIONS.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Comparison reference: `working-tree`
- Normalized baseline: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Diff basis used: `git diff --ignore-cr-at-eol --name-only`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/03-protocol-baseline-hardening`
- Actual changed files reviewed:
  - `.recursive/DECISIONS.md`
  - `docs/protocol/benchmarks.md`
  - `docs/protocol/profiles.md`
  - `docs/protocol/reason-codes.md`
  - `docs/protocol/role-task-capability-mapping.md`
  - `docs/protocol/roles.md`
  - `docs/protocol/tasks.md`
  - `docs/protocol/traces.md`
  - `docs/protocol/usage.md`
  - `packages/conformance/package.json`
  - `packages/conformance/src/gateway-smoke-observability.test.ts`
  - `packages/conformance/src/observability-linkage.test.ts`
  - `packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `packages/conformance/src/protocol-schema-conformance.test.ts`
  - `packages/conformance/src/router-conformance.test.ts`
  - `packages/conformance/src/router-fixture-conformance.test.ts`
  - `packages/conformance/src/router-role-task-eligibility.test.ts`
  - `packages/protocol-types/src/generated.ts`
  - `packages/schema-tools/src/index.ts`
  - `packages/schema-tools/src/validate-schemas.ts`
  - `packages/schema-tools/test/validate-schemas.test.ts`
  - `pnpm-lock.yaml`
  - `protocol/fixtures/example-router-decision.json`
  - `protocol/fixtures/profile-golden/observed-performance-basic.json`
  - `protocol/fixtures/profile-golden/observed-performance-edge-error-rates.json`
  - `protocol/fixtures/profile-golden/observed-performance-invalid-missing-endpoint-version.json`
  - `protocol/fixtures/profile-golden/observed-performance-minimal.json`
  - `protocol/fixtures/role-task-golden/role-binding-invalid-status.json`
  - `protocol/fixtures/role-task-golden/role-binding-minimal.json`
  - `protocol/fixtures/role-task-golden/role-definition-minimal.json`
  - `protocol/fixtures/role-task-golden/task-definition-edge.json`
  - `protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json`
  - `protocol/fixtures/router-golden/cases/binding-capability-restriction.json`
  - `protocol/fixtures/router-golden/cases/binding-task-restriction.json`
  - `protocol/fixtures/router-golden/cases/cost-strategy-prefers-cheaper.json`
  - `protocol/fixtures/router-golden/cases/inactive-role-binding.json`
  - `protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json`
  - `protocol/fixtures/router-golden/cases/local-preference.json`
  - `protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json`
  - `protocol/fixtures/router-golden/cases/measured-profile-prefers-observed.json`
  - `protocol/fixtures/router-golden/cases/preferred-capability-selection.json`
  - `protocol/fixtures/router-golden/cases/quality-strategy-prefers-better-judged.json`
  - `protocol/fixtures/router-golden/cases/remote-preference.json`
  - `protocol/fixtures/router-golden/cases/role-forbids-capability.json`
  - `protocol/fixtures/router-golden/cases/role-task-unsupported.json`
  - `protocol/fixtures/router-golden/cases/task-not-allowed-for-role.json`
  - `protocol/fixtures/router-golden/router-decision-basic.json`
  - `protocol/fixtures/router-golden/router-decision-edge-empty-selection.json`
  - `protocol/fixtures/router-golden/router-decision-invalid-missing-app-id.json`
  - `protocol/fixtures/router-golden/router-decision-minimal.json`
  - `protocol/fixtures/trace-golden/trace-event-edge-no-span.json`
  - `protocol/fixtures/trace-golden/trace-event-invalid-missing-request-id.json`
  - `protocol/fixtures/trace-golden/trace-span-minimal.json`
  - `protocol/fixtures/usage-golden/usage-event-edge-benchmark.json`
  - `protocol/fixtures/usage-golden/usage-event-invalid-missing-routing-decision.json`
  - `protocol/fixtures/usage-golden/usage-event-minimal.json`
  - `protocol/schemas/observed-performance-profile.schema.json`
  - `protocol/schemas/role-binding.schema.json`
  - `protocol/schemas/router-decision.schema.json`
  - `role-model-router/apps/gateway-smoke/src/index.ts`
  - `role-model-router/packages/core/package.json`
  - `role-model-router/packages/core/src/reason-codes.ts`
  - `role-model-router/packages/core/src/router.ts`
  - `role-model-router/packages/core/src/types.ts`
  - `role-model-router/packages/profile-aggregator/package.json`
  - `role-model-router/packages/profile-aggregator/src/index.ts`
  - `role-model-router/packages/trace/package.json`
  - `role-model-router/packages/trace/src/index.ts`
  - `role-model-router/packages/usage/package.json`
  - `role-model-router/packages/usage/src/index.ts`
- Excluded future-phase control-plane drift:
  - `.recursive/STATE.md`
  - `.recursive/memory/domains/role-model-baseline.md`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- appended the durable run-index entry for `03-protocol-baseline-hardening` and synchronized this receipt to the exact final ledger text

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R2 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R3 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R4 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R5 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`

## Audit Verdict

- Audit summary: the global decisions ledger now accurately records the completed M1-M3 baseline-hardening run.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> the durable decisions ledger now records the frozen schema and fixture baseline as completed repo history. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `R2` -> the durable decisions ledger now records the router-reference implementation hardening. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `R3` -> the durable decisions ledger now records fixture-driven routing conformance as part of the repo baseline. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `R4` -> the durable decisions ledger now records the stable observability linkage and empirical profile semantics. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `R5` -> the durable decisions ledger now records the self-validating smoke harness as part of the validated baseline. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
  - `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
  - `/.recursive/DECISIONS.md`

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the run outcome is now discoverable in the global ledger
  - no required Phase 6 section is missing
- Remaining blockers:
  - none

Approval: PASS
