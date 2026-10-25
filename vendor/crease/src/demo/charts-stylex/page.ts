import type { EChartsOption } from 'echarts/types/dist/shared'
import { Match as M, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { interactiveAreaOption } from '@/demo/charts/interactive-area'
import type { ChartSection } from '@/route'
import { CHART_SECTIONS, chartsPath } from '@/route'
import { chartTab } from '@/stylex/composition/chart-tab'
import { box, grid, inline, section, stack, text } from '@/stylex/composition'
import * as Chart from '@/stylex/integrations/echarts'
import * as ToggleGroup from '@/stylex/toggle-group'

const SeriesChoice = S.Literals(['desktop', 'mobile'])
export type SeriesChoice = typeof SeriesChoice.Type

export const Model = S.Struct({
  areaRange: S.Literals(['90d', '30d', '7d']),
  barSeries: SeriesChoice,
  lineSeries: SeriesChoice,
  pieMonth: S.Literals([
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
  ]),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotChartMessage: { message: Chart.ChartMessage },
  SelectedAreaRange: { value: Model.fields.areaRange },
  SelectedBarSeries: { value: SeriesChoice },
  SelectedLineSeries: { value: SeriesChoice },
  SelectedPieMonth: { value: Model.fields.pieMonth },
})
export type Message = typeof Message.Type

export const init = (): Model => ({
  areaRange: '90d',
  barSeries: 'desktop',
  lineSeries: 'desktop',
  pieMonth: 'january',
})

type UpdateReturn = Update.Return<Model, Message>
const sync = (
  hostId: string,
  variant: string,
): ReadonlyArray<Command.Command<Message>> => [
  Command.mapMessage(Chart.SyncChart({ hostId, variant }), message =>
    Message.GotChartMessage({ message }),
  ),
]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotChartMessage: () => ({ model: model }),
      SelectedAreaRange: ({ value }) => ({
        model: modifyFields(model, { areaRange: () => value }),
        commands: sync('stylex-chart-area-interactive', value),
      }),
      SelectedBarSeries: ({ value }) => ({
        model: modifyFields(model, { barSeries: () => value }),
        commands: sync('stylex-chart-bar-interactive', value),
      }),
      SelectedLineSeries: ({ value }) => ({
        model: modifyFields(model, { lineSeries: () => value }),
        commands: sync('stylex-chart-line-interactive', value),
      }),
      SelectedPieMonth: ({ value }) => ({
        model: modifyFields(model, { pieMonth: () => value }),
        commands: sync('stylex-chart-pie-interactive', value),
      }),
    }),
  )

type ChartSpec = Readonly<{
  description: string
  id: string
  size?: Chart.EChartSize
  title: string
}>
const specs = (
  sectionName: ChartSection,
  entries: ReadonlyArray<readonly [string, string]>,
  size?: Chart.EChartSize,
): ReadonlyArray<ChartSpec> =>
  entries.map(([id, title]) => ({
    description: `${title} rendered through the shared Apache ECharts adapter.`,
    id: `${sectionName}-${id}`,
    ...(size === undefined ? {} : { size }),
    title,
  }))

export const SECTION_SPECS: Readonly<
  Record<ChartSection, ReadonlyArray<ChartSpec>>
