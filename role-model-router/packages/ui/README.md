# `@role-model/ui`

Repo-owned RM3 UI kit for the role-model router runtime operator shell.

## Authority

1. Paper file [`01KW9C35N2G5PZRS4SBJ5678Q6`](https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6) — pages `4-0` (design system), `5-0` (runtime specimens), `6-0` (grid templates), `7-0` (Production RuntimeOverview).
2. Repo contract: `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` (Wave 1+).
3. This package implements shared shell/primitives/charts; route pages consume it. Do not invent a second design authority.

Linear / Apple / `--rm-*` purple accent contracts are historical only.

## Planned export surface (Wave 2)

Mapped to Paper inventory §A in run `86-runtime-ui-rm3-design-system-frontend`:

- `Sidebar` + footer (Model inventory → Cache → Router endpoint)
- `PageShell` / `SubPageHeaderBar` / `PageContent`
- `PageFilters` / `TimeRangeControl` / `FilterSelect`
- `SegmentedControl`
- `MetricStrip` (`inline` · `inventory` · `badge` · `panel`)
- `ChartCard` / `ChartGrid` / time-series / ranking / composition charts
- Observe helpers / `RuntimeOverview` as needed
- `usePrefersReducedMotion`

## Status

Wave 2 (SP2): executor kit ported to `@role-model/ui` with recharts 2.x adapters. Runtime-ui wiring is dependency-only; page restyle is SP3/SP4.
