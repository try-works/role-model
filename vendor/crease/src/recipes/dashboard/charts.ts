import * as Chart from '@/ui/chart'
import { ranges, type Range } from './data'

export const chartIds = [
  'revenue-chart',
  'acquisition-chart',
  'plans-chart',
] as const

Chart.registerChart('revenue-chart', (theme, variant) => {
  const data = ranges[variant as Range] ?? ranges['30d']
  return {
    animationDuration: 400,
    tooltip: Chart.tooltipOptions(theme),
    grid: {
      left: 4,
      right: 12,
      top: 18,
      bottom: 8,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: Chart.categoryAxis(theme, data.dates),
    yAxis: {
      ...Chart.valueAxis(theme, {
        showLabels: true,
        axisLabel: { fontSize: 11, formatter: value => `$${value / 1000}k` },
      }),
      splitNumber: 4,
    },
    series: [
      {
        name: 'This period',
        type: 'line',
        smooth: 0.35,
        showSymbol: false,
        data: [...data.current],
        lineStyle: { color: theme.chart2, width: 2.5 },
        itemStyle: { color: theme.chart2 },
        areaStyle: {
          color: Chart.areaGradient(theme.chart2, { from: 0.18, to: 0.01 }),
        },
      },
      {
        name: 'Previous period',
        type: 'line',
        smooth: 0.35,
        showSymbol: false,
        data: [...data.previous],
        lineStyle: {
          color: theme.mutedForeground,
          type: 'dashed',
          width: 1.5,
          opacity: 0.5,
        },
        itemStyle: { color: theme.mutedForeground },
      },
    ],
  }
})

Chart.registerChart('acquisition-chart', theme => ({
  animationDuration: 400,
  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
  series: [
    {
      name: 'Customers',
      type: 'pie',
      radius: ['72%', '90%'],
      center: ['50%', '50%'],
      padAngle: 4,
      label: { show: false },
      emphasis: { scaleSize: 3 },
      itemStyle: { borderRadius: 4 },
      data: [
        {
          name: 'Organic search',
          value: 48,
          itemStyle: { color: theme.chart2 },
        },
        { name: 'Direct', value: 28, itemStyle: { color: theme.chart3 } },
        { name: 'Referrals', value: 16, itemStyle: { color: theme.chart1 } },
        { name: 'Social', value: 8, itemStyle: { color: theme.chart4 } },
      ],
    },
  ],
}))

Chart.registerChart('plans-chart', (theme, variant) => {
  const total = (
    ranges[variant as Range] ?? ranges['30d']
  ).current.reduce<number>((a, b) => a + b, 0)
  return {
    animationDuration: 400,
    tooltip: Chart.tooltipOptions(theme),
    grid: {
      left: 4,
      right: 12,
      top: 10,
      bottom: 0,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: Chart.categoryAxis(
      theme,
      ['Starter', 'Growth', 'Business', 'Enterprise'],
      {
        boundaryGap: true,
      },
    ),
    yAxis: {
      ...Chart.valueAxis(theme, {
        showLabels: true,
        axisLabel: { fontSize: 11, formatter: value => `$${value / 1000}k` },
      }),
      splitNumber: 3,
    },
    series: [
      {
        name: 'Revenue',
        type: 'bar',
        barMaxWidth: 48,
        data: [0.12, 0.28, 0.38, 0.22].map((share, i) => ({
          value: Math.round(total * share),
          itemStyle: {
            color:
              [theme.chart2, theme.chart3, theme.chart1, theme.chart4][i] ??
              theme.chart2,
            borderRadius: [5, 5, 0, 0],
          },
        })),
      },
    ],
  }
})
