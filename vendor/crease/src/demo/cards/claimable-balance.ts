import type { Html, HtmlBuilder } from 'foldkit/html'

import { badge } from '@/ui/badge'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import { item, itemContent } from '@/ui/item'
import { separator } from '@/ui/separator'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardDescription({ children: ['Claimable Balance'] }, h),
              cardTitle(
                {
                  class: 'text-5xl tabular-nums',
                  children: ['$0.00'],
                },
                h,
              ),
              badge(
                {
                  variant: 'outline',
                  children: [
                    h.span([h.Class('size-2 rounded-full bg-yellow-500')], []),
                    'Pending Setup',
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex flex-1 flex-col justify-end',
            children: [
              item(
                {
                  variant: 'muted',
                  class: 'flex-col items-stretch',
                  children: [
                    itemContent(
                      {
                        class: 'gap-3',
                        children: [
                          h.div(
                            [h.Class('flex items-center justify-between')],
                            [
                              h.span(
                                [h.Class('text-sm text-muted-foreground')],
                                ['Net Royalties'],
                              ),
                              h.span(
                                [h.Class('text-sm font-medium tabular-nums')],
                                ['$0.00'],
                              ),
                            ],
                          ),
                          h.div(
                            [h.Class('flex items-center justify-between')],
                            [
                              h.span(
                                [h.Class('text-sm text-muted-foreground')],
                                ['Processing Fee'],
                              ),
                              h.span(
                                [h.Class('text-sm font-medium tabular-nums')],
                                ['-$0.00'],
                              ),
                            ],
                          ),
                          separator({}, h),
                          h.div(
                            [h.Class('flex items-center justify-between')],
                            [
                              h.span(
                                [h.Class('text-sm text-muted-foreground')],
                                ['Total Ready to Claim'],
                              ),
                              h.span(
                                [h.Class('text-sm font-semibold tabular-nums')],
                                ['$0.00 USD'],
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
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'py-2.5',
            children: [
              cardDescription(
                {
                  children: [
                    'Once your bank is connected, balances over $10.00 are automatically eligible for monthly distribution on the 15th of each month.',
                  ],
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
  )
}

// Stateful: no. Submodels: none. PORT NOTEs: none.
