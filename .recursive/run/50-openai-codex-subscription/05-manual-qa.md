# Phase 5 Manual QA

Run: `50-openai-codex-subscription`
Phase: `5 - manual qa`
Status: `LOCKED`
LockedAt: `2026-06-20T04:54:42Z`
LockHash: `30a3739724b0647679731ca3c95385da4c339a021b534b8fc6c010d81a7b61b5`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`
- `/.recursive/run/50-openai-codex-subscription/03-implementation-summary.md`
- `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-01.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-02.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-03.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-04.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-05.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-06.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-07.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-08.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-09.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-10.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-11.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-12.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-13.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-14.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-15.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-16.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-17.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-18.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-19.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-20.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-21.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-22.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-23.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-24.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-25.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-26.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-27.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`
- `/.recursive/run/50-openai-codex-subscription/evidence/browser/`
- `/.recursive/run/50-openai-codex-subscription/evidence/screenshots/`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/`
Scope note: This artifact records hybrid Phase 5 QA for the rebuilt runtime provider, studio, routing, hosted-search, and validation surfaces, including agent-operated live-runtime proof and explicit operator approval of the addendum-expanded run.

## TODO

- [x] Record QA execution mode and final runtime target
- [x] Record agent-operated runtime/browser QA evidence
- [x] Reconcile the addendum-expanded QA scope
- [x] Record operator manual QA approval
- [x] Complete coverage and approval gates

## Runtime Under Test

- Final accepted runtime URL: `http://127.0.0.1:3462`
- Earlier rebuilt-runtime proof also exercised: `http://127.0.0.1:3461`
- Supporting logs:
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/run50-routing-alias-runtime.stdout.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/run50-routing-alias-runtime.stderr.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/run50-qa-3462.stdout.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/run50-qa-3462.stderr.log`
- Runtime selection note:
  - the user identified that an older runtime instance was still bound to `3461`
  - final live QA and approval were therefore anchored to `3462`, which the user explicitly identified as the newer rebuilt runtime

## Agent-Operated QA Completed

### Live Runtime Proof

- Verified the Codex local-auth-cache start/poll flow against the live runtime:
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/sp11-live-codex-runtime-probe.green.log`
  - observed `userCode`, pending session, successful poll, and truthful activation block with the explicit transport-scope error
- Verified canonical live alias inventory on the newer runtime:
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-25-live-3462-alias-matrix.green.log`
  - observed canonical matrix rows for `default`, `baseline`, `controller`, `difficulty`, and `hybrid` across `decision-only`, `hybrid`, and `remote-only`
  - observed controller timeout persisted at `20000ms`
  - observed legacy `craft-ask.*` rows absent from the live runtime config
- Verified explicit requested-role handling on non-controller alias traffic:
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-26-live-3462-requested-role.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-26-non-controller-requested-role.green.log`

### Browser Proof

Verified against the rebuilt runtime evidence:

1. `/app/remote/providers`
   - `/.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt`
   - `/.recursive/run/50-openai-codex-subscription/evidence/screenshots/run50-remote-providers-codex-subscription.png`
   - confirmed one configured OpenAI connection row for `openai.personal.codex-subscription`
   - confirmed lifecycle badge `Connected, no endpoint`
   - confirmed lifecycle reason explains that direct OpenAI Platform requests are unavailable for `Codex Subscription` in the current runtime

2. `/app/studio/chat`
   - `/.recursive/run/50-openai-codex-subscription/evidence/browser/run50-studio-chat.snapshot.txt`
   - confirmed Studio reflects authoritative lifecycle truth:
     - `0` execution-ready models
     - `0` tool-capable endpoints
     - empty-state guidance routes the operator back to Providers and Session Readiness

3. Routing and controller runtime behavior
   - live alias-matrix and requested-role probes on `3462` confirmed the runtime now exposes the expected strategy/execution-mode matrix and no longer collapses non-controller requested-role traffic into empty endpoint failures

### Agent Findings During QA

- A stale runtime instance on `3461` could have misled QA toward older behavior.
  - Resolution: final accepted manual QA target moved to `3462`.
- An intermediate `3462` QA launcher cleanup hit a Windows `EBUSY` temp-directory removal failure.
  - Resolution: validator cleanup was later fixed and `runtime:validate-ui` passed cleanly.

## QA Execution Record

- QA Execution Mode: hybrid
- Agent Executor: Codex
- Tools Used: PowerShell, direct runtime probes, rebuilt-runtime browser snapshots, runtime logs
- Agent-operated execution included:
  - live device-code/auth-cache verification
  - live alias-matrix/config verification
  - live requested-role verification
  - rebuilt-runtime provider and Studio browser verification