> = {
  area: specs('area', [
    ['default', 'Area Chart'],
    ['linear', 'Area Chart - Linear'],
    ['step', 'Area Chart - Step'],
    ['stacked', 'Area Chart - Stacked'],
    ['stacked-expand', 'Area Chart - Stacked Expanded'],
    ['legend', 'Area Chart - Legend'],
    ['gradient', 'Area Chart - Gradient'],
    ['axes', 'Area Chart - Axes'],
    ['icons', 'Area Chart - Icons'],
    ['interactive', 'Area Chart - Interactive'],
  ]),
  bar: specs('bar', [
    ['default', 'Bar Chart'],
    ['horizontal', 'Bar Chart - Horizontal'],
    ['multiple', 'Bar Chart - Multiple'],
    ['stacked', 'Bar Chart - Stacked + Legend'],
    ['label', 'Bar Chart - Label'],
    ['label-custom', 'Bar Chart - Custom Label'],
    ['mixed', 'Bar Chart - Mixed'],
    ['active', 'Bar Chart - Active'],
    ['negative', 'Bar Chart - Negative'],
    ['interactive', 'Bar Chart - Interactive'],
  ]),
  line: specs('line', [
    ['default', 'Line Chart'],
    ['linear', 'Line Chart - Linear'],
    ['step', 'Line Chart - Step'],
    ['multiple', 'Line Chart - Multiple'],
    ['dots', 'Line Chart - Dots'],
    ['dots-custom', 'Line Chart - Custom Dots'],
    ['dots-colors', 'Line Chart - Dots Colors'],
    ['label', 'Line Chart - Label'],
    ['label-custom', 'Line Chart - Custom Label'],
    ['interactive', 'Line Chart - Interactive'],
  ]),
  pie: specs(
    'pie',
    [
      ['simple', 'Pie Chart'],
      ['separator-none', 'Pie Chart - Separator None'],
      ['label', 'Pie Chart - Label'],
      ['label-custom', 'Pie Chart - Custom Label'],
      ['label-list', 'Pie Chart - Label List'],
      ['legend', 'Pie Chart - Legend'],
      ['donut', 'Pie Chart - Donut'],
      ['donut-active', 'Pie Chart - Donut Active'],
      ['donut-text', 'Pie Chart - Donut with Text'],
      ['stacked', 'Pie Chart - Stacked'],
      ['interactive', 'Pie Chart - Interactive'],
    ],
    'square',
  ),
  radar: specs(
    'radar',
    [
      ['default', 'Radar Chart'],
      ['multiple', 'Radar Chart - Multiple'],
      ['dots', 'Radar Chart - Dots'],
      ['lines-only', 'Radar Chart - Lines Only'],
      ['label-custom', 'Radar Chart - Custom Label'],
      ['radius', 'Radar Chart - Radius Axis'],
      ['grid-custom', 'Radar Chart - Grid Custom'],
      ['grid-none', 'Radar Chart - Grid None'],
      ['grid-circle', 'Radar Chart - Grid Circle'],
      ['grid-circle-no-lines', 'Radar Chart - Grid Circle - No lines'],
      ['grid-circle-fill', 'Radar Chart - Grid Circle Filled'],
      ['grid-fill', 'Radar Chart - Grid Filled'],
      ['legend', 'Radar Chart - Legend'],
      ['icons', 'Radar Chart - Icons'],
    ],
    'square',
  ),
  radial: specs(
    'radial',
    [
      ['simple', 'Radial Chart'],
      ['label', 'Radial Chart - Label'],
      ['grid', 'Radial Chart - Grid'],
      ['text', 'Radial Chart - Text'],
      ['shape', 'Radial Chart - Shape'],
      ['stacked', 'Radial Chart - Stacked'],
    ],
    'square',
  ),
  tooltip: specs('tooltip', [
    ['default', 'Tooltip - Default'],
    ['label-custom', 'Tooltip - Custom label'],
    ['label-formatter', 'Tooltip - Label Formatter'],
    ['label-none', 'Tooltip - No Label'],
    ['formatter', 'Tooltip - Formatter'],
    ['icons', 'Tooltip - Icons'],
    ['indicator-line', 'Tooltip - Line Indicator'],
    ['indicator-none', 'Tooltip - No Indicator'],
    ['advanced', 'Tooltip - Advanced'],
  ]),
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const DESKTOP = [186, 305, 237, 273, 309, 354]
const MOBILE = [80, 200, 120, 190, 210, 248]

const cartesianOption = (
  spec: ChartSpec,
  theme: Chart.ChartTheme,
  variant: string,
): EChartsOption => {
  if (spec.id === 'area-interactive') {
    return interactiveAreaOption(theme, variant)
  }
  const isBar = spec.id.startsWith('bar-')
  const isArea = spec.id.startsWith('area-')
  const horizontal = spec.id.endsWith('-horizontal')
  const multiple = /multiple|stacked|legend|interactive/u.test(spec.id)
  const negative = spec.id.endsWith('-negative')
  const labels = /label/u.test(spec.id)
  const dots = /dots|icons/u.test(spec.id)
  const activeMobile = variant === 'mobile'
  const primary = activeMobile ? MOBILE : DESKTOP
  const values = negative
    ? primary.map((value, index) => (index % 2 === 0 ? value : -value))
    : primary
  const series = [
    {
      ...(isArea
        ? {
            areaStyle: {
              color: spec.id.endsWith('-gradient')
                ? Chart.areaGradient(theme.chart1)
                : Chart.colorWithOpacity(theme.chart1, 0.28),
            },
          }
        : {}),
      data: values,
      itemStyle: { borderRadius: isBar ? 4 : 0, color: theme.chart1 },
      label: {
        color: theme.foreground,
        show: labels,
        position: 'top' as const,
      },
      lineStyle: { color: theme.chart1, width: 2 },
      name: activeMobile ? 'Mobile' : 'Desktop',
      showSymbol: dots,
      smooth:
        spec.id.includes('linear') || spec.id.includes('step') ? false : 0.35,
      ...(spec.id.includes('step') ? { step: 'middle' as const } : {}),
      ...(spec.id.includes('stacked') ? { stack: 'traffic' } : {}),
      type: isBar ? ('bar' as const) : ('line' as const),
    },
    ...(multiple
      ? [
          {
            ...(isArea
              ? {
                  areaStyle: {
                    color: Chart.colorWithOpacity(theme.chart2, 0.22),
                  },
                }
              : {}),
            data: MOBILE,
            itemStyle: { borderRadius: isBar ? 4 : 0, color: theme.chart2 },
            lineStyle: { color: theme.chart2, width: 2 },
            name: 'Mobile',
            showSymbol: dots,
            smooth: 0.35,
            ...(spec.id.includes('stacked') ? { stack: 'traffic' } : {}),
            type: spec.id.endsWith('-mixed')
              ? ('line' as const)
              : isBar
                ? ('bar' as const)
                : ('line' as const),
          },
        ]
      : []),
  ]

  return {
    grid: Chart.compactGrid({ bottom: multiple ? 42 : 24 }),
    ...(multiple ? { legend: Chart.legendOptions(theme) } : {}),
    series,
    tooltip: Chart.tooltipOptions(theme),
    xAxis: horizontal
      ? Chart.valueAxis(theme)
      : Chart.categoryAxis(theme, MONTHS, { boundaryGap: isBar }),
    yAxis: horizontal
      ? {
          ...Chart.categoryAxis(theme, MONTHS, { boundaryGap: true }),
          inverse: true,
          type: 'category',
        }
      : Chart.valueAxis(theme, { showLabels: spec.id.endsWith('-axes') }),
  } as EChartsOption
}

const pieOption = (
  spec: ChartSpec,
  theme: Chart.ChartTheme,
  variant: string,
): EChartsOption => {
  const values = [275, 200, 187, 173, 90]
  const monthIndex = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
  ].indexOf(variant)
  const donut =
    spec.id.includes('donut') ||
    spec.id.includes('stacked') ||
    spec.id.includes('interactive')
  const data = values.map((value, index) => ({
    itemStyle: {
      color: [
        theme.chart1,
        theme.chart2,
        theme.chart3,
        theme.chart4,
        theme.chart5,
      ][index],
    },
    name: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'][index],
    ...(index === Math.max(0, monthIndex) ? { selected: true } : {}),
    value,
  }))
  const base = {
    center: ['50%', '46%'],
    data,
    label: { color: theme.foreground, show: spec.id.includes('label') },
    radius: donut ? ['42%', '70%'] : '70%',
    selectedOffset: 8,
    type: 'pie' as const,
  }
  return {
    ...(spec.id.includes('legend')
      ? { legend: Chart.legendOptions(theme) }
      : {}),
    series: spec.id.includes('stacked')
      ? [base, { ...base, data: data.slice(0, 3), radius: ['18%', '35%'] }]
      : [base],
    tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
  } as EChartsOption
}

