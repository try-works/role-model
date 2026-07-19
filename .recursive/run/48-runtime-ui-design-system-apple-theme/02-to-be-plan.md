Run: `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-06-16T18:05:24Z`
LockHash: `dd7f38ce0d4d12b9d86c878592e89507443c7443f102b4abd94797412a19d655`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-worktree.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/01-as-is.md`
Outputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
Scope note: ExecPlan for migrating the runtime UI from the Swiss-era theme baseline to the approved Apple-inspired light/dark design system, with strict TDD, deterministic theme state, transparent semantic pills, bounded route cleanup, and rebuilt-runtime browser verification.

## TODO

- [x] Map every in-scope requirement to bounded implementation sub-phases
- [x] Preserve design-system-first ordering before any route-level styling cleanup
- [x] Define strict TDD evidence for every production-code slice
- [x] Define focused test/build/package/browser verification expectations
- [x] Record a concrete file-change plan for shared theme surfaces and bounded route cleanup
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Outcome

Run 48 will:

1. Replace the runtime UI's authoritative styling baseline with the repo-local Apple reference while preserving the current route and layout architecture.
2. Rebase the shared token layer, typography, shell, and primitives onto the approved light/dark contract.
3. Add a deterministic, persisted two-mode theme system with only `Light` and `Dark` operator choices, while using system preference only for the initial default.
4. Replace Swiss-era square chrome and semantic background-tinted pills with restrained rounded surfaces and transparent semantic status pills.
5. Roll the new design system through Overview and additional runtime routes by changing shared primitives first and using only bounded route-level cleanup where local overrides bypass the shared system.
6. Verify the result with strict RED -> GREEN TDD, focused runtime-ui tests, runtime-ui build proof, runtime packaging, and browser QA against the rebuilt operator surface.

All work executes from worktree `D:\DEV\role-model\.worktrees\48-runtime-ui-design-system-apple-theme` on branch `recursive/48-runtime-ui-design-system-apple-theme`.

## Requirement Mapping

| R# | Sub-phase(s) | Primary deliverable |
| --- | --- | --- |
| R0 | SP48-A through SP48-D | design-system-first implementation order enforced across docs, tokens, tests, shared chrome, then route consumers |
| R1 | SP48-A, Phase 6, Phase 7 | Apple-reference authority in product docs/tests/runtime UI, plus recursive control-plane language updates later |
| R2 | SP48-B, SP48-C, SP48-E | deterministic light/dark theme state, persisted toggle behavior, and rebuilt-runtime proof |
| R3 | SP48-A, SP48-B | exact approved light/dark token contract in docs and CSS/bootstrap |
| R4 | SP48-A, SP48-B | approved typography contract in docs and root/bootstrap styles |
| R5 | SP48-C, SP48-D | shell/panel/control restyle plus bounded route adoption |
| R6 | SP48-B, SP48-C | normalized controls and global theme-toggle affordance |
| R7 | SP48-C | transparent semantic pills in shared primitives and downstream consumers |
| R8 | SP48-D | layout-preserving shared-system rollout across Overview and additional routes |
| R9 | SP48-A, SP48-B, SP48-C | docs, metadata, shared exports, and regression coverage updated together |
| R10 | SP48-E | automated proof plus rebuilt-runtime browser QA |
| R11 | SP48-A through SP48-E | strict TDD evidence by sub-phase |

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: the active tool surface for this run does not expose a callable recursive-subagent workflow; Phase 2 therefore proceeds as a main-agent audit using locked upstream artifacts and direct source inspection
- Delegation Decision Basis: this plan required direct reconciliation between the locked requirements, the locked AS-IS artifact, the current runtime-ui source surfaces, and the repo's recursive-mode rules rather than delegated implementation
- Audit Inputs Provided:
  - `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
  - `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-worktree.md`
  - `/.recursive/run/48-runtime-ui-design-system-apple-theme/01-as-is.md`
  - diff basis from `00-worktree.md`: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
  - targeted code/doc references:
    - `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
    - `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
    - `/role-model-router/apps/runtime-ui/app/app.css`
    - `/role-model-router/apps/runtime-ui/app/root.tsx`
    - `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
    - `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
    - `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
    - `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
    - `/.recursive/STATE.md`
    - `/.recursive/DECISIONS.md`
    - `/docs/architecture/06-router-runtime-architecture-lock.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Comparison reference: `working-tree`
- Normalized baseline: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Planned or claimed changed files:
  - `/.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
  - `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
  - `/role-model-router/apps/runtime-ui/app/app.css`
  - `/role-model-router/apps/runtime-ui/app/root.tsx`
  - `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
  - `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
  - `/role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx` if introduced
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/theme.ts` if introduced
  - `/role-model-router/apps/runtime-ui/app/lib/theme.test.ts` if introduced
  - `/role-model-router/apps/runtime-ui/package.json` if the focused runtime-ui test script must include new theme tests
  - bounded route cleanup targets currently carrying local square/legacy styling overrides:
    - `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/local-swap.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/local-policy.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/local-logs.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
- Actual changed files reviewed:
  - branch-local recursive artifacts under `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
  - copied reference file `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
  - generated Python cache drift under `/.agents/skills/recursive-mode/scripts/__pycache__/` from local lock-script execution
- Unexplained drift: none for planning scope; the generated `__pycache__` change is acknowledged as tool-generated residue and is not part of the intended product diff

## Planned Changes by File

| File | SP | Change summary |
| --- | --- | --- |
| `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | SP48-A | replace Swiss authority language, document Apple-inspired token/typography/theme-toggle/status-pill contract |
| `role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md` | baseline input | keep as original inspiration artifact referenced by the active design system |
| `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | SP48-A, SP48-C | update route-facing theme metadata, shared theme exports, shell/control class contracts |
| `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | SP48-A, SP48-B, SP48-C | replace Swiss-era assertions with Apple-theme tokens, bootstrap, theme toggle, and transparent-pill guards |
| `role-model-router/apps/runtime-ui/app/lib/theme.ts` | SP48-B | add deterministic theme-state helpers for storage, system-default resolution, and browser-chrome values |
| `role-model-router/apps/runtime-ui/app/lib/theme.test.ts` | SP48-B | RED/GREEN theme-state helper coverage |
| `role-model-router/apps/runtime-ui/package.json` | SP48-B | include any new theme-focused test file in the focused runtime-ui test script if needed |
| `role-model-router/apps/runtime-ui/app/root.tsx` | SP48-B | remove IBM Plex bootstrap, add deterministic root theme bootstrap and theme-color sync contract |
| `role-model-router/apps/runtime-ui/app/app.css` | SP48-B | replace token values, typography stacks, theme selectors, and global shell/body styling |
| `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx` | SP48-C | optional new shared global toggle primitive with `Light` and `Dark` only |
| `role-model-router/apps/runtime-ui/app/components/app-shell.tsx` | SP48-C | integrate global theme toggle and update shell/nav chrome styling |
| `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx` | SP48-C | update cards/facts/status pills to new surface grammar and transparent semantic pills |
| route files listed in diff audit | SP48-D | replace remaining local square/stone overrides with shared token/control classes while preserving layout architecture |
| `docs/architecture/06-router-runtime-architecture-lock.md` | SP48-A | remove Swiss-authority language where it conflicts with the runtime UI's active design-system authority |

