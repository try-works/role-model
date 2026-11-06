# S516 — named RouteViewContext + readback registry (S512 design slice 2)

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation pattern)
Public basis 6241792d. Design: evidence/other/s512-flat-model-decomposition-design.md slice S514(named view context + readback registry).

Replace the 19 positional routeContent arguments with a named RouteViewContext (fields named exactly as today; call sites updated to pass the object); move the readback/observe/router/system route renderers into a per-route registry keyed by route tag with exhaustive 47-case coverage and NotFound fallback. Verbatim renderer bodies, unchanged selectors/markup/command args; zero behavior change; NO test edits; other slices untouched.

Evidence: unchanged suites 61/61 (s397/s425/s499/s491/s458/s25d/s111), UI tsc 0, packaged rendered audit 20/20 (final6 exe + rebuilt current static, fresh state), s247 3/3, nonempty lint zero added-line, pragmatic RED=N/A rationale in evidence/logs/s516-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
