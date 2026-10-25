import { Style, When } from '@pleat/core'
import { className } from '@/pleat/style'
import * as Button from '@/pleat/button'
import { reset } from '@/pleat/reset'
import type { EChartsOption } from 'echarts/types/dist/shared'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import {
  chartData,
  chartFamilyHostId,
  chartFamilyKinds,
  chartFamilyOption,
  chartFixtures,
  chartUpstreamHostId,
  chartUpstreamKinds,
  chartUpstreamOption,
  demoTotals,
  isChartFamilyKind,
  isChartUpstreamKind,
  chartHostId,
} from '@/docs/components/pages/chart/shared'
import * as Card from '@/pleat/card'
import * as Chart from '@/pleat/chart'
import * as Table from '@/pleat/table'

import { layoutStyle } from '@/pleat/contracts'
Chart.registerChart(chartHostId, (theme, variant): EChartsOption => ({
  grid: Chart.compactGrid(),
  series: [
    {
      data:
        variant === 'quarter'
          ? [186, 305, 237, 314]
          : [186, 305, 237, 273, 209, 314],
      itemStyle: { color: theme.chart2 },
      name: 'Revenue',
      type: 'bar',
    },
  ],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(
    theme,
    variant === 'quarter'
      ? ['Q1', 'Q2', 'Q3', 'Q4']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    { boundaryGap: true },
  ),
  yAxis: Chart.valueAxis(theme, { showLabels: true }),
}))
for (const kind of chartFamilyKinds)
  Chart.registerChart(chartFamilyHostId(kind), theme =>
    chartFamilyOption(kind, theme),
  )
for (const kind of chartUpstreamKinds)
  Chart.registerChart(chartUpstreamHostId(kind), (theme, variant) =>
    chartUpstreamOption(kind, theme, variant),
  )

const styles = {
  button: layoutStyle({ marginBottom: '0.75rem' }),
  chart: layoutStyle({ marginInline: 'auto', maxWidth: '36rem' }),
  chartHost: Style.make({ height: '16rem', width: '100%' }),
  demoCard: layoutStyle({
    marginInline: 'auto',
    maxWidth: '36rem',
    width: '100%',
  }),
  demoRow: Style.make({
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'column',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      alignItems: 'center',
      flexDirection: 'row',
    }),
  ),
  demoTitle: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: 'center',
  }),
  demoButtons: Style.make({ display: 'flex' }),
  demoButton: Style.make({
    borderColor: 'var(--border)',
    borderStyle: 'solid',
    gap: '0.25rem',
    paddingBlock: '0.75rem',
    paddingInline: '1rem',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'center',
    textAlign: 'start',
    borderLeftWidth: 0,
    borderTopWidth: 1,
  }).pipe(
    Style.when(When.minWidth('640px'), {
      borderLeftWidth: 1,
      borderTopWidth: 0,
    }),
  ),
  demoButtonActive: Style.make({
    backgroundColor: 'color-mix(in oklab, var(--muted) 50%, transparent)',
  }),
  demoButtonBorder: Style.make({ borderLeftWidth: 1 }),
  demoLabel: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  demoTotal: Style.make({
    fontSize: '1.125rem',
    fontWeight: 700,
    lineHeight: 1,
  }),
  frame: Style.make({
    gap: '0.75rem',
    display: 'grid',
    marginInline: 'auto',
    maxWidth: '36rem',
    width: '100%',
  }),
  areaChart: layoutStyle({ marginBottom: '1rem' }),
  row: Style.make({ gap: '1rem', display: 'flex', flexWrap: 'wrap' }),
  stack: Style.make({ marginInline: 'auto', maxWidth: '36rem', width: '100%' }),
}

