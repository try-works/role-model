import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export type SeparatorProps = Readonly<{
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  class?: string
}>

export const separator = <Msg>(
  props: SeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'horizontal'

  return h.div(
    [
      h.DataAttribute('slot', 'separator'),
      h.DataAttribute('orientation', orientation),
      ...((props.decorative ?? true)
        ? [h.Role('none')]
        : [h.Role('separator'), h.AriaOrientation(orientation)]),
      h.Class(
        cn(
          'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
          props.class,
        ),
      ),
    ],
    [],
  )
}
