Run: `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-16T17:04:44Z`
LockHash: `1dcff458e40c3fe3f0ec16e879d1c8bee97c4c92c893b041007913b537cd6b2d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/root.tsx`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `/.agents/skills/design-dna/SKILL.md`
- `/.agents/skills/ui-design-system/SKILL.md`
- User guidance captured in chat on 2026-06-16:
  - apply the Apple-inspired design system to the runtime UI theme/styling, not the app architecture
  - support both light mode and dark mode
  - theme toggle exposes only `Light` and `Dark`
  - system preference determines only the initial default theme before explicit user choice
  - status pills for `healthy` / `degraded` / `offline` must keep semantic text and border colors but use no tinted background
  - remove any claim that the Swiss design skill is authoritative for the UI
Outputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
Scope note: This run restyles the runtime UI design system around the Apple reference artifact already copied into the repo, while preserving existing route architecture, information architecture, and operator workflows. Theme, tokens, component styling, and shell polish are in scope; broad product restructuring is not.

## TODO

- [x] Create new recursive run scaffold
- [x] Audit the current runtime UI design-system implementation and Apple reference
- [x] Convert the approved proposal into stable `R#` requirements
- [x] Record exact light/dark token targets
- [x] Record theme-toggle behavior and status-pill styling constraints
- [x] Record design-system-first implementation order
- [x] Record out-of-scope boundaries
- [x] User approval of the requirement direction in chat
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| Chat guidance (2026-06-16) | Apple-inspired theme direction, light/dark scope, status-pill constraint, no Swiss authority |
| `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md` | authoritative inspiration for colors, typography feel, spacing, restraint, and surface treatment |
| `design-dna` skill audit | design DNA extraction, token translation, stylistic invariants, anti-drift constraints |
| `ui-design-system` skill audit | implementation boundaries for theme tokens, shell, primitives, and route-level design-system ownership |
| `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | current runtime UI contract and current Swiss-oriented authority language to be replaced |
| `app.css`, `design-system.ts`, `design-system.test.ts`, `app-shell.tsx`, `page-primitives.tsx`, `root.tsx` | current implementation surfaces that own theming, shell styling, primitives, and theme state |

## Design-System-First Rule

Frontend delivery for this run must follow this order:

1. `DESIGN_SYSTEM.md`
2. `design-system.ts`
3. `design-system.test.ts`
4. theme/bootstrap shell surfaces (`app.css`, `root.tsx`, `app-shell.tsx`, `page-primitives.tsx`, any shared theme-toggle primitive)
5. route files that consume the updated system

No route-level styling change may land ahead of the corresponding design-system contract and regression coverage for that same slice.

## Fixed Design Decisions

These are non-negotiable product/design decisions for this run:

1. The design inspiration for runtime UI styling is the Apple reference document copied into the repo as `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`.
2. The Apple reference is inspiration for theme tokens, typography, surface treatment, control styling, and overall restraint. It is not a mandate to copy Apple marketing layouts or change runtime UI information architecture.
3. The runtime UI exposes exactly two operator-selectable themes: `Light` and `Dark`.
4. The operator UI does not expose a third `System` theme option.
5. System preference may determine the initial theme only until the operator explicitly chooses `Light` or `Dark`.
6. After explicit operator choice, the chosen theme persists across reloads/restarts until changed again.
7. Status pills for semantic states such as `healthy`, `degraded`, and `offline` must use transparent backgrounds with semantic text and border colors only.
8. The design system must no longer claim that the Swiss design skill is authoritative for runtime UI styling.
9. `SF Pro Display` and `SF Pro Text` are the preferred fonts when available, with `Inter` as the first fallback, then Apple/system fallbacks.
10. Layout and route architecture are already acceptable and are not to be redesigned wholesale in this run.

## Requirements

### `R0` Enforce design-system-first implementation order

Description:
This run is a design-system refactor. The contract must be updated before implementation details.

Acceptance criteria:
- Phase 2 planning explicitly sequences work as `DESIGN_SYSTEM.md` -> `design-system.ts` -> `design-system.test.ts` -> shared theming/primitives -> route consumers
- Phase 3 evidence shows design-system contract/test updates landed before or alongside dependent route styling changes for each sub-slice
- No route file introduces Apple-theme styling, theme-toggle behavior, or token usage without matching design-system contract updates

### `R1` Replace Swiss authority with Apple-reference authority

Description:
The runtime UI design system must stop treating Swiss design guidance as authoritative and instead treat the repo-local Apple reference as the styling inspiration baseline for this run.

Acceptance criteria:
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` no longer states or implies that the Swiss design skill is authoritative for runtime UI styling
- `/.recursive/DECISIONS.md` and `/.recursive/STATE.md` no longer state or imply that Swiss design guidance is the authoritative UI source for current runtime UI work
- `/docs/architecture/06-router-runtime-architecture-lock.md` is updated if it currently states or implies Swiss authority for the runtime UI
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` no longer contains Swiss-authority test naming or Swiss-specific token/font assertions as the active runtime UI contract
- `/role-model-router/apps/runtime-ui/app/root.tsx` no longer boots IBM Plex as the default runtime UI font family and no longer encodes Swiss-era browser chrome colors as the authoritative theme baseline
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` references `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md` as the original styling inspiration for the active design-system refresh
- the replacement language clearly distinguishes styling/theme inspiration from application architecture ownership

