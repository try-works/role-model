import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export type AspectRatioProps = Readonly<{
  ratio: number
  class?: string
  children: ReadonlyArray<Html | string>
}>

export const aspectRatio = <Msg>(
  props: AspectRatioProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'aspect-ratio'),
      h.Class(cn('relative w-full', props.class)),
      h.Style({ aspectRatio: String(props.ratio) }),
    ],
    [...props.children],
  )
}
