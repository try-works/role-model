# S196 My "Overview is missing the visualisations" claim was wrong - they are there once data exists

Two rounds ago I wrote that the port Overview "does not yet carry the model-pool scatter or the token-usage chart". This round I gave the candidate one recorded request and looked again.

```
cards: ["Model cost strip", "Token usage over time", "Latency (ms)", "Success vs failure"]

Model cost strip - "Input cost per 1M tokens. Quality and speed axes are omitted:
                     the host candidate body has no quality or speed score."
  openai/gpt-4.1-mini-fast  0.4  openai.personal.primary.us-east-1.fast
  claude-3.7-sonnet         3    anthropic.team.shared.us-east-1.default
  gpt-5.4                   2.5  cli.local.coder

Token usage over time - "Total tokens per bucket for the last day."
  56 tokens, 28 tokens, 0 tokens across the day buckets
```

**The panels exist.** They render only when telemetry rows exist, and every earlier capture was on a host with zero traffic - the empty state I kept screenshotting.

## The port already reached the same conclusion I reached by hand

Investigating whether the scatter could be built, I found:

- `operationalProfile` carries `tokens_per_sec`, `cost_per_1k_tokens_est`, latency and failure rate - but no quality scalar;
- quality lives in **benchmark** profiles (`judge_score` / `quality_score`), and a fresh host has no benchmark samples.

The Overview card says exactly that, in the UI, in one sentence. So the "content gap" is not a gap: it is a documented omission with a stated reason, plus a cost strip that uses the data that *does* exist.

## Evidence

| File | Shows |
|---|---|
| `ui-audit/port-overview-populated.png` | the port Overview with 4 cards, populated from one real request |
| `ui-audit/reference-overview.png` | the reference (`:3456`, old React app) for comparison |

Audit on the populated Overview: `PASS /`, `{"routes":1,"failures":0,"focus":true}`.

## What this says about my method

I reported a content gap from **empty-state screenshots**. The honest version was one request away, and the code had already documented the real limitation. Two of my last three "scope findings" were artefacts of the fixture state rather than of the port.

## Corrected position on "complete port"

| Area | Status |
|---|---|
| routes | 25/25 render, audited |
| Overview | stat panel, 4 cards, filters, token chart, cost strip - populated when traffic exists |
| IA | grouped differently from the reference by design |
| quality/speed axes | **intentionally omitted**, stated in the UI, because the API has no such score |
| React app | remains as the reference at `:3456` until cutover (owner-confirmed) |