### `R2` Provide exact Light and Dark themes with persisted toggle behavior

Description:
The runtime UI must support a complete light theme and dark theme implementation with explicit operator control.

Acceptance criteria:
- the runtime UI exposes exactly two operator-selectable theme modes: `Light` and `Dark`
- there is no operator-facing `System` mode in the theme toggle UI
- before any explicit operator choice has been saved, the initial theme follows the device/system preference
- once the operator chooses `Light` or `Dark`, that preference persists and overrides later system changes until the operator changes it again
- theme application is driven by a deterministic root state mechanism such as root data attributes or theme classes rather than ad hoc per-component branching
- `root.tsx` and any shared shell/theme bootstrap logic implement the persisted two-mode contract
- browser-chrome theme metadata such as `theme-color` is aligned with the active persisted `Light` / `Dark` selection instead of remaining tied only to `prefers-color-scheme`

### `R3` Replace the current theme tokens with the approved Apple-theme token contract

Description:
The current runtime UI token system must be re-based onto the following explicit light/dark token values.

Acceptance criteria:
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`, `app.css`, and any shared token source document and implement the following canonical tokens exactly unless a later approved addendum supersedes them

#### Surface and text tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-bg` | `#f5f5f7` | `#000000` |
| `--rm-surface` | `#ffffff` | `#272729` |
| `--rm-surface-strong` | `#ffffff` | `#2a2a2c` |
| `--rm-panel` | `#fafafc` | `#252527` |
| `--rm-fg` | `#1d1d1f` | `#ffffff` |
| `--rm-secondary` | `rgba(29, 29, 31, 0.72)` | `rgba(255, 255, 255, 0.72)` |
| `--rm-muted` | `rgba(29, 29, 31, 0.48)` | `rgba(255, 255, 255, 0.48)` |
| `--rm-border` | `#e0e0e0` | `rgba(255, 255, 255, 0.12)` |
| `--rm-border-strong` | `#d2d2d7` | `rgba(255, 255, 255, 0.18)` |

#### Accent tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-accent` | `#0066cc` | `#0066cc` |
| `--rm-accent-focus` | `#0071e3` | `#0071e3` |
| `--rm-accent-on-dark` | `#2997ff` | `#2997ff` |
| `--rm-accent-muted` | `rgba(0, 102, 204, 0.72)` | `rgba(0, 102, 204, 0.72)` |
| `--rm-accent-subtle` | `rgba(0, 102, 204, 0.14)` | `rgba(41, 151, 255, 0.18)` |
| `--rm-accent-ghost` | `rgba(0, 102, 204, 0.08)` | `rgba(41, 151, 255, 0.10)` |

#### Semantic status tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-success` | `#166534` | `#86efac` |
| `--rm-success-muted` | `rgba(22, 101, 52, 0.72)` | `rgba(134, 239, 172, 0.72)` |
| `--rm-success-subtle` | `rgba(22, 101, 52, 0.14)` | `rgba(134, 239, 172, 0.18)` |
| `--rm-warning` | `#b45309` | `#fbbf24` |
| `--rm-warning-muted` | `rgba(180, 83, 9, 0.72)` | `rgba(251, 191, 36, 0.72)` |
| `--rm-warning-subtle` | `rgba(180, 83, 9, 0.14)` | `rgba(251, 191, 36, 0.18)` |
| `--rm-error` | `#c8102e` | `#fb7185` |
| `--rm-error-muted` | `rgba(200, 16, 46, 0.72)` | `rgba(251, 113, 133, 0.72)` |
| `--rm-error-subtle` | `rgba(200, 16, 46, 0.14)` | `rgba(251, 113, 133, 0.18)` |
| `--rm-error-ghost` | `rgba(200, 16, 46, 0.08)` | `rgba(251, 113, 133, 0.10)` |

