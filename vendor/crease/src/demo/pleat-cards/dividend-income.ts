import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/demo/icon-preview'
import { button } from '@/pleat/button'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/pleat/card'
import { barChart } from '@/pleat/chart'
import {
  item,
  itemContent,
  itemDescription,
  itemGroup,
  itemTitle,
} from '@/pleat/item'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  visuallyHidden: Style.make({
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  }),
  chart: Style.make({ display: 'none', height: '2rem', width: '6rem' }).pipe(
    Style.when(When.minWidth('768px'), { display: 'block' }),
  ),
  chartSize: layoutStyle({ height: '2rem', width: '6rem' }),
  closeButton: layoutStyle({ height: '2rem', width: '2rem' }),
  amount: Style.make({
    display: 'none',
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }).pipe(Style.when(When.minWidth('768px'), { display: 'block' })),
}

const holdings = [
  {
    name: 'Vanguard VIG',
    shares: '450 Shares',
    amount: '$1,842.10',
    data: [
      { label: 'Q1', value: 380 },
      { label: 'Q2', value: 420 },
      { label: 'Q3', value: 390 },
      { label: 'Q4', value: 652 },
    ],
  },
  {
    name: 'S&P 500 VOO',
    shares: '112 Shares',
    amount: '$928.40',
    data: [
      { label: 'Q1', value: 180 },
      { label: 'Q2', value: 210 },
      { label: 'Q3', value: 320 },
      { label: 'Q4', value: 218 },
    ],
  },
  {
    name: 'Apple AAPL',
    shares: '85 Shares',
    amount: '$340.00',
    data: [
      { label: 'Q1', value: 60 },
      { label: 'Q2', value: 70 },
      { label: 'Q3', value: 120 },
      { label: 'Q4', value: 90 },
    ],
  },
  {
    name: 'Realty Income',
    shares: '320 Shares',
    amount: '$1,139.50',
    data: [
      { label: 'Q1', value: 240 },
      { label: 'Q2', value: 260 },
      { label: 'Q3', value: 280 },
      { label: 'Q4', value: 360 },
    ],
  },
]

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Q2 Dividend Income'] }, h),
              cardDescription(
                {
                  children: [
                    'Quarterly dividend payouts across your portfolio holdings.',
                  ],
                },
                h,
              ),
              cardAction(
                {
                  children: [
                    button(
                      {
                        variant: 'secondary',
                        size: 'icon',
                        layoutStyle: styles.closeButton,
                        children: [
                          Icon.icon('x', {}, h),
                          h.span(
                            [h.Class(className(styles.visuallyHidden))],
                            ['Close dividend income summary'],
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
        cardContent(
          {
            children: [
              itemGroup(
                {
                  spacing: 'md',
                  children: holdings.map(holding =>
                    item(
                      {
                        variant: 'muted',
                        children: [
                          itemContent(
                            {
                              children: [
                                itemTitle({ children: [holding.name] }, h),
                                itemDescription(
                                  { children: [holding.shares] },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          h.div(
                            [h.Class(className(styles.chart))],
                            [
                              barChart(
                                {
                                  data: holding.data,
                                  showXAxisLabels: false,
                                  layoutStyle: styles.chartSize,
                                },
                                h,
                              ),
                            ],
                          ),
                          h.span(
                            [h.Class(className(styles.amount))],
                            [holding.amount],
                          ),
                        ],
                      },
                      h,
                    ),
                  ),
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

// Stateful: no. Submodels: none. PORT NOTE: Recharts mini charts use @/stylex/chart barChart; icon-sm is matched with a size-8 class.
