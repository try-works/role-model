# S50 mechanism: Studio targets the vendored llama-swap

Owner correction: Studio's image/audio/rerank work is served by the vendored **llama-swap**, not by the runtime's own `/v1` surface.

## Mechanism (citations)

- `packages/vendor-llama-swap/src/index.ts:342` - vendor base URL is `http://127.0.0.1:<port>/v1`.
- `:436-442` - vendor proxy base / running-model probe.
- `apps/runtime-host-bridge/src/index.ts:24244` - the host starts the vendor and exposes its status.
- Legacy client posts same-origin: `runtime-api.ts:3636` images, `:3651` audio voices, `:3660` audio speech, `:3687` rerank/reranking.

## Change landed

The host now proxies those same-origin paths to llama-swap (method, body, content-type, status and body forwarded). When the vendor is inactive it answers **503 JSON**: `{"error":"Llama-swap is not running. Start it from Local > llama-swap."}` instead of a bare 404. Host `tsc` 0.

## Vendor proof

The repo `llama-swap.exe` was started on an ephemeral port with a temp `models: {}` config and its handlers answered:

- `POST /v1/images/generations` -> 400 `missing or invalid model key`
- `POST /v1/audio/speech` -> 400 same
- `POST /v1/rerank` -> 400 same
- `GET /v1/audio/voices?model=x` -> 400 `could not find suitable handler`

So the routing reaches the real vendor and these are vendor-implemented routes. A 200 generation is impossible here because no GGUF/image/audio weights exist in this worktree.

## Not green yet

The client suite is RED at 6 tests because the S49 layout change renamed structure while tests still assert the old one: the index heading is now `Runtime overview` (as in the reference), the nav is grouped, and the debug control is gone. A repair is dispatched to update those assertions to the new intent without weakening them.
