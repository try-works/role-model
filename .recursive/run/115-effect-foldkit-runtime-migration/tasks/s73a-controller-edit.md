# S73a Controller editing: the first real write surface (public, R16 capability port)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R's UI can change the controller endpoint; our Controller page is read-only. Close that gap with the contract the legacy client already uses.

## Measured contract (from the legacy client and the live hosts)

- Read: `GET /api/role-model/controller` (already used by our page).
- Write: **`PATCH /api/role-model/controller`** with body `{ "endpointId": <id> }` (legacy `runtime-api.ts:3093-3106`).
- Endpoints to choose from: `GET /api/role-model/endpoints` (already fetched by our Models page).

## Required work

1. On `/control/controller`: a select of eligible endpoints, a Save action that dispatches the PATCH with exactly `{"endpointId": ...}`, a busy state that disables Save, and a success state that re-reads the assignment so the displayed controller is the SERVER's answer, not the optimistic input.
2. Honest failure: a 4xx/5xx renders the host's error body inside `role=alert` and the displayed assignment remains the last readback (never a silently optimistic value).
3. Tests: exact method/path/body assertion; a PATCH returning a DIFFERENT endpoint than requested must render the server's value and a visible notice (that is the case where an optimistic UI would lie); a 4xx keeps the old value; double-dispatch guarded.
4. REDs: (a) optimistic rendering instead of re-read, (b) body sent as `{endpoint: id}` or missing the id.
5. Prove it against a TEMP-STATE host you start yourself (ephemeral port, `E:` state root): PATCH, then `GET /api/role-model/controller` to show the change persisted, then patch it back. NEVER run this against :3456 or the operator state.

## Files
`apps/runtime-ui-next/src/**`, tests, fixtures; evidence `s73a-*` with the RED logs and the real PATCH transcript.

NO host changes, no new dependency, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The control contract, the tests and REDs, the temp-host transcript showing the persisted change, counts and typecheck.