import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export type ScrollAreaProps = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
  orientation?: 'vertical' | 'horizontal' | 'both'
  direction?: 'ltr' | 'rtl'
  ariaLabel?: string
  tabIndex?: number
}>

export const scrollArea = <Msg>(
  props: ScrollAreaProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'both'

  return h.div(
    [
      h.DataAttribute('slot', 'scroll-area'),
      h.DataAttribute('orientation', orientation),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.Tabindex(props.tabIndex ?? 0),
      h.Class(
        cn(
          'relative size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent',
          orientation === 'vertical'
            ? 'overflow-y-auto overflow-x-hidden'
            : orientation === 'horizontal'
              ? 'overflow-x-auto overflow-y-hidden'
              : 'overflow-auto',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}
