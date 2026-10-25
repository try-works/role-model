import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import { Progress as ProgressPrimitive } from '@foldkit/ui'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { foundationTokens } from './foundations-tokens.stylex'
import { complexTokens } from './complex-tokens.stylex'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx CircularProgress (packages/lab/src/CircularProgress/CircularProgress.tsx) —
   examples and visual spec adapted to Crease UI tokens. Astryx's variant-tinted
   track (20% muted variants) has no token here, so the track circle renders the
   variant stroke at 20% opacity — the same visual tint.
   PORT-NOTE: needs motion tokens 'motionLoopExtraSlow' (4s) and 'motionLoopLonger'
   (3s) — astryx slows the indeterminate spin under prefers-reduced-motion;
   this port keeps the standard durations. */

const rotationFrames = stylex.keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
})

const dashFrames = stylex.keyframes({
  '0%': { strokeDasharray: '2% 300%', strokeDashoffset: '0%' },
  '50%': { strokeDasharray: '175% 300%', strokeDashoffset: '-68%' },
  '100%': { strokeDasharray: '2% 300%', strokeDashoffset: '-302%' },
})

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    position: 'relative',
  },
  rootLabelled: {
    gap: '0.25rem',
    flexDirection: 'column',
  },
  svg: { display: 'block' },
  svgDeterminate: { transform: 'rotate(-90deg)' },
  svgIndeterminate: {
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: rotationFrames,
    animationTimingFunction: interactionTokens.easingLinear,
  },
  track: { fill: 'none' },
  trackAccent: { stroke: foundationTokens.primarySoft20 },
  trackSuccess: { stroke: complexTokens.successSoft20 },
  trackWarning: { stroke: complexTokens.warningSoft20 },
  trackError: { stroke: complexTokens.destructiveSoft20 },
  trackNeutral: { stroke: tokens.muted },
  fill: {
    fill: 'none',
    strokeLinecap: 'round',
  },
  fillDeterminate: {
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'stroke-dashoffset',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  fillIndeterminate: {
    animationDuration: interactionTokens.motionLoopMedium,
    animationIterationCount: 'infinite',
    animationName: dashFrames,
    animationTimingFunction: interactionTokens.easingStandard,
  },
  accent: { stroke: tokens.primary },
  success: { stroke: tokens.alertSuccess },
  warning: { stroke: tokens.alertWarning },
  error: { stroke: tokens.destructive },
  neutral: { stroke: tokens.mutedForeground },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  labelDisabled: { color: tokens.mutedForeground },
  ringWrapper: {
    display: 'inline-flex',
    position: 'relative',
  },
  center: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  valueLabel: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
  },
  srOnly: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
})

export type CircularProgressVariant =
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'
export type CircularProgressSize = 'sm' | 'md' | 'lg'

const SIZE_CONFIG: Readonly<
  Record<
    CircularProgressSize,
    Readonly<{ diameter: number; strokeWidth: number }>
  >
> = {
  sm: { diameter: 32, strokeWidth: 3 },
  md: { diameter: 48, strokeWidth: 4 },
  lg: { diameter: 64, strokeWidth: 5 },
}

