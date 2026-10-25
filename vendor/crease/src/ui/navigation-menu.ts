import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'
import * as Popover from '@/ui/popover'

type Slot = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
}>

export type NavigationMenuLayout = 'inline' | 'scroll' | 'responsive'

export const navigationMenu = <Msg>(
  props: Slot &
    Readonly<{
      ariaLabel?: string
      direction?: 'ltr' | 'rtl'
      layout?: NavigationMenuLayout
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.nav(
    [
      h.DataAttribute('slot', 'navigation-menu'),
      h.AriaLabel(props.ariaLabel ?? 'Main'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      h.DataAttribute('layout', props.layout ?? 'inline'),
      h.Class(
        cn(
          'relative z-10 flex max-w-max flex-1 items-center justify-center data-[layout=scroll]:max-w-full data-[layout=scroll]:overflow-x-auto data-[layout=responsive]:max-w-full',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const navigationMenuList = <Msg>(
  props: Slot & Readonly<{ layout?: NavigationMenuLayout }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.ul(
    [
      h.DataAttribute('slot', 'navigation-menu-list'),
      h.DataAttribute('layout', props.layout ?? 'inline'),
      h.Class(
        cn(
          'group flex flex-1 list-none items-center justify-center gap-1 data-[layout=scroll]:min-w-max data-[layout=scroll]:justify-start data-[layout=responsive]:max-md:flex-col data-[layout=responsive]:max-md:items-stretch',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const navigationMenuItem = <Msg>(
  props: Slot,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.li(
    [
      h.DataAttribute('slot', 'navigation-menu-item'),
      h.Class(props.class ?? ''),
    ],
    [...props.children],
  )
}

export const navigationMenuLink = <Msg>(
  props: Slot & Readonly<{ href: string; isActive?: boolean }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.a(
    [
      h.Href(props.href),
      h.DataAttribute('slot', 'navigation-menu-link'),
      ...(props.isActive === true
        ? [h.AriaCurrent('page'), h.DataAttribute('active', '')]
        : []),
      h.Class(
        cn(
          'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[active]:bg-accent/50',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export type NavigationMenuDisclosureProps<Msg> = Readonly<{
  model: Popover.Model
  toParentMessage: (message: Popover.Message) => Msg
  label: string
  content: Html | string
  class?: string
  ariaLabel?: string
  pointerIntent?: 'press' | 'hover-and-press'
}>

export const navigationMenuDisclosure = <Msg>(
  props: NavigationMenuDisclosureProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return Popover.popover(
    {
      model: props.model,
      toParentMessage: props.toParentMessage,
      trigger: h.span(
        [
          h.Class('flex items-center gap-1'),
          h.AriaLabel(props.ariaLabel ?? props.label),
          ...(props.pointerIntent === 'hover-and-press' && !props.model.isOpen
            ? [h.OnMouseMove(props.toParentMessage(Popover.RequestedOpen()))]
            : []),
        ],
        [
          props.label,
          Icon.chevronDown<Msg>(
            {
              class: cn(
                'relative top-px size-3 transition-transform duration-200 motion-reduce:transition-none',
                props.model.isOpen ? 'rotate-180' : undefined,
              ),
            },
            h,
          ),
        ],
      ),
      triggerClass: cn(
        'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        props.class,
      ),
      content: props.content,
      class: 'w-max min-w-[min(16rem,calc(100vw-2rem))]',
      align: 'start',
      focusSelector: '[data-slot="popover-content"] a',
    },
    h,
  )
}
