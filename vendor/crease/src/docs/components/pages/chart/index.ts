import { authoredPage } from '@/docs/components/pages/authored-page'
import { chartExamples } from '@/docs/components/pages/chart/shared'
import { chartTailwindPreviewProgram } from '@/docs/components/pages/chart/tailwind'

export const chartPage = authoredPage({
  slug: 'chart',
  title: 'Chart',
  kind: 'recipe',
  previewProgram: chartTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Theme-aware SVG chart recipes and a Foldkit lifecycle adapter for building responsive Apache ECharts visualizations.',
    architecture:
      'Keep serializable chart data and configuration in the parent. Pure SVG helpers render directly; ECharts is acquired by Mount, updated through SyncChart, observed for resize, and disposed when the host leaves the DOM.',
    usage: `import * as Chart from '@/ui/chart'

Chart.barChart({
  data: [
    { label: 'Jan', value: 186 },
    { label: 'Feb', value: 305 },
    { label: 'Mar', value: 237 },
  ],
}, h)`,
    sections: [
      {
        id: 'choose-a-renderer',
        title: 'Choose a renderer',
        description:
          'Use barChart, areaChart, interactiveAreaChart, or donutChart when a compact dependency-free SVG is enough. Use eChart when you need richer chart families, pointer tooltips, legends, polar coordinates, or larger data sets. Both approaches read the same chart color tokens.',
      },
      {
        id: 'chart-types',
        title: 'Chart types',
        description:
          'The examples below cover area, bar, line, pie, radar, and radial charts. Each ECharts example is a real Foldkit application with a registered option builder, a measurable host, and an accessible HTML alternative.',
      },
      {
        id: 'chart-configuration',
        title: 'Chart configuration',
        description:
          'Register a pure option builder by host id. The builder receives resolved theme colors and a serializable variant string, so the view only needs to identify the host and route lifecycle messages.',
        code: `const hostId = 'revenue-chart'

Chart.registerChart(hostId, (theme, variant): EChartsOption => ({
  grid: Chart.compactGrid(),
  series: [{
    data: variant === 'quarter' ? quarterlyRevenue : monthlyRevenue,
    itemStyle: { color: theme.chart2 },
    name: 'Revenue',
    type: 'bar',
  }],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, labels, { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme, { showLabels: true }),
}))`,
      },
      {
        id: 'themes-and-colors',
        title: 'Themes and colors',
        description:
          'Chart builders resolve --chart-1 through --chart-5 and the surrounding foreground, background, border, and muted tokens at mount time. Define those variables in light and dark scopes; do not hard-code canvas colors in the view.',
        code: `:root {
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
}

.dark {
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
}`,
      },
      {
        id: 'tooltip-and-legend',
        title: 'Tooltip and legend',
        description:
          'compactGrid, categoryAxis, valueAxis, tooltipOptions, and legendOptions provide the shared CreaseUI visual language without hiding the underlying ECharts option. Compose only the helpers the chart needs.',
        code: `({
  grid: Chart.compactGrid({ bottom: 42 }),
  legend: Chart.legendOptions(theme),
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, labels),
  yAxis: Chart.valueAxis(theme),
  series,
})`,
      },
    ],
    apiHref: 'https://foldkit.dev/guide/html',
    composition: `Parent domain Model
|-- serializable data + variant
|-- ECharts Mount resource
|   |-- ResizeObserver
|   |-- SyncChart Command
|   \-- disposal finalizer
\-- accessible summary or data table`,
    styling:
      'Chart colors come from semantic theme tokens. Give every ECharts host a definite height or aspect ratio so it can measure on first render; the lifecycle adapter keeps the canvas synchronized with later resizes.',
    accessibility:
      'Every renderer exposes an image role and accessible name. The ECharts adapter requires a meaningful HTML summary or data table because canvas tooltips are supplementary and are not the keyboard-accessible data source.',
    examples: chartExamples('tailwind'),
    stylexExamples: chartExamples('stylex'),
    pleatExamples: chartExamples('pleat'),
  },
})
