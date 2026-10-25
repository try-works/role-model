import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { card, cardContent, cardFooter } from '@/stylex/card'
import { donutChart } from '@/stylex/chart'
import { separator } from '@/stylex/separator'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'

const styles = stylex.create({
  chart: { marginInline: 'auto', aspectRatio: '1 / 1', maxHeight: '13.75rem' },
  detail: {
    paddingBlock: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  footer: {
    gap: 0,
    paddingBlock: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  value: { fontSize: '0.875rem', fontWeight: 600, lineHeight: '1.25rem' },
  valueNumeric: { fontVariantNumeric: 'tabular-nums' },
})

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const detail = (
    label: string,
    value: string,
    valueStyle: StaticStyles,
  ): Html =>
    h.div(
      [h.Class(className(styles.detail))],
      [
        h.span([h.Class(className(styles.label))], [label]),
        h.span([h.Class(className(valueStyle))], [value]),
      ],
    )

  return card(
    {
      children: [
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.chart))],
                [
                  donutChart(
                    {
                      value: 24000,
                      max: 30000,
                      label: '$24,000',
                      sublabel: '80% of $30,000',
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
                  detail('Projected Finish', 'October 2024', styles.value),
                  separator({}, h),
                  detail('Monthly Average', '$1,250', [
                    styles.value,
                    styles.valueNumeric,
                  ]),
                  separator({}, h),
                  detail('Top Contributor', 'Auto-Transfer', styles.value),
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

// Stateful: no. Submodels: none. PORT NOTE: Recharts PieChart is rendered with @/stylex/chart donutChart.
