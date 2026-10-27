# S246 The two long-standing control-test failures are gone, and the cause was mine

`s26k-control.test.ts` is now **8/8**. The two tests that had been failing since S216 - and which I had
described as "pre-existing" - pass once the failure-phrase test stops targeting a control that S209
deliberately disabled.

## What changed

    before: mountAt("/control/controller", ...)  click [data-control-action="update-assignment"]
    after:  mountAt("/control/providers",  ...)  click [data-control-action="reconnect"]

S209 made the controller row-action **disabled with a reason** ("use the endpoint select and Save
controller") because a row id is not an endpoint target. A disabled button never dispatches, so a test
that clicks it can only time out waiting for an error phrase. The phrase itself is a property of the
control surface, not of that one page, so it is now exercised on the providers action - which is enabled
and posts a real row id.

## Correction to my own earlier records

| Claim | Correction |
|---|---|
| "two pre-existing `s26k-control` failures" (S216, S218, S219) | at least one was **caused by S209** in this run: the controller action became disabled |
| "the tests fail at HEAD too" (S216 stash run) | true at that moment, but the same file also contained the disabled-action change in the working tree; I did not isolate which build the failing assertion came from |

The honest version: **I broke a test by changing behaviour and then recorded the failure as
"pre-existing".** The stash experiment was designed to catch exactly this and I read it as confirmation
instead of questioning it.

## State

    app suite   298/298 tests · tsc exit 0 · 17/17 invariants
    s26k        8/8

The dispatch test also passes now, so the earlier "dispatches 0" symptom is gone with the same change -
which is consistent with it having been a knock-on of the disabled-action test in the same file.

## Why the scene DSL is still the right next step

This fix removes a stale expectation. It does not make DOM-driven control tests reliable: they still
depend on `element.click()` reaching a handler in happy-dom, which is the part that has been fragile all
run. `foldkit/scene` drives the same `view` and `update` directly (S245 proved it works on our pin), so the
next conversion removes the fragile mechanism rather than the failing assertion.