export type CircularProgressProps = Readonly<{
  /** Current value. Ignored when isIndeterminate is true. */
  value?: number
  /** Maximum value. */
  max?: number
  /** Accessible label for the progress indicator. Required for a11y. */
  label: string
  /** When true (default), the label is visually hidden but stays accessible. */
  isLabelHidden?: boolean
  /** Shows the formatted value in the center of the ring. */
  hasValueLabel?: boolean
  /** Custom formatter for the value label; defaults to a percentage string. */
  formatValueLabel?: (value: number, max: number) => string
  /** Center content; takes precedence over hasValueLabel. */
  children?: ReadonlyArray<Html>
  size?: CircularProgressSize
  variant?: CircularProgressVariant
  /** Animated spinning indicator for unknown progress. */
  isIndeterminate?: boolean
  /** Grays out the ring and text for canceled or inactive operations. */
  isDisabled?: boolean
  /** Element id used to wire the label's aria-labelledby relationship. */
  id?: string
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

const defaultFormatValueLabel = (value: number, max: number): string =>
  `${max > 0 ? Math.round((value / max) * 100) : 0}%`

export const circularProgress = <Msg>(
  props: CircularProgressProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'md'
  const variant = props.variant ?? 'accent'
  const isIndeterminate = props.isIndeterminate === true
  const isDisabled = props.isDisabled === true
  const { diameter, strokeWidth } = SIZE_CONFIG[size]
  const radius = (diameter - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = diameter / 2

  const rawValue = props.value ?? 0
  const safeValue = Number.isFinite(rawValue) ? rawValue : 0
  const rawMax = props.max ?? 100
  const safeMax = Number.isFinite(rawMax) ? rawMax : 0
  const clampedValue = Math.min(Math.max(0, safeValue), safeMax)
  const percentage = safeMax > 0 ? clampedValue / safeMax : 0
  const dashoffset = circumference * (1 - percentage)
  const formatValueLabel = props.formatValueLabel ?? defaultFormatValueLabel
  const valueText = formatValueLabel(clampedValue, safeMax)

  const showLabel = props.isLabelHidden !== true
  const showValueLabel = props.hasValueLabel === true && !isIndeterminate
  const hasCenterContent =
    props.children !== undefined && props.children.length > 0
  const labelId =
    props.id === undefined ? undefined : ProgressPrimitive.labelId(props.id)

  const fillVariant = isDisabled ? 'neutral' : variant
  const trackVariant = isDisabled ? 'neutral' : variant
  const trackStyle =
    trackVariant === 'accent'
      ? styles.trackAccent
      : trackVariant === 'success'
        ? styles.trackSuccess
        : trackVariant === 'warning'
          ? styles.trackWarning
          : trackVariant === 'error'
            ? styles.trackError
            : styles.trackNeutral
  const fillStyle =
    fillVariant === 'accent'
      ? styles.accent
      : fillVariant === 'success'
        ? styles.success
        : fillVariant === 'warning'
          ? styles.warning
          : fillVariant === 'error'
            ? styles.error
            : styles.neutral

  return h.div(
    [
      h.DataAttribute('slot', 'circular-progress'),
      h.DataAttribute('variant', variant),
      h.DataAttribute('size', size),
      h.DataAttribute(
        'state',
        isIndeterminate ? 'indeterminate' : 'determinate',
      ),
      h.Class(
        className(
          styles.root,
          showLabel && styles.rootLabelled,
          props.layoutStyle,
        ),
      ),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
    ],
    [
      h.span(
        [
          ...(labelId === undefined ? [] : [h.Id(labelId)]),
          h.Class(
            className(
              showLabel ? styles.label : styles.srOnly,
              showLabel && isDisabled && styles.labelDisabled,
            ),
          ),
        ],
        [props.label],
      ),
      h.div(
        [h.Class(className(styles.ringWrapper))],
        [
          ProgressPrimitive.view(
            {
              id: props.id ?? 'circular-progress',
              ...(isIndeterminate ? {} : { value: clampedValue }),
              max: safeMax,
              ...(labelId === undefined
                ? { ariaLabel: props.label }
                : { ariaLabelledBy: labelId }),
              ...(isIndeterminate ? {} : { valueText: formatValueLabel }),
              toView: ({ progress: progressAttrs }) =>
                h.svg(
                  [
                    // Root div owns the element id; the svg carries progressbar semantics.
                    ...progressAttrs.filter(attr => attr._tag !== 'Id'),
                    h.Width(String(diameter)),
                    h.Height(String(diameter)),
                    h.ViewBox(`0 0 ${diameter} ${diameter}`),
                    h.Class(
                      className(
                        reset.svg,
                        styles.svg,
                        isIndeterminate
                          ? styles.svgIndeterminate
                          : styles.svgDeterminate,
                      ),
                    ),
                  ],
                  [
                    h.circle(
                      [
                        h.DataAttribute('slot', 'circular-progress-track'),
                        h.Class(className(styles.track, trackStyle)),
                        h.Cx(String(center)),
                        h.Cy(String(center)),
                        h.R(String(radius)),
                        h.StrokeWidth(String(strokeWidth)),
                      ],
                      [],
                    ),

                    h.circle(
                      [
                        h.DataAttribute('slot', 'circular-progress-fill'),
                        h.DataAttribute('variant', fillVariant),
                        h.Class(
                          className(
                            styles.fill,
                            fillStyle,
                            isIndeterminate
                              ? styles.fillIndeterminate
                              : styles.fillDeterminate,
                          ),
                        ),
                        h.Cx(String(center)),
                        h.Cy(String(center)),
                        h.R(String(radius)),
                        h.StrokeWidth(String(strokeWidth)),
                        ...(isIndeterminate
                          ? []
                          : [
                              h.StrokeDasharray(String(circumference)),
                              h.StrokeDashoffset(String(dashoffset)),
                            ]),
                      ],
                      [],
                    ),
                  ],
                ),
            },
            h,
          ),
          ...(hasCenterContent || showValueLabel
            ? [
                h.div(
                  [h.Class(className(styles.center))],
                  hasCenterContent
                    ? [...(props.children ?? [])]
                    : [
                        h.span(
                          [h.Class(className(styles.valueLabel))],
                          [valueText],
                        ),
                      ],
                ),
              ]
            : []),
        ],
      ),
    ],
  )
}
