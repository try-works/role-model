# S88 J6 execution: NOT RUN with the exact contract chain (no faking)

The worker drove the replay contract until the host refused at every level. My own check confirms the last gate: the runtime registers only `GET /api/role-model/operator/trace-roots` and a per-root path (`index.ts:17635`, `:17647`) - there is **no creation endpoint**, so trace roots can only arrive from the private replay-core extension.

## Observed chain (packaged `0.0.20-66-g91f089ec`, fresh state, mock upstream)

| Step | Result |
|---|---|
| chat | 200, `req-a6d785a4-...`, `decision-req-a6d785a4-...`, mock calls 2 |
| `POST /operator/replay/jobs` bare | refused: missing identity/intent/trace root/scope |
| with identity+intent+trace root+scope | **403 `operator_context_mismatch`** (scope) |
| with `scope: standalone-runtime-dev` | **409** bounded `ReplayJobV1` budget required |
| with a full budget | **409 `extension replay-core failed: authoritative trace root resolver required`** |
| `GET /operator/trace-roots` | **`[]`** |

No accepted body, no job id, no terminal lifecycle, no results, and the mock was **not** called a third time - so nothing silently ran.

## What this establishes

J6 execution is not a harness gap after all: it depends on the **private replay-core extension supplying an authoritative trace root**, and the standalone dev artifact has none. That is a real product dependency of the replay path, not a missing test.

## Honest classification

J6: **NOT RUN** for execution, with the blocker named precisely: `replay-core` authoritative trace root resolver absent in the standalone distribution. The honesty half remains PASS (the surfaces answer 200 with empty payloads and no seeded rows).
