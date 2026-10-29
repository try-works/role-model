# S518 — control/feature route modules (S512 design slice 3)

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation pattern)
Public basis ba21550b. Design: evidence/other/s512-flat-model-decomposition-design.md slice S515(control/feature route modules).

Move the Providers/Endpoints/Requests/Learning/Studio/Runtime/Index route renderer bodies verbatim out of the central registry into their feature modules (features/*/view.ts or a routes.ts per family), re-imported by the registry; dispatch/selectors/markup/command args unchanged; keep the 49-key registry exhaustive; zero behavior change; NO test edits; other slices untouched.

Evidence: unchanged suites 61/61 (s397/s425/s499/s491/s458/s25d/s111), UI tsc 0, packaged rendered audit 20/20 (final6 exe + rebuilt current static + fixture-root, fresh state), s247 3/3, nonempty lint zero added-line, pragmatic RED=N/A rationale in evidence/logs/s518-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
