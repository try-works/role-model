# S208 The endpoints page sends a hardcoded sample body (a guaranteed 400)

Driving the next write journey through the UI, the second one fails:

    click "Activate endpoint" on /control/endpoints
    -> "Endpoints action failed: HTTP 400"

## Mechanism

control.ts hardcodes the request body:

    endpoints: { action: { body: { modelId: "moonshot/kimi-k2.5",
                                 providerAccountId: "moonshot.personal.primary",
                                 region: "global" }, ... } }

and the host requires those fields to create a NEW endpoint:

    admitRuntimeEndpoint: providerAccountId, modelId, region -> activateRuntimeEndpoint(...)

The moonshot account does not exist in this catalogue, so the admission cannot succeed. Same class as the Studio default model in S206: a fixture-era value shipped as a default.

## Why this is not a one-line fix

The body cannot be derived from a table row: activating an existing active slot throws

    "Endpoint effort slot <id> is already active."

so the control is not "activate this row" - it is "admit a new endpoint from a provider account, a
model and a region". That needs a small form; a button with a fixed payload can only ever be wrong.

## What I did not do

- I did not hardcode a different sample body: it would pass on one catalogue and fail on the next.
- I did not delete the control: the route should offer admission; it currently offers a lie.

## Recorded state

| Journey | Result |
|---|---|
| controller save | works (S190) |
| Studio run | works (S207) |
| endpoint activate | **HTTP 400, guaranteed** - needs a form |

Next: an admission form (providerAccountId, modelId, region) with defaults taken from the first
configured provider account, then a UI journey check that adds one endpoint and reads it back.