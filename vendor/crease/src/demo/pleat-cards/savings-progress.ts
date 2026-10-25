import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { card, cardContent, cardFooter } from '@/pleat/card'
import { donutChart } from '@/pleat/chart'
import { separator } from '@/pleat/separator'
import { className } from '@/pleat/style'
import { tokens } from '../../pleat/tokens'

const styles = {
  chart: Style.make({
    marginInline: 'auto',
    aspectRatio: '1 / 1',
    maxHeight: '13.75rem',
  }),
  detail: Style.make({
    paddingBlock: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  }),
  footer: Style.make({
    gap: 0,
    paddingBlock: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  label: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  value: Style.make({
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  valueNumeric: Style.make({ fontVariantNumeric: 'tabular-nums' }),
}

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const detail = (
    label: string,
    value: string,
    valueStyle: Style.Style | ReadonlyArray<Style.Style>,
  ): Html =>
    h.div(
      [h.Class(className(styles.detail))],
      [
        h.span([h.Class(className(styles.label))], [label]),
        h.span(
          [
            h.Class(
              className(
                ...(Array.isArray(valueStyle) ? valueStyle : [valueStyle]),
              ),
            ),
          ],
          [value],
        ),
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
