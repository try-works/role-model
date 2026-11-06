# S217 Clicking a control action crashed the shipped app - and the audit never clicked one

While chasing two `s26k-control` failures I had written off as pre-existing, the packaged UI did this:

    click "Reconnect provider" on /control/providers
    Application Crash: targetId is not defined

## Cause

`update.ts` read `targetId` while the handler still destructured `({ key })`:

    ControlActionRequested: ({ key }) => {
      ...
      commands: [dispatchControl({ endpointId: targetId, key, token })],

A one-line defect that **every rendered check passed over**, because the audit rendered 20 routes and
**never clicked a control action**. The Studio journey was the only click-driven check.

## Why the tests disagreed with each other

| State | `s26k-control` |
|---|---|
| HEAD | 2 failed |
| my working tree (with the `targetId` reference) | 2 failed, plus a crash in the real browser |
| after the fix | **289/289** |

So the failures at HEAD were real, my claim that they were "pre-existing and unrelated" was wrong in a
subtle way: they were pre-existing *as failures*, and the crash I introduced made the same two tests
fail for a different reason. **A shared symptom is not a shared cause.**

## The guard

`audit-rendered-ui.mjs --control-action` clicks the first control action and requires an outcome
message - a crash is a failure, and so is silence:

    PASS control action: message:Providers action failed: HTTP 400

That HTTP 400 is the honest fixture answer (no provider to reconnect). The check is about the UI
surviving the click and reporting it, not about the provider being real.

## Verified on the packaged client

    PASS expected model deepseek-official/deepseek-flash
    PASS control action: message:Providers action failed: HTTP 400
    PASS studio run: clicked -> raw:success
    {"routes":20,"failures":0,"focus":true}
    gate exit=0

## The pattern, one more time

Rendering is not behaviour. Two journeys are now click-driven (Studio run, control action); the rest of
the port's write surfaces still have no journey at all.