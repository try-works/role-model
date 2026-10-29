# S520 — update dispatch partition (S512 design slice 4)

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation pattern)
Public basis 9dc4b6fc. Design: evidence/other/s512-flat-model-decomposition-design.md slice S516(update dispatch partition).

Partition createUpdate (update.ts:222-1511) into explicit ordered per-family handler groups (requests-ranking, learning-ranking, device-auth, endpoint-activation, shell/global, remaining) with bodies moved VERBATIM and precedence preserved exactly (same first-match order); parent createUpdate becomes the composition root delegating to the groups. Message.match precedence/behavior unchanged; NO test edits; other slices untouched.

Evidence: unchanged suites 61/61 (s397/s425/s499/s491/s458/s25d/s111), UI tsc 0, packaged rendered audit 20/20 (final6 exe + rebuilt current static + fixture-root, fresh state), s247 3/3, nonempty lint zero added-line, pragmatic RED=N/A rationale in evidence/logs/s520-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
