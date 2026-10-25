import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

export type ScrollAreaProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
  orientation?: 'vertical' | 'horizontal' | 'both'
  direction?: 'ltr' | 'rtl'
  ariaLabel?: string
  tabIndex?: number
}>

const styles = stylex.create({
  base: {
    borderRadius: 'inherit',
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    outlineColor: {
      default: tokens.transparent,
      ':focus-visible': tokens.ring,
    },
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: { default: 0, ':focus-visible': 1 },
    position: 'relative',
    scrollbarColor: `var(--border) ${tokens.transparent}`,
    scrollbarWidth: 'thin',
    transitionProperty: 'color, box-shadow',
    height: '100%',
    width: '100%',
  },
  both: { overflow: 'auto' },
  horizontal: { overflowX: 'auto', overflowY: 'hidden' },
  vertical: { overflowX: 'hidden', overflowY: 'auto' },
})

export const scrollArea = <Msg>(
  props: ScrollAreaProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'both'
  return h.div(
    [
      h.DataAttribute('slot', 'scroll-area'),
      h.DataAttribute('orientation', orientation),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.Tabindex(props.tabIndex ?? 0),
      h.Class(className(styles.base, styles[orientation], props.layoutStyle)),
    ],
    [...props.children],
  )
}
