import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export type SkeletonProps = Readonly<{
  shape?: 'text' | 'rectangle' | 'circle'
  size?: 'sm' | 'md' | 'lg'
  class?: string
}>

const SHAPE_CLASS = {
  text: 'rounded-sm',
  rectangle: 'rounded-md',
  circle: 'rounded-full',
} as const
const SIZE_CLASS = { sm: 'h-3 w-24', md: 'h-4 w-32', lg: 'size-12' } as const

export const skeleton = <Msg>(
  props: SkeletonProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'skeleton'),
      h.AriaHidden(true),
      h.Class(
        cn(
          'animate-pulse bg-accent motion-reduce:animate-none',
          SHAPE_CLASS[props.shape ?? 'rectangle'],
          ...(props.size === undefined ? [] : [SIZE_CLASS[props.size]]),
          props.class,
        ),
      ),
    ],
    [],
  )
}
