import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Dollar-Cost Averaging'] }, h),
              cardDescription(
                {
                  children: ['A strategy for building wealth over time.'],
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
              cardDescription(
                {
                  class: 'mt-3 text-sm leading-relaxed',
                  children: [
                    h.a(
                      [
                        h.Href('#'),
                        h.Class(
                          'underline underline-offset-4 hover:text-primary',
                        ),
                      ],
                      ['Over time'],
                    ),
                    ', this smooths out the average cost of your investments. When prices drop, your fixed amount buys more shares. When prices rise, you buy fewer. The result is a lower average cost per share compared to lump-sum investing during volatile periods.',
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
