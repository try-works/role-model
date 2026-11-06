# S74 Controller editing verified end-to-end in the browser

First interactive write surface of the R16 capability port, exercised by the lead against a temp-state host (ephemeral port 5804, `E:` state root, never `:3456`).

## Contract

| Operation | Contract |
|---|---|
| Read | `GET /api/role-model/controller` |
| Write | `PATCH /api/role-model/controller` with exactly `{"endpointId": id}` |
| Success | re-reads GET; the displayed controller is the SERVER answer, plus a notice |
| Failure | keeps the last readback, renders the host error in `role=alert` |
| Concurrency | Save disabled while pending; a second click does not dispatch |

## What I did and saw

1. `/control/controller` rendered a select with the three configured endpoints, current value `openai.personal.primary.us-east-1.fast`, plus a **Save controller** action.
2. Selected `anthropic.team.shared.us-east-1.default`, clicked Save.
3. UI: `Server assigned anthropic.team.shared.us-east-1.default`, readback switched to `modelId claude-3.7-sonnet`, `updatedAtMs` present.
4. Host: `GET /api/role-model/controller` now returns `{"endpointId":"anthropic.team.shared.us-east-1.default","modelId":"claude-3.7-sonnet", ...}`.

So the write persisted through the real HTTP contract and the UI shows the server value rather than an optimistic one.

## Tests behind it

`test/s73a-controller.test.ts` 3/3: exact PATCH body; a server that returns a DIFFERENT endpoint than requested renders the server value plus a notice; a 4xx keeps the previous value with the host message; a slow PATCH plus double click dispatches exactly once.

REDs: `s73a-red-wrong-body.log` (body loses `endpointId`) and `s73a-red-optimistic.log` (no re-read).

## State of the capability port

| Surface | R | C |
|---|---|---|
| Controller endpoint editing | yes | **now yes, verified** |
| Configured models page | yes | **now yes, verified** |
| Router strategy editor | yes | no |
| Provider setup / connect actions | yes | no |
| Runtime-config editor | yes | no |
| Overview Breakdown/Source/Status/Difficulty filters | yes | no |
| Quality/cost/speed model pool | yes | no (host exposes no quality or speed field) |