## Implementation Steps

1. Complete SP48-A and establish the new design-system contract plus failing regression expectations before changing runtime bootstrap code.
2. Complete SP48-B by introducing failing theme-state/bootstrap tests, then implement deterministic root theming and token replacement until green.
3. Complete SP48-C by introducing failing shared-chrome/pill assertions, then update shared shell/primitives and add the global theme toggle until green.
4. Complete SP48-D with a bounded route sweep only where local classes bypass the shared system; keep route topology intact.
5. Run SP48-E focused verification, package the runtime, and perform browser QA against the rebuilt operator surface.
6. After implementation/testing/manual QA are locked, satisfy the control-plane portions of `R1` in Phases 6 and 7 by updating `/.recursive/DECISIONS.md` and `/.recursive/STATE.md`.

## Implementation Sub-phases

### SP48-A — Contract and regression reset (`R0`, `R1`, `R3`, `R4`, `R9`, `R11`)

Scope and purpose:
At the end of SP48-A, the runtime UI will have a locked implementation contract for the Apple-inspired theme direction before any runtime styling code changes land. The design-system document, theme metadata exports, architecture language, and regression expectations will all point at the new authority and token/typography rules instead of the Swiss baseline.

Implementation checklist:
- [ ] Update `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` to replace Swiss-authority language with the Apple-reference authority and the approved token/typography/theme-toggle/status-pill rules
- [ ] Update `docs/architecture/06-router-runtime-architecture-lock.md` only where it still implies Swiss authority for runtime UI styling
- [ ] Update `role-model-router/apps/runtime-ui/app/lib/design-system.ts` where route-facing theme copy or shared exports must reflect the new contract
- [ ] Change `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` first so it fails on the old Swiss-era contract and asserts the new Apple-theme documentation/bootstrap expectations