const radarOption = (spec: ChartSpec, theme: Chart.ChartTheme): EChartsOption =>
  ({
    ...(spec.id.includes('legend') || spec.id.includes('icons')
      ? { legend: Chart.legendOptions(theme) }
      : {}),
    radar: {
      axisLine: {
        lineStyle: {
          color:
            spec.id.includes('no-lines') || spec.id.includes('grid-none')
              ? 'transparent'
              : theme.border,
        },
      },
      axisName: {
        color: theme.mutedForeground,
        fontFamily: theme.fontFamily,
        fontSize: 11,
      },
      indicator: ['January', 'February', 'March', 'April', 'May', 'June'].map(
        name => ({ max: 500, name }),
      ),
      shape: spec.id.includes('circle') ? 'circle' : 'polygon',
      splitArea: {
        areaStyle: {
          color: spec.id.includes('fill')
            ? [
                Chart.colorWithOpacity(theme.chart1, 0.04),
                Chart.colorWithOpacity(theme.chart1, 0.1),
              ]
            : ['transparent'],
        },
      },
      splitLine: {
        lineStyle: {
          color: spec.id.includes('grid-none') ? 'transparent' : theme.border,
        },
      },
    },
    series: [
      {
        areaStyle: {
          color: spec.id.includes('lines-only')
            ? 'transparent'
            : Chart.colorWithOpacity(theme.chart1, 0.18),
        },
        data: [
          { name: 'Desktop', value: DESKTOP },
          ...(spec.id.includes('multiple') ||
          spec.id.includes('legend') ||
          spec.id.includes('icons')
            ? [{ name: 'Mobile', value: MOBILE }]
            : []),
        ],
        itemStyle: { color: theme.chart1 },
        lineStyle: { color: theme.chart1, width: 2 },
        symbolSize: spec.id.includes('dots') ? 7 : 4,
        type: 'radar',
      },
    ],
    tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
  }) as EChartsOption

