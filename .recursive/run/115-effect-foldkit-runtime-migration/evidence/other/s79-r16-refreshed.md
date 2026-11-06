# S79 R16 refreshed comparison after the capability port

The earlier verdict ("read-mostly subset, 5 regressions") is stale: the candidate gained Models, Overview filters, controller editing, the runtime-config editor and Learning, and my page-by-page probing showed R itself is largely read-only.

## Candidate sections and controls (measured on the packaged build, port 5806)

| Route | `h1` | Controls |
|---|---|---|
| `/` | Runtime overview | 4 filter selects + Day/Week/Month/90 days |
| `/models` | Models | none (readback) |
| `/router` | Router | none |
| `/observe/queues` | Queues | none |
| `/local/choose` | Local choose | none |
| `/control/controller` | Controller | **select + Save controller** |
| `/control/providers` | Providers | **Reconnect provider** |
| `/learning` | Learning | none (three honest sections) |
| `/runtime` | Runtime | **textarea + Load runtime config + Review changes** |
| `/studio` | Studio | **2 inputs + tab buttons** |

## R sections (measured on `:3456/app`)

| R section | Interactive? | Notes |
|---|---|---|
| Overview | filters + model pool | pool needs quality/speed fields |
| Studio | textarea + Run | matches our Studio intent |
| Local | read-only | no form |
| Remote / Connect | read-only tabs | no provider form anywhere (Registry, Upstream both 0 inputs) |
| Models | readback | we now match |
| Router | read-only | we now match |
| System (Config tab) | **textarea editor** | we now match |
| Observe / Learning | readback | we now match (Learning is richer) |

## Updated verdict

| Item | Status |
|---|---|
| Models page | **closed** |
| Overview filters | **closed** |
| Runtime-config editor | **closed and E2E-proven** |
| Controller endpoint editing | **closed; C does more than R here** |
| Provider setup / connect actions | **closed - not a regression** (R has no form; both tabs measured at 0 inputs) |
| Router strategy editor / Local form | **closed - not regressions** (R read-only) |
| Learning surfaces | **closed, richer than R** |
| Model pool (quality/cost/speed) | **open** - blocked on host quality/speed fields |
| UX shape | R groups pages with tabs; C splits them into separate routes | acceptable, but a visible difference in information architecture |

**Conclusion:** the client now preserves every interactive surface R actually has, and exceeds it on the controller. The only open capability gap is the model pool, which needs a host field that does not exist, plus a UX grouping difference that is a design choice rather than a missing feature.
