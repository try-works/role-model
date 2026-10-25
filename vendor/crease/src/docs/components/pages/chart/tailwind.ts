import { taggedStruct } from 'foldkit/schema'
import type { EChartsOption } from 'echarts/types/dist/shared'
import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
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
import * as Card from '@/ui/card'
import * as Chart from '@/ui/chart'
import * as Table from '@/ui/table'

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

const Changed = taggedStruct('ChangedChartRange', {
  variant: S.Literals(['month', 'quarter']),
})
const ChangedSeries = taggedStruct('ChangedSeries', {
  series: S.Literals(['desktop', 'mobile']),
})
const Message = S.Union([Chart.ChartMessage, Changed, ChangedSeries])
type Message = typeof Message.Type
const Model = S.Struct({
  _docsPage: S.Literal('chart'),
  variant: S.Literals(['month', 'quarter']),
  activeChart: S.Literals(['desktop', 'mobile']),
})
type Model = typeof Model.Type

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

const familyChart = (
  kind: string,
  h: HtmlBuilder<Message>,
): Html | undefined =>
  isChartFamilyKind(kind)
    ? h.div(
        [h.Class('mx-auto w-full max-w-xl')],
        [
          Chart.eChart(
            {
              accessibleAlternative: h.p(
                [],
                [`${kind} chart showing the documented values.`],
              ),
              ariaLabel: `${kind} chart example`,
              hostId: chartFamilyHostId(kind),
              toMessage: message => message,
            },
            h,
          ),
        ],
      )
    : undefined

export const chartTailwindPreviewProgram = definePreviewProgram<Model, Message>(
  {
    Model,
    Message,
    init: () => ({
      _docsPage: 'chart',
      variant: 'month',
      activeChart: 'desktop',
    }),
    update: (model, message) =>
      message._tag === 'ChangedChartRange'
        ? {
            model: { ...model, variant: message.variant },
            commands: [
              Chart.SyncChart({
                hostId: chartHostId,
                variant: message.variant,
              }),
            ],
          }
        : message._tag === 'ChangedSeries'
          ? {
              model: { ...model, activeChart: message.series },
              commands: [
                Chart.SyncChart({
                  hostId: chartUpstreamHostId('demo'),
                  variant: message.series,
                }),
              ],
            }
          : { model },
    view: (index, model, h) => {
      const kind = chartFixtures[index]?.kind
      if (kind === 'demo')
        return Card.card(
          {
            class: 'mx-auto w-full max-w-xl',
            children: [
              Card.cardHeader(
                {
                  children: [
                    h.div(
                      [
                        h.Class(
                          'flex flex-col items-stretch sm:flex-row sm:items-center',
                        ),
                      ],
                      [
                        h.div(
                          [
                            h.Class(
                              'flex flex-1 flex-col justify-center gap-1',
                            ),
                          ],
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
                          [h.Class('flex')],
                          (['desktop', 'mobile'] as const).map(key =>
                            h.button(
                              [
                                h.Type('button'),
                                h.DataAttribute(
                                  'active',
                                  model.activeChart === key ? 'true' : 'false',
                                ),
                                h.OnClick(ChangedSeries({ series: key })),
                                h.Class(
                                  'flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l',
                                ),
                              ],
                              [
                                h.span(
                                  [h.Class('text-xs text-muted-foreground')],
                                  [key === 'desktop' ? 'Desktop' : 'Mobile'],
                                ),
                                h.span(
                                  [h.Class('text-lg font-bold leading-none')],
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
                      [h.Class('h-64 w-full')],
                      [
                        Chart.eChart(
                          {
                            accessibleAlternative: h.p(
                              [],
                              [
                                'Daily page views for April: desktop total 7,324, mobile total 7,250.',
                              ],
                            ),
                            ariaLabel: 'Bar chart of daily page views',
                            hostId: chartUpstreamHostId('demo'),
                            toMessage: message => message,
                            variant: model.activeChart,
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
          [h.Class('flex flex-wrap gap-4')],
          [
            Chart.chartTooltipContent(
              {
                config: {
                  desktop: { label: 'Desktop', color: 'var(--chart-3)' },
                },
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
                config: {
                  chrome: { label: 'Chrome', color: 'var(--chart-1)' },
                },
                items: [{ key: 'chrome', value: '1,286' }],
              },
              h,
            ),
          ],
        )
      if (kind === 'rtl')
        return h.div(
          [h.Dir('rtl'), h.Class('mx-auto w-full max-w-xl')],
          [
            Chart.eChart(
              {
                accessibleAlternative: h.p(
                  [],
                  ['Bar chart of monthly desktop and mobile values.'],
                ),
                ariaLabel: 'Right-to-left bar chart example',
                hostId: chartUpstreamHostId('rtl'),
                toMessage: message => message,
              },
              h,
            ),
          ],
        )
      if (kind !== undefined && isChartUpstreamKind(kind))
        return h.div(
          [h.Class('mx-auto w-full max-w-xl')],
          [
            Chart.eChart(
              {
                accessibleAlternative: h.p(
                  [],
                  ['Bar chart of monthly desktop and mobile values.'],
                ),
                ariaLabel: 'Bar chart example',
                hostId: chartUpstreamHostId(kind),
                toMessage: message => message,
              },
              h,
            ),
          ],
        )
      if (kind === 'bar-svg')
        return Chart.barChart({ class: 'mx-auto max-w-xl', data: chartData }, h)
      if (kind === 'area-svg')
        return h.div(
          [h.Class('mx-auto w-full max-w-xl space-y-4')],
          [
            Chart.areaChart({ data: chartData.map(item => item.value) }, h),
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
      if (kind === 'lifecycle')
        return h.div(
          [h.Class('mx-auto w-full max-w-xl space-y-3')],
          [
            h.button(
              [
                h.Type('button'),
                h.OnClick(
                  Changed({
                    variant: model.variant === 'month' ? 'quarter' : 'month',
                  }),
                ),
                h.Class('rounded-md border px-3 py-2 text-sm'),
              ],
              [model.variant === 'month' ? 'Show quarters' : 'Show months'],
            ),
            Chart.eChart(
              {
                accessibleAlternative: table(h),
                ariaLabel: 'Revenue by period',
                hostId: chartHostId,
                toMessage: message => message,
                variant: model.variant,
              },
              h,
            ),
          ],
        )
      if (kind === 'states')
        return h.div(
          [h.Class('mx-auto grid w-full max-w-xl gap-3')],
          [
            Chart.eChart(
              {
                accessibleAlternative: h.p([], ['Revenue data is loading.']),
                ariaLabel: 'Loading revenue',
                hostId: `${chartHostId}-loading`,
                state: 'loading',
                toMessage: message => message,
              },
              h,
            ),
            Chart.eChart(
              {
                accessibleAlternative: h.p(
                  [],
                  ['No revenue records are available.'],
                ),
                ariaLabel: 'Empty revenue',
                hostId: `${chartHostId}-empty`,
                state: 'empty',
                toMessage: message => message,
              },
              h,
            ),
            Chart.eChart(
              {
                accessibleAlternative: h.p(
                  [],
                  ['Revenue service is unavailable.'],
                ),
                ariaLabel: 'Revenue error',
                hostId: `${chartHostId}-error`,
                state: 'error',
                statusText: 'Revenue could not be loaded.',
                toMessage: message => message,
              },
              h,
            ),
          ],
        )
      return kind === undefined ? h.empty : (familyChart(kind, h) ?? h.empty)
    },
  },
)
