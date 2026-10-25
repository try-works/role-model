import type { Html, HtmlBuilder } from 'foldkit/html'
import type { BoxProps } from '@/stylex/composition/box'
import { cn } from '@/lib/utils'
import { element, attributes, padding } from './element'
const surfaces = {
  none: 'bg-transparent',
  page: 'bg-background text-foreground',
  card: 'border bg-card text-card-foreground shadow-sm',
  muted: 'bg-muted text-foreground',
  section: 'bg-secondary text-secondary-foreground',
  canvas: 'bg-muted text-foreground',
}
const widths = {
  auto: 'w-auto',
  full: 'w-full',
  fit: 'w-fit',
  content: 'mx-auto w-full max-w-[1440px]',
  readable: 'mx-auto w-full max-w-[60rem]',
  form: 'w-full max-w-sm',
  login: 'mx-auto w-full max-w-4xl',
  createBoard: 'w-[150rem] md:w-[187.5rem]',
}
const heights = {
  viewport: 'min-h-svh',
  none: 'min-h-0',
  full: 'min-h-full',
  createPage: 'min-h-screen',
  blockPreview: 'min-h-[800px]',
  blocksHero: 'min-h-[530px]',
  skeleton: 'min-h-[450px]',
}
export const box = <M>(p: BoxProps, h: HtmlBuilder<M>): Html =>
  element(
    p.as ?? 'div',
    attributes(
      cn(
        'min-w-0',
        p.surface && surfaces[p.surface],
        p.width && widths[p.width],
        p.minHeight && heights[p.minHeight],
        p.padding && padding[p.padding],
        p.radius &&
          {
            none: 'rounded-none',
            sm: 'rounded-sm',
            md: 'rounded-md',
            lg: 'rounded-xl',
            full: 'rounded-full',
          }[p.radius],
        p.visibility === 'desktop' && 'hidden md:block',
        p.visibility === 'mobile' && 'block md:hidden',
        p.overflowX === 'auto' && 'overflow-x-auto',
        p.overflowX === 'hidden' && 'overflow-x-hidden',
        p.overflowY === 'auto' && 'overflow-y-auto',
        p.overflowY === 'hidden' && 'overflow-y-hidden',
        p.contentAlignment === 'center' && 'grid place-items-center',
        p.position === 'relative' && 'relative',
        p.contain === 'paint' && '[contain:paint]',
      ),
      p.data,
      p.slot,
      h,
    ),
    p.children,
    h,
  )
