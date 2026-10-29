# S511 — W1c: co-locate the endpoint-activation family

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation as S505/S507/S509)
Public basis 4537248b.

Extract endpoint-activation-tracker (model slice, messages, update handlers, view) into src/features/endpoint-activation/ with byte-identical re-export shims; parent delegates to extracted pure plans; zero behavior change; NO test edits; other families untouched.

Evidence: unchanged suites green (s458/s25d/s111/s491/s397/s425/s499), UI tsc 0, rendered audit /control/endpoints PASS, nonempty lint zero added-line, pragmatic RED=N/A rationale in evidence/logs/s511-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