Tests for this sub-phase:
- Tier A:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts`
- Tier B for SP48-A completion:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test`
- Playwright scope:
  - no Playwright changes in this sub-phase
- Pass criteria:
  - the targeted `design-system.test.ts` run goes RED first against the old contract, then passes after contract/test alignment
  - the focused runtime-ui package test command remains green after the contract reset

Sub-phase acceptance:
- `DESIGN_SYSTEM.md` references `DESIGN_APPLE_REFERENCE.md` as the styling inspiration baseline
- active regression tests stop naming Swiss palette/IBM Plex/zero-radius runtime chrome as the intended baseline
- no runtime styling code outside shared contract/test surfaces has changed yet

Rollback / recovery notes:
- If contract language starts implying layout/IA redesign, stop and narrow the doc/test changes before SP48-B begins

### SP48-B — Theme state, bootstrap, and token migration (`R2`, `R3`, `R4`, `R6`, `R9`, `R11`)

Scope and purpose:
At the end of SP48-B, the runtime UI will have a deterministic light/dark theme system with the approved font stacks and exact token values. The app will still use the same route architecture, but root bootstrap and global CSS will now be driven by persistent theme state rather than only `prefers-color-scheme`.

Implementation checklist:
- [ ] Add `role-model-router/apps/runtime-ui/app/lib/theme.ts` for theme storage key, persisted-theme parsing, initial theme resolution, and active theme-color helpers
- [ ] Add `role-model-router/apps/runtime-ui/app/lib/theme.test.ts` and make it fail before implementation
- [ ] Update `role-model-router/apps/runtime-ui/package.json` if the focused runtime-ui test script must include `app/lib/theme.test.ts`
- [ ] Update `role-model-router/apps/runtime-ui/app/root.tsx` to remove IBM Plex bootstrap, add deterministic root theme bootstrap, and align browser-chrome theme metadata with active `Light` / `Dark`
- [ ] Update `role-model-router/apps/runtime-ui/app/app.css` to replace Swiss-era token values with the approved light/dark token contract, typography stacks, and root `data-theme` selectors
- [ ] Keep theme application rooted in one deterministic mechanism (`data-theme` or equivalent), not per-component branching

Tests for this sub-phase:
- Tier A:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui exec vitest run app/lib/theme.test.ts app/lib/design-system.test.ts`
- Tier B for SP48-B completion:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui build`
- Playwright scope:
  - no repo-local Playwright suite exists for this surface; browser automation remains an explicit later-phase exception with manual QA mitigation
- Pass criteria:
  - the new theme-helper test fails before implementation, then passes
  - the global runtime-ui test suite and build both pass with the new token/bootstrap layer active

Sub-phase acceptance:
- fresh sessions still follow system preference before any explicit operator choice
- after explicit choice, the root theme state can persist and override later system changes
- the runtime UI no longer imports IBM Plex Sans as the default display/body bootstrap font

Rollback / recovery notes:
- If root bootstrap causes hydration or flash-of-theme issues, keep the failing test evidence and add the smallest pre-hydration bootstrap needed rather than pushing theme logic down into individual routes

### SP48-C — Shared shell, controls, and transparent semantic pills (`R2`, `R5`, `R6`, `R7`, `R9`, `R11`)

Scope and purpose:
At the end of SP48-C, the shared runtime UI chrome will visually read as the new system: rounded shell/panel/control surfaces, normalized button/input grammar, a global `Light` / `Dark` toggle, and transparent semantic pills. Shared primitives will now carry most of the rollout load before any route-specific cleanup.

Implementation checklist:
- [ ] Add `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx` if a dedicated shared toggle component keeps shell logic cleaner
- [ ] Update `role-model-router/apps/runtime-ui/app/components/app-shell.tsx` to integrate the global theme toggle and the new shell/nav chrome styling
- [ ] Update `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx` to remove `rounded-none` defaults and make semantic pills use transparent backgrounds with semantic border/text only
- [ ] Update `role-model-router/apps/runtime-ui/app/lib/design-system.ts` shared class exports so cards, panels, fields, buttons, payload blocks, and action rows all follow the approved Apple-theme control grammar
- [ ] Extend `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` so the failing expectations explicitly catch:
  - missing global theme toggle ownership
  - Swiss-era square shell/control defaults
  - semantic pill background fills

