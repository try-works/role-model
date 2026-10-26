# S209 Control actions now target a real row, or say why they cannot

S208 found the endpoints "Activate endpoint" button posting a hardcoded moonshot body: a guaranteed
400. Sweeping the client for operator-catalogue literals found **three** such actions, not one:

    control.ts:184  providers reconnect      body { providerAccountId: "moonshot.personal.primary" }
    control.ts:200  endpoints activate       body { modelId: moonshot..., providerAccountId: moonshot..., region: global }
    control.ts:218  controller update         body { endpointId: "moonshot.personal.primary.global.kimi-k2.5" }

## What changed

| Spec | Before | After |
|---|---|---|
| providers reconnect | hardcoded moonshot account | targets the acting row's `providerAccountId` |
| controller update | hardcoded moonshot endpoint | **disabled** with the reason: use the endpoint select and Save controller |
| endpoints activate | hardcoded moonshot triple | **disabled** with the reason: admission needs account + model + region (form not ported) |

A `ControlActionSpec` now carries `targetField` (which body field receives the acting row id) and
`disabledReason`. A control that cannot succeed is rendered disabled **with the reason in its title**
rather than offered as if it worked.

## Verified

    controllers page : action disabled, title "Use the controller endpoint select and Save controller..."
                       save button enabled; select+save still works (endpoint moves to anthropic)
    endpoints page   : action disabled, title "Admission needs a provider account, a model and a region..."
    rendered audit   : 20 routes, focus, studio run -> raw:success, 0 failures
    invariants       : 17/17

## My error in this round

I first used `Option.fromUndefined` in the view; Effect v4 has no such function and the app crashed
with `Option_exports.fromUndefined is not a function` - caught by loading the page, not by the build.
Replaced with a plain optional string in the message schema, which is simpler and has no runtime
dependency.

## What is still true

- endpoint **admission** is not ported: the control is honest about it but the feature is missing;
- `providers reconnect` now targets a real account, but I have not exercised it against a provider
  that can reconnect (fixtures are adapter-backed).