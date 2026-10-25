import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx StatusDot.tsx — fixed 8px plate, pulse keyframes,
   and the --color-on-* ink pairings mapped onto Crease UI tokens. */
const pulseFrames = stylex.keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0.5 },
  '100%': { opacity: 1 },
})

const base = stylex.create({
  root: {
    borderRadius: foundationTokens.radiusFull,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    lineHeight: 0,
    height: '0.5rem',
    width: '0.5rem',
  },
  pulsing: {
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: {
      default: pulseFrames,
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    animationTimingFunction: interactionTokens.easingStandard,
  },
})

const variants = stylex.create({
  success: {
    backgroundColor: tokens.alertSuccess,
    color: tokens.statusPlateInk,
  },
  warning: {
    backgroundColor: tokens.alertWarning,
    color: tokens.statusWarningInk,
  },
  error: {
    backgroundColor: tokens.destructive,
    color: tokens.statusPlateInk,
  },
  accent: {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  neutral: {
    backgroundColor: tokens.mutedForeground,
    color: tokens.background,
  },
})

export type StatusDotVariant = keyof typeof variants

export type StatusDotProps = Readonly<{
  /** The semantic color variant. */
  variant: StatusDotVariant
  /** Accessible label describing the status (the dot's aria-label). */
  label: string
  /** Pulses the dot to indicate activity; honors prefers-reduced-motion. */
  pulsing?: boolean
  /** Optional icon content drawn into the 8px field in the variant's ink. */
  children?: ReadonlyArray<Html>
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

export const statusDot = <Msg>(
  props: StatusDotProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'status-dot'),
      h.Class(
        className(
          base.root,
          variants[props.variant],
          ...(props.pulsing === true ? [base.pulsing] : []),
          props.layoutStyle,
        ),
      ),
      h.Role('img'),
      h.AriaLabel(props.label),
    ],
    [...(props.children ?? [])],
  )
