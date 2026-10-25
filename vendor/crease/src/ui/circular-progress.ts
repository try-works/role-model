import { Progress as ProgressPrimitive } from '@foldkit/ui'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx CircularProgress (packages/lab/src/CircularProgress/CircularProgress.tsx) —
   examples and visual spec adapted to Crease UI tokens. The indeterminate
   dash/rotation keyframes live in src/styles.css as
   @keyframes circular-progress-rotate / circular-progress-dash. */

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

const FILL_VARIANT_CLASS: Readonly<Record<CircularProgressVariant, string>> = {
  accent: 'stroke-primary',
  success: 'stroke-success',
  warning: 'stroke-warning',
  error: 'stroke-destructive',
  neutral: 'stroke-muted-foreground',
}

const TRACK_VARIANT_CLASS: Readonly<Record<CircularProgressVariant, string>> = {
  accent: 'stroke-primary/20',
  success: 'stroke-success/20',
  warning: 'stroke-warning/20',
  error: 'stroke-destructive/20',
  neutral: 'stroke-muted',
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
  class?: string
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

  // The root div already owns the element id; the svg carries the
  // progressbar semantics, so drop the duplicated Id attribute.
  const svgProgressAttributes = (
    attrs: ReadonlyArray<Attribute<Msg>>,
  ): ReadonlyArray<Attribute<Msg>> => attrs.filter(attr => attr._tag !== 'Id')

  const svgAttrs = (attrs: ReadonlyArray<Attribute<Msg>>) => [
    ...svgProgressAttributes(attrs),
    h.Width(String(diameter)),
    h.Height(String(diameter)),
    h.ViewBox(`0 0 ${diameter} ${diameter}`),
    h.Class(
      isIndeterminate
        ? 'block animate-[circular-progress-rotate_2s_linear_infinite] motion-reduce:animate-[circular-progress-rotate_4s_linear_infinite]'
        : 'block -rotate-90',
    ),
  ]

  const trackCircle = h.circle(
    [
      h.DataAttribute('slot', 'circular-progress-track'),
      h.Fill('none'),
      h.Class(TRACK_VARIANT_CLASS[trackVariant]),
      h.Cx(String(center)),
      h.Cy(String(center)),
      h.R(String(radius)),
      h.StrokeWidth(String(strokeWidth)),
    ],
    [],
  )

  const fillCircle = isIndeterminate
    ? h.circle(
        [
          h.DataAttribute('slot', 'circular-progress-fill'),
          h.DataAttribute('variant', fillVariant),
          h.Fill('none'),
          h.Class(
            cn(
              'animate-[circular-progress-dash_1.5s_ease-in-out_infinite] motion-reduce:animate-[circular-progress-dash_3s_ease-in-out_infinite]',
              FILL_VARIANT_CLASS[fillVariant],
            ),
          ),
          h.Cx(String(center)),
          h.Cy(String(center)),
          h.R(String(radius)),
          h.StrokeWidth(String(strokeWidth)),
          h.StrokeLinecap('round'),
        ],
        [],
      )
    : h.circle(
        [
          h.DataAttribute('slot', 'circular-progress-fill'),
          h.DataAttribute('variant', fillVariant),
          h.Fill('none'),
          h.Class(
            cn(
              'transition-[stroke-dashoffset] duration-200 ease-in-out motion-reduce:transition-none',
              FILL_VARIANT_CLASS[fillVariant],
            ),
          ),
          h.Cx(String(center)),
          h.Cy(String(center)),
          h.R(String(radius)),
          h.StrokeWidth(String(strokeWidth)),
          h.StrokeLinecap('round'),
          h.StrokeDasharray(String(circumference)),
          h.StrokeDashoffset(String(dashoffset)),
        ],
        [],
      )

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
        cn(
          'relative inline-flex shrink-0 items-center justify-center',
          showLabel && 'flex-col gap-1',
          props.class,
        ),
      ),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
    ],
    [
      h.span(
        [
          ...(labelId === undefined ? [] : [h.Id(labelId)]),
          h.Class(
            cn(
              showLabel
                ? 'text-xs leading-5 font-medium text-muted-foreground'
                : 'sr-only',
              showLabel && isDisabled && 'text-muted-foreground/60',
            ),
          ),
        ],
        [props.label],
      ),
      h.div(
        [h.Class('relative inline-flex')],
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
                h.svg(svgAttrs(progressAttrs), [trackCircle, fillCircle]),
            },
            h,
          ),
          ...(hasCenterContent || showValueLabel
            ? [
                h.div(
                  [
                    h.Class(
                      'pointer-events-none absolute inset-0 flex items-center justify-center',
                    ),
                  ],
                  hasCenterContent
                    ? [...(props.children ?? [])]
                    : [
                        h.span(
                          [
                            h.Class(
                              cn(
                                'text-xs leading-5 text-muted-foreground',
                                isDisabled && 'text-muted-foreground/60',
                              ),
                            ),
                          ],
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
