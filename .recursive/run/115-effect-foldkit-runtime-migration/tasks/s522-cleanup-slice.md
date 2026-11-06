# S522 — decomposition cleanup (S512 design slice 5)

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation pattern)
Public basis 7bacb981. Design: evidence/other/s512-flat-model-decomposition-design.md slice S517(cleanup).

Remove remaining positional-argument remnants and old signatures; remove the two localized payload casts in Diagnostics/NotFound by narrowing through the route registry types; remove unused fields (broad shared ControlRouteContext surface, unused learningFamilyPage); ensure the 49-key registry is the single dispatch path and no cross-family internals remain. Zero behavior change; NO test edits; other slices stay as committed.

Evidence: unchanged suites 61/61 (s397/s425/s499/s491/s458/s25d/s111), UI tsc 0, packaged rendered audit 20/20 (final6 exe + rebuilt current static + fixture-root, fresh state), s247 3/3, nonempty lint zero added-line, pragmatic RED=N/A rationale in evidence/logs/s522-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
