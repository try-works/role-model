import { Style, When, Global } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { interactionTokens } from './interaction-tokens'

const styles = {
  root: Style.make({
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: Global.keyframes('skeleton-kf1', {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    }),
    backgroundColor: foundationTokens.muted,
    borderRadius: foundationTokens.radiusMd,
  }).pipe(Style.when(When.reducedMotion, { animationName: 'none' })),
  circle: Style.make({ borderRadius: '50%' }),
  rectangle: Style.make({ borderRadius: foundationTokens.radiusMd }),
  text: Style.make({ borderRadius: foundationTokens.radiusSm }),
  sm: Style.make({ height: '0.75rem', width: '6rem' }),
  md: Style.make({ height: '1rem', width: '8rem' }),
  lg: Style.make({ height: '3rem', width: '3rem' }),
}

export type SkeletonProps = Readonly<{
  shape?: 'text' | 'rectangle' | 'circle'
  size?: 'sm' | 'md' | 'lg'
  layoutStyle?: ComponentLayoutStyle | undefined
}>
export const skeleton = <Msg>(
  props: SkeletonProps = {},
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'skeleton'),
      h.AriaHidden(true),
      h.Class(
        className(
          styles.root,
          styles[props.shape ?? 'rectangle'],
          ...(props.size === undefined ? [] : [styles[props.size]]),
          props.layoutStyle,
        ),
      ),
    ],
    [],
  )
