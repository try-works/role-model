import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'

const styles = stylex.create({
  description: {
    fontSize: '0.875rem',
    lineHeight: 1.625,
    marginTop: '0.75rem',
  },
  link: {
    color: { default: 'inherit', ':hover': tokens.primary },
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px',
  },
})

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
