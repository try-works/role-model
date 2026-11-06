# RM3 adapted-source ledger (R7)

This ledger is **outside** `vendor/crease` and `vendor/foldkit`; those snapshots stay untouched.
Hashes are SHA-256 of the pinned upstream file. Owners are the RM3 frontend maintainers unless noted.

| Source (first-party) | Upstream | Pin | SHA-256 | Licence | Owner | Adaptation |
| --- | --- | --- | --- | --- | --- | --- |
| `foldkit-chart.ts` | `vendor/crease/src/ui/chart.ts` | crease `bb447e363e9c717bf11ebb10b2259f053bff6f71` | `79c4cc40777001bcf0f7653eefe2a71939913ee0e4a6a0e63a79f5e84b65c2ee` | MIT | RM3 frontend maintainers | Pure-SVG shape, role=img and aria-label pattern; React-free reimplementation, no ECharts runtime. |
| `foldkit-chart.ts` | `vendor/crease/src/lib/echarts.ts` | crease `bb447e36...` | `65280a20f7d099a9a513639120f214af21909118f6b3240e9b277fac8a6c3949` | MIT | RM3 frontend maintainers | Accessible numeric HTML table beside the renderer. |
| `foldkit-button.ts` | `vendor/foldkit/packages/ui/src/button/index.ts` | foldkit `7ee214268c602967937b80f6f20d1e831f2e8ab6` | `a3bca3a3a82591271f7bf5c7c75902bdae8a9eeff6815f09e68e4d099fad66e5` | MIT | RM3 frontend maintainers | First-party Foldkit wrapper; disabled/ARIA and caller-class concatenation. |
| `foldkit-checkbox.ts` | `vendor/foldkit/packages/ui/src/checkbox/index.ts` | foldkit `7ee21426...` | `2c1ef03f37c96c681c7a119d7b98d90342100e6d3a5587a63ff40864962e2478` | MIT | RM3 frontend maintainers | First-party Foldkit wrapper. |
| `foldkit-input.ts` | `vendor/foldkit/packages/ui/src/input/index.ts` | foldkit `7ee21426...` | `b93fb06aa5d8844ae4dac92dcf5a673dfc7bd4990b53c2398e0b744d99032ea7` | MIT | RM3 frontend maintainers | First-party Foldkit wrapper. |
| `foldkit-textarea.ts` | `vendor/foldkit/packages/ui/src/input/index.ts` (textarea variant) | foldkit `7ee21426...` | `b93fb06a...` | MIT | RM3 frontend maintainers | First-party Foldkit wrapper; no copied source. |
| `chart.tsx`, `chart-time-series.tsx`, `chart-ranking.tsx`, `chart-composition.tsx`, `chart-card.tsx`, `chart-grid.tsx` | none (Recharts/TanStack adapters; Crease visual reference only) | n/a | n/a | repo licence (BUSL-1.1) | RM3 frontend maintainers | First-party; no upstream bytes copied. |
| `badge.tsx`, `metric-strip.tsx`, `sidebar.tsx`, `page-shell.tsx`, `page-filters.tsx`, `segmented-control.tsx`, `observe-*.tsx`, `runtime-overview.tsx` | none (first-party RM3 composition) | n/a | n/a | repo licence (BUSL-1.1) | RM3 frontend maintainers | First-party layout/composition; Crease used as design reference only, no source copy. |
| `foldkit-chart-interaction.ts` | none (first-party) | n/a | n/a | repo licence (BUSL-1.1) | RM3 frontend maintainers | Legend/tooltip/token fence state. |
| `@role-model-router/foldkit-ui` dialog/button/input wrappers | `vendor/foldkit/packages/ui/src/**` | foldkit `7ee21426...` | per-file | MIT | RM3 frontend maintainers | Wrapper build; vendored source untouched. |

## cn merge semantics (R8)
The donor React `cn` is `twMerge(clsx(...))`: the last conflicting Tailwind utility wins. The Foldkit
RM3 button deliberately composes by **plain concatenation** instead (design-system.ts:1252 uses
`${primaryButtonClassName} w-full`): a caller class that conflicts with a base utility is kept, not
deleted. This difference is intentional and pinned by the RM3 matrix test; any future Tailwind-merge
adoption needs an explicit behaviour decision, not an implicit import.
