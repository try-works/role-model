import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'

const styles = stylex.create({
  root: { position: 'relative', width: '100%' },
})

export type AspectRatioProps = Readonly<{
  ratio: number
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
}>

export const aspectRatio = <Msg>(
  props: AspectRatioProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'aspect-ratio'),
      h.Class(className(styles.root, props.layoutStyle)),
      h.Style({ aspectRatio: String(props.ratio) }),
    ],
    [...props.children],
  )
