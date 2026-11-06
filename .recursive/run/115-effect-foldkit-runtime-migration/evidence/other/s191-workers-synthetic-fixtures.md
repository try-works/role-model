# S191 The explicit deepseek-official/deepseek-flash workers, demonstrated on synthetic fixtures

The objective names those workers explicitly. They are absent from the shipped fixture catalogue, and the only real source is the production operator state, which I will not copy or point a candidate at. So I built a **synthetic fixture set** that names them, and ran the packaged candidate against it.

## What the fixture set is

`testdata/router-runtime/fixtures-workers/` - a copy of the fixture catalogue plus:

- one provider account `deepseek-official.primary` (providerKind `provider-openai`, credential ref `DEEPSEEK_API_KEY`, region `ap-east-1`, allowed model `deepseek-official/deepseek-flash`), built by cloning a valid account so every required field is present;
- one registry endpoint `deepseek-official.primary.ap-east-1.flash` (`remote-openai-compatible`, `active`, `healthy`).

**No operator state was read, copied or modified.** This is a test fixture in the public tree, and it cannot reach a provider without a real credential - it exists to exercise the configuration path.

## What the candidate then served

```
GET /api/role-model/models
  deepseek-official/deepseek-flash | Deepseek Flash | deepseek-official.primary.ap-east-1.flash
GET /control/controller (rendered)
  select options: openai…, anthropic…, deepseek-official.primary.ap-east-1.flash, cli.local.coder
GET /control/endpoints (rendered)
  deepseek-official/deepseek-flash | active | deepseek-official
```

## Controller round trip to the worker

Selecting `deepseek-official.primary.ap-east-1.flash` and pressing **Save controller** in the rendered page produced:

```
{"scope":"global","endpointId":"deepseek-official.primary.ap-east-1.flash",
 "modelId":"deepseek-official/deepseek-flash","sourceType":"remote"}
```

## Rendered audit on that configuration

```
PASS / | /models (1616 chars) | /control/controller | /control/endpoints
{"routes":4,"failures":0,"focus":true}   exit=0
```

## What this proves, and what it does not

**Proves:** the packaged runtime accepts, lists, renders and can be steered to an endpoint whose provider account and model are exactly `deepseek-official` / `deepseek-flash`. The configuration path and the UI path both work.

**Does not prove:** that the operator production configuration contains those entries with working credentials, nor that a live request to `deepseek-official` succeeds. The first needs operator state; the second needs a real key. Neither is available here, and neither is claimed.

This is the synthetic-equivalent path that was offered as an R16 option and never confirmed. I took it **for the fixture catalogue only**, because it is reversible, public-tree, and does not touch operator data - and I am labelling the result synthetic everywhere it appears.