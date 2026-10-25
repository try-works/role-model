# S47 Studio: browser verification found the real gap

Served through the packaged executable with `--static-root`, fresh temp state root, ephemeral port.

## What works (verified in the browser)

- `/studio` renders five tabs: **Chat, Images, Audio, Rerank, Advanced APIs**.
- Raw response pane starts with the idle text "Run a Studio request to see the raw response."
- Clicking **Run** on Chat dispatches to the packaged host and renders the honest answer inside `role="alert"`:

```
HTTP 400
{"error":{"type":"capability_eligibility_error","code":"no_eligible_target",
 "message":"no_eligible_target: no targets for model moonshot/kimi-k2.5 satisfy the inferred request capabilities."}}
```

So chat dispatches end-to-end against the real host even though the worker reported that path as not run.

## The gap the browser exposed

I typed `custom-model-xyz` into the Chat model input (the DOM kept the value across a tab round-trip), then clicked Run: the request still carried `requestedModel: "moonshot/kimi-k2.5"`. **Inputs are not wired to state**, so a Studio user cannot change what is sent. That is the last Studio piece, dispatched as a repair.

## Note on the four non-chat tabs

The reference 0.0.20 runtime ALSO answers those `/v1` paths with the SPA fallback (200 HTML), so those endpoints do not exist there either. Our packaged build answers **404 JSON**, and Studio renders that as an error with the raw body - honest on both sides.
