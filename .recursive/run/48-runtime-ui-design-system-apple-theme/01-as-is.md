Run: `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
Phase: `01 AS-IS Analysis`
Status: `LOCKED`
LockedAt: `2026-06-16T17:45:02Z`
LockHash: `f4c9ab0bd7d5acc7a0ed5c68cbdcddfcb6d3a3d023674695fc198579c1b8947c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/root.tsx`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/.agents/skills/design-dna/SKILL.md`
- `C:/Users/erikb/.agents/skills/ui-design-system/SKILL.md`
Outputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/01-as-is.md`
Scope note: This phase captures the current runtime UI design-system baseline before implementation. The goal is to document existing Swiss-era authority language, token/bootstrap behavior, primitive styling, and verification gaps relative to the approved Apple-inspired light/dark contract.

## TODO

- [x] Re-read locked requirements and worktree baseline
- [x] Inventory current design-system documentation, token layer, shell, and primitives
- [x] Identify all current Swiss-era authority references covered by the requirement
- [x] Record current theme bootstrap behavior and missing persisted toggle behavior
- [x] Record current status-pill behavior against the transparent-pill rule
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: R0-R11, including exact light/dark token values, typography contract, transparent status-pill rule, and strict TDD.
- `00-worktree.md`: isolated worktree on `recursive/48-runtime-ui-design-system-apple-theme`, baseline commit `a9162d5907019f9270510bdbcd947b0bd283bbfe`, green `runtime-ui` test/build floor.
- `design-dna` skill: this run is a design-system restyle, so the relevant DNA dimensions are tokenized design system values plus qualitative styling invariants; no visual-effects layer is in scope.
- `ui-design-system` skill: theming should live in a deterministic shared token/bootstrap layer, with dark-mode state and global controls owned by the shared shell rather than per-route ad hoc styling.

## AS-IS Summary

The runtime UI is still materially aligned with the prior Swiss-style baseline:

1. **Authority language is still Swiss-oriented.** `DESIGN_SYSTEM.md` explicitly says the runtime UI uses the Swiss-design baseline, and repo-level history/architecture docs still contain Swiss-era styling references.
2. **Theme bootstrap is still media-query-driven.** `app.css` defines light tokens under `:root` and dark tokens only inside `@media (prefers-color-scheme: dark)`. `root.tsx` sets `theme-color` meta tags purely by `prefers-color-scheme`.
3. **Typography is still IBM Plex-first.** `root.tsx` imports Google-hosted IBM Plex Sans/Mono, and `app.css` boots IBM Plex Sans as the default body/display stack.
4. **Shared primitives are still rectilinear and Swiss-dense.** `rounded-none`, zero-radius tokens, and stone-era palette/shadow defaults still define the shell, cards, fields, buttons, and status pills.
5. **Status pills violate the approved transparent-pill rule.** `StatusPill` still uses tinted backgrounds for `accent`, `warning`, and `success`.
6. **No persisted two-mode theme control exists yet.** There is no global `Light` / `Dark` toggle, no persisted operator preference, and no root-level deterministic theme attribute/class contract.

## Source Requirement Inventory

| R# | Disposition | AS-IS summary |
| --- | --- | --- |
| R0 | partial | The repo already has a design-system contract surface, but the current implementation is drifted and nothing yet enforces the Apple-theme sequencing for this run. |
| R1 | gap | Swiss authority remains in runtime UI docs/tests and repo-level history/architecture references. |
| R2 | gap | The app has only `prefers-color-scheme` behavior; no global `Light` / `Dark` toggle or persisted override exists. |
| R3 | gap | Current semantic tokens use the prior stone/cobalt baseline, zero-radius shell values, and different shell width/shadow values than the approved Apple contract. |
| R4 | gap | Runtime UI bootstrap still imports and defaults to IBM Plex Sans instead of the approved `SF Pro` / `Inter` stack and typography scale. |
| R5 | gap | Shell, panels, and controls still read as Swiss-style rectilinear chrome instead of restrained rounded Apple-inspired surfaces. |
| R6 | gap | Shared controls are inconsistent with the new contract and there is no global theme-toggle affordance. |
| R7 | gap | Shared status pills still use semantic background fills instead of transparent backgrounds. |
| R8 | partial | Route architecture is already in the right place and does not need redesign, but shared styling has not yet been propagated to fulfill the new system. |
| R9 | gap | `DESIGN_SYSTEM.md`, `design-system.ts`, and `design-system.test.ts` still encode the old visual baseline. |
| R10 | gap | Phase 0 established focused test/build baselines, but there is no post-change rebuilt-runtime browser proof yet. |
| R11 | gap | Strict TDD is now required for implementation, but no Apple-theme RED evidence exists yet because implementation has not started. |

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\.worktrees\48-runtime-ui-design-system-apple-theme`
2. Open `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
   - note the intro says the runtime UI uses the Swiss-design baseline
   - note the core rules require no rounded structural elements and IBM Plex typography
3. Open `role-model-router/apps/runtime-ui/app/app.css`
   - note the light theme tokens live in `:root`
   - note dark values are only applied in `@media (prefers-color-scheme: dark)`
   - note zero-radius tokens and IBM Plex Sans default body typography
4. Open `role-model-router/apps/runtime-ui/app/root.tsx`
   - note Google Fonts IBM Plex import
   - note `theme-color` meta tags are tied to `prefers-color-scheme`
5. Open `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
   - note `StatusPill` uses background fills for semantic tones
   - note the pill itself is `rounded-none`
