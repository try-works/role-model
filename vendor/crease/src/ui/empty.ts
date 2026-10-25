import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>

const slotDiv =
  (slot: string, baseClass: string) =>
  <Msg>(props: SlotProps, h: HtmlBuilder<Msg>): Html => {
    return h.div(
      [h.DataAttribute('slot', slot), h.Class(cn(baseClass, props.class))],
      [...props.children],
    )
  }

export const empty = slotDiv(
  'empty',
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12',
)

export const emptyHeader = slotDiv(
  'empty-header',
  'flex max-w-sm flex-col items-center gap-2 text-center',
)

export const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>

export type EmptyMediaProps = SlotProps &
  Readonly<{
    variant?: EmptyMediaVariants['variant']
  }>

export const emptyMedia = <Msg>(
  props: EmptyMediaProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'

  return h.div(
    [
      h.DataAttribute('slot', 'empty-icon'),
      h.DataAttribute('variant', variant),
      h.Class(cn(emptyMediaVariants({ variant }), props.class)),
    ],
    [...props.children],
  )
}

export const emptyTitle = <Msg>(props: SlotProps, h: HtmlBuilder<Msg>): Html =>
  h.h2(
    [
      h.DataAttribute('slot', 'empty-title'),
      h.Class(cn('text-lg font-medium tracking-tight', props.class)),
    ],
    [...props.children],
  )

export const emptyDescription = slotDiv(
  'empty-description',
  'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
)

export const emptyContent = slotDiv(
  'empty-content',
  'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
)
