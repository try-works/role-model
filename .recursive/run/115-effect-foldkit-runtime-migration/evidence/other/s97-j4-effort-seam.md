# S97 J4 effort: the seam is now identified exactly - two ways in, both closed here

The fixture attempt showed endpoint config cannot make a model effort-capable. This traces where the levels actually come from.

## Evidence from the code

| Path | Source of effort levels |
|---|---|
| Codex subscription accounts | `OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX` (`index.ts:611+`), consumed at `:9244-9263` (`reasoningEffortLevels` copied into the model record) and at `:23438-23444` (`isOpenAICodexSubscriptionAccount(account)` gates the matrix lookup) |
| Everything else | `source.reasoningEffortLevels` from the normalized catalog (`:9250-9252`, `:23441-23444`) |

I checked the catalog itself: `role-model-router/packages/catalog/data/normalized-catalog.json` is **3,389,031 bytes and contains no `reasoningEfforts` field at all**. So for a non-subscription endpoint `source.reasoningEffortLevels` is undefined, the published level list is empty, and `effortSource` collapses to `fixed` - which is exactly what the fixture attempt measured.

## Consequence

J4 effort-honoring has exactly two preconditions:

1. an **OpenAI Codex subscription account** (real subscription auth, which a mock cannot stand in for), or
2. a **catalog carrying `reasoningEffortLevels`** for the model, which this repository's normalized catalog does not.

Neither exists in this environment, so the journey cannot be exercised here - and crucially the runtime behaved correctly at every step: it published `effortSource: fixed`, refused `reasoning_effort` with a typed 400 naming `reasoning.effort_control`, and forwarded **zero** requests to the mock.

## Classification

J4: **NOT RUN** for honoring, with both preconditions named and their code paths cited. Honesty half PASS.