6. Open `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
   - note primary and secondary nav links are `rounded-none` and there is no theme toggle
7. Open `role-model-router/apps/runtime-ui/app/lib/design-system.ts` and `design-system.test.ts`
   - note zero-radius theme tokens, `1480px` shell width, Swiss-era class contracts, and Swiss-specific regression assertions
8. Run `corepack pnpm --filter @role-model-router/runtime-ui test`
   - expect the focused baseline to pass before any implementation work

## Current Behavior by Requirement

### `R0` Enforce design-system-first implementation order

- The runtime UI already centralizes route metadata and shared class contracts in `design-system.ts`.
- The repo also has a dedicated runtime UI design-system document.
- **Gap:** the current contract is still the old one, and there is no Apple-theme RED/GREEN sequence yet.

### `R1` Replace Swiss authority with Apple-reference authority

- `DESIGN_SYSTEM.md:5` says the runtime UI "uses the Swiss-design baseline".
- `DESIGN_SYSTEM.md` also encodes Swiss-specific core rules and token descriptions, including IBM Plex-first typography and zero-radius structure.
- `design-system.test.ts:677` still contains a test named around "swiss stone palette, ibm plex typography, and dual-scheme browser contract".
- `.recursive/DECISIONS.md:491` records Swiss design-system compliance as the shipped styling receipt for a prior run.
- `.recursive/STATE.md:137` still says the Local runtime UI pages shipped with the Swiss design system.
- `docs/architecture/06-router-runtime-architecture-lock.md:122` still references Swiss styling guidance.
- **Gap:** authoritative styling language has not been migrated to the Apple reference.

### `R2` Provide exact Light and Dark themes with persisted toggle behavior

- `app.css` only supports theme switching through `@media (prefers-color-scheme: dark)`.
- `root.tsx:33-35` sets `color-scheme` and light/dark `theme-color` meta tags via media queries.
- No shared theme provider, root `data-theme`, root theme class, or persisted preference storage exists in the current runtime UI shell.
- `app-shell.tsx` exposes no global theme toggle.
- **Gap:** there is no deterministic two-mode operator theme system yet.

### `R3` Replace the current theme tokens with the approved Apple-theme token contract

- `app.css:4-35` still defines the old light tokens:
  - `--rm-bg: #fafaf9`
  - `--rm-surface: #f5f5f4`
  - `--rm-panel: #e7e5e4`
  - `--rm-accent: #003b8e`
  - `--rm-shell-width: 1480px`
  - zero-radius shell/panel/field tokens
- `app.css:40-66` still defines the old dark token values under media-query control.
- `design-system.ts:595` still exports `maxContentWidth: "1480px"`.
- `design-system.test.ts:366-400` still asserts the prior radii and color contracts.
- **Gap:** the canonical token layer still matches the previous stone/cobalt runtime baseline, not the approved Apple contract.

### `R4` Apply the approved typography contract

