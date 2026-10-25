import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens'

const styles = {
  base: Style.make({ backgroundColor: tokens.border, flexShrink: 0 }),
  horizontal: Style.make({ height: '1px', width: '100%' }),
  vertical: Style.make({ height: '100%', width: '1px' }),
}

export type SeparatorProps = Readonly<{
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  layoutStyle?: ComponentLayoutStyle | undefined
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
