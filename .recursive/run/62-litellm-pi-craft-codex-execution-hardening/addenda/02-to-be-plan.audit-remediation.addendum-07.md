Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `07`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-06.md` (DRAFT)
- live rebuilt-runtime investigation on `2026-07-08` against `http://127.0.0.1:3456`
- real `pi` client runs using the run-62 `pi-role-model` extension
- user report on `2026-07-08`: Pi requests using exact model ids work, but Pi requests using router aliases do not
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-07.md`
Scope note: This addendum records the actual live Pi alias-path root cause. The prior addendum-06 `/v1/responses` normalization work was valid but did not address the user-facing symptom because the Pi package currently uses the chat-completions transport, not the Responses transport.

## TODO

- [x] Re-read the locked requirements and root-cause artifact
- [x] Reconcile the real Pi provider path against the previous addendum-06 scope
- [x] Reproduce the alias-only behavior with the actual `pi` client
- [x] Compare Pi alias routing receipts against Craft alias routing receipts
- [x] Compare Pi alias behavior against Pi exact-model behavior
- [x] Reduce the evidence to a runtime-owned alias-routing root cause
- [x] Record the corrective direction for the next remediation slice

## Effective Inputs Re-read

- `00-requirements.md`
  - `R0`, `R2`, `R3`, and `R4` require execution-family and alias routing behavior to be correct for downstream clients without patching Pi.
  - `R9` and `R10` require live alias-routed Pi verification, not only exact-model proof.
- `01.5-root-cause.md`
  - `RC1`, `RC2`, `RC3`, and `RC6` remain relevant because this is a shared routing-contract problem rather than a provider outage.
- `02-to-be-plan.audit-remediation.addendum-06.md`
  - remains valid for `/v1/responses` normalization.
  - is now proven insufficient for the live Pi symptom because Pi is using `openai.chat.completions`, not `/v1/responses`.

## Problem Statement

New live evidence narrows the current user-facing Pi issue further:

1. Pi requests to exact `chatgpt/gpt-5.4` work.
2. Pi requests to exact `deepseek/deepseek-v4-pro` work.
3. Craft requests to alias `difficulty.remote-only` work and can route to both available models.
4. Pi requests to alias `difficulty.remote-only` are the problematic path.

That means the active defect is:

- not generic Pi transport failure
- not generic GPT/Codex execution failure
- not generic DeepSeek execution failure
- not generic runtime availability
- the alias-routing path as exercised by Pi's default request shape

## Error Analysis

Concrete evidence from the live rebuilt runtime:

- real Pi provider registration in `packages/pi-role-model/src/downstream-openai.ts` maps the runtime to `api: "openai-completions"`, so live Pi traffic uses chat-completions rather than Responses
- a real Pi alias request produced telemetry with:
  - `sourceClient: "openai.chat.completions"`
  - `requestedModelId: "difficulty.remote-only"`
  - `difficultyBucket: "hard"`
  - `taxonomyRoleId: "coder"`
  - `taxonomyTaskType: "coder.edit"`
  - `taxonomyToolClassIds: ["filesystem.read","filesystem.write","shell.execute"]`
  - `requestPayloadBytes: 6363`
  - `ingressPayloadBytes: 7647`
  - `inputTokens: 11749`
  - selected endpoint `openai.personal.openai-codex-subscription.global.gpt-5.4`
- a matching Craft alias request produced telemetry with:
  - `sourceClient: "openai.chat.completions"`
  - `requestedModelId: "difficulty.remote-only"`
  - `difficultyBucket: "easy"`
  - no taxonomy role/task/tool-class classification
  - `requestPayloadBytes: 193`
  - `inputTokens: 23`
  - selected endpoint `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`

## Reproduction Verification

Reproduced with the actual `pi` client and the run-62 extension:

1. `pi --provider role-model --model difficulty.remote-only -p 'Reply with exactly DEFAULT_OK.'`
2. inspect runtime receipts on `:3456`
3. compare against:
   - `pi --provider role-model --model difficulty.remote-only --no-tools -p 'Reply with exactly NOTOOLS_OK.'`
   - Craft alias request to `/v1/chat/completions`
   - exact-model Pi requests to GPT and DeepSeek

Result:

- Pi alias with default tools routes to the GPT/Codex endpoint and carries a much larger payload.
- Pi alias with `--no-tools` routes to DeepSeek and returns quickly.
- exact-model Pi requests work.
- Craft alias requests work and route to DeepSeek in the simple-text case.

**Reproducible:** Yes
**Frequency:** Consistent in the live rebuilt runtime
**Deterministic:** Yes

## Multi-Layer Evidence

**Layer 1: Pi package transport choice**
- Input: downstream discovery from Role-Model
- Output: provider config uses `api: "openai-completions"`
- Status: WORKING

**Layer 2: Pi alias request shape**
- Input: simple prompt with default Pi tools enabled
- Output: request is tool-bearing and classification-bearing even for trivial prompts
- Status: WORKING but materially different from Craft

**Layer 3: Alias difficulty/controller routing**
- Input: Pi alias request
- Output: runtime classifies the turn as hard/coder-oriented and narrows to the GPT/Codex endpoint
- Status: BROKEN for the intended alias behavior

**Layer 4: Exact-model execution**
- Input: exact GPT or exact DeepSeek request from Pi
- Output: both execute successfully
- Status: WORKING
LockedAt: `2026-07-10T04:26:46Z`
LockHash: `7e1312f955d0d9deb9eb462a6761e1b1016556438f4ed2e88c6ffb8a6e3c6664`

**Failure Boundary:** Pi alias request shape -> runtime alias-routing policy and initial Codex pinning

## Data Flow Trace

1. `packages/pi-role-model/src/downstream-openai.ts` maps Role-Model discovery to Pi provider config with `api: "openai-completions"`.
2. Pi sends a chat-completions request through the alias `difficulty.remote-only`.
3. The runtime sees `toolCount > 0` and code-oriented signals from the Pi request context.
4. `shouldPreferOpenAICodexSubscriptionForTurn()` in `role-model-router/apps/runtime-host-bridge/src/index.ts` returns true for tool-bearing/code-burden turns.
5. `resolveOpenAICodexSubscriptionRoutingModel()` produces a preferred Codex endpoint set.
6. the routing request ends up with GPT/Codex-only `allow_endpoints` for the Pi alias turn, while Craft's simple alias turn keeps both endpoints in play.

## Pattern Analysis

**Working comparison:** exact-model Pi requests and simple-text Craft alias requests

- exact-model Pi requests bypass alias arbitration and execute correctly
- Craft alias requests without tools remain `easy` and let cost-based DeepSeek selection win

**Broken comparison:** Pi alias requests with default tools enabled

- even trivial prompts inherit Pi's default tool-bearing coding posture
- the runtime interprets that posture as code/schema burden and prefers the Codex subscription path
- payload size and token count are much larger than Craft's simple alias request

## Hypothesis Testing

### Hypothesis 1
**Statement:** The prior `/v1/responses` fix should have resolved the live Pi symptom.
**Result:** Rejected.
**Evidence:** real Pi telemetry shows `sourceClient: "openai.chat.completions"`, not `openai.responses`.

### Hypothesis 2
**Statement:** The alias failure is actually a generic provider or transport outage.
**Result:** Rejected.
**Evidence:** exact-model Pi requests to both GPT and DeepSeek work.

### Hypothesis 3
**Statement:** The alias-specific slowdown is caused by the runtime interpreting Pi's default tool-bearing request shape as a hard coder turn and pinning it toward Codex.
**Result:** Confirmed.
**Evidence:**
- Pi alias telemetry shows `difficultyBucket: "hard"`, `taxonomyRoleId: "coder"`, `taxonomyTaskType: "coder.edit"`, `toolClassIds` populated, and GPT/Codex selection
- Craft alias telemetry shows `difficultyBucket: "easy"`, no tool classes, and DeepSeek selection
- Pi alias request with `--no-tools` routes to DeepSeek
- `shouldPreferOpenAICodexSubscriptionForTurn()` and `resolveOpenAICodexSubscriptionRoutingModel()` directly encode this initial pin behavior

## Root Cause Summary

**Root Cause:** Pi alias requests are being over-interpreted by the runtime's alias-routing heuristics because Pi's default chat-completions request shape advertises tool capability and coding-oriented context even for trivial prompts, which triggers Codex-subscription initial pinning and removes DeepSeek from the eligible alias pool.

**Location:**
- `packages/pi-role-model/src/downstream-openai.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `shouldPreferOpenAICodexSubscriptionForTurn()`
  - `resolveOpenAICodexSubscriptionRoutingModel()`
  - difficulty-routing / heuristic controller guidance paths using `toolCount`

