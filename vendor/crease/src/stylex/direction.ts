import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'

export type Direction = 'ltr' | 'rtl'

export const direction = <Msg>(
  props: Readonly<{
    direction: Direction
    children: ReadonlyArray<Html | string>
    layoutStyle?: ComponentLayoutStyle
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [h.Dir(props.direction), h.Class(className(props.layoutStyle))],
    [...props.children],
  )
}
