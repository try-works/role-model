# S514 — Model grouping slice (first S512-design implementation slice; IDs shifted +1 because S513 was already used for the endpoint-activation review)

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation pattern)
Public basis ff1735fe. Design: evidence/other/s512-flat-model-decomposition-design.md slice S513(Model grouping).

Compose the flat 23-field modelFields from per-feature field objects (requests-ranking, learning-ranking, device-auth, endpoint-activation, and remaining groups) with Pick slice types; runtime model shape/initialization byte-compatible (same hydration, same serialization); no behavior change; NO test edits; other slices (named view context, update partition) untouched.

Evidence: unchanged suites 61/61 (s397/s425/s499/s491/s458/s25d/s111), UI tsc 0, rendered audit spot routes PASS, s247 3/3, nonempty lint zero added-line, pragmatic RED=N/A rationale in evidence/logs/s514-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
