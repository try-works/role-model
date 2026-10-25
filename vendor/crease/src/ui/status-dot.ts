import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx StatusDot.tsx — 8px dot, variant plates, pulse
   animation and ink-on-plate icon contract adapted to Crease UI tokens.
   Success/warning/error/accent follow the alert component's chart-token
   convention; the icon ink stays a fixed light/dark pairing like astryx's
   --color-on-* tokens so it never follows the foreground theme flip. */
export const statusDotVariants = cva(
  'inline-flex size-2 shrink-0 items-center justify-center rounded-full leading-[0] [&>svg]:size-2 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        success: 'bg-success text-[oklch(0.985_0_0)]',
        warning: 'bg-warning text-[oklch(0.205_0_0)]',
        error: 'bg-destructive text-[oklch(0.985_0_0)]',
        accent: 'bg-primary text-primary-foreground',
        neutral: 'bg-muted-foreground text-background',
      },
      pulsing: {
        true: 'animate-pulse motion-reduce:animate-none',
      },
    },
    defaultVariants: {
      variant: 'success',
    },
  },
)

export type StatusDotVariants = VariantProps<typeof statusDotVariants>

export type StatusDotProps = Readonly<{
  /** The semantic color variant. */
  variant: NonNullable<StatusDotVariants['variant']>
  /** Accessible label describing the status (the dot's aria-label). */
  label: string
  /** Pulses the dot to indicate activity; honors prefers-reduced-motion. */
  pulsing?: boolean
  /** Optional icon content drawn into the 8px field in the variant's ink. */
  children?: ReadonlyArray<Html>
  class?: string
}>

export const statusDot = <Msg>(
  props: StatusDotProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'status-dot'),
      h.DataAttribute('variant', props.variant),
      h.Class(
        cn(
          statusDotVariants({
            variant: props.variant,
            ...(props.pulsing === undefined ? {} : { pulsing: props.pulsing }),
          }),
          props.class,
        ),
      ),
      h.Role('img'),
      h.AriaLabel(props.label),
    ],
    [...(props.children ?? [])],
  )
