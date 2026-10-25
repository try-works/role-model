import type { Html, HtmlBuilder } from 'foldkit/html'
import type { InlineProps } from '@/stylex/composition/inline'
import { cn } from '@/lib/utils'
import { element, attributes, gap, align, justify } from './element'
export const inline = <M>(p: InlineProps, h: HtmlBuilder<M>): Html =>
  element(
    p.as ?? 'div',
    attributes(
      cn(
        'flex min-w-0 flex-row',
        p.gap && gap[p.gap],
        p.align && align[p.align],
        p.justify && justify[p.justify],
        p.width === 'full' && 'w-full',
        p.wrap && 'flex-wrap',
        p.variant === 'sectionTabs' && 'gap-1 border-b pb-2',
      ),
      p.data,
      p.slot,
      h,
    ),
    p.children,
    h,
  )