Tests for this sub-phase:
- Tier A:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts app/lib/theme.test.ts`
- Tier B for SP48-C completion:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui build`
- Playwright scope:
  - not applicable in-repo; use later browser QA against the rebuilt runtime
- Pass criteria:
  - RED evidence shows the old shell/pill contract failing before production edits
  - shared runtime-ui tests and build pass after shell/primitives are restyled

Sub-phase acceptance:
- the global shell exposes only `Light` and `Dark`
- status pills for `healthy`, `degraded`, and `offline` no longer use tinted semantic backgrounds
- shared controls read as one coherent system without route-local special cases

Rollback / recovery notes:
- If a route depends on legacy square classes to stay functional, preserve behavior first and move only the minimum required local cleanup into SP48-D

### SP48-D — Bounded route adoption without architectural redesign (`R0`, `R5`, `R8`, `R9`, `R11`)

Scope and purpose:
At the end of SP48-D, Overview and additional runtime routes will visibly inherit the new design system without changing route hierarchy or information architecture. This phase is only for bounded local cleanup where existing route files still hard-code square/stone-era styling that shared primitives cannot override on their own.

Implementation checklist:
- [ ] Update `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx` so the `/app` overview page fully reflects the new shared shell/primitives and transparent status-pill styling
- [ ] Update `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` as the first non-Overview dense inspector route to prove the new design system works beyond the dashboard
- [ ] Sweep route files that currently carry local `rounded-none` or legacy surface overrides and replace only the bounded styling seams that bypass shared classes:
  - `control-controller.tsx`
  - `control-models.tsx`
  - `control-roles.tsx`
  - `providers.tsx`
  - `local-swap.tsx`
  - `local-policy.tsx`
  - `local-logs.tsx`
  - `control-benchmark.tsx`
- [ ] Keep route structure, navigation hierarchy, and operator workflows intact; no route-family redesign is allowed in this phase

Tests for this sub-phase:
- Tier A:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts app/lib/theme.test.ts`
- Tier B for SP48-D completion:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui build`
- Playwright scope:
  - not applicable in-repo; browser QA in SP48-E must prove Overview plus at least one additional route
- Pass criteria:
  - the full focused runtime-ui suite and build remain green
  - Overview and at least one additional route outside Overview visibly consume the new shared system

Sub-phase acceptance:
- the rollout is clearly broader than a dashboard-only restyle
- layout and route architecture remain recognizably the same product
- any remaining route-specific edits are visual cleanup only

Rollback / recovery notes:
- If a route sweep starts turning into architecture churn, stop and defer the non-essential cleanup rather than violating `R8`

### SP48-E — Verification, packaging, and rebuilt-runtime browser QA (`R2`, `R5`, `R7`, `R10`, `R11`)

Scope and purpose:
At the end of SP48-E, the run will have automated proof, packaged-runtime proof, and browser evidence on the rebuilt operator surface. This phase validates that the theme system, shared styling, and transparent pills behave correctly under the real runtime UI deployment path rather than only a package-local build.

Implementation checklist:
- [ ] Re-run the full focused runtime-ui test suite after the final SP48-D diff
- [ ] Re-run the runtime-ui build
- [ ] Run `corepack pnpm run runtime:package-sea` from the worktree root to rebuild the packaged runtime surface used by operators
- [ ] If the command is practical in-session, run `corepack pnpm run runtime:validate-ui` as supplemental proof; if it repeats the known timeout behavior, record that explicitly without replacing the required browser QA
- [ ] Start the rebuilt operator surface on the real runtime path expected by prior runtime UI validation (`http://127.0.0.1:3456`) and use it for browser QA
- [ ] Capture screenshots/logs for:
  - Overview in light mode
  - Overview in dark mode
  - theme toggle switching between `Light` and `Dark`
  - persisted theme after reload
  - transparent status pills
  - at least one additional non-Overview route

