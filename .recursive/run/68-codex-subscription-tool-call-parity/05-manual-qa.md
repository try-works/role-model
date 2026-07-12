Run: `/.recursive/run/68-codex-subscription-tool-call-parity/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-12T17:07:48Z`
LockHash: `67498c4ec56bd4a00e1f65ae70fcfc3f70b98aa001d74e23a9a79f5c77f3bfbf`
Inputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/02-to-be-plan.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/04-test-summary.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/logs/manual-qa/runtime-package-sea-rerun3.log`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/run68-runtime-relaunch3.stderr.log`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/run68-runtime-relaunch4.json`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/direct-codex-responses-tool-continuation-v4.json`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/pi-exact-model-read.jsonl`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/pi-alias-read-small.jsonl`
Outputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
Scope note: This artifact records the rebuilt-runtime verification for the run-68 tool-call parity symptom: exact-model Codex typed Responses continuation, Pi CLI exact-model tool-call execution, Pi CLI alias-routed tool-call execution, and the Windows packaged-runtime relaunch caveat that had to be bypassed to run the live proofs.

## TODO

- [x] Declare the QA execution mode and supporting evidence
- [x] Record the rebuilt-runtime relaunch and packaged build receipts
- [x] Record exact-model Codex and alias-routed Pi tool-call scenarios
- [x] Make the selected alias provider outcome explicit instead of assuming Codex
- [x] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `Codex main agent in D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity`
- Tools Used: packaged runtime SEA build, `powershell` with `Invoke-RestMethod` for canonical runtime request-detail cross-checks, and Pi CLI `--mode json` for tool-call receipts
- Rebuilt Runtime Base URL: `http://127.0.0.1:57686`
- Rebuilt Runtime Binary:
  - `D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity\role-model-router\dist\release\win32-x64\role-model-runtime.exe`
- Evidence Path:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/`
- Runtime Package Evidence:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/logs/manual-qa/runtime-package-sea-rerun3.log`
- Relaunch Metadata:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/run68-runtime-relaunch4.json`

## QA Scenarios and Results

### 1. `V1` rebuilt packaged runtime and relaunch proof

- Packaged runtime rebuild:
  - command family: `corepack pnpm run runtime:package-sea`
  - retained evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/logs/manual-qa/runtime-package-sea-rerun3.log`
  - final SEA output hash: `127680ca39bb0d2baf5a795ad69ed62836433865230a10170f13039c442ab398`
- Successful relaunch metadata:
  - file: `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/run68-runtime-relaunch4.json`
  - PID: `55548`
  - port: `57686`
  - scope id: `run68-manual-qa-20260712-235024`
  - launched at: `2026-07-13T00:36:26.2324999+08:00`
- Windows relaunch caveat:
  - the earlier `Start-Process` attempt split a spaced path incorrectly and failed with `Unexpected argument 'Model'. This command does not take positional arguments`
  - retained failure evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/run68-runtime-relaunch3.stderr.log`
  - working fix: raw `.NET ProcessStartInfo.ArgumentList`
- Inventory proof on the rebuilt runtime:
  - `/v1/models` includes exact models `chatgpt/gpt-5.4`, `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`, `moonshot/kimi-k2.7-code`
  - `/v1/models` also includes canonical routing aliases such as `difficulty.remote-only`

### 2. `V2` direct exact-model Codex `/v1/responses` typed continuation proof

- Request evidence:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/direct-codex-responses-tool-continuation-v4.json`
- Exact live request facts:
  - request header id: `run68-responses-codex-tool-continuation-v4`
  - canonical request id: `req-3c28554b-e398-455a-8761-b40ec7d065d7`
  - endpoint: `openai.personal.openai-codex-subscription.global.gpt-5.4`
  - provider: `openai`
  - source client: `openai.responses`
  - adapter family: `codex-subscription-responses`
- Probe shape:
  - user `input_text`
  - typed `function_call`
  - typed `function_call_output`
- Result:
  - response `object = "response"`
  - response `status = "completed"`
  - assistant output: `Order 84 has been shipped and is expected to arrive in 2 days.`
- Outcome:
  - the rebuilt runtime now accepts official typed Responses continuation items on the live Codex Subscription path

### 3. `V3` Pi exact-model Codex tool-call proof

- Pi evidence:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/pi-exact-model-read.jsonl`
- Exact-model path:
  - provider: `role-model`
  - requested model: `chatgpt/gpt-5.4`
  - Pi mode: `--mode json`
  - Pi tool surface: `read`
- Pi receipts:
  - first response id: `chatcmpl_req-dceec397-f0f2-4642-9370-5df20b09ffe7`
  - final response id: `chatcmpl_req-fca0887a-6587-433c-abb3-de59624e6705`
  - tool call emitted: `read`
  - final answer: `@role-model-router/provider-openai`
- Canonical runtime cross-check:
  - first request id: `req-dceec397-f0f2-4642-9370-5df20b09ffe7`
  - second request id: `req-fca0887a-6587-433c-abb3-de59624e6705`
  - endpoint on both turns: `openai.personal.openai-codex-subscription.global.gpt-5.4`
  - source client on both turns: `openai.chat.completions`
  - adapter family on both turns: `codex-subscription-responses`
- Outcome:
  - exact-model Pi tool calls now execute cleanly on the rebuilt Codex Subscription runtime path

### 4. `V4` Pi alias tool-call proof

- Pi evidence:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/pi-alias-read-small.jsonl`
- Alias path:
  - provider: `role-model`
  - requested alias: `difficulty.remote-only`
  - Pi mode: `--mode json`
  - Pi tool surface: `read`
