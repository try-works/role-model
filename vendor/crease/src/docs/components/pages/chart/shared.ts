import type { EChartsOption } from 'echarts/types/dist/shared'

import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'
import * as ECharts from '@/lib/echarts'

export const chartHostId = 'docs-chart-lifecycle'
export const chartData = [
  { label: 'Jan', value: 186 },
  { label: 'Feb', value: 305 },
  { label: 'Mar', value: 237 },
  { label: 'Apr', value: 273 },
  { label: 'May', value: 209 },
  { label: 'Jun', value: 314 },
] as const

export const chartFamilyKinds = [
  'area',
  'bar',
  'line',
  'pie',
  'radar',
  'radial',
] as const
export type ChartFamilyKind = (typeof chartFamilyKinds)[number]
export const chartFamilyHostId = (kind: ChartFamilyKind): string =>
  `docs-chart-family-${kind}`
export const isChartFamilyKind = (kind: string): kind is ChartFamilyKind =>
  chartFamilyKinds.some(candidate => candidate === kind)

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const
const desktop = [186, 305, 237, 273, 209, 314] as const
const mobile = [80, 200, 120, 190, 130, 140] as const

export const chartFamilyOption = (
  kind: ChartFamilyKind,
  theme: ECharts.ChartTheme,
): EChartsOption => {
  switch (kind) {
    case 'area':
      return {
        grid: ECharts.compactGrid(),
        series: [
          {
            areaStyle: { color: ECharts.areaGradient(theme.chart1) },
            data: desktop,
            itemStyle: { color: theme.chart1 },
            lineStyle: { color: theme.chart1, width: 2 },
            name: 'Desktop',
            showSymbol: false,
            smooth: 0.35,
            type: 'line',
          },
        ],
        tooltip: ECharts.tooltipOptions(theme),
        xAxis: ECharts.categoryAxis(theme, labels),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    case 'bar':
      return {
        grid: ECharts.compactGrid({ bottom: 28 }),
        series: [
          {
            data: desktop,
            itemStyle: { borderRadius: 4, color: theme.chart2 },
            name: 'Desktop',
            type: 'bar',
          },
        ],
        tooltip: ECharts.tooltipOptions(theme),
        xAxis: ECharts.categoryAxis(theme, labels, { boundaryGap: true }),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    case 'line':
      return {
        grid: ECharts.compactGrid({ bottom: 42 }),
        legend: ECharts.legendOptions(theme),
        series: [
          {
            data: desktop,
            itemStyle: { color: theme.chart1 },
            lineStyle: { color: theme.chart1, width: 2 },
            name: 'Desktop',
            showSymbol: false,
            smooth: 0.35,
            type: 'line',
          },
          {
            data: mobile,
            itemStyle: { color: theme.chart2 },
            lineStyle: { color: theme.chart2, width: 2 },
            name: 'Mobile',
            showSymbol: false,
            smooth: 0.35,
            type: 'line',
          },
        ],
        tooltip: ECharts.tooltipOptions(theme),
        xAxis: ECharts.categoryAxis(theme, labels),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    case 'pie':
      return {
        legend: ECharts.legendOptions(theme),
        series: [
          {
            data: [
              {
                itemStyle: { color: theme.chart1 },
                name: 'Chrome',
                value: 275,
              },
              {
                itemStyle: { color: theme.chart2 },
                name: 'Safari',
                value: 200,
              },
              {
                itemStyle: { color: theme.chart3 },
                name: 'Firefox',
                value: 187,
              },
              { itemStyle: { color: theme.chart4 }, name: 'Edge', value: 173 },
            ],
            label: { color: theme.foreground },
            radius: ['44%', '70%'],
            type: 'pie',
          },
        ],
        tooltip: ECharts.tooltipOptions(theme, { trigger: 'item' }),
      } as EChartsOption
    case 'radar':
      return {
        radar: {
          axisLine: { lineStyle: { color: theme.border } },
          axisName: {
            color: theme.mutedForeground,
            fontFamily: theme.fontFamily,
            fontSize: 11,
          },
          indicator: ['Speed', 'Quality', 'Coverage', 'Reliability', 'DX'].map(
            name => ({ max: 100, name }),
          ),
          splitArea: { areaStyle: { color: ['transparent'] } },
          splitLine: { lineStyle: { color: theme.border } },
        },
        series: [
          {
            areaStyle: { color: ECharts.colorWithOpacity(theme.chart1, 0.18) },
            data: [{ name: 'Score', value: [82, 91, 76, 88, 84] }],
            itemStyle: { color: theme.chart1 },
            lineStyle: { color: theme.chart1, width: 2 },
            type: 'radar',
          },
        ],
        tooltip: ECharts.tooltipOptions(theme, { trigger: 'item' }),
      } as EChartsOption
    case 'radial':
      return {
        angleAxis: { max: 400, startAngle: 90, type: 'value' },
        polar: { radius: ['24%', '88%'] },
        radiusAxis: {
          axisLine: { show: false },
          axisTick: { show: false },
          data: ['Search', 'Direct', 'Social', 'Email'],
          type: 'category',
        },
        series: [
          {
            backgroundStyle: {
              color: ECharts.colorWithOpacity(theme.mutedForeground, 0.12),
            },
            barWidth: '58%',
            coordinateSystem: 'polar',
            data: [275, 220, 187, 140].map((value, index) => ({
              itemStyle: {
                color: [theme.chart1, theme.chart2, theme.chart3, theme.chart4][
                  index
                ],
              },
              value,
            })),
            name: 'Visitors',
            roundCap: true,
            showBackground: true,
            type: 'bar',
          },
        ],
        tooltip: ECharts.tooltipOptions(theme, { trigger: 'item' }),
      } as EChartsOption
  }
}

const stepLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const
const stepDesktop = [186, 305, 237, 73, 209, 214] as const
const stepMobile = [80, 200, 120, 190, 130, 140] as const

const demoLabels = Array.from({ length: 30 }, (_, index) => `Apr ${index + 1}`)
export const demoDesktop = [
  222, 97, 167, 242, 373, 301, 245, 409, 59, 261, 327, 292, 342, 137, 120, 138,
  446, 364, 243, 89, 137, 224, 138, 387, 215, 75, 383, 122, 315, 454,
] as const
export const demoMobile = [
  150, 180, 120, 260, 290, 340, 180, 320, 110, 190, 350, 210, 380, 220, 170,
  190, 360, 410, 180, 150, 200, 170, 230, 290, 250, 130, 420, 180, 240, 380,
] as const
export const demoTotals = {
  desktop: demoDesktop.reduce((a, b) => a + b, 0),
  mobile: demoMobile.reduce((a, b) => a + b, 0),
}

const rtlLabels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'] as const

export const chartUpstreamKinds = [
  'demo',
  'step-basic',
  'step-grid',
  'step-axis',
  'step-tooltip',
  'step-legend',
  'rtl',
] as const
export type ChartUpstreamKind = (typeof chartUpstreamKinds)[number]
export const chartUpstreamHostId = (kind: ChartUpstreamKind): string =>
  `docs-chart-${kind}`
export const isChartUpstreamKind = (kind: string): kind is ChartUpstreamKind =>
  chartUpstreamKinds.some(candidate => candidate === kind)

export const chartUpstreamOption = (
  kind: ChartUpstreamKind,
  theme: ECharts.ChartTheme,
  variant?: string,
): EChartsOption => {
  const desktopBar = {
    data: kind === 'rtl' ? [...stepDesktop] : [...stepDesktop],
    itemStyle: { borderRadius: 4, color: theme.chart2 },
    name: kind === 'rtl' ? 'سطح المكتب' : 'Desktop',
    type: 'bar' as const,
  }
  const mobileBar = {
    data: [...stepMobile],
    itemStyle: { borderRadius: 4, color: theme.chart1 },
    name: kind === 'rtl' ? 'الجوال' : 'Mobile',
    type: 'bar' as const,
  }
  const series = [desktopBar, mobileBar]
  const axisLabels = kind === 'rtl' ? rtlLabels : stepLabels
  switch (kind) {
    case 'step-basic':
      return {
        series,
        xAxis: {
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          data: [...axisLabels],
          type: 'category',
        },
        yAxis: {
          axisLabel: { show: false },
          splitLine: { show: false },
          type: 'value',
        },
      } as EChartsOption
    case 'step-grid':
      return {
        grid: ECharts.compactGrid(),
        series,
        xAxis: {
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          data: [...axisLabels],
          type: 'category',
        },
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    case 'step-axis':
      return {
        grid: ECharts.compactGrid(),
        series,
        xAxis: ECharts.categoryAxis(theme, axisLabels, { boundaryGap: true }),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    case 'step-tooltip':
      return {
        grid: ECharts.compactGrid(),
        series,
        tooltip: ECharts.tooltipOptions(theme),
        xAxis: ECharts.categoryAxis(theme, axisLabels, { boundaryGap: true }),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    case 'step-legend':
      return {
        grid: ECharts.compactGrid({ bottom: 42 }),
        legend: ECharts.legendOptions(theme),
        series,
        tooltip: ECharts.tooltipOptions(theme),
        xAxis: ECharts.categoryAxis(theme, axisLabels, { boundaryGap: true }),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    case 'demo': {
      const active = variant === 'mobile' ? 'mobile' : 'desktop'
      return {
        grid: ECharts.compactGrid({ left: 12, right: 12, top: 24 }),
        series: [
          {
            data: active === 'mobile' ? [...demoMobile] : [...demoDesktop],
            itemStyle: {
              borderRadius: 2,
              color: active === 'mobile' ? theme.chart1 : theme.chart2,
            },
            name: active === 'mobile' ? 'Mobile' : 'Desktop',
            type: 'bar',
          },
        ],
        tooltip: ECharts.tooltipOptions(theme),
        xAxis: ECharts.categoryAxis(theme, demoLabels, { boundaryGap: true }),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
    }
    case 'rtl':
      return {
        grid: ECharts.compactGrid({ bottom: 42 }),
        legend: ECharts.legendOptions(theme),
        series,
        tooltip: ECharts.tooltipOptions(theme),
        xAxis: ECharts.categoryAxis(theme, axisLabels, { boundaryGap: true }),
        yAxis: ECharts.valueAxis(theme),
      } as EChartsOption
  }
}

export const chartFixtures = [
  { title: 'Demo', heroOnly: true, kind: 'demo' },
  {
    title: 'Your First Chart',
    sectionId: 'your-first-chart',
    kind: 'step-basic',
    description:
      'A minimal two-series bar chart: register an ECharts option builder and mount it once.',
  },
  {
    title: 'Your First Chart',
    sectionId: 'your-first-chart-grid',
    kind: 'step-grid',
    description:
      'Add a grid — compactGrid plus the dashed value-axis split lines.',
  },
  {
    title: 'Your First Chart',
    sectionId: 'your-first-chart-axis',
    kind: 'step-axis',
    description: 'Add an axis — categoryAxis renders the muted month labels.',
  },
  {
    title: 'Your First Chart',
    sectionId: 'your-first-chart-tooltip',
    kind: 'step-tooltip',
    description:
      'Add a tooltip — tooltipOptions styles hover details from the resolved theme.',
  },
  {
    title: 'Your First Chart',
    sectionId: 'your-first-chart-legend',
    kind: 'step-legend',
    description: 'Add a legend — legendOptions lists each named series.',
  },
  {
    title: 'Tooltip',
    kind: 'tooltip',
    description:
      'chartTooltipContent renders the static tooltip panel: an optional label plus labeled value rows with series markers.',
  },
  {
    title: 'RTL',
    kind: 'rtl',
    description:
      'Right-to-left direction renders inside a dir="rtl" container with localized labels and legend names.',
  },
  {
    title: 'Monthly revenue',
    description:
      'A responsive bar chart is a pure SVG projection of typed data and needs no update branch.',
    kind: 'bar-svg',
  },
  {
    title: 'Traffic trend',
    description:
      'Pure SVG area rendering and the shared legend remain separate helpers so the application controls composition.',
    kind: 'area-svg',
  },
  {
    title: 'ECharts lifecycle',
    description:
      'Mount owns the imperative chart, resize observer, and cleanup. Parent state selects the variant and SyncChart applies finite updates.',
    kind: 'lifecycle',
  },
  {
    title: 'Lifecycle states',
    description:
      'Loading, empty, and error states render meaningful HTML without mounting an imperative runtime, so SSR and failure paths remain useful.',
    kind: 'states',
  },
  {
    title: 'Area chart',
    description:
      'Show change over time while emphasizing the magnitude beneath a continuous series.',
    kind: 'area',
  },
  {
    title: 'Bar chart',
    description:
      'Compare discrete values across periods or categories with a shared quantitative baseline.',
    kind: 'bar',
  },
  {
    title: 'Line chart',
    description:
      'Compare multiple continuous series and expose their values through a themed tooltip and legend.',
    kind: 'line',
  },
  {
    title: 'Pie chart',
    description:
      'Show a compact part-to-whole relationship when the category count stays intentionally small.',
    kind: 'pie',
  },
  {
    title: 'Radar chart',
    description:
      'Compare several dimensions on a shared scale when the overall profile matters more than exact values.',
    kind: 'radar',
  },
  {
    title: 'Radial chart',
    description:
      'Use polar bars for a compact category comparison where direction is not part of the data.',
    kind: 'radial',
  },
] as const

const lifecycleSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Chart — ECharts lifecycle adapter',
    imports: `import type { EChartsOption } from 'echarts/types/dist/shared'
import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/chart'
import * as Button from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/button'`,
    model: `export const Model = S.Struct({ variant: S.Literals(['month', 'quarter']) })
export type Model = typeof Model.Type

const hostId = 'revenue-chart'
Chart.registerChart(hostId, (theme, variant): EChartsOption => ({
  grid: Chart.compactGrid(),
  series: [{ data: variant === 'quarter' ? [186, 305, 237, 314] : [186, 305, 237, 273, 209, 314], itemStyle: { color: theme.chart2 }, name: 'Revenue', type: 'bar' }],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, variant === 'quarter' ? ['Q1', 'Q2', 'Q3', 'Q4'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme, { showLabels: true }),
}))`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ChangedRange = taggedStruct('ChangedRange', { variant: S.Literals(['month', 'quarter']) });
export const Message = S.Union([Chart.ChartMessage, ChangedRange])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { variant: 'month' } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedRange': return { model: { variant: message.variant }, commands: [Chart.SyncChart({ hostId, variant: message.variant })] }
    case 'ChartMounted':
    case 'ChartMountFailed':
    case 'CompletedSyncChart': return { model: model }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Revenue chart',
  body: h.main([], [
    Button.button({ variant: 'outline', onClick: ChangedRange({ variant: model.variant === 'month' ? 'quarter' : 'month' }), children: ['Change range'] }, h),
    Chart.eChart({ accessibleAlternative: h.p([], ['Revenue values: January 186, February 305, March 237.']), ariaLabel: 'Revenue by period', hostId, toMessage: message => message, variant: model.variant }, h),
  ]),
})`,
  })

const staticSource = (
  kind: 'bar-svg' | 'area-svg',
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  staticComponentApplication({
    componentName: 'Chart',
    componentSlug: 'chart',
    renderer,
    exampleName: kind === 'bar-svg' ? 'Monthly revenue' : 'Traffic trend',
    ...(renderer !== 'tailwind'
      ? {
          componentImports:
            "import * as stylex from '@stylexjs/stylex'\nimport { layoutStyle } from '@/stylex/contracts'\nconst styles = stylex.create({ chart: { marginInline: 'auto', maxWidth: '36rem' }, stack: { marginInline: 'auto', maxWidth: '36rem', width: '100%' } })",
        }
      : {}),
    viewBody:
      kind === 'bar-svg'
        ? `Chart.barChart({ ${renderer !== 'tailwind' ? 'layoutStyle: layoutStyle({ marginInline: "auto", maxWidth: "36rem" })' : "class: 'mx-auto max-w-xl'"}, data: [{ label: 'Jan', value: 186 }, { label: 'Feb', value: 305 }, { label: 'Mar', value: 237 }, { label: 'Apr', value: 273 }, { label: 'May', value: 209 }, { label: 'Jun', value: 314 }] }, h)`
        : `${renderer !== 'tailwind' ? "h.div([h.Class(stylex.props(styles.stack).className ?? '')]" : "h.div([h.Class('mx-auto w-full max-w-xl space-y-4')]"}, [Chart.areaChart({ data: [186, 305, 237, 273, 209, 314] }, h), Chart.chartLegend({ config: { visitors: { label: 'Visitors', color: 'var(--chart-2)' } } }, h)])`,
  })

const familyRegistration = (kind: ChartFamilyKind): string => {
  switch (kind) {
    case 'area':
      return `grid: Chart.compactGrid(),\n  series: [{ areaStyle: { color: Chart.areaGradient(theme.chart1) }, data: [186, 305, 237, 273, 209, 314], itemStyle: { color: theme.chart1 }, lineStyle: { color: theme.chart1, width: 2 }, name: 'Desktop', showSymbol: false, smooth: 0.35, type: 'line' }],\n  tooltip: Chart.tooltipOptions(theme),\n  xAxis: Chart.categoryAxis(theme, labels),\n  yAxis: Chart.valueAxis(theme)`
    case 'bar':
      return `grid: Chart.compactGrid(),\n  series: [{ data: [186, 305, 237, 273, 209, 314], itemStyle: { borderRadius: 4, color: theme.chart2 }, name: 'Desktop', type: 'bar' }],\n  tooltip: Chart.tooltipOptions(theme),\n  xAxis: Chart.categoryAxis(theme, labels, { boundaryGap: true }),\n  yAxis: Chart.valueAxis(theme)`
    case 'line':
      return `grid: Chart.compactGrid({ bottom: 42 }),\n  legend: Chart.legendOptions(theme),\n  series: [{ data: [186, 305, 237, 273, 209, 314], itemStyle: { color: theme.chart1 }, lineStyle: { color: theme.chart1, width: 2 }, name: 'Desktop', type: 'line' }, { data: [80, 200, 120, 190, 130, 140], itemStyle: { color: theme.chart2 }, lineStyle: { color: theme.chart2, width: 2 }, name: 'Mobile', type: 'line' }],\n  tooltip: Chart.tooltipOptions(theme),\n  xAxis: Chart.categoryAxis(theme, labels),\n  yAxis: Chart.valueAxis(theme)`
    case 'pie':
      return `legend: Chart.legendOptions(theme),\n  series: [{ data: [{ name: 'Chrome', value: 275 }, { name: 'Safari', value: 200 }, { name: 'Firefox', value: 187 }], radius: ['44%', '70%'], type: 'pie' }],\n  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' })`
    case 'radar':
      return `radar: { indicator: ['Speed', 'Quality', 'Coverage', 'Reliability', 'DX'].map(name => ({ max: 100, name })) },\n  series: [{ data: [{ name: 'Score', value: [82, 91, 76, 88, 84] }], itemStyle: { color: theme.chart1 }, type: 'radar' }],\n  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' })`
    case 'radial':
      return `angleAxis: { max: 400, startAngle: 90, type: 'value' },\n  polar: { radius: ['24%', '88%'] },\n  radiusAxis: { data: ['Search', 'Direct', 'Social', 'Email'], type: 'category' },\n  series: [{ coordinateSystem: 'polar', data: [275, 220, 187, 140], roundCap: true, type: 'bar' }],\n  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' })`
  }
}

const familySource = (
  kind: ChartFamilyKind,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: `Chart — ${kind} chart`,
    imports: `import type { EChartsOption } from 'echarts/types/dist/shared'
import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/chart'`,
    model: `export const Model = S.Struct({})
export type Model = typeof Model.Type

const hostId = '${chartFamilyHostId(kind)}'
const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
Chart.registerChart(hostId, (theme): EChartsOption => ({
  ${familyRegistration(kind)},
}))`,
    messages: `export const Message = Chart.ChartMessage
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {} })`,
    update: `export const update = (model: Model, _message: Message): Update.Return<Model, Message> => ({ model: model })`,
    view: `export const view = (_model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${kind[0]?.toUpperCase() ?? ''}${kind.slice(1)} chart',
  body: h.main([], [Chart.eChart({ accessibleAlternative: h.p([], ['${kind} chart showing the documented values.']), ariaLabel: '${kind} chart example', hostId, toMessage: message => message }, h)]),
})`,
  })

const stepRegistration = (
  kind: Exclude<ChartUpstreamKind, 'demo' | 'rtl'>,
): string => {
  const series = `series: [{ data: [186, 305, 237, 73, 209, 214], itemStyle: { borderRadius: 4, color: theme.chart2 }, name: 'Desktop', type: 'bar' }, { data: [80, 200, 120, 190, 130, 140], itemStyle: { borderRadius: 4, color: theme.chart1 }, name: 'Mobile', type: 'bar' }]`
  const hiddenAxis = `xAxis: { axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, data: labels, type: 'category' }`
  const hiddenY = `yAxis: { axisLabel: { show: false }, splitLine: { show: false }, type: 'value' }`
  switch (kind) {
    case 'step-basic':
      return `${series},
  ${hiddenAxis},
  ${hiddenY}`
    case 'step-grid':
      return `grid: Chart.compactGrid(),
  ${series},
  ${hiddenAxis},
  yAxis: Chart.valueAxis(theme)`
    case 'step-axis':
      return `grid: Chart.compactGrid(),
  ${series},
  xAxis: Chart.categoryAxis(theme, labels, { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme)`
    case 'step-tooltip':
      return `grid: Chart.compactGrid(),
  ${series},
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, labels, { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme)`
    case 'step-legend':
      return `grid: Chart.compactGrid({ bottom: 42 }),
  legend: Chart.legendOptions(theme),
  ${series},
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, labels, { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme)`
  }
}

const stepSource = (
  kind: Exclude<ChartUpstreamKind, 'demo' | 'rtl'>,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: `Chart — ${kind}`,
    imports: `import type { EChartsOption } from 'echarts/types/dist/shared'
import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/chart'`,
    model: `export const Model = S.Struct({})
export type Model = typeof Model.Type

const hostId = '${chartUpstreamHostId(kind)}'
const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
Chart.registerChart(hostId, (theme): EChartsOption => ({
  ${stepRegistration(kind)},
}))`,
    messages: `export const Message = Chart.ChartMessage
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {} })`,
    update: `export const update = (model: Model, _message: Message): Update.Return<Model, Message> => ({ model: model })`,
    view: `export const view = (_model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Bar chart',
  body: h.main([], [Chart.eChart({ accessibleAlternative: h.p([], ['Bar chart of monthly desktop and mobile values.']), ariaLabel: 'Bar chart example', hostId, toMessage: message => message }, h)]),
})`,
  })

const rtlSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Chart — RTL',
    imports: `import type { EChartsOption } from 'echarts/types/dist/shared'
import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/chart'`,
    model: `export const Model = S.Struct({})
export type Model = typeof Model.Type

const hostId = '${chartUpstreamHostId('rtl')}'
const labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو']
Chart.registerChart(hostId, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ bottom: 42 }),
  legend: Chart.legendOptions(theme),
  series: [{ data: [186, 305, 237, 73, 209, 214], itemStyle: { borderRadius: 4, color: theme.chart2 }, name: 'سطح المكتب', type: 'bar' }, { data: [80, 200, 120, 190, 130, 140], itemStyle: { borderRadius: 4, color: theme.chart1 }, name: 'الجوال', type: 'bar' }],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, labels, { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme),
}))`,
    messages: `export const Message = Chart.ChartMessage
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {} })`,
    update: `export const update = (model: Model, _message: Message): Update.Return<Model, Message> => ({ model: model })`,
    view: `export const view = (_model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'RTL chart',
  body: h.main([], [h.div([h.Dir('rtl')], [Chart.eChart({ accessibleAlternative: h.p([], ['Bar chart of monthly desktop and mobile values.']), ariaLabel: 'Right-to-left bar chart example', hostId, toMessage: message => message }, h)])]),
})`,
  })