#### Telemetry semantic tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-telemetry-local` | `#1d1d1f` | `#ffffff` |
| `--rm-telemetry-remote` | `#0066cc` | `#2997ff` |
| `--rm-telemetry-healthy` | `#166534` | `#86efac` |
| `--rm-telemetry-degraded` | `#b45309` | `#fbbf24` |
| `--rm-telemetry-raw` | `#7a7a7a` | `#cccccc` |

#### Radius, shadow, and shell tokens

| Token | Value |
| --- | --- |
| `--rm-radius-sm` | `8px` |
| `--rm-radius-md` | `11px` |
| `--rm-radius-lg` | `18px` |
| `--rm-radius-pill` | `9999px` |
| `--rm-radius-shell` | `18px` |
| `--rm-radius-panel` | `18px` |
| `--rm-radius-field` | `11px` |
| `--rm-radius-badge` | `9999px` |
| `--rm-shadow-card` | `none` |
| `--rm-shadow-ui` | `none` |
| `--rm-shadow-product` | `0 3px 5px 30px rgba(0, 0, 0, 0.22)` |
| `--rm-shell-width` | `1440px` |

#### Spacing and sizing tokens

| Token | Value |
| --- | --- |
| `--rm-space-xxs` | `4px` |
| `--rm-space-xs` | `8px` |
| `--rm-space-sm` | `12px` |
| `--rm-space-md` | `17px` |
| `--rm-space-lg` | `24px` |
| `--rm-space-xl` | `32px` |
| `--rm-space-xxl` | `48px` |
| `--rm-space-section` | `80px` |
| `--rm-nav-height-global` | `44px` |
| `--rm-nav-height-sub` | `52px` |
| `--rm-sticky-bar-height` | `64px` |
| `--rm-field-height` | `44px` |
| `--rm-icon-button-size` | `44px` |

#### Border and utility surface tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--rm-divider-soft` | `#f0f0f0` | `rgba(255, 255, 255, 0.10)` |
| `--rm-hairline` | `#e0e0e0` | `rgba(255, 255, 255, 0.12)` |
| `--rm-chip-translucent` | `rgba(210, 210, 215, 0.64)` | `rgba(210, 210, 215, 0.24)` |

#### Component sizing and padding tokens

| Token | Value |
| --- | --- |
| `--rm-button-pill-padding` | `11px 22px` |
| `--rm-button-utility-padding` | `8px 15px` |
| `--rm-button-pearl-padding` | `8px 14px` |
| `--rm-button-hero-padding` | `14px 28px` |
| `--rm-chip-padding` | `12px 16px` |
| `--rm-search-padding` | `12px 20px` |
| `--rm-card-padding` | `24px` |
| `--rm-sticky-bar-padding` | `12px 32px` |

Acceptance criteria, continued:
- obsolete or conflicting token values in the current runtime UI theme layer are removed or remapped so these values are the active canonical contract
- light and dark theme variants both use the same token names with theme-specific values rather than forking component implementations unnecessarily
- shared primitives, shell styling, and control styling consume these spacing/sizing tokens instead of keeping Swiss-era zero-radius and stone-density defaults

### `R4` Apply the approved typography contract

Description:
Typography must shift from the current baseline to an Apple-inspired but platform-safe stack with explicit size, weight, and tracking rules.

Acceptance criteria:
- the canonical font tokens are:

| Token | Value |
| --- | --- |
| `--rm-font-display` | `"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--rm-font-body` | `"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--rm-font-mono` | `"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace` |

- the design system documents and implements the following typography rules:

