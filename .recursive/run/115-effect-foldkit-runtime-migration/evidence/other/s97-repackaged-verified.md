# S97 Repackaged candidate verified by the lead (0.0.20-81-g17cbdd21)

| | |
|---|---|
| Version | `0.0.20-81-g17cbdd21` |
| Commit | `17cbdd21` (includes the acquisition-scope wiring `5b2f1326`) |
| Exe sha256 | `4898f865c06c1e7364748641cff4889d8901bf8d3f70c5109de296e748f044c7` - recomputed by me |
| Client `main.js` | 2,660,667 bytes, sha256 `d7cd6ded...` |
| `validate-packaging` | exit 0 |

## Verified on my own instance (port 5927, fresh state root, static root attached)

| Check | Result |
|---|---|
| `/healthz` | `runtime.version = 0.0.20-81-g17cbdd21` |
| Foreign-origin `PATCH /api/role-model/controller` | **403**, controller unchanged `openai.personal.primary.us-east-1.fast` |
| `/models` with `Accept: text/html` | **200 text/html** (client route served) |
| `/assets/main.js` | **2,660,667 bytes** - the rebuilt client ships inside the package |

The worker's own smoke on 5926 said the same; I stopped relying on that when its server died mid-check and re-ran the whole thing on my own instance, which is where these numbers come from.

## Why the repackage was necessary

The previous artifact (`s85a`, `91f089ec`) predated: the acquisition-scope wiring, the unified release order, the truthful config diff, the exact model join, settled title text and the learning-unknown fix. Shipping a verification against a stale binary would have meant claiming results for code that was not in it.
