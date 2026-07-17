Run: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-07-17T01:30:06Z`
LockHash: `18a50c45d90ea43f95e89bf124031602466433dfe15aa55bdb0465ee1e81bd53`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md`
Outputs:
- `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Record the Kimi Code K3 catalog and request-policy decision in the shared recursive ledger after live repo-path verification on Friday, July 17, 2026.

## TODO

- [x] Record the exact decision delta introduced by run 74
- [x] Update the shared recursive decision ledger
- [x] Complete the audited decisions-update gates before locking

## Effective Inputs Re-read

- `05-manual-qa.md` (locked): live repo-path K3 and K2.7 Kimi verification through `createRuntimeBridgeBackend()`
- `03-implementation-summary.md` (locked): K3 catalog, alias, and provider-openai implementation details

## Decisions Changes Applied

- Added run `74-kimi-k3-kimi-code-oauth-support` to `/.recursive/DECISIONS.md`.
- Recorded three durable decisions:
  - Kimi Code K3 is an operator-visible Moonshot model with canonical id `moonshot/kimi-k3` and hidden economics authority `moonshotai/kimi-k3`
  - the Kimi Code provider-openai path maps canonical `moonshot/kimi-k3` to upstream `k3`
  - the current fixed-temperature Kimi Code chat-completions models must omit caller-supplied `temperature`, not just K3

## Rationale

- Shipping K3 only in supplements or only in provider-openai tests would have left the exported catalog and provider surfaces incomplete.
- Live direct discovery and final repo-path QA both showed the request-policy problem was broader than K3 alone: K2.7 shared the same fixed-temperature constraint.

## Resulting Decision Entry

See `/.recursive/DECISIONS.md` -> Run `74-kimi-k3-kimi-code-oauth-support`.

## Traceability

- `R1`: the ledger now records the canonical K3 catalog identity and exported limits
- `R2`: the ledger now records the Moonshot hidden-authority alias pattern for K3 economics
- `R3`: the ledger now records that K3 landed on the existing Moonshot and Kimi Code provider surfaces without adding a new provider
- `R4`: the ledger now records canonical `moonshot/kimi-k3` to upstream `k3` mapping
- `R5`: the ledger now records the shared fixed-temperature omission rule for current Kimi Code chat-completions models
- `R6`: the ledger records that the change was landed with strict RED/GREEN regression coverage
- `R7`: the ledger records the final live repo-path Kimi verification completed on Friday, July 17, 2026
- `R8`: the ledger records the centralized shared-policy implementation rather than a K3-only exception

## Coverage Gate

- [x] The decision ledger captures the new K3 catalog and request-policy rules
- [x] The recorded decision matches the verified implementation and QA evidence

Coverage: PASS

## Approval Gate

- [x] The shared decision ledger is updated accurately
- [x] The artifact is ready for the state update phase

Approval: PASS

## Audit Context

- Phase: `06 Decisions Update`
- Auditor: `self`
- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: current desktop-thread tool roster exposes no directly callable subagent execution tool
- Delegation Decision Basis: the closeout scope was limited to reconciling one verified model-family change into the shared ledger
- Audit Inputs Provided:
  - `05-manual-qa.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - updated `/.recursive/DECISIONS.md`
- Audit basis: implementation and QA reconciliation against the new shared decision entry

## Earlier Phase Reconciliation

- Phase 3 implemented the K3 catalog, alias, provider, and provider-openai request-policy repair.
- Phase 4 verified the owning package and host-bridge regression floor.
- Phase 5 confirmed live repo-path K3 and K2.7 behavior against the real Kimi Code endpoint.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: verified that the updated decision entry matches the final implementation, the refreshed automated floor, and the live repo-path QA outcomes
- Acceptance Decision: `not applicable`
- Refresh Handling: no delegated artifacts to refresh
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Comparison reference: `working-tree`
- Normalized baseline: `ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Diff basis used: `git diff --name-only ac855c46309f3ccdf7b26b6375ed41ae0d380ffc`
- Supplemental scope command: `git status --short --untracked-files=all`
- Reviewed changed paths:
  - `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
  - `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/catalog-economics-providers.test.ts`
  - `role-model-router/packages/catalog/data/normalized-catalog.json`
  - `role-model-router/packages/catalog/src/token-economics.ts`
  - `role-model-router/packages/catalog/test/index.test.ts`
  - `role-model-router/packages/catalog/test/token-economics.test.ts`
  - `role-model-router/packages/provider-openai/src/index.ts`
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `testdata/catalog/models-dev-local-overrides.json`
  - `testdata/catalog/models-dev-local-supplement.json`
  - `testdata/catalog/models-dev-snapshot.json`
  - `.recursive/DECISIONS.md`
- Unexplained drift:
  - none

## Gaps Found

None.

## Repair Work Performed

None.

## Requirement Completion Status

- `R1` | Status: `verified` | Changed Files: `testdata/catalog/models-dev-snapshot.json`, `testdata/catalog/models-dev-local-supplement.json`, `role-model-router/packages/catalog/data/normalized-catalog.json`, `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`, `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`, `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md`
- `R2` | Status: `verified` | Changed Files: `testdata/catalog/models-dev-local-overrides.json`, `role-model-router/packages/catalog/src/token-economics.ts`, `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`, `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`
- `R3` | Status: `verified` | Changed Files: `role-model-router/apps/runtime-host-bridge/test/catalog-economics-providers.test.ts`, `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`, `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`, `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md`
- `R4` | Status: `verified` | Changed Files: `role-model-router/packages/provider-openai/src/index.ts`, `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`, `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`, `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md`
- `R5` | Status: `verified` | Changed Files: `role-model-router/packages/provider-openai/src/index.ts`, `role-model-router/packages/provider-openai/test/index.test.ts`, `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`, `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`, `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md`
- `R6` | Status: `verified` | Changed Files: `role-model-router/packages/catalog/test/index.test.ts`, `role-model-router/packages/catalog/test/token-economics.test.ts`, `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`, `role-model-router/apps/runtime-host-bridge/test/catalog-economics-providers.test.ts`, `role-model-router/packages/provider-openai/test/index.test.ts`, `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`, `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`
- `R7` | Status: `verified` | Changed Files: `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/evidence/logs/green/sp5-runtime-bridge-kimi.log`
- `R8` | Status: `verified` | Changed Files: `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/packages/provider-openai/src/index.ts`, `.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/03-implementation-summary.md`, `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/04-test-summary.md`, `/.recursive/run/74-kimi-k3-kimi-code-oauth-support/05-manual-qa.md`

## Audit Verdict

Audit: PASS
