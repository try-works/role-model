import type { Html, HtmlBuilder } from 'foldkit/html'
import type { GridProps } from '@/stylex/composition/grid'
import { cn } from '@/lib/utils'
import { element, attributes, gap, padding, align } from './element'
const columns = {
  one: 'grid-cols-1',
  two: 'grid-cols-1 min-[700px]:grid-cols-2',
  four: 'grid-cols-1 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-4',
  gallery: 'grid-cols-1 min-[700px]:grid-cols-2 lg:grid-cols-3',
  sidebar: 'grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)]',
  sidebarWide: 'grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)]',
  appShell: 'grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)]',
  appShellWide: 'grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)]',
  masterDetail: 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]',
  loginSplit: 'grid-cols-1 min-[900px]:grid-cols-2',
  createBoard: 'grid-cols-7',
}
export const grid = <M>(p: GridProps, h: HtmlBuilder<M>): Html =>
  element(
    p.as ?? 'div',
    attributes(
      cn(
        'grid min-w-0',
        p.columns && columns[p.columns],
        p.gap && gap[p.gap],
        p.padding && padding[p.padding],
        p.align && align[p.align],
        p.width === 'full' && 'w-full',
        p.surface === 'muted' && 'bg-muted',
      ),
      p.data,
      p.slot,
      h,
    ),
    p.children,
    h,
  )