**Detailed Explanation:** The live user-facing symptom is not a broken alias resolver and not a broken provider. The alias path is functioning, but Pi's default request looks like a tool-bearing coding turn to the runtime. That classification drives `requiredCapabilities` toward `tools.function_calling` and `reasoning.effort_control`, raises the request to `hard`, and triggers the Codex initial pin, which collapses the alias endpoint pool to GPT/Codex. Exact-model requests work because they bypass alias arbitration. Craft works because its simple alias request does not carry the same tool-bearing/coder burden.

**Corrective Direction:** The next remediation slice should target alias-routing policy, not provider execution:

1. stop treating Pi's mere tool availability as proof that the turn requires tool-capable/Codex-preferred routing
2. distinguish "tools available" from "tool-bearing turn that actually needs tool-capable routing"
3. narrow Codex initial pinning so trivial Pi alias prompts can still compete across DeepSeek and GPT
4. add explicit real-Pi regression cases for:
   - alias + default tools + trivial prompt
   - alias + no tools + trivial prompt
   - alias + actual tool-bearing coding prompt
   - exact-model GPT and exact-model DeepSeek controls

## Requirement Completion Status

- `R0` | Status: reopened | Rationale: execution-family ownership is correct, but the alias policy layer is collapsing Pi alias turns into Codex-only routing too early. | Addendum: `02-to-be-plan.audit-remediation.addendum-07.md`
- `R2` | Status: reopened | Rationale: Pi alias request semantics are preserved, but they are being over-weighted by routing heuristics in a way that breaks the intended alias behavior. | Addendum: `02-to-be-plan.audit-remediation.addendum-07.md`
- `R3` | Status: reopened | Rationale: DeepSeek remains healthy, but Pi alias routing frequently removes it from the pool before normal scoring. | Addendum: `02-to-be-plan.audit-remediation.addendum-07.md`
- `R4` | Status: reopened | Rationale: Codex path is healthy, but the runtime is preferring it too aggressively for Pi alias traffic. | Addendum: `02-to-be-plan.audit-remediation.addendum-07.md`
- `R9` | Status: reopened | Rationale: the prior proof did not include the exact Pi alias-vs-exact-model differential that exposed this issue. | Addendum: `02-to-be-plan.audit-remediation.addendum-07.md`
- `R10` | Status: reopened | Rationale: rebuilt-runtime proof must now include exact-model controls and real Pi alias-vs-exact-model contrast. | Addendum: `02-to-be-plan.audit-remediation.addendum-07.md`

## Coverage Gate

- [x] The addendum reconciles the real Pi transport path against the prior `/v1/responses` scope
- [x] The addendum reproduces the live alias-only behavior with the actual `pi` client
- [x] The addendum compares Pi alias, Pi no-tools alias, Craft alias, and Pi exact-model behavior
- [x] The addendum identifies the owning alias-routing code path
- [x] The addendum records a concrete corrective direction

Coverage: PASS

## Approval Gate

- [x] The root cause is specific enough to plan the next fix slice
- [x] The next remediation target is runtime alias-routing policy, not generic provider execution
- [x] No further implementation should happen until the next TDD-backed remediation plan uses this root cause

Approval: PASS
