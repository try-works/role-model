import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/pleat/card'
import { className } from '@/pleat/style'
import { tokens } from '../../pleat/tokens'

const styles = {
  description: Style.make({
    fontSize: '0.875rem',
    lineHeight: 1.625,
    marginTop: '0.75rem',
  }),
  link: Style.make({
    color: 'inherit',
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px',
  }).pipe(Style.when(When.hover, { color: tokens.primary })),
}

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
                  children: [
                    h.span(
                      [h.Class(className(styles.description))],
                      [
                        h.a(
                          [
                            h.Href('#'),
                            h.Class(className(reset.link, styles.link)),
                          ],
                          ['Over time'],
                        ),
                        ', this smooths out the average cost of your investments. When prices drop, your fixed amount buys more shares. When prices rise, you buy fewer. The result is a lower average cost per share compared to lump-sum investing during volatile periods.',
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
  )
}

// Stateful: no. Submodels: none. PORT NOTEs: none.
