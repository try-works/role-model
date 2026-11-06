# S200 Closing the review's safety caveat: the worker model is now routed, not just listed

Review #2 said the worker check was "a catalogue/listing path, not a routing path", and warned that a deepseek request would **fall through to live execution** because `adapter-captures.json` had no deepseek entry. Both true, and the second is a safety issue in a test harness, not a cosmetic one.

## What changed

| Change | Effect |
|---|---|
| `fixtures-workers/adapter-captures.json` gains `deepseek-official.primary.ap-east-1.flash` -> `adapter-openai-response.json` | the fixture adapter serves that model, so a worker request can never reach a real provider in this harness |
| gate sets `R39_CHAT_MODEL` for the worker run | the worker journey now **sends a chat completion**, not just a listing query |
| chat check requires `usage.total_tokens >= 1` and non-empty assistant content | a zero-token or empty response no longer passes |
| card expectation counts only **visible, non-empty** cards | hidden or placeholder cards no longer satisfy it |

## Verified

```
PASS chat completion: openai/gpt-4.1-mini-fast total_tokens=56            (default catalogue)
PASS expected model deepseek-official/deepseek-flash
PASS chat completion: deepseek-official/deepseek-flash total_tokens=56    (worker catalogue)
exit=0
```

And the direct request against the worker catalogue:

```
POST /v1/chat/completions {model:"deepseek-official/deepseek-flash"}
200  {"model":"deepseek-official/deepseek-flash","object":"chat.completion", … "usage":{"total_tokens":56}}
```

Served by the fixture adapter (the capture exists), so the routing path is exercised **and** cannot leave the machine.

## Still open from review #2

- controls hidden by opacity/transparent backgrounds, inputs, shadow DOM;
- contrast for oklch/gradients/images/opacity/buttons;
- focus ring uses `--rm-accent-subtle` at 8% ink, and the audit accepts any box-shadow;
- light theme still ships `<meta theme-color #0a0a0a>`;
- CI audits a single viewport (1440x900);
- `--rendered` still exits 0 on a skip unless `--require-rendered`.

The last one is deliberate for local runs and dangerous in CI; the workflow now gates it on the blocking variable, but the **script** still allows it. That asymmetry is on the list.