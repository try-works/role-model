# S34 visual re-verification after the parser fixes (real Chrome)

The S26o audit fixed four parsers that rejected the real packaged host shapes. This re-runs the browser pass with a bundle rebuilt AFTER those fixes (served through the packaged executable with `--static-root`, fresh temp state root, ephemeral port).

| Route | Before (packaged bundle) | After (rebuilt bundle) |
|---|---|---|
| `/runtime` | `error`: "Runtime read failed: invalid response" | **ok** - applied/path rows render |
| `/session-readiness` | loading/error risk | **ok** - overall, channel/scope and observedAt render from the live host |
| `/observe/activity` | error | **empty** (host answered with no items) |
| `/dashboard` | error (wrong shape) | **empty** (RuntimeTelemetrySummary parsed) |
| `/observe/observability-snapshot` | ok | **ok** |
| `/observe/queues` | ok | **ok** |
| `/router` | ok | **ok** |

No `role=alert` on any re-checked route. `/session-readiness` showed `loading` at the instant of capture and settled to `ok` with real values after the read resolved - recorded because a loading state that never settles would be a defect.

## Still unproven

- Detail routes (`/requests/:id`, `/router/decisions/:id`): this packaged state has no request or decision ids, so the detail bodies were never exercised against the host.
- Control actions: asserted at the client boundary (method/path/body), never dispatched against a real host.
- The packaged SEA with this rebuilt bundle has not been repackaged; this pass serves the fresh bundle through the packaged backend.
