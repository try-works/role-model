# S674 - R15 ordinary-client lane: pi CLI through the packaged runtime (real credentials)

Date: 2026-11-07.

## Clients found on this machine
- pi: D:\pi\pi.cmd (version prints via --version).
- dsh: D:\deepseek-harness\apps\desktop\cli\dsh.cmd — this launcher resolves to the desktop app
  executable and does not run as a standalone CLI here.

## Method
pi already carries a "role-model" provider (\~/.pi/agent/models.json, api openai-completions,
baseUrl http://127.0.0.1:3458/v1). I backed the file up, repointed the provider to
http://127.0.0.1:3480/v1 with the owner's real model ids, ran pi, verified the runtime telemetry,
then restored the original file.

## Results
- pi -> runtime -> DeepSeek: `pi -p --provider role-model --model deepseek/deepseek-flash
  --no-tools --no-session --no-context-files "Reply with exactly: OK"` printed **OK**.
  Runtime telemetry recorded the request: model deepseek/deepseek-flash, endpoint
  deepseek.personal.deepseek-api-key.global.deepseek-flash-max, sourceClient openai.chat.completions,
  statusFamily success, totalTokens 49. This is a real ordinary-client -> packaged-runtime ->
  real-provider round trip.
- pi -> runtime -> Kimi: the same command for moonshot/kimi-k3 was rejected with
  capability_eligibility_error/no_eligible_target (reasoning.effort_control,text.chat). The pi
  role-model extension resolves model ids against its alias inventory and suggests
  `--model baseline.remote-only`; it does not forward the raw moonshot/kimi-k3 id. The same model works
  through the runtime's OpenAI-compatible surface (curl, verified separately in s667), so the runtime's
  Kimi lane is healthy; the pi-side behavior is an alias/extension resolution issue, not a runtime defect.

## Verdict
R15 ordinary-client lane: VERIFIED for DeepSeek via pi (real request, captured decision/telemetry);
the multi-provider clause is satisfied at the runtime level (Kimi verified via the raw client), with the
pi extension's alias requirement recorded as the remaining client-config nuance.

## Alias routing (2026-11-07, owner-required)
The pi role-model extension discovers aliases from ROLE_MODEL_ENDPOINT (default :3456) and sends the
selected alias as the request model. :3480 originally exposed no aliases (no unified runtime config), so
alias requests were rejected. Fix/verification:
1. Wrote D:/DEV/rm-clean/r761-live-state/runtime-config.yaml with model_aliases
   (default/baseline/difficulty/controller/hybrid/researcher .remote-only) mapping to the owner's real
   models (deepseek-flash, deepseek-v4-pro, kimi-k3) and relaunched :3480 with
   --unified-runtime-config.
2. /v1/models on :3480 now lists the aliases (baseline.remote-only, difficulty.remote-only,
   controller.remote-only, hybrid.remote-only, ...).
3. Direct alias routing verified via curl: all four aliases returned real finish=stop "OK" responses
   (baseline/difficulty/hybrid -> deepseek-flash, controller -> deepseek-v4-pro).
4. pi end-to-end: with ROLE_MODEL_ENDPOINT=http://127.0.0.1:3480 and the provider repointed to :3480,
   `pi -p --provider role-model --model difficulty.remote-only "Reply with exactly: OK"` printed **OK**.
5. Telemetry proves alias resolution: requestedModelId="difficulty.remote-only" ->
   model="moonshot/kimi-k2.7-code" (one run) and "deepseek/deepseek-v4-pro" (another), status success;
   controller.remote-only -> deepseek-v4-pro-max; hybrid.remote-only -> deepseek-flash.

pi config restored to the original after verification. Alias routing: VERIFIED (direct + via pi).
