import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { interactionTokens } from './interaction-tokens.stylex.const'

const styles = stylex.create({
  root: {
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: {
      default: stylex.keyframes({
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
      }),
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    backgroundColor: foundationTokens.muted,
    borderRadius: foundationTokens.radiusMd,
  },
  circle: { borderRadius: '50%' },
  rectangle: { borderRadius: foundationTokens.radiusMd },
  text: { borderRadius: foundationTokens.radiusSm },
  sm: { height: '0.75rem', width: '6rem' },
  md: { height: '1rem', width: '8rem' },
  lg: { height: '3rem', width: '3rem' },
})

export type SkeletonProps = Readonly<{
  shape?: 'text' | 'rectangle' | 'circle'
  size?: 'sm' | 'md' | 'lg'
  layoutStyle?: ComponentLayoutStyle
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
