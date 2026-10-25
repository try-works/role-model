import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

const styles = stylex.create({
  /* TW emits bg-border (var(--border), preset-scoped). */
  base: { backgroundColor: tokens.border, flexShrink: 0 },
  horizontal: { height: '1px', width: '100%' },
  vertical: { height: '100%', width: '1px' },
})

export type SeparatorProps = Readonly<{
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  layoutStyle?: ComponentLayoutStyle
}>

export const separator = <Msg>(
  props: SeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'horizontal'
  return h.div(
    [
      h.DataAttribute('slot', 'separator'),
      h.DataAttribute('orientation', orientation),
      ...((props.decorative ?? true)
        ? [h.Role('none')]
        : [h.Role('separator'), h.AriaOrientation(orientation)]),
      h.Class(className(styles.base, styles[orientation], props.layoutStyle)),
    ],
    [],
  )
}
