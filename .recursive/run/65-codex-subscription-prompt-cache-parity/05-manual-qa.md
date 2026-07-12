Run: `/.recursive/run/65-codex-subscription-prompt-cache-parity/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-12T02:58:54Z`
LockHash: `8b7875e056666ae81b952128fb1402a129ec7b8e97eba9ac9ac9f9358a5cc065`
Inputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/02-to-be-plan.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/addenda/03-implementation-summary.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/runtime-process.v2.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/pi-live-cache-verification.v2.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/telemetry-cache-proof.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/provider-doc-crosswalk.md`
Outputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
Scope note: This artifact records the rebuilt-runtime verification for the downstream-visible Pi symptom, alias-backed continuity, Observe/telemetry parity, official-provider crosswalk, and the exact Kimi live-routing blocker.

## TODO

- [x] Declare the QA execution mode and supporting evidence
- [x] Record the manual QA scenarios and observed results
- [x] Record the official-provider crosswalk and Kimi blocker outcomes
- [x] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `Codex main agent in D:\DEV\role-model\.worktrees\65-codex-subscription-prompt-cache-parity`
- Tools Used: live Pi runtime CLI evidence bundle under the run-65 rebuilt-runtime requests tree; `powershell` with `Invoke-RestMethod` for canonical request-detail and telemetry cross-checks; Playwright screenshot command for Observe requests visual proof
- Rebuilt Runtime Base URL: `http://127.0.0.1:50692`
- Exact Rebuilt Runtime Process Command:
  - `"C:\Program Files\nodejs\node.exe" --import tsx D:\DEV\role-model\.worktrees\65-codex-subscription-prompt-cache-parity\role-model-router\apps\runtime-host-bridge\src\cli-entry.ts --host 127.0.0.1 --port 0 --repo-root D:\DEV\role-model\.worktrees\65-codex-subscription-prompt-cache-parity --runtime-state-root C:\Users\erikb\AppData\Local\Temp\run65-phase5-rebuilt-32b033cb1a6b4e7baddd46eac6126399\state --scope-id runtime --unified-runtime-config C:\Users\erikb\AppData\Local\Temp\run65-phase5-rebuilt-32b033cb1a6b4e7baddd46eac6126399\state\runtime-config.yaml --static-root D:\DEV\role-model\.worktrees\65-codex-subscription-prompt-cache-parity\role-model-router\apps\runtime-ui\build\client`
- Runtime Build Evidence:
  - `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/rebuild-host-bridge.log`
  - `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`
- Evidence Path:
  - `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/`

## QA Scenarios and Results

### 1. `V1` through `V8` and `V10`: live Pi Codex Subscription cache proof

- Path verified: rebuilt runtime -> Pi role-model provider -> `chatgpt/gpt-5.4` Codex Subscription execution
- Supported-zero control:
  - request id: `req-c8af339d-d1d7-477f-9c88-ded62f4ca77e`
  - evidence: `requests/pi-codex-cache-zero-control-009/request-detail.json`
  - result: `cacheRead = 0`, Pi footer `0.0%`, canonical cache support remained present rather than unsupported
- Repeated Codex cache pair:
  - prompt input path: `requests/pi-codex-cache-sameprompt-cold-007/prompt.txt`
  - logical Pi session id: `run65-codex-cache-v4-sameprompt`
  - first recorded request id: `req-659b5575-d85c-4de3-9691-fb617b5575f4`
  - second recorded request id: `req-450eaa65-3b8d-42a9-b1e0-895176426f39`
  - first recorded result: `cacheRead = 4096`, Pi footer `61.483%`
  - second recorded result: `cacheRead = 6144`, Pi footer `70.6126%`
- Canonical warm-request cross-check (`req-450eaa65-3b8d-42a9-b1e0-895176426f39`):
  - selected endpoint: `openai.personal.openai-codex-subscription.global.gpt-5.4`
  - `routingDiagnostics.cacheContinuity.scopeSource = prompt_cache_key`
  - `selectedDomainState = restored`
  - `selection_reasons` include `CONTINUITY_AFFINITY_APPLIED` and `CACHE_AFFINITY_APPLIED`
  - downstream usage detail preserved `prompt_tokens_details.cached_tokens = 6144`
  - `cacheCostSavingsUsd = 0.01536`
- Outcome:
  - Pi is no longer permanently stuck at `0%` on the repaired Codex Subscription path
  - supported-zero remains truthful for a zero-hit control instead of collapsing into unsupported semantics

### 2. `V11`, `V12`, `V17`, `V20`: live alias-backed `A -> B -> A` continuity proof

- Alias verified: `difficulty.remote-only`
- Logical Pi session id: `run65-alias-cache-v1`
- Prompt input path for return leg: `requests/pi-alias-deepseek-restored-016/prompt.txt`
- Sequence:
  - first leg: DeepSeek text request -> endpoint `deepseek.personal.deepseek-api-key.global.deepseek-v4-flash` -> `selectedDomainState = created`
  - second leg: Codex image pivot -> endpoint `openai.personal.openai-codex-subscription.global.gpt-5.4` -> `selectedDomainState = created`
  - third leg: return to DeepSeek text -> endpoint `deepseek.personal.deepseek-api-key.global.deepseek-v4-flash` -> `selectedDomainState = restored`
- Restored-leg result:
  - request id: `req-7e2e0baf-246b-4ec4-ac56-dd84cfef1e40`
  - `cacheRead = 7808`
  - Pi footer `99.1114%`
  - `thirdAdvisoryWarmedEndpointIds` contained both warmed domains:
    - `deepseek.personal.deepseek-api-key.global.deepseek-v4-flash`
    - `openai.personal.openai-codex-subscription.global.gpt-5.4`
