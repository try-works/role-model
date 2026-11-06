# S33 packaged-byte visual verification (real Chrome, 22 routes)

Artifact: `E:/rm-tmp/s31a/release/win32-x64`, version `0.0.20-18-g6c9aeba1`, commit `6c9aeba1`, source tree `e79ccfc7`, exe sha `468bdc50`, bundle `/assets/main.js` 2,570,138 bytes sha256 `4121ee63`. Served on an ephemeral loopback port; screenshots in `evidence/visual-packaged/`.

| Route | Title | State attributes | role=alert |
|---|---|---|---|
| `/` | Overview | RM3 Foldkit shell | idle, idle, success | 0 |
| `/diagnostics/42` | Diagnostics 42 | RM3 Foldkit shell | idle, idle | 0 |
| `/observe/observability-snapshot` | Observability | RM3 Foldkit shell | live, live, ok | 0 |
| `/observe/store-degradation-receipts` | Store receipts | RM3 Foldkit shell | idle, idle, loading | 0 |
| `/observe/queues` | Queues | RM3 Foldkit shell | live, live, ok | 0 |
| `/local/logs` | Local logs | RM3 Foldkit shell | live, live, empty | 0 |
| `/router/candidates` | Router candidates | RM3 Foldkit shell | live, live, ok | 0 |
| `/requests` | Requests | RM3 Foldkit shell | live, live, empty | 0 |
| `/router/decisions` | Router decisions | RM3 Foldkit shell | live, live, empty | 0 |
| `/system/peers` | System peers | RM3 Foldkit shell | live, live, empty | 0 |
| `/local/peers` | Local peers | RM3 Foldkit shell | live, live, empty | 0 |
| `/control/controller` | Controller | RM3 Foldkit shell | ok | 0 |
| `/session-readiness` | Session readiness | RM3 Foldkit shell | empty | 0 |
| `/dashboard` | Dashboard | RM3 Foldkit shell | empty | 0 |
| `/local/swap` | Local swap | RM3 Foldkit shell | empty | 0 |
| `/observe/activity` | Activity | RM3 Foldkit shell | empty | 0 |
| `/observe/logs` | Observe logs | RM3 Foldkit shell | empty | 0 |
| `/observe/routing` | Observe routing | RM3 Foldkit shell | empty | 0 |
| `/router` | Router | RM3 Foldkit shell | ok | 0 |
| `/nonexistent-route` | Not found: /nonexistent-route | RM3 Foldkit shell | error | 1 |
| `/runtime` | Runtime | RM3 Foldkit shell | error | 1 |
| `/control/providers` | Providers | RM3 Foldkit shell | ok | 0 |
| `/control/endpoints` | Endpoints | RM3 Foldkit shell | ok | 0 |

## What this proves and what it does not

- Every client route renders in a real browser from the PACKAGED bytes (not a dev server), with its own document title, a non-empty shell and no alert on any route.
- The not-found route renders `Not found: /nonexistent-route` with an error state, so unknown paths are a real state, not a blank page.
- Read routes that hit the host show `ok` or `empty` states from the packaged backend; the router page shows `ok`; observe-routing shows `empty`.
- It does NOT prove pixel design quality: there is no design source to diff against, and no interaction script (clicks, keyboard, focus order) was run in this pass.
- A browser-tool timeout interrupted one batch; the three routes it held were re-captured afterwards and are included above.
