# S83 CRITICAL confirmed: mutating role-model endpoints are cross-origin writable

I verified the second review's top finding by reading the code, and it holds:

| Fact | Evidence |
|---|---|
| `PUT /api/role-model/runtime/config` | `index.ts:18970` |
| `PATCH /api/role-model/controller` | `:19498` |
| `POST /api/role-model/endpoints` | `:19955` |
| Operator gate covers only `/api/role-model/operator/` | `:17530` |
| CORS is wide open | `:16780-16785`: `Access-Control-Allow-Origin: *`, `GET, POST, PUT, DELETE, OPTIONS` |

Consequence: **any page the operator visits can rewrite the runtime config or switch the controller** on a reachable runtime, with no credential. The vulnerability is pre-existing, but the config editor I ported this session turns it from latent into live - so it is now mine to fix.

Fix dispatched: same-origin enforcement on every mutating `/api/role-model/*` request (foreign `Origin` -> 403 with no state change), no `Access-Control-Allow-Origin: *` on mutating paths, and the operator credential required in addition when one is configured - with tests that must fail before the fix (a foreign-origin PATCH currently succeeds).

## Other accepted findings (queued, not claimed fixed)

- **Config diff can lie**: the editor falls back to `{}` before Load, so Review can say `added:` and Confirm can delete existing keys without showing removals; a server change between Review and Confirm leaves a stale diff. Must refuse Review before Load and recompute at Confirm.
- **Models join test is self-fulfilling**: an always-empty join still passes; needs exact endpoint/health/role values and an always-empty mutation.
- **Single-title test proves the shell title only**, never the route's own title text.
- **Filters**: only `statusFamilies=success` is covered mounted; switching breakdown endpoint->model keeps the stale value, and the model pool is built from candidates rather than the filtered body.
- **Learning** fabricates `Production activation: disabled` when the field is absent.
- **My own evidence gaps**: `s78` config E2E has no durable transcript (I ran it interactively), and `s79` overstated "filters closed". I will re-run the config E2E as a scripted, logged artifact rather than leaving a claim without a log.
