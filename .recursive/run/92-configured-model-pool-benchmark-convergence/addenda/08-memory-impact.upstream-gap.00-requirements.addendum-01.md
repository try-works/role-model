Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `08 Memory Impact upstream-gap addendum`
Status: `LOCKED`
LockedAt: `2026-08-21T14:25:49Z`
LockHash: `ccf241381cb8d99f8f2360eb0464a6f3c505e04528c496267ece972b564fe56d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/08-memory-impact.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/04-test-summary.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/05-manual-qa.md` (LOCKED)
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/candidate-profile-scaling.test.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This authoritative post-closeout addendum records stage-readiness findings discovered after the original Run 92 requirements and plan were locked. It preserves that history and defines the effective acceptance conditions now required before a `dev → stage` release-candidate promotion.

## TODO

- [x] Record the post-closeout readiness gaps without modifying locked history.
- [x] Define concrete remediation acceptance conditions for profile provenance, legacy reconciliation, runtime QA, and delivery.
- [x] Map the gaps back to R3–R8.

## Addendum Content

### Gap and evidence

The independent readiness audit found the locked Phase 5 receipt insufficient for original R3–R8:

1. It explicitly says no benchmark was run, although R8 requires production benchmark API evidence for exact selection, result, and propagated profile revision.
2. It marks final-controller eject `N/A` in the rebuilt runtime, although R8 requires final-controller eject/empty-pool recovery.
3. `toRouterDecisionData` computes the current configured-membership revision while listing a decision and returns it as both `membershipRevision` and `profileRevision`. This cannot identify the benchmark profile revision used at decision time.
4. The SP5 regression only scans source text for non-null fields, not profile-revision behavior; SP5/SP6 also lack retained preceding RED evidence despite strict TDD.
5. Latest-profile reads retain benchmark samples without a membership revision unless another reconciliation path proves compatibility. The locked tests cover stale and mismatched samples, but not ambiguous no-revision legacy data.

### Effective acceptance conditions

#### `A1` Immutable decision-time benchmark profile revision

- A canonical profile revision must be distinct from membership revision, bound to exact endpoint variant, benchmark suite/version, membership revision, completion state, result/profile receipt, and completion order/time.
- A valid benchmark completion for unchanged membership advances the affected profile revision; failed, cancelled, stale, mismatched, or sibling results do not.
- A routing decision persists both revisions when it is created. Later listing must never recompute historic values from current endpoints.
- `profileRevision: null` means no valid profile at decision time; membership revision must never be substituted.

#### `A2` Conservative legacy reconciliation

- A no-membership or otherwise ambiguous legacy benchmark sample must be quarantined/ignored with a diagnostic before it can influence a canonical profile, candidate, score, or routing decision.
- A legacy sample may remain only when exact endpoint/suite/version compatibility is documented and independently testable.

#### `A3` Mandatory rebuilt-runtime acceptance

In an isolated disposable state root and via normal production host APIs/browser UI, the repair must:

1. configure deterministic endpoint variants and run a benchmark;
2. prove exact selection/result/profile revision across Overview, Models, Benchmark, Router Candidates, Controller/Strategy, and routing decision detail;
3. route a request after completion and prove its persisted decision stores exact endpoint, membership revision, and profile revision;
4. confirm-eject the only non-local controller endpoint, verify durable empty/no-eligible recovery, restart, and prove no ghost profile/controller/member returns.

The receipt must bind source commit, executable/bundle SHA-256, launch command, port, state root, configuration digest, benchmark/result IDs, request/decision IDs, and restart evidence. A supervised deterministic local upstream is allowed; paid provider traffic and stage/user state mutation are not required.

#### `A4` Strict TDD recovery

Every remediation production change requires a focused behavioral RED run before the change, GREEN after the minimal repair, and final relevant suite/build evidence. Source-presence assertions alone cannot satisfy A1/A2.

#### `A5` Delivery gate

Run 92 is **NOT READY FOR STAGE RC** until A1–A4 have locked repair and verification receipts and the corrective `dev` commit has green CI. The future stage promotion must create a new immutable RC and must not overwrite an existing RC or promote to `main`.