const radialOption = (
  spec: ChartSpec,
  theme: Chart.ChartTheme,
): EChartsOption =>
  ({
    angleAxis: {
      max: 400,
      show: spec.id.includes('grid'),
      startAngle: 90,
      type: 'value',
    },
    polar: {
      radius: spec.id.includes('text') ? ['35%', '88%'] : ['20%', '92%'],
    },
    radiusAxis: {
      axisLabel: { show: spec.id.includes('label') },
      axisLine: { show: false },
      axisTick: { show: false },
      data: MONTHS,
      type: 'category',
    },
    series: [
      {
        backgroundStyle: {
          color: Chart.colorWithOpacity(theme.mutedForeground, 0.12),
        },
        barWidth: spec.id.includes('shape') ? '38%' : '62%',
        coordinateSystem: 'polar',
        data: DESKTOP.map((value, index) => ({
          itemStyle: {
            color: [
              theme.chart1,
              theme.chart2,
              theme.chart3,
              theme.chart4,
              theme.chart5,
              theme.chart1,
            ][index],
          },
          value,
        })),
        name: 'Visitors',
        roundCap: !spec.id.includes('shape'),
        showBackground: true,
        ...(spec.id.includes('stacked') ? { stack: 'visitors' } : {}),
        type: 'bar',
      },
    ],
    tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
  }) as EChartsOption

const tooltipOption = (
  spec: ChartSpec,
  theme: Chart.ChartTheme,
): EChartsOption =>
  ({
    grid: Chart.compactGrid(),
    series: [
      {
        data: DESKTOP,
        itemStyle: { color: theme.chart1 },
        lineStyle: { color: theme.chart1, width: 2 },
        name: 'Desktop',
        showSymbol: spec.id.includes('icons'),
        smooth: 0.35,
        type: 'line',
      },
    ],
    tooltip: {
      ...Chart.tooltipOptions(theme),
      axisPointer: {
        type: spec.id.includes('indicator-line') ? 'line' : 'none',
      },
      ...(spec.id.includes('label-none') ? { showContent: false } : {}),
    },
    xAxis: Chart.categoryAxis(theme, MONTHS),
    yAxis: Chart.valueAxis(theme),
  }) as EChartsOption

for (const [sectionName, sectionSpecs] of Object.entries(
  SECTION_SPECS,
) as ReadonlyArray<readonly [ChartSection, ReadonlyArray<ChartSpec>]>) {
  for (const spec of sectionSpecs) {
    Chart.registerChart(
      `stylex-chart-${spec.id}`,
      (theme, variant): EChartsOption => ({
        ...Chart.updateAnimation(),
        ...(sectionName === 'pie'
          ? pieOption(spec, theme, variant)
          : sectionName === 'radar'
            ? radarOption(spec, theme)
            : sectionName === 'radial'
              ? radialOption(spec, theme)
              : sectionName === 'tooltip'
                ? tooltipOption(spec, theme)
                : cartesianOption(spec, theme, variant)),
      }),
    )
  }
}

