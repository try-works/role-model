import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { tokens } from './tokens.stylex'

const styles = stylex.create({
  root: {
    animationDuration: interactionTokens.motionLoopFast,
    animationIterationCount: 'infinite',
    animationName: {
      default: stylex.keyframes({ to: { transform: 'rotate(360deg)' } }),
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    animationTimingFunction: interactionTokens.easingLinear,
    height: '1rem',
    width: '1rem',
  },
  sm: { height: '0.75rem', width: '0.75rem' },
  md: { height: '1rem', width: '1rem' },
  lg: { height: '1.5rem', width: '1.5rem' },
  xl: { height: '2rem', width: '2rem' },
  current: { color: 'currentColor' },
  muted: { opacity: 0.65 },
  primary: { color: tokens.primary },
})
type SpinnerAccessibility =
  | Readonly<{ isDecorative: true; label?: never }>
  | Readonly<{ isDecorative?: false; label: string }>
export type SpinnerProps = SpinnerAccessibility &
  Readonly<{
    size?: 'sm' | 'md' | 'lg' | 'xl'
    tone?: 'current' | 'muted' | 'primary'
    /** Emits data-icon="inline-start|inline-end" for parent icon positioning. */
    dataIcon?: 'inline-start' | 'inline-end'
    layoutStyle?: ComponentLayoutStyle
  }>
export const spinner = <Msg>(props: SpinnerProps, h: HtmlBuilder<Msg>): Html =>
  Icon.loaderCircle(
    {
      class: className(
        styles.root,
        styles[props.size ?? 'md'],
        styles[props.tone ?? 'current'],
        props.layoutStyle,
      ),
      ...(props.isDecorative ? {} : { ariaLabel: props.label }),
      ...(props.dataIcon === undefined ? {} : { dataIcon: props.dataIcon }),
    },
    h,
  )
