# StyleX component authoring contract

## Consuming StyleX components

Install a component and its source dependencies from the registry, for example
`Potti1234/creaseui/stylex-button`. Registry files install under a `stylex`
subdirectory of the configured shadcn UI directory (for example, `@/ui/stylex`
when `aliases.ui` is `@/ui`); configure the StyleX compiler with the semantics in
[`stylex.config.js`](../../stylex.config.js) and provide the theme variables
referenced by `tokens.stylex.ts`, `foundations-tokens.stylex.ts`, and
`complex-tokens.stylex.ts`. The light and dark variable blocks in
[`src/theme.css`](../theme.css) include the required StyleX aliases and can be
used as a starting point; the application owns its document font, line height,
and background.

Components must not depend on Tailwind preflight. The `className()` adapter
supplies `border-box` sizing and accepts static styles and StyleX markers.
Apply the appropriate element defaults from `reset.ts` **first**, before the
component recipe and `layoutStyle`. Use `default: 'inherit'` when a conditional
color should inherit; `null` removes an earlier reset declaration.

Use `sidebarMenuLabel` around the text beside a menu icon so it fades during
icon collapse while remaining in the accessible name. Keep `stylex.when`
conditions inline in `stylex.create`; they are compile-time expressions.

`npx playwright test e2e/stylex-preflight.spec.ts --project=chromium` builds a
separate StyleX consumer without Tailwind and compares computed styles and
screenshots before and after adding preflight, in light and dark themes.
`npm run test:sites` also checks every component documentation page in both
production builds and compares StyleX preview geometry and computed styles
with and without preflight. The StyleX site itself has no global element reset.

## Authoring

For the complete experiment summary, Polar Orbit comparison, enforcement
model, and implementation learnings, see
[`docs/stylex-agent-safe-design-system.md`](../../docs/stylex-agent-safe-design-system.md).

This pilot treats component styling as a closed API, not as a bag of CSS.

- Call sites choose named `variant` and `size` values.
- `layoutStyle` accepts only statically extracted parent-layout properties:
  margins, flex/grid placement, alignment, and order.
- Colors, typography, shape, internal spacing, shadows, and interaction states
  stay inside the component and use `tokens.stylex.ts`.
- Variant names live in `contracts.ts`. Compile-time exact-key assertions keep
  every public variant synchronized with its StyleX map.

## Making a visual change

If a visual choice is reusable, add a named variant and its semantic tokens.
If it is specific to one composition, put the StyleX rule on a wrapper owned by
that composition. Do not widen `ComponentLayoutStyle` to change a component's
appearance.

There is intentionally no public `class`, `className`, `style`, or
`unsafeStyle` prop. A genuinely new visual requirement should change the
component contract where it can be reviewed and tested. Type assertions such
as `as unknown as ComponentLayoutStyle` are unsupported escape hatches and
should be rejected in review.

Dynamic `stylex.firstThatWorks` tuples are also intentionally rejected. The
Foldkit adapter emits only StyleX's generated class name, so accepting inline
styles would silently discard `stylex.props(...).style`. Add a finite named
variant for dynamic visual states instead.

Anchored overlays must use `themedAnchor` from `overlay-boundary.ts`. Scoped
Create themes rely on CSS inheritance, so Foldkit's default body portal is not
safe here. Do not add `portal: true` locally; a clipping requirement needs a
reviewed theme-copying portal at the shared boundary.
Use `themedComboboxPanel` for a combobox popup that must escape clipping; it
copies inherited theme variables before portaling and tracks ancestor theme
changes until the popup unmounts.

Durations, easing, cursors, and press behavior come from
`interaction-tokens.stylex.const.ts`. Raw values are lint errors. Suppressions
must be next-line only and include `-- reason: ...`; CSS Module fallbacks must
be registered in `fallbacks/manifest.json`.

`test/stylex-contract.test.ts` protects these source-level invariants, while
the type tests in `contracts.ts` ensure StyleX cannot silently widen the
layout-only contract after a dependency upgrade. The cross-file flow and
governance checks run through `npm run lint:stylex-contracts` and
`npm run lint:stylex-governance`.