## Implications for Current and Later Phases

- The locked original artifacts remain historically accurate, but their completed/stage-ready interpretation is superseded by this effective addendum.
- A follow-up implementation must create a new isolated repair worktree from the then-current `origin/dev`, run strict TDD, and create Phase 3–5 remediation addenda/receipts before any delivery decision.
- The linked plan addendum is the canonical repair sequence.

## Traceability

- R3/R4 → A1, A3
- R5 → A3
- R6 → A2
- R7 → A4
- R8 → A3, A5

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: an independent bounded audit was dispatched against the merged Run 92 worktree while the controller inspected the locked receipts and changed host/sqlite surfaces.
Delegation Decision Basis: this is a controller-owned closeout addendum; the independent audit corroborates findings but does not author the effective contract.
Delegation Override Reason: no delegated implementation or verification result is accepted here.
Audit Inputs Provided:
- locked Run 92 requirements, plan, implementation, test, and QA receipts
- normalized diff basis `d59f07b91e7b23c25e7297860a0f9c967b342b7a..60f346e2`
- decision projection, SP5 test, and latest benchmark profile read path

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Comparison reference: `origin/dev` merge `60f346e2`
- Normalized baseline: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Normalized comparison: `60f346e2`
- Normalized diff command: `git diff --name-only d59f07b91e7b23c25e7297860a0f9c967b342b7a 60f346e2 -- role-model-router`
- Planned or claimed changed files: original Run 92 diff plus the repair surfaces in the linked plan addendum.
- Actual changed files reviewed: `apps/runtime-host-bridge/src/index.ts`, `apps/runtime-host-bridge/test/candidate-profile-scaling.test.ts`, `packages/sqlite-memory/src/index.ts`, and locked control-plane receipts.
- Unexplained drift: none in this documentation-only addendum.

## Subagent Contribution Verification

- Reviewed Action Records: none; this is a post-closeout audit addendum.
- Main-Agent Verification Performed: confirmed Phase 5 omissions, `profileRevision: membershipRevision`, source-only SP5 coverage, and legacy no-revision acceptance path.
- Acceptance Decision: partially accepted — the original delivery remains blocked, while the remediation contract is accepted.
- Refresh Handling: implementation must regenerate review/audit evidence from its own repair diff.
- Repair Performed After Verification: none; product code is intentionally untouched.

## Requirement Completion Status

- `R3` | Status: blocked | Rationale: exact profile revision and production benchmark verification absent | Blocking Evidence: `05-manual-qa.md`, `src/index.ts` | Addendum: this file
- `R4` | Status: blocked | Rationale: decision-time profile provenance is represented by current membership | Blocking Evidence: `src/index.ts`, `candidate-profile-scaling.test.ts` | Addendum: this file
- `R5` | Status: blocked | Rationale: rebuilt-runtime final-controller eject/recovery was not executed | Blocking Evidence: `05-manual-qa.md` | Addendum: this file
- `R6` | Status: blocked | Rationale: ambiguous no-membership legacy evidence lacks reconciliation proof | Blocking Evidence: `packages/sqlite-memory/src/index.ts` | Addendum: this file
- `R7` | Status: blocked | Rationale: SP5/SP6 lack preceding durable RED evidence | Blocking Evidence: `03-implementation-summary.md`, `evidence/logs/green/sp5-decision-revision.log`, `evidence/logs/green/sp6-stale-quarantine.log` | Addendum: this file
- `R8` | Status: blocked | Rationale: mandatory benchmark/eject/restart execution not run | Blocking Evidence: `05-manual-qa.md` | Addendum: this file

## Coverage Gate

- [x] Every readiness finding has an effective acceptance condition.
- [x] R3–R8 implications are mapped.
- [x] TDD, rebuilt-runtime, and delivery obligations are explicit.

Audit: PASS
Coverage: PASS

## Approval Gate

- [x] Locked history remains untouched.
- [x] The linked plan is implementation-ready.
- [x] This addendum does not claim stage readiness.

Approval: PASS
