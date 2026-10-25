import type { Html, HtmlBuilder } from 'foldkit/html'
import type { StackProps } from '@/stylex/composition/stack'
import { cn } from '@/lib/utils'
import { element, attributes, gap, padding, align, justify } from './element'
export const stack = <M>(p: StackProps, h: HtmlBuilder<M>): Html =>
  element(
    p.as ?? 'div',
    attributes(
      cn(
        'flex min-w-0 flex-col',
        p.gap && gap[p.gap],
        p.padding && padding[p.padding],
        p.align && align[p.align],
        p.justify && justify[p.justify],
        p.width === 'full' && 'w-full',
        p.gridColumn === 'span2' && 'col-span-2',
        p.preset === 'chartGallery' &&
          'mx-auto w-full max-w-[1400px] gap-8 px-4 py-8 md:px-8',
      ),
      p.data,
      p.slot,
      h,
    ),
    p.children,
    h,
  )
