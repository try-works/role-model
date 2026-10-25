import * as stylex from '@stylexjs/stylex'
import { Progress as ProgressPrimitive } from '@foldkit/ui'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { normalizeProgress } from '@/lib/progress'

const indeterminateFrames = stylex.keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(100%)' },
})

const styles = stylex.create({
  root: {
    borderRadius: foundationTokens.radiusFull,
    overflow: 'hidden',
    backgroundColor: foundationTokens.primarySoft20,
    position: 'relative',
    height: '0.5rem',
    width: '100%',
  },
  indicator: {
    flex: '1',
    backgroundColor: tokens.primary,
    transitionDuration: {
      default: interactionTokens.motionFast,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'transform',
    height: '100%',
    width: '100%',
  },
  indeterminate: {
    animationDuration: interactionTokens.motionLoopMedium,
    animationIterationCount: 'infinite',
    animationName: {
      default: indeterminateFrames,
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    animationTimingFunction: interactionTokens.easingStandard,
  },
})
export type ProgressProps = Readonly<{
  value: number | null
  max?: number
  ariaLabel?: string
  valueText?: string
  id?: string
  direction?: 'ltr' | 'rtl'
  layoutStyle?: ComponentLayoutStyle
}>
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
            h.Class(className(styles.root, props.layoutStyle)),
          ],
          [
            h.div(
              [
                h.DataAttribute('slot', 'progress-indicator'),
                h.Class(
                  className(
                    styles.indicator,
                    normalized.value === null && styles.indeterminate,
                  ),
                ),
                h.Style({
                  transform:
                    normalized.percentage === null
                      ? 'translateX(-60%)'
                      : `translateX(${(props.direction === 'rtl' ? 1 : -1) * (100 - normalized.percentage)}%)`,
                }),
              ],
              [],
            ),
          ],
        ),
    },
    h,
  )
}
