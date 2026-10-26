# S137 Cross-origin write gate re-proven on the current packaged binary

The gate was proven on an older build; the binary changed five slices later, so I re-proved it rather than assuming a control survives unrelated refactors.

Artifact: `role-model-dev.exe` sha256 `1403f66f…f7d9`, version `0.0.20-131-g13e0c927`, port 5970, temp state on E:.

| Request | Result |
|---|---|
| `PATCH /api/role-model/controller` with `Origin: https://evil.example` | **403**, no `Access-Control-Allow-Origin` |
| `PATCH` with no `Origin` header | **200** |
| `GET` with foreign `Origin` | **200**, `Access-Control-Allow-Origin: *` |

That is the intended shape: reads stay open (the UI is same-origin but the read surface is deliberately public), while a **cross-origin mutation is refused before it reaches a handler** and the refusal does not advertise CORS permission.

## Why this is worth a round

The gate is one line of middleware ordered before the mutating routes. Five refactors later, the only thing that guarantees it is still ordered first is a request against a real binary - and the check costs seconds. A regression here silently reopens a vulnerability that this session already found once.

## Scope

This re-proves the gate on the **dev-channel** package. The stage/production channel uses the same handler chain (`setCorsHeaders` + the origin gate in `index.ts`), and nothing channel-specific was touched this session, but I did not run the check against a stage build because none can be produced here without a real Run 88 identity.