| Use | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Hero display | `56px` | `600` | `1.07` | `-0.28px` |
| Display / shell title | `40px` | `600` | `1.10` | `0` |
| Section heading | `34px` | `600` | `1.47` | `-0.374px` |
| Lead | `28px` | `400` | `1.14` | `0.196px` |
| Lead airy | `24px` | `300` | `1.50` | `0` |
| Tagline | `21px` | `600` | `1.19` | `0.231px` |
| Body | `17px` | `400` | `1.47` | `-0.374px` |
| Body strong | `17px` | `600` | `1.24` | `-0.374px` |
| Dense link | `17px` | `400` | `2.41` | `0` |
| Caption | `14px` | `400` | `1.43` | `-0.224px` |
| Caption strong | `14px` | `600` | `1.29` | `-0.224px` |
| Button large | `18px` | `300` | `1.0` | `0` |
| Button utility | `14px` | `400` | `1.29` | `-0.224px` |
| Fine print | `12px` | `400` | `1.0` | `-0.12px` |
| Micro legal | `10px` | `400` | `1.3` | `-0.08px` |
| Nav link | `12px` | `400` | `1.0` | `-0.12px` |
| Utility label | `12px` | `400` | `1.0` | `-0.12px` |

- `system-ui` is not the default first-choice font
- shell titles, page headings, card headings, body copy, captions, and data labels are mapped deliberately onto the above scale rather than inheriting inconsistent legacy sizing
- the active runtime UI bootstrap no longer imports IBM Plex Sans as the default body/display font family
- the implementation preserves the Apple-reference weight ladder where it matters: body defaults to `400`, strong emphasis defaults to `600`, large airy moments may use `300`, and Swiss-era default reliance on `500` body/UI weight is removed unless a specific component contract justifies it

### `R5` Reframe shell, panel, and control styling around restrained Apple-inspired surfaces

Description:
The app already has acceptable structure. This run changes visual treatment, not architecture.

Acceptance criteria:
- shell, panels, cards, tables, pills, and controls use the new token contract rather than the prior Swiss/stone-heavy styling
- panel and shell styling emphasize restrained rounded surfaces, thin borders, quiet contrast, and minimal decorative effects
- default component shadows are removed except where the approved token contract explicitly allows them
- gradients, neon accents, glassmorphism, and decorative color washes are not introduced as the default style language
- overview and at least one additional route outside Overview visibly inherit the updated shell and primitive styling so the design system is not isolated to a single page

### `R6` Normalize interactive control styling and theme-toggle affordance

Description:
Buttons, tabs, inputs, nav items, and theme-toggle controls must feel like one coherent system.

Acceptance criteria:
- primary actions use the canonical accent blue with the updated radius/typography treatment
- secondary, ghost, and outline controls use neutral surface styling consistent with the token contract
- inputs, filters, and tab-like controls use the same field radius and border grammar across light and dark modes
- the theme toggle is integrated into the shared shell or another clearly global operator surface rather than being page-local
- focus and active states use the approved accent tokens and remain accessible in both themes
- shared controls align with the Apple reference component grammar:
  - primary CTA pill uses `11px 22px` padding and pill radius
  - outline/ghost pill uses transparent background plus accent border/text
  - search/input controls use `44px` height and pill/field treatment consistent with the approved tokens
  - utility controls may use the compact `8px 15px` padding grammar
- if pressed/active button scaling is adopted from the Apple reference, it is implemented consistently across shared button primitives rather than ad hoc per route

### `R7` Status pills must use transparent backgrounds

Description:
Semantic status styling must remain legible without tinted fill backgrounds.

Acceptance criteria:
- pills/badges for statuses such as `healthy`, `degraded`, and `offline` use transparent backgrounds in both light and dark themes
- those pills preserve semantic text colors and semantic border colors
- no pill/badge variant reintroduces a background color that is simply a low-alpha version of the semantic text color for those statuses
- the updated status-pill rule is documented in `DESIGN_SYSTEM.md` and reflected in the shared primitive/component styling used by overview telemetry cards and any other affected runtime UI surfaces

### `R8` Preserve layout and route architecture while updating styling broadly

Description:
The user explicitly approved the existing runtime UI layout and architecture as broadly acceptable. This run is not a route-structure redesign.

Acceptance criteria:
- existing route hierarchy, navigation architecture, and major page layouts remain intact unless a styling change requires a narrowly-scoped structural tweak
- the run does not turn into an overview-page redesign detached from the rest of runtime UI
- shared primitives and shell styling are the primary mechanism for propagating the new look across the app
- route-specific edits remain bounded to visual cleanup and design-system adoption needed to make the new theme coherent

### `R9` Update design-system documentation, route metadata, and regression coverage together

Description:
The design-system contract, metadata layer, and tests must move together so the new theme is durable instead of cosmetic drift.

