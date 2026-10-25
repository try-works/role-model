import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import { badge } from '@/stylex/badge'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { item, itemContent, itemGroup } from '@/stylex/item'
import { separator } from '@/stylex/separator'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'
import { cardDemoTokens } from './foundations-card-tokens.stylex'

const styles = stylex.create({
  balance: {
    fontSize: '3rem',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '3rem',
  },
  pendingDot: {
    borderRadius: cardDemoTokens.round,
    backgroundColor: cardDemoTokens.pendingIndicator,
    height: '0.5rem',
    width: '0.5rem',
  },
  content: {
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'flex-end',
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  value: {
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  total: {
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '1.25rem',
  },
  footer: { paddingBlock: '0.625rem' },
})

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
                  children: [
                    h.span([h.Class(className(styles.balance))], ['$0.00']),
                  ],
                },
                h,
              ),
              badge(
                {
                  variant: 'outline',
                  children: [
                    h.span([h.Class(className(styles.pendingDot))], []),
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
            children: [
              h.div(
                [h.Class(className(styles.content))],
                [
                  itemGroup(
                    {
                      children: [
                        item(
                          {
                            variant: 'muted',
                            orientation: 'vertical',
                            children: [
                              itemContent(
                                {
                                  spacing: 'md',
                                  children: [
                                    h.div(
                                      [h.Class(className(styles.row))],
                                      [
                                        h.span(
                                          [h.Class(className(styles.label))],
                                          ['Net Royalties'],
                                        ),
                                        h.span(
                                          [h.Class(className(styles.value))],
                                          ['$0.00'],
                                        ),
                                      ],
                                    ),
                                    h.div(
                                      [h.Class(className(styles.row))],
                                      [
                                        h.span(
                                          [h.Class(className(styles.label))],
                                          ['Processing Fee'],
                                        ),
                                        h.span(
                                          [h.Class(className(styles.value))],
                                          ['-$0.00'],
                                        ),
                                      ],
                                    ),
                                    separator({}, h),
                                    h.div(
                                      [h.Class(className(styles.row))],
                                      [
                                        h.span(
                                          [h.Class(className(styles.label))],
                                          ['Total Ready to Claim'],
                                        ),
                                        h.span(
                                          [h.Class(className(styles.total))],
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
                ],
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            children: [
              h.div(
                [h.Class(className(styles.footer))],
                [
                  cardDescription(
                    {
                      children: [
                        'Once your bank is connected, balances over $10.00 are automatically eligible for monthly distribution on the 15th of each month.',
                      ],
                    },
                    h,
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

// Stateful: no. Submodels: none. PORT NOTEs: none.
