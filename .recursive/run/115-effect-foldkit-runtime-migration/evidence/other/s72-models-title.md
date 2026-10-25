# S72 single-title invariant and /models verified in the browser

## Single title, enforced route-wide

A route-wide invariant test mounts **35 routes from the router table** and asserts `h1` count === 1. Its RED listed **9 routes** with two `h1`s (diagnostics, observability, providers, endpoints, controller, local choose, studio, models, NotFound) - `9 failed | 26 passed` - and the fix moved every content `h1` to `h2`, keeping the top-bar `h1`. Green **35/35**.

Independently sampled in the browser on the rebuilt package:

| Route | `h1` count | Title |
|---|---|---|
| `/` | 1 | Runtime overview |
| `/models` | 1 | Models |
| `/studio` | 1 | Studio |
| `/local/choose` | 1 | Local choose |
| `/control/providers` | 1 | Providers |
| `/control/endpoints` | 1 | Endpoints |
| `/learning` | 1 | Learning |
| `/nonexistent-xyz` | 1 | Not found: /nonexistent-xyz |

This is the difference between patching a symptom and removing the class: the previous fix covered `/learning` only, and the invariant test now fails for any route that regresses.

## `/models` restored (R had `/app/models`)

- State `success`, one row per configured model joined from `/api/role-model/models` + `/api/role-model/endpoints`.
- Columns: id/displayName, provider, endpoint, health/routing status, effort capability (or "unavailable"), role bindings - **no invented effort** when no target advertises it.
- Own **Models** nav group; fixtures `models-real.json` / `model-endpoints-real.json` captured from the packaged host.

## Still open (R16 capability port)

Router strategy editing, provider setup, connect/account actions, runtime-config editor, and the Overview Breakdown/Source/Status/Difficulty filters plus the quality-cost-speed model pool (which needs a host field for quality/speed that does not exist today).