- `root.tsx:14-25` imports IBM Plex Sans and IBM Plex Mono from Google Fonts.
- `app.css:80` sets the default runtime UI font family to `"IBM Plex Sans", ... system-ui`.
- `app.css:92` uses IBM Plex Mono for monospace surfaces.
- `DESIGN_SYSTEM.md` documents IBM Plex Sans as the primary font and IBM Plex Mono as the mono font.
- Typography classes across shell/primitives still lean on the older light Swiss hierarchy (`font-light`, uppercase tracking, narrow monochrome rhythm) rather than the approved Apple scale.
- **Gap:** the runtime UI has not yet adopted the new `SF Pro` / `Inter` body/display stacks or the explicit typography scale contract.

### `R5` Reframe shell, panel, and control styling around restrained Apple-inspired surfaces

- `app-shell.tsx:14-27` renders primary and secondary nav items with `rounded-none`.
- `design-system.ts:673-703` defines `cardClassName`, `raisedPanelClassName`, `mutedPanelClassName`, field/button/payload classes, and callout classes all around `rounded-none` borders.
- `root.tsx:67` renders the error shell with `rounded-none`.
- Multiple route files still consume these shared rectilinear contracts directly.
- **Gap:** the visual language is still intentionally hard-edged rather than restrained rounded-shell styling.

### `R6` Normalize interactive control styling and theme-toggle affordance

- Shared field/button classes in `design-system.ts:681-688` still use the older control grammar:
  - square corners
  - accent background button
  - dense input/button padding
- `app-shell.tsx` has no global theme control.
- No shared theme-toggle primitive exists in the current route shell.
- **Gap:** there is no cohesive shared control system for the approved Apple-theme grammar.

### `R7` Status pills must use transparent backgrounds

- `page-primitives.tsx:88-95` maps:
  - `accent` -> accent border plus accent ghost background
  - `warning` -> warning border plus warning background
  - `success` -> success border plus success subtle background
  - `neutral` -> neutral border plus background fill
- `page-primitives.tsx:100` renders pills as `rounded-none`.
- `StatusPill` is reused across dashboard and control routes, so the current tinted-fill behavior is shared.
- **Gap:** semantic pills do not honor the transparent-background rule.

### `R8` Preserve layout and route architecture while updating styling broadly

- The route hierarchy, shell information architecture, and runtime route metadata are already established in `design-system.ts`.
- The user-approved scope does not require changing route topology, and nothing in the current codebase blocks a theme-first rollout through shared shell/primitives.
- **Gap:** the new look has not yet been propagated through those shared surfaces, so route consumers still display the legacy design language.

### `R9` Update design-system documentation, route metadata, and regression coverage together

- `DESIGN_SYSTEM.md` is still the old design contract.
- `design-system.ts` still exports legacy runtime theme tokens/classes.
- `design-system.test.ts` still protects the old palette/radius/bootstrap contract.
- **Gap:** docs, token source, and regression coverage are still aligned with the old baseline and must be updated together.

### `R10` Verification must include build/test proof and rebuilt-runtime browser proof

- Phase 0 already established:
  - `corepack pnpm install --frozen-lockfile` -> PASS
  - `corepack pnpm --filter @role-model-router/runtime-ui test` -> PASS (`126` tests)
  - `corepack pnpm --filter @role-model-router/runtime-ui build` -> PASS
- `runtime:validate-ui` was attempted during Phase 0 but timed out and was explicitly not adopted as the clean baseline for this run.
- **Gap:** no rebuilt-runtime browser verification exists yet for light mode, dark mode, theme toggle persistence, transparent pills, or second-route rollout.

### `R11` Implementation must follow strict TDD

- The run requirement now explicitly requires strict TDD.
- The current repo contains runtime-ui test coverage, but none of the required Apple-theme behavior has been driven RED first in this run yet.
- **Gap:** implementation has not started, so the first next-phase obligation is to create failing tests before touching production code.

## Relevant Code Pointers

