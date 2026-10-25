import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx Stat (packages/lab/src/Stat/Stat.tsx) — examples and
   visual spec adapted to Crease UI tokens. Astryx's supporting-text role
   (12px/20px) maps to 0.75rem/1.25rem; heading-2 leading (1.4) is kept
   verbatim. */

const styles = stylex.create({
  root: {
    gap: '0.25rem',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  valueRow: {
    gap: '0.5rem',
    alignItems: 'baseline',
    display: 'flex',
    minWidth: 0,
  },
  value: {
    color: tokens.foreground,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  /* TW applies inline line-height 1.4 on the value for every size. */
  valueSm: { fontSize: '1.25rem' },
  valueMd: { fontSize: '1.5rem' },
  valueLg: { fontSize: '1.875rem' },
  delta: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
  },
  positive: { color: tokens.alertSuccess },
  negative: { color: tokens.destructive },
  neutral: { color: tokens.mutedForeground },
  glyph: { flexShrink: 0 },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  },
  media: {
    alignSelf: 'stretch',
    marginTop: '0.25rem',
    minWidth: 0,
  },
})

export type StatDeltaDirection = 'up' | 'down' | 'flat'
export type StatDeltaSentiment = 'positive' | 'negative' | 'neutral'
export type StatSize = 'sm' | 'md' | 'lg'

export type StatDelta = Readonly<{
  /** Pre-formatted change text, e.g. "+12.4%" or "-8 ms". */
  value: string
  /** Trend direction. Picks the glyph and the default sentiment. */
  direction: StatDeltaDirection
  /**
   * Overrides the direction-to-color mapping for inverted metrics where
   * down is good: up maps to positive, down to negative, flat to neutral.
   */
  sentiment?: StatDeltaSentiment
}>

const DIRECTION_SENTIMENT: Readonly<
  Record<StatDeltaDirection, StatDeltaSentiment>
> = {
  up: 'positive',
  down: 'negative',
  flat: 'neutral',
}

const DIRECTION_TEXT: Readonly<Record<StatDeltaDirection, string>> = {
  up: 'trending up',
  down: 'trending down',
  flat: 'flat',
}

const DELTA_GLYPH_PATHS: Readonly<Record<StatDeltaDirection, string>> = {
  up: 'M3.5 8.5L8.5 3.5M8.5 3.5H4.75M8.5 3.5V7.25',
  down: 'M3.5 3.5L8.5 8.5M8.5 8.5H4.75M8.5 8.5V4.75',
  flat: 'M2.5 6H9.5',
}

const srOnly = stylex.create({
  text: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
})

const deltaGlyph = <Msg>(
  direction: StatDeltaDirection,
  h: HtmlBuilder<Msg>,
): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.ViewBox('0 0 12 12'),
      h.Width('12'),
      h.Height('12'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.Class(className(reset.svg, styles.glyph)),
      h.DataAttribute('slot', 'stat-delta-glyph'),
    ],
    [h.path([h.D(DELTA_GLYPH_PATHS[direction])], [])],
  )

export type StatProps = Readonly<{
  /** Metric name shown above the value, e.g. "Total requests". */
  label: string
  /** The headline metric, rendered large with tabular numerals. */
  value: string
  /** Change indicator rendered next to the value. */
  delta?: StatDelta
  /** Muted supporting line under the value, e.g. "vs. previous 30 days". */
  description?: string
  /** Trend slot rendered below the text content, e.g. a sparkline. */
  media?: ReadonlyArray<Html>
  /** Size variant controlling the value's font size. */
  size?: StatSize
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

export const stat = <Msg>(props: StatProps, h: HtmlBuilder<Msg>): Html => {
  const size = props.size ?? 'md'
  const sentiment =
    props.delta === undefined
      ? undefined
      : (props.delta.sentiment ?? DIRECTION_SENTIMENT[props.delta.direction])

  return h.div(
    [
      h.DataAttribute('slot', 'stat'),
      h.DataAttribute('size', size),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      h.span(
        [
          h.DataAttribute('slot', 'stat-label'),
          h.Class(className(styles.label)),
        ],
        [props.label],
      ),
      h.span(
        [h.Class(className(styles.valueRow))],
        [
          h.span(
            [
              h.DataAttribute('slot', 'stat-value'),
              h.Class(
                className(
                  styles.value,
                  size === 'sm'
                    ? styles.valueSm
                    : size === 'lg'
                      ? styles.valueLg
                      : styles.valueMd,
                ),
              ),
            ],
            [props.value],
          ),
          ...(props.delta === undefined || sentiment === undefined
            ? []
            : [
                h.span(
                  [
                    h.DataAttribute('slot', 'stat-delta'),
                    h.DataAttribute('sentiment', sentiment),
                    h.Class(
                      className(
                        styles.delta,
                        sentiment === 'positive'
                          ? styles.positive
                          : sentiment === 'negative'
                            ? styles.negative
                            : styles.neutral,
                      ),
                    ),
                  ],
                  [
                    deltaGlyph(props.delta.direction, h),
                    props.delta.value,
                    h.span(
                      [h.Class(className(srOnly.text))],
                      [`(${DIRECTION_TEXT[props.delta.direction]})`],
                    ),
                  ],
                ),
              ]),
        ],
      ),
      ...(props.description === undefined
        ? []
        : [
            h.span(
              [
                h.DataAttribute('slot', 'stat-description'),
                h.Class(className(styles.description)),
              ],
              [props.description],
            ),
          ]),
      ...(props.media === undefined
        ? []
        : [
            h.div(
              [
                h.DataAttribute('slot', 'stat-media'),
                h.Class(className(styles.media)),
              ],
              [...props.media],
            ),
          ]),
    ],
  )
}
