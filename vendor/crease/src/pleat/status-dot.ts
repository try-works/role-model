import { Style, When, Global } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'

/* Ported from Meta Astryx StatusDot.tsx — fixed 8px plate, pulse keyframes,
   and the --color-on-* ink pairings mapped onto Crease UI tokens. */
const pulseFrames = Global.keyframes('status-dot-pulse-frames', {
  '0%': { opacity: 1 },
  '50%': { opacity: 0.5 },
  '100%': { opacity: 1 },
})

const base = {
  root: Style.make({
    borderRadius: foundationTokens.radiusFull,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    lineHeight: 0,
    height: '0.5rem',
    width: '0.5rem',
  }),
  pulsing: Style.make({
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: pulseFrames,
    animationTimingFunction: interactionTokens.easingStandard,
  }).pipe(Style.when(When.reducedMotion, { animationName: 'none' })),
}

const variants = {
  success: Style.make({
    backgroundColor: tokens.alertSuccess,
    color: tokens.statusPlateInk,
  }),
  warning: Style.make({
    backgroundColor: tokens.alertWarning,
    color: tokens.statusWarningInk,
  }),
  error: Style.make({
    backgroundColor: tokens.destructive,
    color: tokens.statusPlateInk,
  }),
  accent: Style.make({
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  }),
  neutral: Style.make({
    backgroundColor: tokens.mutedForeground,
    color: tokens.background,
  }),
}

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
  layoutStyle?: ComponentLayoutStyle | undefined
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
