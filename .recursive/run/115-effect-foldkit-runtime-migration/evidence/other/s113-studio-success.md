# S113 Studio success path verified end-to-end in the browser

R13's standing caveat has been "Studio success generation needs real model weights". That conflated two things: **weights for local generation** and **a successful response being rendered**. The second is now verified.

## Setup

- Packaged `0.0.20-81-g17cbdd21` on ephemeral 5961, fresh `E:` state, static root attached.
- Fixture copy whose `openai.personal.primary` account carries `baseUrlOverride`, so the chat path is exercised through the host rather than only its error branch.

## What happened

1. `/studio` rendered the chat form: model input `moonshot/kimi-k2.5`, prompt input, **Run**.
2. Setting the model through a real `input` event (not by mutating state) and clicking Run produced:

```
RAW RESPONSE {"id":"chatcmpl-role-model","object":"chat.completion","created":1792968316,
  "model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"message":{"role":"assistant",
  "content":"OpenAI summary","tool_calls":[{"id":"call_1","type":"function",
  "function":{"name":"lookupRegistry","arguments":"{\"endpointId\":\"openai.personal.primary.us-east-1.fast\"}"}}]}}]
```

- **No `role=alert`**: this is a success render, not an error surfaced politely.
- The raw pane shows the full body including tool calls, which is what an operator needs to debug a route.

![Studio success](.recursive/run/115-effect-foldkit-runtime-migration/evidence/visual-final/studio-success.png)

## What this does and does not close

Closed: the client's **success rendering** for a chat request against the real host, with a live 200 body and no fabricated content.

Still open: **actual model generation** - image/audio/rerank and real weights. Those need capabilities absent from this environment (the host has no local weights and the four `/v1` studio endpoints return typed 404s except chat).

## A self-inflicted detour worth recording

My first attempt used the browser `type` tool, which **appends** to the field, producing `moonshot/kimi-k2.5openai/gpt-4.1-mini-fast` and a 400 `no_eligible_target`. The fix was to set the value through the native setter plus an `input` event so the app's own handler ran - the error was my harness, not the product.