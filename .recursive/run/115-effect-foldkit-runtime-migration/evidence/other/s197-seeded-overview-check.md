# S197 The populated Overview is now what the gate audits

S196 ended with a correction: the Overview cards exist, and every earlier capture was of the **empty** state because the fixture host had no traffic. The obvious follow-up is to stop auditing the empty state.

## `audit-rendered-ui.mjs --seed-chat --expect-overview-cards N`

- `--seed-chat` makes exactly one OpenAI-compatible request before auditing, so telemetry rows exist;
- `--expect-overview-cards N` requires at least N `[data-overview-card]` elements on `/`.

```
seeded chat: status 200
PASS /          {"routes":1,"failures":0}   exit=0
```

## Two false-ish results on the way, both instructive

1. **First run: 0 cards** even though the seed returned 200. The shell fetches `/telemetry/rows` **after** hydration, and the audit judged the first frame 1.2 s in. Now the card count is **polled** for up to 8 s (`AUDIT_CARDS_TIMEOUT_MS`). A single-frame sample of an async-rendered page is not evidence.
2. **Without seeding the count is 1, not 0** - the cost strip renders from the candidate catalogue alone. So an expectation of 3 fails honestly:

```
FAIL / - expected at least 3 Overview cards, saw 1
exit=1
```

That is the falsifiability check: the expectation is not satisfied by the page being present, only by the data-driven panels appearing.

## Wired in

The packaged gate now runs the rendered audit with `--focus --seed-chat --expect-overview-cards 3`, and the CI advisory step passes the same flags. Full gate:

```
PASS chat completion: openai/gpt-4.1-mini-fast total_tokens=56
PASS expected model deepseek-official/deepseek-flash
seeded chat: status 200
{"routes":20,"failures":0,"focus":true}   exit=0
```

## Why this matters beyond one page

Many of my earlier screenshots were of empty states, and I twice wrote conclusions from them (the "missing visualisations" claim in S176/S195, and a "content gap" that did not exist). The fix is not more care - it is making the gate **populate** the state it claims about.