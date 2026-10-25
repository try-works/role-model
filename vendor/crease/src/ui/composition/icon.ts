import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/lib/icon'
import type { IconProps } from '@/stylex/composition/icon'
export const icon = <M>(p: IconProps, h: HtmlBuilder<M>): Html =>
  Icon.icon(
    p.name,
    {
      class: p.size === 'md' ? 'size-5 shrink-0' : 'size-4 shrink-0',
      ...(p.ariaLabel === undefined ? {} : { ariaLabel: p.ariaLabel }),
    },
    h,
  )