Acceptance criteria:
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` documents the Apple-inspired theme direction, light/dark mode behavior, exact token contract, typography contract, status-pill rule, and theme-toggle expectations
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts` is updated where route metadata, theme-facing copy, or design-system exports need to reflect the new contract
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` is updated with regression coverage that prevents drift in the documented theme contract or route metadata assumptions that matter for this run
- if additional shared theme helpers or primitives are introduced, they are covered by focused tests where practical
- regression coverage explicitly stops asserting the Swiss stone palette, IBM Plex Sans default typography, zero-radius shell contract, or Swiss-named runtime design-system expectations as the active baseline
- regression coverage explicitly asserts the Apple-theme token contract, `Light` / `Dark` persisted theme behavior, and transparent semantic status pills where practical

### `R10` Verification must include build/test proof and rebuilt-runtime browser proof

Description:
This run is not complete when the CSS compiles. It must be verified against the real operator runtime.

Acceptance criteria:
- relevant runtime UI automated tests pass after implementation
- the runtime UI build passes after implementation
- the rebuilt runtime/operator surface is exercised in a browser after implementation, not only a dev preview
- browser verification covers at minimum:
  - overview page in light mode
  - overview page in dark mode
  - theme toggle changes between `Light` and `Dark`
- persisted theme behavior after reload
- transparent status-pill styling on affected semantic badges
- at least one additional route outside Overview to prove shared design-system rollout

### `R11` Implementation must follow strict TDD

Description:
Production code changes for this run must follow explicit failing-test-first discipline.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict`
- no production code for this run is accepted without a preceding failing automated test that is recorded as RED evidence
- GREEN evidence is recorded for each implementation slice before refactor/cleanup is accepted
- if a test fixture or assertion must change to encode the new Apple-theme contract, the failing assertion is observed first and documented before the corresponding production styling/bootstrap change
- Phase 4 verifies TDD compliance explicitly rather than only reporting final passing tests

## Out of Scope

- `OOS1`: broad runtime UI information architecture redesign
- `OOS2`: renaming or restructuring route families unrelated to adopting the new design system
- `OOS3`: introducing a third operator-selectable `System` theme mode
- `OOS4`: implementing new backend APIs unrelated to theme persistence or existing UI needs
- `OOS5`: copying Apple product-page layouts, animations, or marketing interactions into the runtime UI
- `OOS6`: unrelated repo-wide cleanup outside the design-system/documentation surfaces touched by this run

## Constraints

- Preserve the runtime UI's existing route and workflow architecture unless a narrowly-scoped styling adjustment requires a minor layout correction
- The Apple reference remains inspiration for styling/theme tokens and restraint, not a license to clone Apple layouts
- Use the copied repo-local Apple reference as the style authority for this run instead of remote or ambiguous memory
- Keep the theme toggle limited to `Light` and `Dark`; device/system preference is initial-default logic only
- Keep semantic status pills transparent
- Remove or update Swiss-authority references where they would conflict with the new design-system contract
- Minimize unrelated churn outside `role-model-router/apps/runtime-ui/`, `docs/architecture/`, and the recursive memory/decision files that encode UI authority

## Assumptions

- The current runtime UI shell, navigation structure, and route architecture are sound enough that a theme/system refactor can build on them rather than replace them
- Existing theme bootstrap logic can be extended to persist a two-mode operator preference without requiring a larger state-management rewrite
- The current design-system layer owns enough of the shared styling that broad visual change can be driven primarily through tokens, shell primitives, and bounded route cleanup

## Coverage Gate

- [x] Apple-reference authority and Swiss-authority removal are explicit
- [x] Exact light/dark token values are included
- [x] Exact font-stack and typography rules are included
- [x] Theme-toggle behavior is explicit and limited to `Light` / `Dark`
- [x] Transparent semantic status-pill styling is explicit
- [x] Design-system-first sequencing is explicit
- [x] Build/test/browser verification requirements are explicit
- [x] Strict TDD requirement is explicit
- [x] Layout-preservation scope boundary is explicit

Coverage: PASS

## Approval Gate

- [x] User approved the Apple-theme direction
- [x] User approved exact light/dark scope
- [x] User approved the theme-toggle rule: only `Light` / `Dark`, with system preference only determining the initial default
- [x] User approved the font-stack preference with `SF Pro` first and `Inter` as first fallback
- [x] User approved the status-pill rule: semantic text + border, no semantic background tint

Approval: PASS
