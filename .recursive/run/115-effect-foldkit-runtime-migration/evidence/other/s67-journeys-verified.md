# S67 R17 journeys corrected: J3/J4/J6 verified, and a real UI gap found

## Verified outcomes (packaged exe, fresh temp state, slow mock upstream)

| Journey | Result |
|---|---|
| **J3 cancel/error** | **PASS** - 10 s mock, abort at 500 ms, `AbortError`, counter `2 -> 3` exactly +1, no hung spinner, no false success (earlier legs: success 200 and upstream 500 each +1 with distinct request/decision ids) |
| **J4 metadata/effort** | **PASS (honesty)** - `reasoning_effort: high` correctly yields 400 `no_eligible_target` because all endpoints have empty effort capability; the no-effort readback reports `reasoningEffort: null`, `effortSource: none`, with no fabricated live-only support. Effort-honoring **NOT RUN** (precondition: an endpoint with non-empty effort levels) |
| **J6 replay/eval/learning** | **PASS (API)** - `/operator/replay/jobs` 200 `[]`, `/operator/evaluation/jobs` 200 `[]`, `/operator/learning` 200 with `candidates: 0`, `indexedDocuments: 0`; no seeded rows. Job execution **NOT RUN** |

Both earlier misclassifications are superseded: the un-prefixed 404 probe (wrong paths) and the J4 "defect" (correct rejection).

## The gap the correction exposed

The packaged client returns **NotFound for `/learning`** while the API exposes three operator surfaces. That is honest but incomplete: the reference navigation has a Learning section, and R17 J6 asks for honest disabled/empty states, which cannot exist if the route does not.

Live payloads captured for the fixtures:

```
/api/role-model/operator/learning -> {"knowledge":{"available":true,"schemaVersion":"role-model.knowledge-worker.v1",
  "candidates":0,"indexedDocuments":0,"backend":"sqlite_fts5_bm25","productionActivation":false,
  "retrievalReceipts":0,"rollbackReceipts":0,"recoveryReceipts":0,"degradationCount":0,...}}
/api/role-model/operator/replay/jobs     -> []
/api/role-model/operator/evaluation/jobs -> []
```

Dispatched: add `/learning` with the knowledge-worker fields (including an explicit `productionActivation: false` note), honest replay/evaluation job lists, four states each, real captured fixtures plus a one-row fixture to prove row rendering, and a test that a fabricated job id cannot render as success.