const SECTION_LABELS: Readonly<Record<ChartSection, string>> = {
  area: 'Area Charts',
  bar: 'Bar Charts',
  line: 'Line Charts',
  pie: 'Pie Charts',
  radar: 'Radar Charts',
  radial: 'Radial Charts',
  tooltip: 'Tooltip',
}
const chartVariant = (model: Model, spec: ChartSpec): string =>
  spec.id === 'area-interactive'
    ? model.areaRange
    : spec.id === 'bar-interactive'
      ? model.barSeries
      : spec.id === 'line-interactive'
        ? model.lineSeries
        : spec.id === 'pie-interactive'
          ? model.pieMonth
          : ''

const choices = <Value extends string>(
  label: string,
  value: Value,
  values: ReadonlyArray<Value>,
  toMessage: (value: Value) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  ToggleGroup.toggleGroup<Message, Value>(
    {
      ariaLabel: label,
      arrangement: 'wrapped',
      items: values.map(choice => ({ children: [choice], value: choice })),
      onToggle: toMessage,
      size: 'sm',
      value,
      variant: 'outline',
    },
    h,
  )

const actions = (
  model: Model,
  spec: ChartSpec,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  spec.id === 'area-interactive'
    ? [
        choices(
          'Area range',
          model.areaRange,
          ['90d', '30d', '7d'],
          value => Message.SelectedAreaRange({ value }),
          h,
        ),
      ]
    : spec.id === 'bar-interactive'
      ? [
          choices(
            'Bar series',
            model.barSeries,
            ['desktop', 'mobile'],
            value => Message.SelectedBarSeries({ value }),
            h,
          ),
        ]
      : spec.id === 'line-interactive'
        ? [
            choices(
              'Line series',
              model.lineSeries,
              ['desktop', 'mobile'],
              value => Message.SelectedLineSeries({ value }),
              h,
            ),
          ]
        : spec.id === 'pie-interactive'
          ? [
              choices(
                'Pie month',
                model.pieMonth,
                ['january', 'february', 'march', 'april', 'may', 'june'],
                value => Message.SelectedPieMonth({ value }),
                h,
              ),
            ]
          : []

const chartCard = (
  model: Model,
  spec: ChartSpec,
  h: HtmlBuilder<Message>,
): Html =>
  section(
    {
      actions: actions(model, spec, h),
      children: [
        Chart.eChart(
          {
            accessibleAlternative: h.p(
              [],
              [`${spec.title}: ${spec.description}`],
            ),
            ariaLabel: `${spec.title}: ${spec.description}`,
            hostId: `stylex-chart-${spec.id}`,
            ...(spec.size === undefined ? {} : { size: spec.size }),
            toMessage: message => Message.GotChartMessage({ message }),
            variant: chartVariant(model, spec),
          },
          h,
        ),
      ],
      data: { 'chart-example': spec.id },
      description: spec.description,
      heading: spec.title,
      surface: 'card',
    },
    h,
  )

export const view = (
  model: Model,
  activeSection: ChartSection,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      as: 'main',
      children: [
        stack(
          {
            children: [
              stack(
                {
                  align: 'start',
                  children: [
                    text(
                      {
                        as: 'h1',
                        children: ['Beautiful Charts & Graphs'],
                        tone: 'accent',
                        variant: 'chartTitle',
                      },
                      h,
                    ),
                    text(
                      {
                        as: 'p',
                        children: [
                          'A collection of ready-to-use chart components built with Apache ECharts and foldkit, styled with CreaseUI. From basic charts to rich data displays.',
                        ],
                        variant: 'chartLead',
                      },
                      h,
                    ),
                  ],
                  gap: 'md',
                },
                h,
              ),
              box(
                {
                  as: 'nav',
                  children: [
                    inline(
                      {
                        align: 'center',
                        children: CHART_SECTIONS.map(sectionName =>
                          chartTab(
                            {
                              active: sectionName === activeSection,
                              children: [SECTION_LABELS[sectionName]],
                              href: chartsPath(sectionName),
                            },
                            h,
                          ),
                        ),
                        variant: 'sectionTabs',
                        width: 'full',
                        wrap: true,
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              grid(
                {
                  children: SECTION_SPECS[activeSection].map(spec =>
                    chartCard(model, spec, h),
                  ),
                  columns: 'gallery',
                  gap: 'lg',
                  width: 'full',
                },
                h,
              ),
            ],
            preset: 'chartGallery',
          },
          h,
        ),
      ],
      data: { page: 'charts-stylex', section: activeSection },
      minHeight: 'createPage',
      surface: 'page',
      width: 'content',
    },
    h,
  )