const demoDesktopData =
  '222, 97, 167, 242, 373, 301, 245, 409, 59, 261, 327, 292, 342, 137, 120, 138, 446, 364, 243, 89, 137, 224, 138, 387, 215, 75, 383, 122, 315, 454'
const demoMobileData =
  '150, 180, 120, 260, 290, 340, 180, 320, 110, 190, 350, 210, 380, 220, 170, 190, 360, 410, 180, 150, 200, 170, 230, 290, 250, 130, 420, 180, 240, 380'

const demoSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Chart — interactive bar chart',
    imports: `import type { EChartsOption } from 'echarts/types/dist/shared'
import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Card from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/card'
import * as Chart from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/chart'`,
    model: `export const Model = S.Struct({ activeChart: S.Literals(['desktop', 'mobile']) })
export type Model = typeof Model.Type

const hostId = '${chartUpstreamHostId('demo')}'
const labels = Array.from({ length: 30 }, (_, index) => \`Apr \${index + 1}\`)
const data = { desktop: [${demoDesktopData}], mobile: [${demoMobileData}] }
const totals = { desktop: data.desktop.reduce((a, b) => a + b, 0), mobile: data.mobile.reduce((a, b) => a + b, 0) }
Chart.registerChart(hostId, (theme, active): EChartsOption => ({
  grid: Chart.compactGrid({ left: 12, right: 12, top: 24 }),
  series: [{ data: active === 'mobile' ? data.mobile : data.desktop, itemStyle: { borderRadius: 2, color: active === 'mobile' ? theme.chart1 : theme.chart2 }, name: active === 'mobile' ? 'Mobile' : 'Desktop', type: 'bar' }],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, labels, { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme),
}))`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ChangedSeries = taggedStruct('ChangedSeries', { series: S.Literals(['desktop', 'mobile']) });
export const Message = S.Union([Chart.ChartMessage, ChangedSeries])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { activeChart: 'desktop' } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedSeries': return { model: { activeChart: message.series }, commands: [Chart.SyncChart({ hostId, variant: message.series })] }
    case 'ChartMounted':
    case 'ChartMountFailed':
    case 'CompletedSyncChart': return { model: model }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Interactive bar chart',
  body: h.main([], [
    Card.card({ children: [
      Card.cardHeader({ children: [
        Card.cardTitle({ children: ['Bar Chart - Interactive'] }, h),
        Card.cardDescription({ children: ['Showing total visitors for the last 3 months'] }, h),
        h.div([h.Class('flex')], (['desktop', 'mobile'] as const).map(key => h.button([h.Type('button'), h.DataAttribute('active', model.activeChart === key ? 'true' : 'false'), h.OnClick(ChangedSeries({ series: key }))], [key === 'desktop' ? 'Desktop' : 'Mobile', ' ', String(totals[key])]))),
      ] }, h),
      Card.cardContent({ children: [
        Chart.eChart({ accessibleAlternative: h.p([], ['Daily page views for April: desktop total 7,324, mobile total 7,250.']), ariaLabel: 'Bar chart of daily page views', hostId, toMessage: message => message, variant: model.activeChart }, h),
      ] }, h),
    ] }, h),
  ]),
})`,
  })

const tooltipSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  staticComponentApplication({
    componentName: 'Chart',
    componentSlug: 'chart',
    renderer,
    exampleName: 'Tooltip',
    ...(renderer !== 'tailwind'
      ? {
          componentImports:
            "import * as stylex from '@stylexjs/stylex'\nimport { layoutStyle } from '@/stylex/contracts'\nconst styles = stylex.create({ row: { display: 'flex', flexWrap: 'wrap', gap: '1rem' } })",
        }
      : {}),
    viewBody: `${renderer !== 'tailwind' ? "h.div([h.Class(stylex.props(styles.row).className ?? '')]" : "h.div([h.Class('flex flex-wrap gap-4')]"}, [
    Chart.chartTooltipContent({ config: { desktop: { label: 'Desktop', color: 'var(--chart-3)' } }, label: 'Page Views', items: [{ key: 'desktop', value: '12,486' }] }, h),
    Chart.chartTooltipContent({ config: { chrome: { label: 'Chrome', color: 'var(--chart-3)' }, firefox: { label: 'Firefox', color: 'var(--chart-4)' } }, label: 'Browser', items: [{ key: 'chrome', value: '1,286' }, { key: 'firefox', value: '1,000' }] }, h),
    Chart.chartTooltipContent({ config: { chrome: { label: 'Chrome', color: 'var(--chart-1)' } }, items: [{ key: 'chrome', value: '1,286' }] }, h),
  ])`,
  })

const chartExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  chartFixtures.map(fixture => ({
    title: fixture.title,
    ...('description' in fixture && fixture.description !== undefined
      ? { description: fixture.description }
      : {}),
    ...('sectionId' in fixture ? { sectionId: fixture.sectionId } : {}),
    ...('heroOnly' in fixture && fixture.heroOnly === true
      ? { heroOnly: true }
      : {}),
    previewClass: 'justify-stretch',
    code:
      fixture.kind === 'bar-svg' || fixture.kind === 'area-svg'
        ? staticSource(fixture.kind, renderer)
        : fixture.kind === 'lifecycle' || fixture.kind === 'states'
          ? lifecycleSource(renderer)
          : fixture.kind === 'demo'
            ? demoSource(renderer)
            : fixture.kind === 'tooltip'
              ? tooltipSource(renderer)
              : fixture.kind === 'rtl'
                ? rtlSource(renderer)
                : isChartUpstreamKind(fixture.kind)
                  ? stepSource(fixture.kind, renderer)
                  : familySource(fixture.kind, renderer),
  }))

export const chartExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, chartExamplesFor(renderer))