- Human/operator execution:
  - the user manually exercised the rebuilt runtime throughout the run, reported live runtime/UI findings, and explicitly approved Phase 5 manual QA after the addendum-expanded repairs

## QA Scenarios and Results

- OpenAI provider dedupe and naming: PASS.
  - One operator-facing OpenAI connection row remained visible; `Codex Subscription` naming stayed consistent.
- Device-code visibility and onboarding UX: PASS.
  - The flow exposed a real device code and supporting verification page behavior instead of the earlier hidden-pane problem.
- Truthful lifecycle/readiness semantics: PASS.
  - After sign-in, the runtime remained `Connected, no endpoint` with explicit transport-limit explanation rather than falsely surfacing execution-ready state.
- Rebuilt-runtime Studio/provider UI proof: PASS.
  - Providers and Studio reflected the truthful no-endpoint state after rebuild.
- Canonical routing alias matrix and legacy alias removal: PASS.
  - Final runtime config exposed the full strategy × execution-mode matrix and removed `craft-ask.*`.
- Requested-role routing on non-controller aliases: PASS.
  - The runtime no longer failed these requests by emptying the candidate set before role/task inference.
- Hosted-search and tool-capability routing: PASS.
  - Automated live-runtime coverage proved OpenAI hosted-search surface acceptance, Kimi hosted-search completion, DeepSeek hosted-search completion, and DeepSeek DSML consumer-tool normalization.
- Runtime validator cleanup: PASS.
  - `runtime:validate-ui` now exits successfully after validator teardown repair.

## Evidence and Artifacts

- Browser evidence:
  - `/.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt`
  - `/.recursive/run/50-openai-codex-subscription/evidence/browser/run50-studio-chat.snapshot.txt`
- Screenshot evidence:
  - `/.recursive/run/50-openai-codex-subscription/evidence/screenshots/run50-remote-providers-codex-subscription.png`
- Live runtime/log evidence:
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/sp11-live-codex-runtime-probe.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-25-live-3462-alias-matrix.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-26-live-3462-requested-role.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-26-non-controller-requested-role.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-27-runtime-validate-ui.green.log`
- Hosted-search/tool-capability evidence:
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-19-openai-web-search.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-20-bridge-kimi-hosted.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-21-web-search-transport.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-22-tool-loop.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-23-deepseek-dsml.green.log`
  - `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-24-consumer-tool-normalization.green.log`

## User Sign-Off

- Approved by: operator/user
- Date: `2026-06-20`
- Operator manual QA result: PASS.
- Sign-off source: user message in this run: `you can consider phase 5 manual qa approved. resume the recursive run 50. make sure to include addenda docs in closeout`
- Scope of approval: the rebuilt runtime and all addendum-expanded run-50 surfaces, with `3462` treated as the authoritative final runtime target after the stale `3461` correction.

## Traceability

- `R1` -> PASS via Providers rebuilt-runtime proof and provider dedupe tests.
- `R2` -> PASS via `Codex Subscription` naming in rebuilt-runtime provider UI.
- `R3` -> PASS via live Codex auth-cache start/poll and truthful transport-scope block.
- `R4` -> PASS via real device-code lifecycle proof and user-observed sign-in flow.
- `R5` -> PASS via curated OpenAI `5.3+` matrix tests and provider/runtime readback.
- `R6` -> PASS via preserved API-key OpenAI verification in automated suites and unchanged operator provider surface.
- `R7` -> PASS via rebuilt-runtime `Connected, no endpoint` UI proof and Studio empty-state proof.
- `R8` -> PASS via provider/transport-aware hosted-search and capability verification across OpenAI, Kimi, and DeepSeek.
- `R9` -> PASS via final live alias-matrix/config proof on `3462`.
- `R10` -> PASS via the recorded RED/GREEN evidence and Phase 4 verification receipt.
- `R11` -> PASS via integrated live-runtime proofs for auth, routing, hosted-search, requested-role, and validator behavior.
- `R12` -> PASS via rebuilt-runtime browser verification and operator approval.

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: recursive router policy files were absent in this worktree as recorded in `/.recursive/run/50-openai-codex-subscription/00-worktree.md`.
- Delegation Decision Basis: self-audit used because no configured routed subagent policy/discovery inventory was available in the isolated worktree.
- Audit Inputs Provided: locked Phase 3 and Phase 4 artifacts, addenda `02-to-be-plan.addendum-01.md` through `02-to-be-plan.addendum-27.md`, rebuilt-runtime browser artifacts, live runtime logs, and the explicit user approval message.

