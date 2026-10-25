# Constrained composition

For the full case study and the relationship to Polar's Orbit approach, see
[`docs/stylex-agent-safe-design-system.md`](../../../docs/stylex-agent-safe-design-system.md).

These primitives are the page-layout boundary for AI-authored StyleX screens.
`Box`, `Stack`, `Inline`, `Grid`, and `Text` expose closed unions instead of
CSS objects, class names, or StyleX styles.

For full pages, prefer the semantic region components (`appShell`,
`pageLayout`, `section`, `toolbar`, `formLayout`, `metricGrid`, and
`tableRegion`) and start from a named recipe (`dashboardShell`, `settingsPage`,
`masterDetailPage`, `dataExplorerPage`, or `commercePage`). Their rationale,
template metadata, and evaluation workflow are documented in
[`docs/stylex-astryx-architecture.md`](../../../docs/stylex-astryx-architecture.md).

The StyleX renderer available from the `/create` switcher deliberately shares
the same Elm model, messages, subscriptions, card specification, preset theme,
and leaf StyleX components. Only its board composition differs from the
Tailwind renderer.

## Authoring contract

- Compose page structure with `box`, `stack`, `inline`, `grid`, and `text`.
- Choose only named spacing, surface, typography, alignment, and layout values.
- Add a reviewed named variant when the existing vocabulary cannot express a
  real design-system need.
- Do not add `class`, `className`, `style`, `layoutStyle`, `StaticStyles`, or an
  unsafe escape hatch to a primitive.
- Keep responsive behavior finite. `createBoard` is one extracted responsive
  spacing recipe; callers cannot invent breakpoint objects or media queries.

## Enforcement boundary

`npm run lint:composition` runs three complementary checks:

1. Oxlint rejects direct StyleX, class-merging, and adapter imports at the page
   boundary.
2. The TypeScript AST test proves the primitive prop surfaces stay closed and
   that the page contains no raw Foldkit layout nodes or class/style builders.
3. The grep guard gives a cheap, readable failure for a short list of literal
   escape-hatch signatures.

The StyleX ESLint plugin remains necessary inside primitive implementations for
valid styles, semantic paint tokens, property ordering, shorthands, and theme
file rules. Oxlint does not natively replace those StyleX-specific checks.