Tests for this sub-phase:
- Tier A:
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui build`
- Tier B:
  - `corepack pnpm run runtime:package-sea`
  - `corepack pnpm run runtime:validate-ui` when it completes inside session constraints; otherwise document the timeout and rely on packaged-runtime browser QA plus focused automated proof
- Playwright scope:
  - exception for this run: no repo-local Playwright harness was found for the runtime UI surface during Phase 2 planning
  - mitigation: strict Vitest RED/GREEN coverage, runtime-ui build proof, packaged-runtime verification on `:3456`, and agent-operated browser QA with evidence capture
- Pass criteria:
  - focused runtime-ui tests and build pass
  - packaging completes
  - browser QA on the rebuilt runtime proves theme toggle behavior, persistence, transparent pills, and rollout beyond Overview

Sub-phase acceptance:
- the user can inspect the updated frontend in a browser after Phase 5 evidence is collected
- no validation claim relies only on source inspection or a dev-only preview

Rollback / recovery notes:
- If packaged-runtime verification fails while focused tests are green, treat it as a blocking host-path regression and resolve it before closing the run

## TDD Plan

TDD Mode: `strict`

Policy:

- Documentation-only contract updates in `DESIGN_SYSTEM.md` and the architecture doc may precede production TypeScript/CSS changes.
- Every production-code change after that point must be preceded by failing automated evidence at the closest relevant layer.
- No styling/bootstrap production code lands without first observing RED on the current Swiss-era behavior.

### Planned RED/GREEN evidence paths

| Slice | RED log | GREEN log |
| --- | --- | --- |
| SP48-A contract reset | `evidence/logs/sp48-a-contract.red.log` | `evidence/logs/sp48-a-contract.green.log` |
| SP48-B theme state/bootstrap | `evidence/logs/sp48-b-theme-bootstrap.red.log` | `evidence/logs/sp48-b-theme-bootstrap.green.log` |
| SP48-C shell and pills | `evidence/logs/sp48-c-shell-pills.red.log` | `evidence/logs/sp48-c-shell-pills.green.log` |
| SP48-D bounded route adoption | `evidence/logs/sp48-d-route-rollout.red.log` | `evidence/logs/sp48-d-route-rollout.green.log` |
| SP48-E packaging and rebuilt-runtime QA | `evidence/logs/sp48-e-packaging-qa.log` | `evidence/logs/sp48-e-packaging-qa.green.log` |

## Testing Strategy

New behavior tests to add:

- `role-model-router/apps/runtime-ui/app/lib/theme.test.ts`
  - persisted theme parsing
  - system-default fallback logic
  - theme-color helper behavior
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - Apple-reference authority assertions
  - exact token/bootstrap assertions
  - transparent semantic status-pill assertions
  - global `Light` / `Dark` toggle ownership assertions

Regression-first tests that must fail on current behavior:

- old Swiss-era `design-system.test.ts` assumptions must be replaced with new Apple-theme expectations and observed failing before implementation
- `theme.test.ts` must fail before the new theme helper/bootstrap code exists
- transparent-pill assertions must fail before `page-primitives.tsx` is updated

Non-regression guardrail tests:

- continue running the full focused runtime-ui test suite so existing route metadata, telemetry helpers, provider-account flows, router candidate labels, and benchmark helpers remain green

Exact test file paths and exact commands:

```powershell
cd D:\DEV\role-model\.worktrees\48-runtime-ui-design-system-apple-theme
corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts
corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui exec vitest run app/lib/theme.test.ts app/lib/design-system.test.ts
corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test
corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui build
corepack pnpm run runtime:package-sea
corepack pnpm run runtime:validate-ui
```

Expected pass criteria:

- Tier A commands must go RED before the corresponding production slice and then GREEN before advancing to the next sub-phase
- Tier B focused runtime-ui suite and build must remain green at every sub-phase boundary where they are listed
- packaged-runtime browser QA is mandatory even if all automated commands are green

## Playwright Plan (if applicable)

Playwright Plan status: `exception / not applicable for this run`

Reason:

- No repo-local Playwright harness or runtime-ui Playwright test files were found during Phase 2 planning.
- The runtime-ui package currently uses focused Vitest coverage, and this run's user requirement explicitly asks for rebuilt-runtime browser review after testing.

Planned Playwright files modified:

- none

Tagging strategy:

- no Playwright tests are introduced in the base plan
- if a later implementation addendum introduces Playwright coverage, it must add `@recursive:48-runtime-ui-design-system-apple-theme` and the relevant `@spk` tags before Phase 4 lock

Tier A / Tier B substitute strategy:

- Tier A: sub-phase-specific Vitest commands listed above
- Tier B: full focused runtime-ui suite, runtime-ui build, runtime packaging, and rebuilt-runtime browser QA on `http://127.0.0.1:3456`

