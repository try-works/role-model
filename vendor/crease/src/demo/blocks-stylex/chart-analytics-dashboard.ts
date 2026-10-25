import type { EChartsOption } from 'echarts/types/dist/shared'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { badge } from '@/stylex/badge'
import {
  box,
  grid,
  inline,
  masterDetailPage,
  metricGrid,
  section,
  stack,
  text,
} from '@/stylex/composition'
import { icon } from '@/stylex/composition/icon'
import * as Chart from '@/stylex/integrations/echarts'
import {
  item,
  itemContent,
  itemDescription,
  itemGroup,
  itemMedia,
  itemTitle,
} from '@/stylex/item'

const AREA_HOST = 'stylex-block-chart-area'
const BAR_HOST = 'stylex-block-chart-bar'
const LINE_HOST = 'stylex-block-chart-line'
const PIE_HOST = 'stylex-block-chart-pie'
const RADAR_HOST = 'stylex-block-chart-radar'
const RADIAL_HOST = 'stylex-block-chart-radial'

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

Chart.registerChart(AREA_HOST, (theme): EChartsOption => ({
  grid: Chart.compactGrid(),
  series: [
    {
      areaStyle: {
        color: Chart.areaGradient(theme.chart1, { from: 0.42, to: 0.03 }),
      },
      data: [186, 245, 218, 312, 286, 354],
      itemStyle: { color: theme.chart1 },
      lineStyle: { color: theme.chart1, width: 2 },
      name: 'Revenue',
      showSymbol: false,
      smooth: 0.4,
      type: 'line',
    },
  ],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, MONTHS),
  yAxis: Chart.valueAxis(theme),
}))

Chart.registerChart(BAR_HOST, (theme): EChartsOption => ({
  grid: Chart.compactGrid(),
  series: [
    {
      data: [186, 305, 237, 273, 309, 354],
      itemStyle: { borderRadius: 4, color: theme.chart1 },
      name: 'Actual',
      type: 'bar',
    },
    {
      data: [210, 280, 260, 290, 300, 340],
      itemStyle: { borderRadius: 4, color: theme.chart2 },
      name: 'Target',
      type: 'bar',
    },
  ],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, MONTHS, { boundaryGap: true }),
  yAxis: Chart.valueAxis(theme),
}))

Chart.registerChart(LINE_HOST, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ bottom: 42 }),
  legend: Chart.legendOptions(theme),
  series: [
    {
      data: [142, 136, 158, 149, 172, 151],
      itemStyle: { color: theme.chart1 },
      lineStyle: { color: theme.chart1, width: 2 },
      name: 'API',
      showSymbol: false,
      smooth: 0.3,
      type: 'line',
    },
    {
      data: [98, 104, 101, 118, 109, 112],
      itemStyle: { color: theme.chart2 },
      lineStyle: { color: theme.chart2, width: 2 },
      name: 'Web',
      showSymbol: false,
      smooth: 0.3,
      type: 'line',
    },
  ],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: Chart.categoryAxis(theme, MONTHS),
  yAxis: Chart.valueAxis(theme),
}))

Chart.registerChart(PIE_HOST, (theme): EChartsOption => ({
  legend: Chart.legendOptions(theme),
  series: [
    {
      data: [
        { itemStyle: { color: theme.chart1 }, name: 'Organic', value: 38 },
        { itemStyle: { color: theme.chart2 }, name: 'Paid', value: 27 },
        { itemStyle: { color: theme.chart3 }, name: 'Partner', value: 21 },
        { itemStyle: { color: theme.chart4 }, name: 'Direct', value: 14 },
      ],
      emphasis: { scaleSize: 4 },
      center: ['50%', '43%'],
      label: { show: false },
      radius: ['42%', '68%'],
      type: 'pie',
    },
  ],
  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
}))

