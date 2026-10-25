import type { Html, HtmlBuilder } from 'foldkit/html'

import { barChart } from '@/ui/chart'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import { progress } from '@/ui/progress'
import { separator } from '@/ui/separator'

const chartData = [
  { label: '6a', value: 1.2 },
  { label: '8a', value: 2.8 },
  { label: '10a', value: 3.1 },
  { label: '12p', value: 2.4 },
  { label: '2p', value: 3.4 },
  { label: '4p', value: 2.9 },
  { label: '6p', value: 3.8 },
  { label: '8p', value: 3.2 },
] as const

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Power Usage'] }, h),
              cardDescription({ children: ['Whole Home'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex flex-col gap-4',
            children: [
              barChart(
                {
                  data: chartData,
                  class: 'h-[140px] w-full',
                },
                h,
              ),
              separator({}, h),
              h.div(
                [h.Class('grid grid-cols-2 gap-4')],
                [
                  h.div(
                    [h.Class('flex flex-col gap-0.5')],
                    [
                      h.span(
                        [h.Class('text-sm text-muted-foreground')],
                        ['Currently Using'],
                      ),
                      h.span(
                        [h.Class('text-lg font-semibold tabular-nums')],
                        ['3.4 kW'],
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class('flex flex-col gap-0.5')],
                    [
                      h.span(
                        [h.Class('text-sm text-muted-foreground')],
                        ['Solar Gen'],
                      ),
                      h.span(
                        [
                          h.Class(
                            'text-lg font-semibold text-chart-1 tabular-nums',
                          ),
                        ],
                        ['+1.2 kW'],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'flex-col items-start gap-1 py-2.5',
            children: [
              h.span(
                [h.Class('text-sm text-muted-foreground')],
                ['Battery Level'],
              ),
              h.div(
                [h.Class('flex w-full items-center gap-2')],
                [
                  progress({ value: 85, class: 'flex-1' }, h),
                  h.span(
                    [h.Class('text-sm font-medium tabular-nums')],
                    ['85%'],
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
}

// Stateful? no. Submodels wired: none. PORT NOTEs: Recharts replaced by @/ui/chart barChart.
