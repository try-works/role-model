# S190 The controller round-trip works through the shipped UI

The objective names a GPT controller and explicit workers. Until now the controller had been verified by API (`s74-controller-verified.md`) and via scripted E2E; this round I drove it **through the rendered page of the packaged candidate**.

Target: `role-model-dev.exe` `0.0.20-188`, own state root, port 6202.

## Affordances present

```
select[aria-label="Controller endpoint"]  options: openai.personal.primary.us-east-1.fast
                                                   anthropic.team.shared.us-east-1.default
                                                   cli.local.coder
button[data-controller-save]              "Save controller"
button[data-control-action]               "Update controller"
6 config rows: scope, controller.endpointId, controller.modelId, displayName, upstreamModelId, sourceType
```

## Round trip

| Step | Result |
|---|---|
| initial `/api/role-model/controller` | endpoint `openai.personal.primary.us-east-1.fast`, model `openai/gpt-4.1-mini-fast` |
| select `anthropic.team.shared.us-east-1.default`, click **Save controller** | API now reports `endpointId: anthropic.team.shared.us-east-1.default`, `modelId: claude-3.7-sonnet`, `scope: global` |
| select `openai.personal.primary.us-east-1.fast`, click **Save controller** | API back to the original endpoint and model |

Both directions persist through the UI, and the model follows the endpoint - so the controller is a real control, not a display.

## What is NOT established here

The **explicit `deepseek-official/deepseek-flash` workers** are not visible in this fixture catalogue:

```
grep deepseek testdata/router-runtime/fixtures/*.json  ->  no matches
```

So the packaged candidate under fixtures cannot demonstrate those workers. The operator runtime (`:3456`) shows them, but its state is production and I will not point a candidate at it or copy its credentials. The worker requirement therefore remains **blocked on a fixture/config that names them**, which is the R16 config-seeding decision I have recorded twice and not taken unilaterally.

## Scope of the claim

Verified today: controller selection works end to end in the shipped UI on a packaged candidate, with the model following the endpoint. Not verified: the named workers, because the fixture catalogue does not contain them.