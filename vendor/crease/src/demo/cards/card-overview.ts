import type { Html, HtmlBuilder } from 'foldkit/html'

import { badge } from '@/ui/badge'
import { button } from '@/ui/button'
import { card, cardContent, cardDescription, cardTitle } from '@/ui/card'
import { barChart } from '@/ui/chart'

const activityData = [
  { month: 'Jan', amount: 40 },
  { month: 'Feb', amount: 55 },
  { month: 'Mar', amount: 35 },
  { month: 'Apr', amount: 60 },
  { month: 'May', amount: 45 },
  { month: 'Jun', amount: 50 },
  { month: 'Jul', amount: 65 },
  { month: 'Aug', amount: 40 },
  { month: 'Sep', amount: 55 },
  { month: 'Oct', amount: 70 },
  { month: 'Nov', amount: 45 },
  { month: 'Dec', amount: 80 },
]

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return h.div(
    [h.Class('grid grid-cols-2 gap-3')],
    [
      card(
        {
          children: [
            cardContent(
              {
                children: [
                  cardDescription({ children: ['Card Balance'] }, h),
                  cardTitle(
                    {
                      class: 'text-2xl tabular-nums',
                      children: ['US$12.94'],
                    },
                    h,
                  ),
                  cardDescription(
                    {
                      class: 'tabular-nums',
                      children: ['US$11,337.06 Available'],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      ),
      card(
        {
          class: 'flex flex-col justify-between',
          children: [
            cardContent(
              {
                class: 'flex flex-1 flex-col justify-between',
                children: [
                  h.div(
                    [h.Class('flex flex-col gap-1')],
                    [
                      cardDescription({ children: ['Payment Due'] }, h),
                      cardTitle({ class: 'text-2xl', children: ['1 Apr'] }, h),
                    ],
                  ),
                  button(
                    {
                      variant: 'outline',
                      size: 'sm',
                      class: 'mt-3 w-full',
                      children: ['Pay Early'],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      ),
      card(
        {
          class: 'col-span-2',
          children: [
            cardContent(
              {
                class: 'flex flex-col gap-2',
                children: [
                  h.div(
                    [h.Class('flex items-center justify-between')],
                    [
                      cardDescription({ children: ['Yearly Activity'] }, h),
                      badge(
                        {
                          variant: 'secondary',
                          children: ['+US$0.25 Daily Cash'],
                        },
                        h,
                      ),
                    ],
                  ),
                  barChart(
                    {
                      data: activityData.map(({ month, amount }) => ({
                        label: month.slice(0, 1),
                        value: amount,
                      })),
                      class: 'h-20 w-full text-[10px]',
                      isCompact: true,
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      ),
    ],
  )
}

// Stateful: no. Submodels: none. PORT NOTE: Recharts is rendered with @/ui/chart barChart.
