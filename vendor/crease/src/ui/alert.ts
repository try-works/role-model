import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'
import {
  alertSemantics,
  type AlertAnnouncement,
  type AlertSeverity,
} from '@/lib/alert'

export * from '@/lib/alert'

export const alertVariants = cva(
  'relative grid w-full grid-cols-[1rem_1fr] items-start gap-x-3 gap-y-0.5 rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current',
        info: 'bg-card text-primary',
        success: 'bg-card text-success',
        warning: 'bg-card text-warning',
        error: 'bg-card text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type AlertVariants = VariantProps<typeof alertVariants>

type Slot = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
}>

export type AlertProps = Slot &
  Readonly<{
    variant?: AlertVariants['variant']
    severity?: AlertSeverity
    announcement: AlertAnnouncement
  }>

export const alert = <Msg>(props: AlertProps, h: HtmlBuilder<Msg>): Html => {
  const severity =
    props.severity ?? (props.variant === 'destructive' ? 'error' : 'info')
  const semantics = alertSemantics(props.announcement)
  return h.div(
    [
      h.DataAttribute('slot', 'alert'),
      h.DataAttribute('severity', severity),
      ...(semantics.role === undefined ? [] : [h.Role(semantics.role)]),
      ...(semantics.live === undefined ? [] : [h.AriaLive(semantics.live)]),
      h.Class(cn(alertVariants({ variant: severity }), props.class)),
    ],
    [...props.children],
  )
}

export const alertIcon = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'alert-icon'),
      h.AriaHidden(true),
      h.Class(cn('col-start-1 row-span-2 [&>svg]:size-4', props.class)),
    ],
    [...props.children],
  )

export const alertTitle = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'alert-title'),
      h.Class(
        cn('col-start-2 min-h-4 font-medium tracking-tight', props.class),
      ),
    ],
    [...props.children],
  )
}

export const alertDescription = <Msg>(
  props: Slot,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'alert-description'),
      h.Class(
        cn(
          'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}
