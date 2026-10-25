# S83a CRITICAL: mutating role-model endpoints are cross-origin writable (public, R21/R23 security)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The second independent review found, and I confirmed by reading the code, that the runtime accepts MUTATING writes to `/api/role-model/*` from any web origin:

- `PUT /api/role-model/runtime/config` at `index.ts:18970`,
- `PATCH /api/role-model/controller` at `:19498`,
- `POST /api/role-model/endpoints` at `:19955`,
- the operator gate at `:17530` covers ONLY `/api/role-model/operator/`,
- `setCorsHeaders` (`:16780-16785`) sends `Access-Control-Allow-Origin: *` with `GET, POST, PUT, DELETE, OPTIONS`.

So any page the operator visits can rewrite the runtime config or switch the controller on a reachable runtime, with no credential. This is pre-existing, but the config editor I ported turns it from latent into live.

## Fix (this slice)

1. **Same-origin enforcement for mutating `/api/role-model/*` requests** (anything that is not GET/HEAD): accept only when the request is same-origin - `Sec-Fetch-Site: same-origin`/`none`, or an `Origin` header whose host equals the bound host/port, or no `Origin` at all (curl/CLI, which already has local access). Reject a foreign `Origin` with 403 and a typed JSON body. Do NOT rely on `Sec-Fetch-Site` alone; treat it as one accepted signal.
2. **CORS tightening**: stop sending `Access-Control-Allow-Origin: *` for mutating `/api/role-model/*` paths (the UI is same-origin and needs no CORS). Keep GET behaviour unchanged unless you find a concrete cross-origin read the product relies on - if so, say which.
3. **Defense in depth**: if an operator credential is configured, mutating requests must also pass `authorizeOperatorRequest`; when none is configured, same-origin is the gate. State exactly which mode applies.
4. **Tests (host)**:
   - `PATCH /api/role-model/controller` with `Origin: https://evil.example` -> 403, and the controller does NOT change;
   - same request with `Origin: http://127.0.0.1:<port>` -> allowed;
   - same request with no Origin (curl) -> allowed;
   - same for `PUT /api/role-model/runtime/config` and `POST /api/role-model/endpoints`;
   - `GET` unaffected;
   - assert the mutating response carries no `Access-Control-Allow-Origin: *`.

## Evidence

`s83a-*` with the RED (test fails before the fix: a foreign-origin PATCH currently succeeds), the green run, host `tsc`, and a note on whether any client code sends an `Origin` that must be allowed.

NO upgrades, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The gate rule, the CORS change, the test table with RED/GREEN, host tsc, and any client-side impact.