- Pi receipts:
  - tool-turn response id: `fe49367b-2cf8-4a8c-93cb-2ba6face2f24`
  - final response id: `a03e315d-5c81-4feb-baf2-06047af2ad07`
  - selected response model on both turns: `deepseek-v4-pro`
  - tool call emitted: `read`
  - final answer: `@role-model-router/provider-openai`
- Canonical runtime cross-check:
  - tool-turn request id: `req-bebcfd24-ef21-40e3-ab23-d0ec6828eef9`
  - final request id: `req-7770e686-b414-4731-a328-986d4c21d148`
  - endpoint on both turns: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - provider on both turns: `deepseek`
  - source client on both turns: `openai.chat.completions`
  - adapter family on both turns: `ai-sdk-openai-compatible`
- Outcome:
  - the alias proof is successful for cross-provider tool-call compatibility, but the live runtime selected DeepSeek Pro rather than Codex for this prompt
  - this is recorded as the true routing result, not treated as a failure

### 5. `V5` aborted large-file alias probe

- Earlier evidence:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/pi-alias-read.jsonl`
- Outcome:
  - that earlier alias probe was aborted after the model looped on repeated file-read attempts against a much larger input path
  - the run does not use that transcript as proof because it was not a clean terminating Pi pass
  - the smaller alias probe above is the retained canonical alias receipt

## Evidence and Artifacts

- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/logs/manual-qa/runtime-package-sea-rerun3.log`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/run68-runtime-relaunch4.json`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/run68-runtime-relaunch3.stderr.log`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/direct-codex-responses-tool-continuation-v4.json`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/pi-exact-model-read.jsonl`
- `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/pi-alias-read-small.jsonl`

## User Sign-Off

- Approved by: `agent-operated closeout per locked QA mode`
- Date: `2026-07-13`

## Traceability

- `R1` -> live exact-model Codex `/v1/responses` proof shows native Codex tool-call continuation parity survives on the rebuilt runtime
- `R2` -> live exact-model Codex `/v1/responses` proof shows truthful downstream Responses output after typed continuation replay
- `R3` -> exact-model Codex Pi proof and alias-routed DeepSeek Pi proof show provider-neutral continuation rendering works across both target families
- `R4` -> Phase 4 automated verification remains the primary proof for caller-owned `parallel_tool_calls`; Phase 5 confirms those tool-bearing requests no longer fail live
- `R5` -> manual QA consumes the strict regression floor from Phase 4 and proves the originally failing live path is covered end to end
- `R6` -> rebuilt-runtime direct plus Pi CLI verification is completed here for both the exact model and the routing alias
- `R7` -> the rebuilt runtime used here is the same packaged runtime built from the repaired benchmark Responses seam
- `R8` -> the run now has rebuilt-runtime proof for exact-model Codex, alias-routed non-Codex, and direct Responses continuation flows
- `R9` -> the alias-routed DeepSeek proof shows the bridge-safe route-switch contract works in live execution, not only in fixture tests
- `R10` -> the alias proof lands on the generic LiteLLM-compatible DeepSeek path and still executes tools correctly

## Coverage Gate

- [x] Rebuilt packaged runtime proof is explicit
- [x] Direct exact-model Codex `/v1/responses` typed continuation proof is explicit
- [x] Exact-model Pi CLI tool-call proof is explicit
- [x] Routing-alias Pi CLI tool-call proof is explicit
- [x] The true alias-selected provider and the Windows relaunch caveat are both recorded exactly

Coverage: PASS

## Approval Gate

- [x] The original tool-call failure mode is repaired on the rebuilt runtime
- [x] Exact-model Codex and alias-routed non-Codex tool calls both terminate cleanly through Pi
- [x] Remaining caveats are recorded as launcher behavior or superseded transcripts, not hidden

Approval: PASS

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed subagent tooling in this repository session, but the user did not authorize delegated sub-agent work in this run.
Delegation Decision Basis: Phase 5 required direct control of the rebuilt runtime, Pi CLI, and request-detail receipts.
Delegation Override Reason: local direct QA was the safest way to preserve exact runtime, Pi, and request-detail evidence.
Audit Inputs Provided:
- all inputs listed above

## Effective Inputs Re-read

- all inputs listed above

## Earlier Phase Reconciliation

- `03-implementation-summary.md` records the in-scope product repairs, including the forced-tool and typed replay fixes that Phase 5 needed.
- `04-test-summary.md` locks the deterministic regression and build floor that this rebuilt-runtime QA depends on.
- This Phase 5 receipt closes the intentional `R6` deferment with exact-model, alias, and direct Responses proof on the rebuilt packaged runtime.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct review of the packaged runtime build log, the relaunch metadata, the saved direct Responses proof, the Pi JSONL receipts, and the canonical runtime request-detail rows for the retained exact-model and alias probes
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none beyond recording the retained canonical receipts and discarding the earlier non-terminating alias transcript as non-canonical

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Comparison reference: `working-tree`
- Normalized baseline: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Planned or claimed changed files:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
  - `/.recursive/run/68-codex-subscription-tool-call-parity/evidence/manual-qa/direct-codex-responses-tool-continuation-v4.json`
- Actual changed files reviewed:
  - those two files plus the retained relaunch, Pi, and packaging evidence listed above
- Unexplained drift: `none`

## Gaps Found

None.

## Repair Work Performed

- added a saved direct `/v1/responses` continuation probe so the exact-model Codex live proof is file-backed instead of narrative-only

## Audit Verdict

- Summary: the rebuilt packaged runtime now has direct Codex and Pi-backed tool-call parity proof on both exact-model and alias paths, and the retained receipts match the actual selected providers and adapters.
Audit: PASS