App start / base URL for end-to-end verification:

- packaging command: `corepack pnpm run runtime:package-sea`
- verification surface: rebuilt runtime on `http://127.0.0.1:3456`
- exact launched packaged-runtime command/path must be recorded in Phase 5 execution metadata once the rebuilt artifact is produced

Selector strategy:

- agent-operated browser QA uses stable route URLs and the shared shell toggle/control surfaces
- if browser automation is later added, prefer `data-testid` or similarly stable selectors and record the exact additions in an upstream-gap addendum

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

All scenarios must run against the rebuilt operator surface, not only a package-local build:

1. **Overview light mode** — open `/app` and verify the updated Apple-inspired shell, typography, surfaces, and transparent status pills in light mode
2. **Overview dark mode** — switch to dark mode and verify the same page uses the approved dark tokens and remains legible
3. **Theme toggle behavior** — confirm the global theme toggle exposes only `Light` and `Dark`
4. **Theme persistence** — choose one theme, reload the page, and verify the theme remains selected
5. **System-default bootstrap** — clear persisted preference, reload under the current device preference, and verify the initial theme follows system preference before explicit choice
6. **Transparent semantic pills** — verify `healthy`, `degraded`, and `offline` style pills use semantic text/border with no semantic background tint
7. **Additional route rollout** — open at least one non-Overview route such as request detail or providers and verify the shared design-system rollout is visible there too

## Idempotence and Recovery

- If SP48-B theme bootstrap introduces hydration drift or meta-theme mismatch, keep the failing tests, repair the root bootstrap, and do not continue to SP48-C until the theme contract is stable.
- If SP48-C reveals a route depends on a local square override for readability or function, defer only that narrow route cleanup to SP48-D instead of weakening shared primitives.
- If SP48-D starts expanding into architecture work, stop and keep the route edit bounded to styling adoption.
- If SP48-E packaging or rebuilt-runtime verification fails while focused tests are green, treat that as a real regression and repair it before closing the run.

## Risks And Controls

| Risk | Control |
| --- | --- |
| The run becomes a dashboard-only cosmetic pass | SP48-D explicitly requires Overview plus at least one additional route and favors shared primitives over page-only polish |
| Theme state becomes inconsistent between bootstrap, shell state, and browser chrome | SP48-B centralizes theme resolution in a shared helper and root bootstrap contract |
| Swiss-era assumptions remain hidden in docs/tests/control-plane text | SP48-A plus later Phase 6/7 closeout explicitly own those surfaces |
| Transparent pills regress into tinted semantic fills later | SP48-C adds regression assertions for semantic pill styling |
| Browser QA is skipped because unit tests pass | SP48-E makes rebuilt-runtime browser QA a hard requirement |

## Traceability

| R# | Planned sub-phase | Verification |
| --- | --- | --- |
| R0 | SP48-A through SP48-D | ordered diff plus sub-phase execution discipline |
| R1 | SP48-A, Phase 6, Phase 7 | design-system/doc/test changes plus control-plane artifact updates |
| R2 | SP48-B, SP48-C, SP48-E | theme tests, build proof, browser QA |
| R3 | SP48-A, SP48-B | docs/test token assertions plus CSS/root bootstrap |
| R4 | SP48-A, SP48-B | typography assertions plus root/app CSS updates |
| R5 | SP48-C, SP48-D, SP48-E | shared shell/primitives, route rollout, browser QA |
| R6 | SP48-B, SP48-C | theme helpers, shell toggle, shared controls |
| R7 | SP48-C, SP48-E | transparent-pill assertions plus browser verification |
| R8 | SP48-D | bounded route sweep with architecture preserved |
| R9 | SP48-A, SP48-B, SP48-C | docs/metadata/tests/theme helpers move together |
| R10 | SP48-E | automated proof plus rebuilt-runtime browser evidence |
| R11 | all sub-phases | RED/GREEN evidence logs and phased execution |

## Subagent Contribution Verification

