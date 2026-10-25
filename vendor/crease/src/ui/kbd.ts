import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

type Slot = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
  icon?: 'inline-start' | 'inline-end'
}>

export const kbd = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.kbd(
    [
      h.DataAttribute('slot', 'kbd'),
      ...(props.icon === undefined
        ? []
        : [h.DataAttribute('icon', props.icon)]),
      h.Class(
        cn(
          "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const kbdGroup = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.kbd(
    [
      h.DataAttribute('slot', 'kbd-group'),
      h.Class(cn('inline-flex items-center gap-1', props.class)),
    ],
    [...props.children],
  )
}