## Effective Inputs Re-read

- Re-read `/.recursive/run/50-openai-codex-subscription/03-implementation-summary.md`.
- Re-read `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`.
- Re-read `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-01.md` through `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-27.md`.
- Re-read the relevant browser and live-runtime evidence files listed above.

## Prior Recursive Evidence Reviewed

- Re-read `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md` as the current hybrid manual-QA template reference.
- Re-read `/.recursive/memory/domains/role-model-baseline.md` as the relevant runtime/operator baseline memory before closeout.

## Earlier Phase Reconciliation

- Phase 4 established the automated verification floor for the base OpenAI change and the addendum-expanded routing/controller/tooling fixes.
- Phase 5 manual QA anchored the final acceptance runtime to `3462` after the stale `3461` correction.
- The user-approved QA scope covers the full addendum-expanded run, not only the original OpenAI onboarding slice.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: compared the rebuilt-runtime snapshots, live runtime logs, and explicit approval message against the locked implementation/test receipts and addendum scope.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: not applicable.
- Repair Performed After Verification: anchored the final manual-QA record to `3462` so the receipt reflects the actual accepted runtime rather than the earlier stale port.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Comparison reference: `working-tree`
- Normalized baseline: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Phase-owned changed file reviewed: `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`

## Gaps Found

- None unresolved after final operator approval.

## Repair Work Performed

- Converted the missing Phase 5 artifact into a full hybrid QA receipt and reconciled the final accepted runtime target to `3462`.

## Requirement Completion Status

- `R1 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt | Verification Evidence: /.recursive/run/50-openai-codex-subscription/evidence/screenshots/run50-remote-providers-codex-subscription.png | Audit Note: operator-facing OpenAI dedupe remained visible in the rebuilt runtime.`
- `R2 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt | Verification Evidence: user approval recorded in this receipt | Audit Note: `Codex Subscription` naming was approved on the rebuilt runtime.`
- `R3 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/sp11-live-codex-runtime-probe.green.log | Verification Evidence: user approval recorded in this receipt | Audit Note: Codex-managed auth flow and truthful scope boundary were approved live.`
- `R4 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/sp11-live-codex-runtime-probe.green.log | Verification Evidence: user approval recorded in this receipt | Audit Note: device-code UX and poll behavior were exercised before approval.`
- `R5 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-19-openai-web-search.green.log | Verification Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-25-live-3462-alias-matrix.green.log | Audit Note: curated supported-model behavior stayed consistent in the rebuilt runtime.`
- `R6 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/04-test-summary.md | Verification Evidence: user approval recorded in this receipt | Audit Note: OpenAI API-key behavior remained preserved; no manual QA finding contradicted the automated floor.`
- `R7 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-studio-chat.snapshot.txt | Verification Evidence: /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt | Audit Note: the rebuilt runtime truthfully remained connected-without-endpoint instead of implying execution readiness.`
- `R8 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-20-bridge-kimi-hosted.green.log, /.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-23-deepseek-dsml.green.log | Verification Evidence: user approval recorded in this receipt | Audit Note: provider capability and transport behavior were accepted with the expanded multi-provider runtime surface.`
- `R9 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-25-live-3462-alias-matrix.green.log | Verification Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-26-live-3462-requested-role.green.log | Audit Note: final live runtime QA covered canonical alias inventory and routing-role behavior.`
- `R10 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/04-test-summary.md | Verification Evidence: user approval recorded in this receipt | Audit Note: manual QA supplements but does not replace the recorded TDD floor.`
- `R11 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-27-runtime-validate-ui.green.log | Verification Evidence: user approval recorded in this receipt | Audit Note: integrated runtime behavior across auth, routing, tools, and validation was accepted.`
- `R12 | Status: verified | Changed Files: /.recursive/run/50-openai-codex-subscription/05-manual-qa.md | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt, /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-studio-chat.snapshot.txt | Verification Evidence: user approval recorded in this receipt | Audit Note: final approval explicitly covers rebuilt-runtime browser verification.`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Agent-operated runtime proof and operator sign-off are both recorded for hybrid QA.
- [x] The addendum-expanded run scope is represented in the manual QA record.
- [x] Final runtime target and approval context are explicit.

Coverage: PASS

## Approval Gate

- [x] Phase 5 manual QA is approved by the operator.
- [x] No unresolved manual-QA blocker remains before Phase 6.

Approval: PASS
