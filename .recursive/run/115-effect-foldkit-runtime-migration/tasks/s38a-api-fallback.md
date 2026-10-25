# S38a API paths must not be swallowed by the static fallback (public, R21/R33)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Found while probing the packaged host: a GET to a MISSING api path returns **200 with text/html** (the SPA index), while POST to the same path returns 404.

```
GET /api/role-model/definitely-missing-xyz -> 200 text/html
GET /v1/definitely-missing-xyz          -> 200 text/html
POST /api/role-model/device/start        -> 404
```

That means any mistyped or unimplemented GET endpoint looks like success to a client that checks `response.ok`, and a JSON parser then reports 'invalid response' instead of a 404. It also made a route-audit probe falsely report that studio endpoints existed.

## Required work
1. Scope the static fallback: only non-API paths may fall back to `index.html`, and only for navigation-style requests (for example `Accept` containing `text/html`). Requests under `/api/*` and `/v1/*` that have no registered handler must return a 404 with a JSON error body.
2. Keep client-side routing working: a deep link like `/observe/queues` (no extension, `Accept: text/html`) must still receive the SPA index with 200.
3. Prove both directions with tests: (a) GET `/api/role-model/definitely-missing-xyz` -> 404 JSON; (b) GET `/v1/definitely-missing-xyz` -> 404 JSON; (c) GET `/observe/queues` with `Accept: text/html` -> 200 HTML; (d) an asset path that does not exist -> 404, not index; (e) POST to an unknown api path stays 404.
4. State whether this changes any documented contract (a client that relied on the old 200 HTML for a missing endpoint was relying on a bug).

## Files
the static-serving code in `apps/runtime-host-bridge/src` and its tests; evidence `s38a-*`.

NO unrelated host changes, no ECharts, no packaging, no installs, no commits, no subagents; ephemeral ports only.

## Report
The fallback rule you implemented, the five proofs with exact status+content-type, and any contract note.