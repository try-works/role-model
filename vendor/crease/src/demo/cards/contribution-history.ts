import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/ui/button'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import { barChart } from '@/ui/chart'
import { item, itemContent, itemDescription } from '@/ui/item'

const chartData = [
  { label: 'Dec', value: 800 },
  { label: 'Jan', value: 1100 },
  { label: 'Feb', value: 900 },
  { label: 'Mar', value: 1300 },
  { label: 'Apr', value: 750 },
  { label: 'May', value: 1400 },
]

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const summary = (label: string, value: string, description: string): Html =>
    item(
      {
        variant: 'muted',
        class: 'flex-col items-stretch',
        children: [
          itemContent(
            {
              class: 'gap-1',
              children: [
                itemDescription(
                  {
                    class:
                      'text-xs font-medium tracking-wider text-muted-foreground uppercase',
                    children: [label],
                  },
                  h,
                ),
                h.span([h.Class('text-lg font-semibold')], [value]),
                h.span(
                  [h.Class('text-sm text-muted-foreground')],
                  [description],
                ),
              ],
            },
            h,
          ),
        ],
      },
      h,
    )

  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Contribution History'] }, h),
              cardDescription({ children: ['Last 6 months of activity'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              barChart(
                {
                  data: chartData,
                  class: 'h-[200px] w-full',
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              h.div(
                [h.Class('grid w-full grid-cols-1 gap-3 md:grid-cols-2')],
                [
                  summary('Upcoming', 'May 25, 2024', '$1,000 scheduled'),
                  summary('Auto-Save Plan', 'Accelerated', 'Recurring weekly'),
                ],
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'py-2.5',
            children: [
              button({ class: 'w-full', children: ['View Full Report'] }, h),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

// Stateful: no. Submodels: none. PORT NOTE: Recharts is rendered with @/ui/chart barChart.
