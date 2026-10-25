import type { Html, HtmlBuilder } from 'foldkit/html'

import { card, cardContent, cardFooter } from '@/ui/card'
import { donutChart } from '@/ui/chart'
import { separator } from '@/ui/separator'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const detail = (label: string, value: string, className: string): Html =>
    h.div(
      [h.Class('flex w-full items-center justify-between py-3')],
      [
        h.span([h.Class('text-sm text-muted-foreground')], [label]),
        h.span([h.Class(className)], [value]),
      ],
    )

  return card(
    {
      children: [
        cardContent(
          {
            children: [
              donutChart(
                {
                  value: 24000,
                  max: 30000,
                  label: '$24,000',
                  sublabel: '80% of $30,000',
                  class: 'mx-auto aspect-square max-h-[220px]',
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'flex-col gap-0 py-2.5',
            children: [
              detail(
                'Projected Finish',
                'October 2024',
                'text-sm font-semibold',
              ),
              separator({}, h),
              detail(
                'Monthly Average',
                '$1,250',
                'text-sm font-semibold tabular-nums',
              ),
              separator({}, h),
              detail(
                'Top Contributor',
                'Auto-Transfer',
                'text-sm font-semibold',
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

// Stateful: no. Submodels: none. PORT NOTE: Recharts PieChart is rendered with @/ui/chart donutChart.