Chart.registerChart(RADAR_HOST, (theme): EChartsOption => ({
  radar: {
    axisName: {
      color: theme.mutedForeground,
      fontFamily: theme.fontFamily,
      fontSize: 11,
    },
    indicator: [
      { max: 100, name: 'Quality' },
      { max: 100, name: 'Speed' },
      { max: 100, name: 'Reach' },
      { max: 100, name: 'Trust' },
      { max: 100, name: 'Value' },
    ],
    splitArea: { areaStyle: { color: ['transparent'] } },
    splitLine: { lineStyle: { color: theme.border } },
  },
  series: [
    {
      areaStyle: { color: Chart.colorWithOpacity(theme.chart1, 0.18) },
      data: [{ name: 'Current', value: [82, 71, 64, 88, 76] }],
      itemStyle: { color: theme.chart1 },
      lineStyle: { color: theme.chart1, width: 2 },
      symbolSize: 5,
      type: 'radar',
    },
  ],
  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
}))

Chart.registerChart(RADIAL_HOST, (theme): EChartsOption => ({
  angleAxis: { max: 100, show: false, startAngle: 90, type: 'value' },
  polar: { radius: ['28%', '92%'] },
  radiusAxis: {
    axisLabel: { show: false },
    axisLine: { show: false },
    axisTick: { show: false },
    data: ['Compute', 'Storage', 'Network', 'Support'],
    type: 'category',
  },
  series: [
    {
      backgroundStyle: {
        color: Chart.colorWithOpacity(theme.mutedForeground, 0.12),
      },
      barWidth: '62%',
      coordinateSystem: 'polar',
      data: [
        { itemStyle: { color: theme.chart1 }, value: 78 },
        { itemStyle: { color: theme.chart2 }, value: 64 },
        { itemStyle: { color: theme.chart3 }, value: 47 },
        { itemStyle: { color: theme.chart4 }, value: 83 },
      ],
      name: 'Budget used',
      roundCap: true,
      showBackground: true,
      type: 'bar',
    },
  ],
  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
}))

const metric = <Message>(
  label: string,
  value: string,
  delta: string,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      children: [
        stack(
          {
            children: [
              inline(
                {
                  children: [
                    text(
                      {
                        children: [label],
                        tone: 'secondary',
                        variant: 'caption',
                      },
                      h,
                    ),
                    badge({ children: [delta], variant: 'outline' }, h),
                  ],
                  justify: 'between',
                  width: 'full',
                },
                h,
              ),
              text(
                { children: [value], numeric: 'tabular', variant: 'headingMd' },
                h,
              ),
            ],
            gap: 'sm',
          },
          h,
        ),
      ],
      padding: 'md',
      radius: 'lg',
      surface: 'card',
    },
    h,
  )

const insight = <Message>(
  title: string,
  description: string,
  iconName: string,
  h: HtmlBuilder<Message>,
): Html =>
  item(
    {
      children: [
        itemMedia(
          { children: [icon({ name: iconName }, h)], variant: 'icon' },
          h,
        ),
        itemContent(
          {
            children: [
              itemTitle({ children: [title] }, h),
              itemDescription({ children: [description] }, h),
            ],
          },
          h,
        ),
      ],
      size: 'sm',
    },
    h,
  )

const chartCard = <Message>(
  title: string,
  description: string,
  chart: Html,
  h: HtmlBuilder<Message>,
): Html =>
  section(
    { children: [chart], description, heading: title, surface: 'card' },
    h,
  )

