# S681 - learning route pages wired to the backend (owner-reported)

Date: 2026-11-07. Build 0.0.20-818 + the rebuilt client; :3480.

## Report
The Learning pages (Overview/Configuration/Packs/Decisions/Evidence/History) showed "Loading learning
state…" forever; the endpoint ladder index and task-scoped packs never appeared.

## Root cause (two independent defects)
1. UI: role-model-router/apps/runtime-ui-next/src/features/learning/routes.ts rendered a hardcoded
   loading() AND wrapped the real tables in hiddenTable() (h.div Class "hidden"). The readbacks DID load
   (the UI fetched /api/role-model/operator/learning/records?kind=pack → 200) but the page never showed
   them. The learning-ranking pages (which are wired) were imported in view.ts but unused for these routes.
2. Data: the generic parseLearningFamily only read records/items/rows/data; the packs payload has
   records: [] + ladders: [...], so it yielded ZERO rows; policy/decisions/history/profile/measurement
   collapsed into one opaque row.

## Fix (TDD)
- UI commit 57bd82a5: removed hiddenTable and every hardcoded loading body; one readbackBody used by all
  six pages — idle/loading → placeholder, ok → visible rows, empty → spec emptyText, error → role=alert.
  Packs renders the ladder table under ROLE · TASK / TOP ENDPOINTS / ACTIVATION with per-ladder
  Activate/Roll back, plus the pack records table. New test/s681-learning-wiring.test.ts 26 tests
  (19 RED before the fix). Logs: evidence/logs/s681-learning-wiring-{red,green}.log.
- Data commits 1cdf3c28 + 62b8563d: explicit parsers for knowledge (7 rows), policy (50), packs (5 ladder
  rows), decisions (40), measurement (4), history (28 buckets), profile (15), advisory (3). New
  test/s681-learning-readback.test.ts 4/4. Logs: evidence/logs/s681-learning-{red,green}.log.
- Affected callers updated: test/s386/s533/s541/s563/s565 structural fixtures and the page story now
  match the wired contract (ladder-shaped rows, UPPER-case headers, idle=loading). UI suite: 130 files,
  1086 tests pass; tsc 0.

## Visual verification (new build, :3480, rebuilt client)
Playwright/CDP DOM read of each page after load:
- /learning/packs: 2 tables; headers ROLE · TASK | TOP ENDPOINTS | ACTIVATION and PACK | VALIDATION | STATE;
  first rows "coder · tester.reproduce | moonshot.personal.kimi-code.global.kimi-k2.7-code ..." and
  "creative · creative.copywriting ...". loading occurrences: 0.
- /learning/configuration: PARAMETER | VALUE | DETAIL, "Policy version | 1 | sha256:16464f32…",
  "stage | S4 | effective".
- /learning/decisions: DECISION | OUTCOME | ORIGIN | EVIDENCE with real decision rows.
- /learning/evidence: GUARDRAIL | BOUND | OBSERVED | VERDICT and REASON | COUNT | DETAIL with
  "Route decision | measurement:659e2b595dd041a4".
- /learning/history: BUCKET | VALUE | DETAIL with real time-window buckets.
- 0 "Loading learning state…" on every page. Screenshot: learning-packs-verify.jpg (learning Packs tab).

## Backend and store cross-check
- GET /api/role-model/operator/learning/records?kind=pack → 200, 5 ladders (coder/tester.reproduce,
  creative/copywriting, creative/visual.prompt, support/ticket.reply, writer/docs.write), records [].
  The page renders all 5.
- knowledge-store.sqlite (scope standalone-runtime-dev): knowledge_route_ladders 3,
  knowledge_learning_records 133 (all validation_receipt), knowledge_retrieval_receipts 1000,
  knowledge_documents 180.
- Mismatch (documented, not hidden): the endpoint reports 5 ladders while 3 are persisted in
  knowledge_route_ladders (the sidecar projection adds support/ticket.reply and creative/visual.prompt),
  and /operator/learning reports retrievalReceipts 0 while the store has 1000 for the scope. Public
  index.ts only forwards these to the sidecar (index.ts:18032, track-b-operations.ts:2116), so the shape
  was not changed; these are sidecar projection/store discrepancies left for a follow-up.

## Bound
The learning pages are wired and verified end-to-end against the real runtime and stores. The two
sidecar projection/store discrepancies above are recorded as open follow-ups rather than claimed fixed.
