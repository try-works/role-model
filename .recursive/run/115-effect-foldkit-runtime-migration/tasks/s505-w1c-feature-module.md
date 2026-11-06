# S505 — W1c: co-locate the requests-ranking feature

Status: pending
TDD Mode: pragmatic (pure refactor; no new behavior - compensation: existing behavioral suites s491/s458/s25d/s111 must stay green unchanged, UI tsc 0, rendered audit /requests still PASS)
Public basis 9e12d584.

Extract the requests-ranking family into a co-located feature module src/features/requests-ranking/ containing its model slice, messages, update handlers and view (importing the shared src/ui/listbox.ts), re-exported so other modules keep the SAME import specifiers/behavior (zero message/query flow changes). Do NOT touch other families, the flat Model/routeContent/createUpdate structure, or the shared HTTP client.

Evidence: unchanged test files only (no test edits) - s491 (listbox scenes incl typeahead/query assertions), s458, s25d, s111 all green; UI tsc 0; audit-rendered-ui /requests PASS with the same package semantics (source-level; packaged rebuild optional); nonempty lint zero added-line; record RED=N/A pragmatic rationale in evidence/logs/s505-green.log header. Freeze hashes; independent review by a different member; no commit. No whole Workspace claim - this is one family of several.