- Pi session-history caveat:
  - reusing the same local Pi session file after an image-bearing alias turn carried image modality into the next request and kept the alias on Codex
  - the canonical proof therefore reused the same logical Pi `session-id` but refreshed local Pi session storage on the return leg

### 3. `V9`: Observe and telemetry parity proof

- Canonical telemetry summary (`telemetry-cache-proof.json`):
  - `requestCount = 15`
  - `successCount = 14`
  - `failureCount = 1`
  - `cachedRequestCount = 6`
  - `averageLatencyMs = 2365`
  - `p95LatencyMs = 10770`
- Observe requests / ledger proof:
  - request rows include the supported-zero Codex row with `promptCacheSupported = true`, `cacheReadTokens = 0`, `cacheReadTokensSupported = true`
  - request rows also include warmed Codex hit rows with non-zero `cacheReadTokens`
- Analytics query proof:
  - `totals.cacheHitTokens = 21248`
  - `totals.cacheHitTokenRate = 0.293193`
  - `totals.cacheBackedRequestRate = 0.5`
  - `totals.cacheCostSavingsUsd = 0.05312`
  - all queried metrics returned `supported`
- Visual proof:
  - screenshot: `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/observe-requests-cache-proof.png`

### 4. `V13`: live DeepSeek parity control

- Exact-model DeepSeek pair:
  - warm request id: `req-0048b8e0-75b8-41b4-b484-d5c0317b2bf8`
  - `cacheRead = 7296`
  - Pi footer `76.9458%`
- Outcome:
  - existing non-Codex cache reporting remained truthful after the Codex parity repair

### 5. `V14` and `V19`: Kimi blocker recorded exactly

- Requested model: `moonshot/kimi-k2.7-code`
- Request id: `req-15553569-c713-4849-8cea-26f94521d7ec`
- Canonical blocker:
  - `errorClass = no_eligible_target`
  - `benchmarkSamples = 0`
  - `eligibleEndpointIds = []`
  - `eligibleModelIds = []`
- Outcome:
  - run 65 verified Kimi request-shape normalization and prompt-cache forwarding deterministically in tests
  - live rebuilt-runtime routing proof for Kimi remained blocked because the runtime had no eligible Kimi target at closeout time

### 6. `V15`: direct non-Codex OpenAI-compatible control

- Exact live control status: blocked in the rebuilt runtime because no direct OpenAI API-key endpoint separate from Codex Subscription was configured and active during Phase 5
- Deterministic substitute used:
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `"builds an OpenAI responses request and normalizes text, usage, and tool calls"`
  - `"normalizes OpenAI Responses cached-token detail fields without rewriting totals"`
- Outcome:
  - generic OpenAI-family total-plus-cache-detail serialization remained covered even though the rebuilt runtime did not expose a second live OpenAI account path

### 7. `V16` and `V18`: reproducibility and official-doc proof

- Runtime process command line is captured exactly in `runtime-process.v2.json` and above in this receipt.
- Provider-doc crosswalk is captured at:
  - `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/provider-doc-crosswalk.md`
- Rebuilt runtime was verified on branch `recursive/65-codex-subscription-prompt-cache-parity` anchored at commit `6b3850470de5c37a7d005838aa2fb91afadd214e`, with the live runtime built from the current working tree.
- Pi request reproducibility boundary captured by the evidence bundle:
  - exact `model`
  - exact logical `sessionId`
  - exact `prompt.txt` input path
  - exact canonical request id and request-detail receipt
  - the evidence bundle does not retain a verbatim one-line Pi CLI transcript beyond that preserved tuple

## Evidence and Artifacts

- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/runtime-process.v2.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/pi-live-cache-verification.v2.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/telemetry-cache-proof.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/provider-doc-crosswalk.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/observe-requests-cache-proof.png`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/requests/pi-codex-cache-zero-control-009/request-detail.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/requests/pi-codex-cache-sameprompt-warm-008/request-detail.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/requests/pi-deepseek-cache-warm-011/request-detail.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/requests/pi-alias-deepseek-restored-016/request-detail.json`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/requests/pi-kimi-cache-cold-012/request-detail.json`

## User Sign-Off

- Approved by: `agent-operated closeout per locked QA mode`
- Date: `2026-07-12`

## Traceability

- `R1` -> live Codex and DeepSeek request receipts show cache facts survive normalized execution and downstream response shaping
- `R2` -> canonical request-detail and Pi footer cross-check prove downstream OpenAI-compatible total-plus-cache-detail semantics remain intact
- `R3` -> official provider-doc crosswalk plus live Codex/Kimi/DeepSeek receipt comparison prove the OpenAI-family cache contract is now truthful
- `R4` -> live continuity restore and warmed-domain advisory proof
- `R5` -> request-detail, telemetry query, and Observe requests parity proof
- `R6` -> DeepSeek parity control and deterministic generic OpenAI-family substitute
- `R7` -> Phase 5 evidence explicitly consumes the strict RED/GREEN automation floor from Phase 4 rather than replacing it with manual-only claims
- `R8` -> `V1` through `V20` as recorded above

## Coverage Gate

- [x] Live Pi CLI proof covers the repaired Codex Subscription path
- [x] Supported-zero semantics were verified separately from warmed-hit proof
- [x] Alias-backed `A -> B -> A` continuity proof is explicit
- [x] Observe/telemetry parity proof is explicit
- [x] Official provider-doc crosswalk is explicit
- [x] Kimi blocker and Pi session-history caveat are explicit

Coverage: PASS

## Approval Gate

- [x] The original downstream-visible symptom is repaired
- [x] Canonical request-detail and telemetry proof agree with the Pi footer percentages
- [x] Remaining live limitation is recorded as a provider-eligibility blocker, not hidden

Approval: PASS
