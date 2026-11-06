# RM3 adapted-source ledger (R7)

This ledger is outside `vendor/crease` and `vendor/foldkit`; those snapshots stay untouched. Every
first-party RM3 component source has exactly one row. `first-party-only` means no upstream source was
copied; the hash is verified for every upstream row by `packages/ui/src/rm3-provenance.test.ts`.

| Source (first-party) | Upstream | Pin | SHA-256 | Licence | Owner | Adaptation |
| --- | --- | --- | --- | --- | --- | --- |
| `badge.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `chart-card.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `chart-composition.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `chart-grid.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `chart-ranking.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `chart-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `chart-time-series.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `chart.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `foldkit-button.ts` | `vendor/foldkit/packages/ui/src/button/index.ts` | `7ee214268c602967937b80f6f20d1e831f2e8ab6` | `a3bca3a3a82591271f7bf5c7c75902bdae8a9eeff6815f09e68e4d099fad66e5` | MIT | RM3 frontend maintainers | Adapted from the pinned upstream file; first-party wrapper/port. |
| `foldkit-chart-interaction.ts` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `foldkit-chart.ts` | `vendor/crease/src/ui/chart.ts` | `bb447e363e9c717bf11ebb10b2259f053bff6f71` | `79c4cc40777001bcf0f7653eefe2a71939913ee0e4a6a0e63a79f5e84b65c2ee` | MIT | RM3 frontend maintainers | Adapted from the pinned upstream file; first-party wrapper/port. |
| `foldkit-checkbox.ts` | `vendor/foldkit/packages/ui/src/checkbox/index.ts` | `7ee214268c602967937b80f6f20d1e831f2e8ab6` | `2c1ef03f37c96c681c7a119d7b98d90342100e6d3a5587a63ff40864962e2478` | MIT | RM3 frontend maintainers | Adapted from the pinned upstream file; first-party wrapper/port. |
| `foldkit-input.ts` | `vendor/foldkit/packages/ui/src/input/index.ts` | `7ee214268c602967937b80f6f20d1e831f2e8ab6` | `b93fb06aa5d8844ae4dac92dcf5a673dfc7bd4990b53c2398e0b744d99032ea7` | MIT | RM3 frontend maintainers | Adapted from the pinned upstream file; first-party wrapper/port. |
| `foldkit-textarea.ts` | `vendor/foldkit/packages/ui/src/input/index.ts` | `7ee214268c602967937b80f6f20d1e831f2e8ab6` | `b93fb06aa5d8844ae4dac92dcf5a673dfc7bd4990b53c2398e0b744d99032ea7` | MIT | RM3 frontend maintainers | Adapted from the pinned upstream file; first-party wrapper/port. |
| `metric-strip-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `metric-strip.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-activity-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-activity.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-logs-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-logs.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-requests-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-requests.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-routing-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-routing.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `observe-shared.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `page-filters-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `page-filters.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `page-shell.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `runtime-overview-specimen-page.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `runtime-overview-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `runtime-overview.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `segmented-control-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `segmented-control.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `sidebar-specimens.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `sidebar.tsx` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |
| `rm3-matrix.ts` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | Behaviour-matrix documentation/state. |
| `use-prefers-reduced-motion.ts` | first-party-only | n/a | first-party-only | BUSL-1.1 | RM3 frontend maintainers | No upstream source copied; first-party RM3 composition/state. |

## Notes
- `foldkit-chart.ts` also follows the accessible-table pattern in `vendor/crease/src/lib/echarts.ts`
  (hash `65280a20f7d099a9a513639120f214af21909118f6b3240e9b277fac8a6c3949`); the primary row above
  pins `chart.ts`, and the secondary reference is informational, not a copied upstream file.
- First-party rows are design-system compositions, specimens, or state helpers with no vendored bytes.
- The excluded component family is not used; see the gap ledger and the real scan in the provenance test.
