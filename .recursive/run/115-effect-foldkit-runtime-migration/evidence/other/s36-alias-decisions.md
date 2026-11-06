# S36 alias decisions and detail-route behaviour, verified in the browser

After the S26r repairs, served through the packaged executable with the rebuilt client.

| Path | Rendered | Meaning |
|---|---|---|
| `/local/models` | **Local choose** | the one honest alias, target view asserted |
| `/local/matrix` | **Not found: /local/matrix** (error) | alias removed because its legacy target (`llama-swap/models?view=grid`) is unported |
| `/router/config` | **Not found: /router/config** (error) | alias removed because its legacy target (`router/strategy`) is unported |
| `/requests/abc` | **Request abc** - "Request detail read failed: HTTP 404" (error) | the route exists and surfaces the host's real 404 for an unknown id; the inventory marks it unproven because no real id exists in this state |
| `/router/decisions/abc` | **Decision abc** - "Router decision detail read failed: HTTP 404" (error) | same |

## Why this is the honest state

- Two aliases were pointing at the WRONG target views; removing them is better than shipping a bookmark that silently shows a different page.
- The detail routes are not faked: they render the host's 404 for an id that does not exist. Their success state remains unproven until a real request/decision id can be captured.
- `local-peer-models` is verified with an injected non-empty success body plus the captured empty `[]` fixture for the empty state.
- Control actions now send real ids/bodies and are asserted exactly (method, path, body).

## Verification

Full client suite 173/173 across 16 files, `tsc` 0, re-run by the controller.
