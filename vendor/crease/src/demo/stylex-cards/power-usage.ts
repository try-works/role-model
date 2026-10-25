import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import { barChart } from '@/stylex/chart'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { separator } from '@/stylex/separator'
import { className } from '@/stylex/style'
import { foundationTokens } from '../../stylex/foundations-tokens.stylex'
import { tokens } from '../../stylex/tokens.stylex'
import { interactionCardTokens } from './interaction-card-tokens.stylex'

const styles = stylex.create({
  battery: {
    gap: '0.25rem',
    paddingBlock: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
  },
  batteryRow: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  },
  body: { gap: '1rem', display: 'flex', flexDirection: 'column' },
  chart: { height: '8.75rem', width: '100%' },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  metric: { gap: '0.125rem', display: 'flex', flexDirection: 'column' },
  metrics: {
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  progress: { flexGrow: 1 },
  progressIndicator: {
    backgroundColor: tokens.primary,
    height: '100%',
    width: '85%',
  },
  progressRoot: {
    borderRadius: interactionCardTokens.roundRadius,
    overflow: 'hidden',
    backgroundColor: foundationTokens.primarySoft,
    position: 'relative',
    height: '0.5rem',
    width: '100%',
  },
  usage: {
    fontSize: '1.125rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: '1.75rem',
  },
  usageAccent: { color: interactionCardTokens.usageAccent },
  value: {
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
})

const chartData = [
  { label: '6a', value: 1.2 },
  { label: '8a', value: 2.8 },
  { label: '10a', value: 3.1 },
  { label: '12p', value: 2.4 },
  { label: '2p', value: 3.4 },
  { label: '4p', value: 2.9 },
  { label: '6p', value: 3.8 },
  { label: '8p', value: 3.2 },
] as const

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Power Usage'] }, h),
              cardDescription({ children: ['Whole Home'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.body))],
                [
                  barChart(
                    {
                      data: chartData,
                      layoutStyle: styles.chart,
                    },
                    h,
                  ),
                  separator({}, h),
                  h.div(
                    [h.Class(className(styles.metrics))],
                    [
                      h.div(
                        [h.Class(className(styles.metric))],
                        [
                          h.span(
                            [h.Class(className(styles.label))],
                            ['Currently Using'],
                          ),
                          h.span(
                            [h.Class(className(styles.usage))],
                            ['3.4 kW'],
                          ),
                        ],
                      ),
                      h.div(
                        [h.Class(className(styles.metric))],
                        [
                          h.span(
                            [h.Class(className(styles.label))],
                            ['Solar Gen'],
                          ),
                          h.span(
                            [
                              h.Class(
                                className(styles.usage, styles.usageAccent),
                              ),
                            ],
                            ['+1.2 kW'],
                          ),
                        ],
                      ),
                    ],
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
                [h.Class(className(styles.battery))],
                [
                  h.span([h.Class(className(styles.label))], ['Battery Level']),
                  h.div(
                    [h.Class(className(styles.batteryRow))],
                    [
                      h.div(
                        [h.Class(className(styles.progress))],
                        [
                          h.div(
                            [
                              h.Role('progressbar'),
                              h.AriaLabel('Battery Level'),
                              h.AriaValuemin(0),
                              h.AriaValuemax(100),
                              h.AriaValuenow(85),
                              h.DataAttribute('state', 'determinate'),
                              h.DataAttribute('slot', 'progress'),
                              h.Class(className(styles.progressRoot)),
                            ],
                            [
                              h.div(
                                [
                                  h.DataAttribute('slot', 'progress-indicator'),
                                  h.Class(className(styles.progressIndicator)),
                                ],
                                [],
                              ),
                            ],
                          ),
                        ],
                      ),
                      h.span([h.Class(className(styles.value))], ['85%']),
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
  )
}

// Stateful? no. Submodels wired: none. PORT NOTEs: Recharts replaced by @/stylex/chart barChart.
