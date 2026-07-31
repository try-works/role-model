# `@role-model/ui`

Repo-owned RM3 UI kit for the role-model router runtime operator shell.

## Authority

1. Paper file [`01KW9C35N2G5PZRS4SBJ5678Q6`](https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6) — pages `4-0` (design system), `5-0` (runtime specimens), `6-0` (grid templates), `7-0` (Production RuntimeOverview).
2. Repo contract: `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`.
3. This package implements shared shell/primitives/charts; route pages consume it. Do not invent a second design authority.

Linear / Apple / Linear-purple contracts are historical only. Transitional `--rm-*` CSS aliases in runtime-ui map 1:1 onto `--rm3-*`.

## Export surface

Mapped to Paper inventory §A in run `86-runtime-ui-rm3-design-system-frontend`:

- `Sidebar` + footer (Model inventory → Cache → Router endpoint)
- `PageShell` / `SubPageHeaderBar` / `PageContent`
- `PageFilters` / `TimeRangeControl` / `FilterSelect`
- `SegmentedControl`
- `MetricStrip` (`inline` · `inventory` · `badge` · `panel`)
- `Badge`
- `ChartCard` / `ChartGrid` / time-series / ranking / composition charts
- Observe helpers / `RuntimeOverview`
- `usePrefersReducedMotion`

Specimens are deep-import only (`@role-model/ui/<name>-specimens`).

## Scripts

```bash
# From role-model-router/
pnpm --filter @role-model/ui test
```

Playground specimens: deep-import `*-specimens` / `runtime-overview-specimen-page` from a Vite app or the runtime-ui playground host when present.