- Reviewed Action Records: none; no delegated subagent actions contributed to this artifact
- Main-Agent Verification Performed: compared the locked requirements and locked AS-IS artifact against the current runtime-ui theme/bootstrap surfaces and the recursive-mode phase rules
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: added explicit file-by-file sub-phase scope, TDD evidence paths, and the no-Playwright exception mitigation

## Requirement Completion Status

- `R0 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md, /role-model-router/apps/runtime-ui/app/lib/design-system.ts, /role-model-router/apps/runtime-ui/app/lib/design-system.test.ts, /role-model-router/apps/runtime-ui/app/app.css, /role-model-router/apps/runtime-ui/app/components/app-shell.tsx, /role-model-router/apps/runtime-ui/app/routes/dashboard.tsx | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R1 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md, /role-model-router/apps/runtime-ui/app/lib/design-system.test.ts, /role-model-router/apps/runtime-ui/app/root.tsx, /docs/architecture/06-router-runtime-architecture-lock.md | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md | Verification Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/06-decisions-update.md, /.recursive/run/48-runtime-ui-design-system-apple-theme/07-state-update.md`
- `R2 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/app/lib/theme.ts, /role-model-router/apps/runtime-ui/app/lib/theme.test.ts, /role-model-router/apps/runtime-ui/app/root.tsx, /role-model-router/apps/runtime-ui/app/app.css, /role-model-router/apps/runtime-ui/app/components/app-shell.tsx | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R3 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md, /role-model-router/apps/runtime-ui/app/app.css, /role-model-router/apps/runtime-ui/app/lib/design-system.test.ts | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R4 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md, /role-model-router/apps/runtime-ui/app/root.tsx, /role-model-router/apps/runtime-ui/app/app.css, /role-model-router/apps/runtime-ui/app/lib/design-system.test.ts | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R5 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/app/components/app-shell.tsx, /role-model-router/apps/runtime-ui/app/components/page-primitives.tsx, /role-model-router/apps/runtime-ui/app/lib/design-system.ts, /role-model-router/apps/runtime-ui/app/routes/dashboard.tsx, /role-model-router/apps/runtime-ui/app/routes/request-detail.tsx | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R6 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/app/lib/theme.ts, /role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx, /role-model-router/apps/runtime-ui/app/components/app-shell.tsx, /role-model-router/apps/runtime-ui/app/lib/design-system.ts | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R7 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md, /role-model-router/apps/runtime-ui/app/components/page-primitives.tsx, /role-model-router/apps/runtime-ui/app/lib/design-system.test.ts | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R8 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/app/routes/dashboard.tsx, /role-model-router/apps/runtime-ui/app/routes/request-detail.tsx, /role-model-router/apps/runtime-ui/app/routes/control-controller.tsx, /role-model-router/apps/runtime-ui/app/routes/control-models.tsx, /role-model-router/apps/runtime-ui/app/routes/providers.tsx | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R9 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md, /role-model-router/apps/runtime-ui/app/lib/design-system.ts, /role-model-router/apps/runtime-ui/app/lib/design-system.test.ts, /role-model-router/apps/runtime-ui/app/lib/theme.ts, /role-model-router/apps/runtime-ui/app/lib/theme.test.ts | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R10 | Status: planned | Changed Files: /role-model-router/apps/runtime-ui/package.json, /.recursive/run/48-runtime-ui-design-system-apple-theme/04-test-summary.md, /.recursive/run/48-runtime-ui-design-system-apple-theme/05-manual-qa.md | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `R11 | Status: planned | Changed Files: /.recursive/run/48-runtime-ui-design-system-apple-theme/03-implementation-summary.md, /.recursive/run/48-runtime-ui-design-system-apple-theme/04-test-summary.md, /role-model-router/apps/runtime-ui/app/lib/design-system.test.ts, /role-model-router/apps/runtime-ui/app/lib/theme.test.ts | Implementation Evidence: /.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every in-scope requirement is mapped to at least one bounded sub-phase
- [x] Design-system-first ordering is explicit before route cleanup
- [x] Strict TDD evidence expectations are explicit for production-code changes
- [x] Focused test/build/package/browser verification is explicit
- [x] The no-Playwright exception is explicit and paired with concrete mitigation

Coverage: PASS

## Approval Gate

- [x] The plan is bounded to theme/styling/system work rather than route-architecture redesign
- [x] The plan can be executed sequentially per sub-phase with concrete test commands
- [x] The plan preserves the required rebuilt-runtime browser QA gate
- [x] No unexplained planning-scope drift remains

Approval: PASS
