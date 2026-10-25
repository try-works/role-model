# S58 proxy repaired by the lead, with a real RED/GREEN host test

The worker twice reported the llama-swap proxy fixed; `git diff` showed `runtime-host-bridge/src/index.ts` untouched and the variable still had only a declaration and a read. I repaired it myself.

## The change

- The dead module-level `llamaSwapProxyBaseUrl` is gone.
- The proxy target is resolved **live per request** through a new option seam:
  `StartBridgeServerOptions.readLlamaSwapVendorStatus?: () => { healthStatus, baseUrl? } | null`,
  wired `RuntimeBridgeBackend.readLlamaSwapVendorStatus()` -> `cli.ts` -> `startBridgeServer`.
- The handler forwards only when `healthStatus === "healthy"` and `baseUrl` is a string; otherwise 503 with the documented message.

## Proof (host test, both directions)

`test/index.test.ts` -> "proxies the Studio vendor paths to a healthy llama-swap and 503s when it is not running":

- starts a real upstream `http` server and points the seam at `http://127.0.0.1:<port>/v1`;
- `POST /v1/images/generations` returns **200** with the vendor echo, and the echoed **body contains the original model string** - a proxy that swallowed the body would fail;
- with the vendor reported `stopped`, all of `/v1/images/generations`, `/v1/audio/speech`, `/v1/rerank`, `/v1/reranking` and `GET /v1/audio/voices` return **503** with "Llama-swap is not running".

**RED** (handler forced to `null`): the test fails. **GREEN** (restored): passes. Host `tsc` 0.

## Still open from the review

- Gap rendering: empty buckets are omitted and the line can bridge a gap.
- Packaging self-containment: `build.mjs` copies fonts from the legacy app build and style-build imports from legacy `node_modules`; `runtime:package-sea` does not build the legacy app.
- a11y: Studio tabs lack tablist semantics; model-pool points are not focusable; rail dash reasons ride on generic spans.
- Studio end-to-end success still needs real model weights.
