# S38 host probe: wave-4 endpoints truly absent, and the fallback is a defect

Probing the packaged host on an ephemeral port:

| Path | Status | Content-Type | Meaning |
|---|---|---|---|
| `/v1/models` | 200 | `application/json` | a real endpoint |
| `/v1/messages` | 200 | `text/html` | **the SPA fallback** - no such endpoint |
| `/v1/images/generations` | 200 | `text/html` | fallback |
| `/v1/rerank` | 200 | `text/html` | fallback |
| `/api/role-model/router/strategy` | 200 | `text/html` | fallback |
| `/api/role-model/definitely-missing-xyz` | 200 | `text/html` | fallback |
| `POST /api/role-model/device/start` | 404 | - | correct 404 |

## What this establishes

1. **Wave 4 really is blocked**: the studio endpoints do not exist. The earlier 200s were the static fallback, confirmed by content type - a status-code-only check would have lied.
2. **The fallback is a defect**: a GET to any unknown `/api/*` or `/v1/*` path returns 200 HTML, so a client that checks `response.ok` treats a missing endpoint as success and the JSON parser then reports "invalid response". POST already 404s, so the behaviour is also inconsistent by method.

Fix dispatched: only non-API navigation requests may fall back to `index.html`; `/api/*` and `/v1/*` without a handler must return 404 JSON. Deep links such as `/observe/queues` must keep working.
