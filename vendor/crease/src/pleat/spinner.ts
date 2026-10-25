import { Style, When, Global } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { interactionTokens } from './interaction-tokens'
import { tokens } from './tokens'

const styles = {
  root: Style.make({
    animationDuration: interactionTokens.motionLoopFast,
    animationIterationCount: 'infinite',
    animationName: Global.keyframes('spinner-kf1', {
      to: { transform: 'rotate(360deg)' },
    }),
    animationTimingFunction: interactionTokens.easingLinear,
    height: '1rem',
    width: '1rem',
  }).pipe(Style.when(When.reducedMotion, { animationName: 'none' })),
  sm: Style.make({ height: '0.75rem', width: '0.75rem' }),
  md: Style.make({ height: '1rem', width: '1rem' }),
  lg: Style.make({ height: '1.5rem', width: '1.5rem' }),
  xl: Style.make({ height: '2rem', width: '2rem' }),
  current: Style.make({ color: 'currentColor' }),
  muted: Style.make({ opacity: 0.65 }),
  primary: Style.make({ color: tokens.primary }),
}
type SpinnerAccessibility =
  | Readonly<{ isDecorative: true; label?: never }>
  | Readonly<{ isDecorative?: false; label: string }>
export type SpinnerProps = SpinnerAccessibility &
  Readonly<{
    size?: 'sm' | 'md' | 'lg' | 'xl'
    tone?: 'current' | 'muted' | 'primary'
    /** Emits data-icon="inline-start|inline-end" for parent icon positioning. */
    dataIcon?: 'inline-start' | 'inline-end'
    layoutStyle?: ComponentLayoutStyle | undefined
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
