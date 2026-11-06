# S207 Studio works now - and the mechanism was route-scoped readbacks

S206 recorded that Studio fails its first request on hosts without the hardcoded model, and that my first fix silently did nothing. This round found why and fixed it.

## Why the first fix did nothing

A diagnostic attribute on the Studio route settled it:

    S206: data-studio-catalogue -> "idle:0"     (catalogue never requested)
    S207: data-studio-catalogue -> "ok:3"       (after requesting it on route entry)

configuredModels is a **route-scoped readback**: init.ts requests it only in the Models branch. The sidebar count comes from a different readback (models), so the shell could show "MODELS 3" while Studio saw an empty catalogue. The substitution I wrote in S206 had nothing to substitute, which is why it appeared to do nothing.

## The fix

1. init.ts: a Studio branch that dispatches readReadback({ key: "configuredModels" }) and starts the readback in loading.
2. view.ts: every Studio model field shows configuredModels.includes(state.model) ? state.model : configuredModels[0].
3. update.ts: StudioRunRequested sends a served model when the typed one is not in the catalogue, and writes it into state so the field and the request agree.

## Verified through the UI, not the API

    field before run : "claude-3.7-sonnet"        (was "moonshot/kimi-k2.5")
    click Run        : raw:success
    response         : {"object":"chat.completion","model":"claude-3.7-sonnet", ...}

Before: HTTP 400 no_eligible_target. After: a completed chat completion, rendered.

## Now a standing check

audit-rendered-ui.mjs --studio-run drives one real request and requires data-studio-raw="success":

    PASS studio run: clicked -> raw:success

It is wired into verify-packaged-candidate.mjs --rendered and into the CI advisory step, so the port cannot regress to "renders but cannot complete a request" without a failure. The full gate: {"routes":20,"failures":0,"focus":true} plus PASS studio run, exit 0.

## Invariants

test/s207-studio-model-catalogue.test.mjs (3/3): the Studio route requests the catalogue, the form prefers a catalogue model, and a run sends a served model.

## What this changes about "the port renders"

Every previous statement I made about the port was about **rendering**. This is the first end-to-end user action verified through the UI: click, request, response, rendered. It found a defect that 20 rendered routes and 14 invariants did not.