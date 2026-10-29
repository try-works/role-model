# S507 — W1c: co-locate the learning-ranking family

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation as S505)
Public basis 1d08347f.

Same pattern as S505: extract learning-ranking (learning-ranking.ts / learning-ranking-view.ts and their model/messages/update/view slices) into src/features/learning-ranking/ with byte-identical re-export shims; parent dispatcher delegates to extracted pure plans; zero message/query flow change; NO test edits; flat Model/routeContent/createUpdate untouched; no other families.

Evidence: s458/s25d/s111/s491 unchanged suites green; UI tsc 0; rendered audit /learning PASS; nonempty lint zero added-line; pragmatic RED=N/A rationale in evidence/logs/s507-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
