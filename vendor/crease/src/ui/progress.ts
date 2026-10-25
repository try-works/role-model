import { Progress as ProgressPrimitive } from '@foldkit/ui'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { normalizeProgress } from '@/lib/progress'
import { cn } from '@/lib/utils'

export type ProgressProps = Readonly<{
  /** `null` renders an indeterminate progress indicator. */
  value: number | null
  max?: number
  ariaLabel?: string
  valueText?: string
  id?: string
  direction?: 'ltr' | 'rtl'
  class?: string
}>

// The primitive stamps Base UI state attrs (`data-state` loading/complete,
// `data-indeterminate`, `data-value`/`min`/`max`); crease carries a single
// `data-state` hook in its own vocabulary ('indeterminate' | 'determinate').
const PRIMITIVE_DATA_KEYS = new Set([
  'state',
  'indeterminate',
  'value',
  'min',
  'max',
])

const keepProgressAttribute = <Msg>(
  attr: Attribute<Msg>,
  hasId: boolean,
): boolean =>
  // The primitive always stamps an id and an aria-labelledby fallback; crease
  // keeps both optional, so drop them when the caller supplied neither.
  !(attr._tag === 'Id' && !hasId) &&
  !(attr._tag === 'AriaLabelledBy' && !hasId) &&
  !(attr._tag === 'DataAttribute' && PRIMITIVE_DATA_KEYS.has(attr.key))

export const progress = <Msg>(
  props: ProgressProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const normalized = normalizeProgress(props.value, props.max)
  const hasId = props.id !== undefined

  return ProgressPrimitive.view(
    {
      id: props.id ?? 'progress',
      ...(normalized.value === null ? {} : { value: normalized.value }),
      max: normalized.max,
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      ...(props.valueText === undefined ? {} : { valueText: props.valueText }),
      toView: ({ progress: progressAttrs }) =>
        h.div(
          [
            ...progressAttrs.filter(attr => keepProgressAttribute(attr, hasId)),
            ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
            h.DataAttribute('state', normalized.state),
            h.DataAttribute('slot', 'progress'),
            h.Class(
              cn(
                'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
                props.class,
              ),
            ),
          ],
          [
            h.div(
              [
                h.DataAttribute('slot', 'progress-indicator'),
                h.Class(
                  'h-full w-full flex-1 bg-primary transition-all motion-reduce:transition-none',
                ),
                h.Style({
                  transform:
                    normalized.percentage === null
                      ? 'translateX(-60%)'
                      : `translateX(${(props.direction === 'rtl' ? 1 : -1) * (100 - normalized.percentage)}%)`,
                }),
                ...(normalized.value === null
                  ? [
                      h.Class(
                        'animate-[progress-indeterminate_1.5s_ease-in-out_infinite] motion-reduce:animate-none',
                      ),
                    ]
                  : []),
              ],
              [],
            ),
          ],
        ),
    },
    h,
  )
}
