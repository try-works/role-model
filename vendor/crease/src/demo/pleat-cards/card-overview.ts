import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { badge } from '@/pleat/badge'
import { button } from '@/pleat/button'
import { card, cardContent, cardDescription, cardTitle } from '@/pleat/card'
import { barChart } from '@/pleat/chart'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  grid: Style.make({
    gap: '0.75rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  }),
  amount: Style.make({
    fontSize: '1.5rem',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '2rem',
  }),
  tabular: Style.make({ fontVariantNumeric: 'tabular-nums' }),
  paymentContent: Style.make({
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    justifyContent: 'space-between',
  }),
  stack: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  titleLarge: Style.make({ fontSize: '1.5rem', lineHeight: '2rem' }),
  payButton: Style.make({ marginTop: '0.75rem', width: '100%' }),
  activityCard: Style.make({
    gridColumnEnd: 'span 2',
    gridColumnStart: 'span 2',
  }),
  activityContent: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  row: Style.make({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  chart: Style.make({ fontSize: '0.625rem', height: '5rem', width: '100%' }),
  chartSize: layoutStyle({ height: '5rem', width: '100%' }),
}

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
