import type { Html, HtmlBuilder } from 'foldkit/html'

export type Direction = 'ltr' | 'rtl'

export const direction = <Msg>(
  props: Readonly<{
    direction: Direction
    children: ReadonlyArray<Html | string>
    class?: string
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.Dir(props.direction),
      ...(props.class === undefined ? [] : [h.Class(props.class)]),
    ],
    [...props.children],
  )
}
