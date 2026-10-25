import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import { badge } from '@/stylex/badge'
import { button } from '@/stylex/button'
import { card, cardContent, cardDescription, cardTitle } from '@/stylex/card'
import { barChart } from '@/stylex/chart'
import { className } from '@/stylex/style'

const styles = stylex.create({
  grid: {
    gap: '0.75rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  amount: {
    fontSize: '1.5rem',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '2rem',
  },
  tabular: { fontVariantNumeric: 'tabular-nums' },
  paymentContent: {
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'space-between',
  },
  stack: { gap: '0.25rem', display: 'flex', flexDirection: 'column' },
  titleLarge: { fontSize: '1.5rem', lineHeight: '2rem' },
  payButton: { marginTop: '0.75rem', width: '100%' },
  activityCard: { gridColumnEnd: 'span 2', gridColumnStart: 'span 2' },
  activityContent: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  row: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  chart: { fontSize: '0.625rem', height: '5rem', width: '100%' },
  /* Component layout slot accepts positioning props only; fontSize stays on
     the wrapper so the chart's em-based internals inherit it. */
  chartSize: { height: '5rem', width: '100%' },
})

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
    [h.Class(className(styles.grid))],
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
                      children: [
                        h.span(
                          [h.Class(className(styles.amount))],
                          ['US$12.94'],
                        ),
                      ],
                    },
                    h,
                  ),
                  cardDescription(
                    {
                      children: [
                        h.span(
                          [h.Class(className(styles.tabular))],
                          ['US$11,337.06 Available'],
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
      card(
        {
          children: [
            cardContent(
              {
                children: [
                  h.div(
                    [h.Class(className(styles.paymentContent))],
                    [
                      h.div(
                        [h.Class(className(styles.stack))],
                        [
                          cardDescription({ children: ['Payment Due'] }, h),
                          h.div(
                            [h.Class(className(styles.titleLarge))],
                            [cardTitle({ children: ['1 Apr'] }, h)],
                          ),
                        ],
                      ),
                      h.div(
                        [h.Class(className(styles.payButton))],
                        [
                          button(
                            {
                              variant: 'outline',
                              size: 'sm',
                              children: ['Pay Early'],
                            },
                            h,
                          ),
                        ],
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
      h.div(
        [h.Class(className(styles.activityCard))],
        [
          card(
            {
              children: [
                cardContent(
                  {
                    children: [
                      h.div(
                        [h.Class(className(styles.activityContent))],
                        [
                          h.div(
                            [h.Class(className(styles.row))],
                            [
                              cardDescription(
                                { children: ['Yearly Activity'] },
                                h,
                              ),
                              badge(
                                {
                                  variant: 'secondary',
                                  children: ['+US$0.25 Daily Cash'],
                                },
                                h,
                              ),
                            ],
                          ),
                          h.div(
                            [h.Class(className(styles.chart))],
                            [
                              barChart(
                                {
                                  data: activityData.map(
                                    ({ month, amount }) => ({
                                      label: month.slice(0, 1),
                                      value: amount,
                                    }),
                                  ),
                                  isCompact: true,
                                  layoutStyle: styles.chartSize,
                                },
                                h,
                              ),
                            ],
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
      ),
    ],
  )
}

// Stateful: no. Submodels: none. PORT NOTE: Recharts is rendered with @/stylex/chart barChart.
