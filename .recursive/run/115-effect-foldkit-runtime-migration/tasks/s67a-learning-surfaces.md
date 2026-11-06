# S67a Learning / replay / evaluation surfaces (public, R13 + R17 J6 UI half)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The API surfaces exist and answer honestly, but the packaged client returns **NotFound for `/learning`**. I verified all four against the running packaged host:

```
/api/role-model/operator/learning          -> 200 {"knowledge":{"available":true,"schemaVersion":"role-model.knowledge-worker.v1","candidates":0,"indexedDocuments":0,"backend":"sqlite_fts5_bm25","productionActivation":false,"retrievalReceipts":0,...}}
/api/role-model/operator/replay/jobs       -> 200 []
/api/role-model/operator/evaluation/jobs   -> 200 []
browser /learning                          -> "Not found: /learning" (error state)
```

## Required work

1. Add `/learning` with three honest sections:
   - **Knowledge worker**: `available`, `schemaVersion`, `backend`, `candidates`, `indexedDocuments`, `productionActivation`, and the receipt/degradation counters - rendered as fields with their real values, and an explicit note when `productionActivation` is false.
   - **Replay jobs**: the `/operator/replay/jobs` list; empty is an explicit 'No replay jobs' empty state, never a fabricated row.
   - **Evaluation jobs**: same for `/operator/evaluation/jobs`.
2. Four states per section: loading (aria-busy), empty (explicit text), error (exact phrase + role=alert), success (rows with ids).
3. Tests: captured real bodies (the ones above are real and empty - capture them as fixtures), plus a fixture with one job row to prove the row rendering; assert the empty text, the `productionActivation: false` note, and that a fabricated/nonexistent job id cannot render as a success row.
4. Wire `/learning` into the grouped nav (it belongs with Studio or System - state the choice).

## Constraints

NO host changes (the endpoints are correct), no new dependency, no recharts/ECharts, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The three sections and their field mapping, the nav placement, the states, fixtures with capture provenance, tests with a RED that fails if an empty list renders a fake row, counts and typecheck.