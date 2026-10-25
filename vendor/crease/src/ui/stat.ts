import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Stat (packages/lab/src/Stat/Stat.tsx) — examples and
   visual spec adapted to Crease UI tokens. Astryx's supporting-text role
   (12px/20px) maps to text-xs leading-5; the heading-2 value leading (1.4)
   rides along as an inline style since Tailwind's leading scale cannot
   express it. */

/** Trend direction of a delta; picks the glyph (up/down arrow, flat dash). */
export type StatDeltaDirection = 'up' | 'down' | 'flat'
/** Color tone of a delta; overrides the default direction mapping. */
export type StatDeltaSentiment = 'positive' | 'negative' | 'neutral'
/** Size variant controlling the value's font size. */
export type StatSize = 'sm' | 'md' | 'lg'

export type StatDelta = Readonly<{
  /** Pre-formatted change text, e.g. "+12.4%" or "-8 ms". */
  value: string
  /** Trend direction. Picks the glyph and the default sentiment. */
  direction: StatDeltaDirection
  /**
   * Overrides the direction-to-color mapping for inverted metrics where
   * down is good (error rate, latency): up maps to positive, down to
   * negative, flat to neutral by default.
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

/** Screen-reader text announced after the delta value. */
const DIRECTION_TEXT: Readonly<Record<StatDeltaDirection, string>> = {
  up: 'trending up',
  down: 'trending down',
  flat: 'flat',
}

/** Inline glyph paths (12x12 viewBox): up-right arrow, down-right arrow, dash. */
const DELTA_GLYPH_PATHS: Readonly<Record<StatDeltaDirection, string>> = {
  up: 'M3.5 8.5L8.5 3.5M8.5 3.5H4.75M8.5 3.5V7.25',
  down: 'M3.5 3.5L8.5 8.5M8.5 8.5H4.75M8.5 8.5V4.75',
  flat: 'M2.5 6H9.5',
}

const SENTIMENT_CLASS: Readonly<Record<StatDeltaSentiment, string>> = {
  positive: 'text-success',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
}

const VALUE_SIZE_CLASS: Readonly<Record<StatSize, string>> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
}

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
      h.Class('shrink-0'),
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
  class?: string
}>

export const stat = <Msg>(props: StatProps, h: HtmlBuilder<Msg>): Html => {
  const sentiment =
    props.delta === undefined
      ? undefined
      : (props.delta.sentiment ?? DIRECTION_SENTIMENT[props.delta.direction])

  return h.div(
    [
      h.DataAttribute('slot', 'stat'),
      h.DataAttribute('size', props.size ?? 'md'),
      h.Class(cn('flex min-w-0 flex-col items-start gap-1', props.class)),
    ],
    [
      h.span(
        [
          h.DataAttribute('slot', 'stat-label'),
          h.Class('text-xs leading-5 font-medium text-muted-foreground'),
        ],
        [props.label],
      ),
      h.span(
        [h.Class('flex min-w-0 items-baseline gap-2')],
        [
          h.span(
            [
              h.DataAttribute('slot', 'stat-value'),
              h.Class(
                cn(
                  'font-semibold text-foreground tabular-nums',
                  VALUE_SIZE_CLASS[props.size ?? 'md'],
                ),
              ),
              h.Style({ lineHeight: '1.4' }),
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
                      cn(
                        'inline-flex items-center gap-1 text-xs leading-5 font-medium tabular-nums whitespace-nowrap',
                        SENTIMENT_CLASS[sentiment],
                      ),
                    ),
                  ],
                  [
                    deltaGlyph(props.delta.direction, h),
                    props.delta.value,
                    h.span(
                      [h.Class('sr-only')],
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
                h.Class('text-xs leading-5 text-muted-foreground'),
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
                h.Class('mt-1 min-w-0 self-stretch'),
              ],
              [...props.media],
            ),
          ]),
    ],
  )
}
