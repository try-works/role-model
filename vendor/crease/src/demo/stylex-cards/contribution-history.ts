import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import { button } from '@/stylex/button'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { barChart } from '@/stylex/chart'
import { item, itemContent, itemGroup } from '@/stylex/item'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'

const styles = stylex.create({
  eyebrow: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: '1.75rem',
  },
  summaryDescription: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  chart: { height: '12.5rem', width: '100%' },
  summaryGrid: {
    gap: '0.75rem',
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 768px)': 'repeat(2, minmax(0, 1fr))',
    },
    width: '100%',
  },
  footer: { paddingBlock: '0.625rem' },
  fullWidth: { width: '100%' },
})

const chartData = [
  { label: 'Dec', value: 800 },
  { label: 'Jan', value: 1100 },
  { label: 'Feb', value: 900 },
  { label: 'Mar', value: 1300 },
  { label: 'Apr', value: 750 },
  { label: 'May', value: 1400 },
]

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const summary = (label: string, value: string, description: string): Html =>
    item(
      {
        variant: 'muted',
        orientation: 'vertical',
        children: [
          itemContent(
            {
              children: [
                /* Mirrors ui/item itemDescription: the p carries the eyebrow
                   classes directly, keeping the line box at text-xs height. */
                h.p(
                  [
                    h.DataAttribute('slot', 'item-description'),
                    h.Class(className(reset.text, styles.eyebrow)),
                    h.Style({ WebkitLineClamp: '2' }),
                  ],
                  [label],
                ),
                h.span([h.Class(className(styles.summaryValue))], [value]),
                h.span(
                  [h.Class(className(styles.summaryDescription))],
                  [description],
                ),
              ],
            },
            h,
          ),
        ],
      },
      h,
    )

  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Contribution History'] }, h),
              cardDescription({ children: ['Last 6 months of activity'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              barChart({ data: chartData, layoutStyle: styles.chart }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.summaryGrid))],
                [
                  itemGroup(
                    {
                      children: [
                        summary('Upcoming', 'May 25, 2024', '$1,000 scheduled'),
                      ],
                    },
                    h,
                  ),
                  itemGroup(
                    {
                      children: [
                        summary(
                          'Auto-Save Plan',
                          'Accelerated',
                          'Recurring weekly',
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
                [h.Class(className(styles.footer, styles.fullWidth))],
                [
                  button(
                    {
                      layoutStyle: styles.fullWidth,
                      children: ['View Full Report'],
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

// Stateful: no. Submodels: none. PORT NOTE: Recharts is rendered with @/stylex/chart barChart.
