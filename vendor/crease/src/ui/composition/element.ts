import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import type { PrimitiveData } from '@/stylex/composition/types'
export const attributes = <M>(
  css: string,
  data: PrimitiveData | undefined,
  slot: string | undefined,
  h: HtmlBuilder<M>,
): ReadonlyArray<Attribute<M>> => [
  h.Class(css),
  ...Object.entries(data ?? {}).map(([key, value]) =>
    h.DataAttribute(key, String(value)),
  ),
  ...(slot === undefined ? [] : [h.DataAttribute('slot', slot)]),
]
export const gap = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-[var(--block-space-sm,0.75rem)]',
  md: 'gap-[var(--block-space-md,1rem)]',
  lg: 'gap-[var(--block-space-lg,1.5rem)]',
  xl: 'gap-10',
  xxl: 'gap-12',
  createBoard: 'gap-4 md:gap-10',
}
export const padding = {
  none: 'p-0',
  xs: 'p-1',
  sm: 'p-[var(--block-space-sm,0.75rem)]',
  md: 'p-[var(--block-space-md,1rem)]',
  lg: 'p-[var(--block-space-lg,1.5rem)]',
  xl: 'p-10',
  xxl: 'p-12',
  createBoard: 'p-4 md:p-10',
}
export const align = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}
export const justify = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}
export const element = <M>(
  as:
    | 'div'
    | 'section'
    | 'article'
    | 'aside'
    | 'main'
    | 'header'
    | 'footer'
    | 'nav'
    | 'ul'
    | 'ol'
    | 'li',
  attrs: ReadonlyArray<Attribute<M>>,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<M>,
): Html => h[as](attrs, children)
