import type { Html, HtmlBuilder } from 'foldkit/html'
import type { TextProps } from '@/stylex/composition/text'
import { cn } from '@/lib/utils'
import { attributes } from './element'
const variants = {
  inherit: 'text-inherit',
  body: 'text-sm leading-normal text-pretty',
  caption: 'text-xs leading-normal text-pretty',
  label: 'text-sm font-medium leading-tight',
  headingSm: 'text-base font-semibold leading-tight text-balance',
  headingMd: 'text-xl font-semibold leading-tight text-balance',
  display: 'text-4xl font-bold',
  hero: 'text-3xl font-bold tracking-tight md:text-5xl',
  chartTitle: 'text-3xl font-semibold tracking-tight xl:text-5xl',
  chartLead: 'text-base sm:text-lg',
}
export const text = <M>(p: TextProps, h: HtmlBuilder<M>): Html =>
  h[p.as ?? 'span'](
    attributes(
      cn(
        variants[p.variant ?? 'body'],
        p.tone === 'secondary'
          ? 'text-muted-foreground'
          : p.tone === 'danger'
            ? 'text-destructive'
            : 'text-foreground',
        p.align &&
          { left: 'text-left', center: 'text-center', right: 'text-right' }[
            p.align
          ],
        p.numeric === 'tabular' && 'tabular-nums',
        p.measure === 'hero' && 'max-w-2xl',
      ),
      p.data,
      undefined,
      h,
    ),
    p.children,
  )