const table = <Msg>(h: HtmlBuilder<Msg>) =>
  Table.table(
    {
      children: [
        Table.tableCaption(
          { children: ['Revenue values shown in the chart.'] },
          h,
        ),
        Table.tableHeader(
          {
            children: [
              Table.tableRow(
                {
                  children: [
                    Table.tableHead({ children: ['Period'] }, h),
                    Table.tableHead({ children: ['Revenue'] }, h),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        Table.tableBody(
          {
            children: [
              ['Jan', '$186k'],
              ['Feb', '$305k'],
              ['Mar', '$237k'],
            ].map(([period, value]) =>
              Table.tableRow(
                {
                  children: [
                    Table.tableHead(
                      { scope: 'row', children: [period ?? ''] },
                      h,
                    ),
                    Table.tableCell({ children: [value ?? ''] }, h),
                  ],
                },
                h,
              ),
            ),
          },
          h,
        ),
      ],
    },
    h,
  )

const frame = <Msg>(children: ReadonlyArray<Html>, h: HtmlBuilder<Msg>): Html =>
  h.div([h.Class(className(styles.frame))], children)

export const chartPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const { variant, activeChart } = model as {
    variant: 'month' | 'quarter'
    activeChart: 'desktop' | 'mobile'
  }
  const kind = chartFixtures[index]?.kind
  const toMessage = (message: Chart.ChartMessage): Msg =>
    onMessageJson(JSON.stringify(message))
  if (kind === 'demo')
    return Card.card(
      {
        layoutStyle: styles.demoCard as ComponentLayoutStyle,
        children: [
          Card.cardHeader(
            {
              children: [
                h.div(
                  [h.Class(className(styles.demoRow))],
                  [
                    h.div(
                      [h.Class(className(styles.demoTitle))],
                      [
                        Card.cardTitle(
                          { children: ['Bar Chart - Interactive'] },
                          h,
                        ),
                        Card.cardDescription(
                          {
                            children: [
                              'Showing total visitors for the last 3 months',
                            ],
                          },
                          h,
                        ),
                      ],
                    ),
                    h.div(
                      [h.Class(className(styles.demoButtons))],
                      (['desktop', 'mobile'] as const).map((key, buttonIndex) =>
                        h.button(
                          [
                            h.Type('button'),
                            h.DataAttribute(
                              'active',
                              activeChart === key ? 'true' : 'false',
                            ),
                            h.OnClick(
                              onMessageJson(
                                JSON.stringify({
                                  _tag: 'ChangedSeries',
                                  series: key,
                                }),
                              ),
                            ),
                            h.Class(
                              className(
                                reset.button,
                                styles.demoButton,
                                activeChart === key
                                  ? styles.demoButtonActive
                                  : undefined,
                                buttonIndex === 1
                                  ? styles.demoButtonBorder
                                  : undefined,
                              ),
                            ),
                          ],
                          [
                            h.span(
                              [h.Class(className(styles.demoLabel))],
                              [key === 'desktop' ? 'Desktop' : 'Mobile'],
                            ),
                            h.span(
                              [h.Class(className(styles.demoTotal))],
                              [demoTotals[key].toLocaleString()],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            },
            h,
          ),
          Card.cardContent(
            {
              children: [
                h.div(
                  [h.Class(className(styles.chartHost))],
                  [
                    Chart.eChart(
                      {
                        accessibleAlternative: h.p(
                          [h.Class(className(reset.text))],
                          [
                            'Daily page views for April: desktop total 7,324, mobile total 7,250.',
                          ],
                        ),
                        ariaLabel: 'Bar chart of daily page views',
                        hostId: chartUpstreamHostId('demo'),
                        toMessage,
                        variant: activeChart,
                      },
                      h,
                    ),
                  ],
                ),
              ],
            },
            h,
          ),
        ],
      },
      h,
    )
  if (kind === 'tooltip')
    return h.div(
      [h.Class(className(styles.row))],
      [
        Chart.chartTooltipContent(
          {
            config: { desktop: { label: 'Desktop', color: 'var(--chart-3)' } },
            label: 'Page Views',
            items: [{ key: 'desktop', value: '12,486' }],
          },
          h,
        ),
        Chart.chartTooltipContent(
          {
            config: {
              chrome: { label: 'Chrome', color: 'var(--chart-3)' },
              firefox: { label: 'Firefox', color: 'var(--chart-4)' },
            },
            label: 'Browser',
            items: [
              { key: 'chrome', value: '1,286' },
              { key: 'firefox', value: '1,000' },
            ],
          },
          h,
        ),
        Chart.chartTooltipContent(
          {
            config: { chrome: { label: 'Chrome', color: 'var(--chart-1)' } },
            items: [{ key: 'chrome', value: '1,286' }],
          },
          h,
        ),
      ],
    )
  if (kind === 'rtl')
    return h.div(
      [h.Dir('rtl'), h.Class(className(styles.stack))],
      [
        Chart.eChart(
          {
            accessibleAlternative: h.p(
              [h.Class(className(reset.text))],
              ['Bar chart of monthly desktop and mobile values.'],
            ),
            ariaLabel: 'Right-to-left bar chart example',
            hostId: chartUpstreamHostId('rtl'),
            toMessage,
          },
          h,
        ),
      ],
    )
  if (kind !== undefined && isChartUpstreamKind(kind))
    return h.div(
      [h.Class(className(styles.stack))],
      [
        Chart.eChart(
          {
            accessibleAlternative: h.p(
              [h.Class(className(reset.text))],
              ['Bar chart of monthly desktop and mobile values.'],
            ),
            ariaLabel: 'Bar chart example',
            hostId: chartUpstreamHostId(kind),
            toMessage,
          },
          h,
        ),
      ],
    )
  if (kind === 'bar-svg')
    return Chart.barChart({ layoutStyle: styles.chart, data: chartData }, h)
  if (kind === 'area-svg')
    return h.div(
      [h.Class(className(styles.stack))],
      [
        Chart.areaChart(
          {
            layoutStyle: styles.areaChart,
            data: chartData.map(item => item.value),
          },
          h,
        ),
        Chart.chartLegend(
          {
            config: {
              visitors: { label: 'Visitors', color: 'var(--chart-2)' },
            },
          },
          h,
        ),
      ],
    )
  if (kind === 'lifecycle') {
    const change = onMessageJson(
      JSON.stringify({
        _tag: 'ChangedChartRange',
        variant: variant === 'month' ? 'quarter' : 'month',
      }),
    )
    return h.div(
      [h.Class(className(styles.stack))],
      [
        Button.button(
          {
            variant: 'outline',
            buttonAttributes: [h.Type('button'), h.OnClick(change)],
            layoutStyle: styles.button,
            children: [variant === 'month' ? 'Show quarters' : 'Show months'],
          },
          h,
        ),
        Chart.eChart(
          {
            accessibleAlternative: table(h),
            ariaLabel: 'Revenue by period',
            hostId: chartHostId,
            toMessage,
            variant,
          },
          h,
        ),
      ],
    )
  }
  if (kind === 'states')
    return frame(
      [
        Chart.eChart(
          {
            accessibleAlternative: h.p(
              [h.Class(className(reset.text))],
              ['Revenue data is loading.'],
            ),
            ariaLabel: 'Loading revenue',
            hostId: `${chartHostId}-loading`,
            state: 'loading',
            toMessage,
          },
          h,
        ),
        Chart.eChart(
          {
            accessibleAlternative: h.p(
              [h.Class(className(reset.text))],
              ['No revenue records are available.'],
            ),
            ariaLabel: 'Empty revenue',
            hostId: `${chartHostId}-empty`,
            state: 'empty',
            toMessage,
          },
          h,
        ),
        Chart.eChart(
          {
            accessibleAlternative: h.p(
              [h.Class(className(reset.text))],
              ['Revenue service is unavailable.'],
            ),
            ariaLabel: 'Revenue error',
            hostId: `${chartHostId}-error`,
            state: 'error',
            statusText: 'Revenue could not be loaded.',
            toMessage,
          },
          h,
        ),
      ],
      h,
    )
  return kind !== undefined && isChartFamilyKind(kind)
    ? h.div(
        [h.Class(className(styles.stack))],
        [
          Chart.eChart(
            {
              accessibleAlternative: h.p(
                [h.Class(className(reset.text))],
                [`${kind} chart showing the documented values.`],
              ),
              ariaLabel: `${kind} chart example`,
              hostId: chartFamilyHostId(kind),
              toMessage,
            },
            h,
          ),
        ],
      )
    : undefined
}