| Area | Path | Notes |
| --- | --- | --- |
| Runtime UI design authority | `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | still explicitly Swiss-oriented |
| Apple inspiration source | `role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md` | present in repo for the new authority baseline |
| Theme tokens and bootstrap CSS | `role-model-router/apps/runtime-ui/app/app.css` | media-query-driven theme values, IBM Plex-first typography |
| Document bootstrap | `role-model-router/apps/runtime-ui/app/root.tsx` | Google Fonts IBM Plex import, media-query `theme-color` tags |
| Shared shell chrome | `role-model-router/apps/runtime-ui/app/components/app-shell.tsx` | square nav chrome, no global theme toggle |
| Shared primitives | `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx` | square status pills with tinted backgrounds |
| Shared theme metadata + classes | `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | route metadata, theme values, shared class contracts |
| Regression coverage | `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | still asserts Swiss-era design contract |
| Repo UI authority history | `.recursive/STATE.md`, `.recursive/DECISIONS.md` | still describe prior Swiss runtime UI baseline |
| Architecture reference | `docs/architecture/06-router-runtime-architecture-lock.md` | still references Swiss styling guidance |

## Evidence

- Code readback:
  - `DESIGN_SYSTEM.md`
  - `DESIGN_APPLE_REFERENCE.md`
  - `app.css`
  - `root.tsx`
  - `app-shell.tsx`
  - `page-primitives.tsx`
  - `design-system.ts`
  - `design-system.test.ts`
  - `.recursive/STATE.md`
  - `.recursive/DECISIONS.md`
  - `docs/architecture/06-router-runtime-architecture-lock.md`
- Search inventory:
  - `rg -n "swiss|IBM Plex|rounded-none|prefers-color-scheme|theme-color|color-scheme" role-model-router/apps/runtime-ui`
  - `rg -n "swiss|Swiss|IBM Plex|authoritative|runtime UI" .recursive/DECISIONS.md .recursive/STATE.md docs/architecture/06-router-runtime-architecture-lock.md role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- Baseline verification from Phase 0:
  - `corepack pnpm --filter @role-model-router/runtime-ui test` -> PASS (`126` passing tests)
  - `corepack pnpm --filter @role-model-router/runtime-ui build` -> PASS

## Known Unknowns

- Whether the runtime UI already has an existing client-side persistence helper worth reusing for theme preference, or whether a small new root helper will be the cleanest option.
- Whether browser-chrome `theme-color` should be updated through server-rendered head state alone or paired with a lightweight client sync after theme toggles.
- Whether any route-level local styling overrides outside the currently audited primitives will need bounded cleanup once the shared classes change.

## Traceability

| R# | AS-IS gap recorded | Primary evidence |
| --- | --- | --- |
| R0 | no Apple-theme implementation sequence yet | requirements + current shared contract surfaces |
| R1 | Swiss authority remains in docs/tests/history | `DESIGN_SYSTEM.md`, `design-system.test.ts`, `.recursive/STATE.md`, `.recursive/DECISIONS.md`, architecture doc |
| R2 | no persisted `Light` / `Dark` toggle | `app.css`, `root.tsx`, `app-shell.tsx` |
| R3 | old tokens remain active | `app.css`, `design-system.ts`, `design-system.test.ts` |
| R4 | IBM Plex-first bootstrap remains active | `root.tsx`, `app.css`, `DESIGN_SYSTEM.md` |
| R5 | shell/primitives still use square Swiss styling | `app-shell.tsx`, `page-primitives.tsx`, `design-system.ts` |
| R6 | control grammar and theme-toggle affordance missing | `design-system.ts`, `app-shell.tsx` |
| R7 | status pills still use tinted backgrounds | `page-primitives.tsx` |
| R8 | layout baseline is acceptable; styling baseline is not | route metadata + user-approved scope |
| R9 | docs/metadata/tests still encode old contract | `DESIGN_SYSTEM.md`, `design-system.ts`, `design-system.test.ts` |
| R10 | no rebuilt-runtime browser proof yet | Phase 0 receipts only |
| R11 | no RED evidence yet | current run has not entered implementation |

## Subagent Capability Probe

- Subagent Availability: unavailable
- Delegation Decision Basis: self-audit only; the active tool surface for this run does not expose a callable recursive subagent workflow, and Phase 1 required direct source reading rather than delegated interpretation
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every in-scope requirement has an AS-IS disposition
- [x] Swiss-authority references are inventoried across runtime UI docs/tests and repo-level docs
- [x] Theme bootstrap, token, shell, primitive, and status-pill gaps are recorded
- [x] TDD and rebuilt-runtime browser verification gaps are recorded

Coverage: PASS

## Approval Gate

- [x] The artifact is sufficient to plan bounded implementation slices
- [x] No unresolved AS-IS unknown blocks Phase 2 planning

Approval: PASS