export const chartAnalyticsDashboard = <Message>(
  toMessage: (message: Chart.ChartMessage) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  masterDetailPage(
    {
      detail: section(
        {
          children: [
            itemGroup(
              {
                children: [
                  insight(
                    'Revenue acceleration',
                    'Expansion revenue led the September increase.',
                    'trending-up',
                    h,
                  ),
                  insight(
                    'Latency watch',
                    'API latency remains inside the SLO but is trending upward.',
                    'timer',
                    h,
                  ),
                  insight(
                    'Organic growth',
                    'Organic acquisition is now the largest channel.',
                    'chart-pie',
                    h,
                  ),
                ],
                spacing: 'md',
              },
              h,
            ),
          ],
          description: 'Generated from the current reporting window',
          heading: 'Key insights',
        },
        h,
      ),
      detailBehavior: 'stack',
      header: [
        stack(
          {
            children: [
              text(
                {
                  as: 'h1',
                  children: ['Analytics overview'],
                  variant: 'headingMd',
                },
                h,
              ),
              text(
                {
                  as: 'p',
                  children: [
                    'Revenue, service performance and acquisition in one view.',
                  ],
                  tone: 'secondary',
                  variant: 'caption',
                },
                h,
              ),
            ],
            gap: 'xs',
          },
          h,
        ),
      ],
      master: [
        metricGrid(
          {
            children: [
              metric('Revenue', '$354k', '+14.6%', h),
              metric('Conversion', '4.82%', '+0.7 pts', h),
              metric('P95 latency', '151ms', '-8.1%', h),
              metric('Budget used', '68%', '+3.2 pts', h),
            ],
          },
          h,
        ),
        grid(
          {
            children: [
              chartCard(
                'Revenue trend',
                'Monthly recurring revenue',
                Chart.eChart(
                  {
                    size: 'dashboard',
                    accessibleAlternative: text(
                      {
                        as: 'p',
                        variant: 'inherit',
                        children: ['Monthly recurring revenue trend.'],
                      },
                      h,
                    ),
                    ariaLabel: 'Area chart of monthly recurring revenue',
                    hostId: AREA_HOST,
                    toMessage,
                  },
                  h,
                ),
                h,
              ),
              chartCard(
                'Actual vs target',
                'Monthly revenue performance',
                Chart.eChart(
                  {
                    size: 'dashboard',
                    accessibleAlternative: text(
                      {
                        as: 'p',
                        variant: 'inherit',
                        children: [
                          'Monthly actual and target revenue comparison.',
                        ],
                      },
                      h,
                    ),
                    ariaLabel:
                      'Grouped bar chart comparing actual revenue with target',
                    hostId: BAR_HOST,
                    toMessage,
                  },
                  h,
                ),
                h,
              ),
              chartCard(
                'Service latency',
                'API and web response time',
                Chart.eChart(
                  {
                    size: 'dashboard',
                    accessibleAlternative: text(
                      {
                        as: 'p',
                        variant: 'inherit',
                        children: ['API and web response-time comparison.'],
                      },
                      h,
                    ),
                    ariaLabel: 'Line chart comparing API and web latency',
                    hostId: LINE_HOST,
                    toMessage,
                  },
                  h,
                ),
                h,
              ),
              chartCard(
                'Acquisition mix',
                'Share of new customers by channel',
                Chart.eChart(
                  {
                    accessibleAlternative: text(
                      {
                        as: 'p',
                        variant: 'inherit',
                        children: [
                          'New-customer share by acquisition channel.',
                        ],
                      },
                      h,
                    ),
                    ariaLabel: 'Donut chart of acquisition channels',
                    hostId: PIE_HOST,
                    size: 'square',
                    toMessage,
                  },
                  h,
                ),
                h,
              ),
              chartCard(
                'Product readiness',
                'Weighted launch dimensions',
                Chart.eChart(
                  {
                    accessibleAlternative: text(
                      {
                        as: 'p',
                        variant: 'inherit',
                        children: [
                          'Weighted product launch-readiness dimensions.',
                        ],
                      },
                      h,
                    ),
                    ariaLabel: 'Radar chart of product readiness dimensions',
                    hostId: RADAR_HOST,
                    size: 'square',
                    toMessage,
                  },
                  h,
                ),
                h,
              ),
              chartCard(
                'Budget allocation',
                'Usage by operating category',
                Chart.eChart(
                  {
                    accessibleAlternative: text(
                      {
                        as: 'p',
                        variant: 'inherit',
                        children: ['Budget usage by operating category.'],
                      },
                      h,
                    ),
                    ariaLabel: 'Radial bar chart of budget usage',
                    hostId: RADIAL_HOST,
                    size: 'square',
                    toMessage,
                  },
                  h,
                ),
                h,
              ),
            ],
            columns: 'two',
            gap: 'md',
            width: 'full',
          },
          h,
        ),
      ],
      theme: 'comfortable',
    },
    h,
  )
