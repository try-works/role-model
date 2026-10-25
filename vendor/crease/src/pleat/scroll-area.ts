import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens'

export type ScrollAreaProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle | undefined
  children: ReadonlyArray<Html | string>
  orientation?: 'vertical' | 'horizontal' | 'both'
  direction?: 'ltr' | 'rtl'
  ariaLabel?: string
  tabIndex?: number
}>

const styles = {
  base: Style.make({
    borderRadius: 'inherit',
    boxShadow: tokens.shadowNone,
    outlineColor: tokens.transparent,
    outlineStyle: 'none',
    outlineWidth: 0,
    position: 'relative',
    scrollbarColor: `var(--border) ${tokens.transparent}`,
    scrollbarWidth: 'thin',
    transitionProperty: 'color, box-shadow',
    height: '100%',
    width: '100%',
  }).pipe(
    Style.when(When.focusVisible, {
      boxShadow: tokens.focusRingShadow,
      outlineColor: tokens.ring,
      outlineStyle: 'solid',
      outlineWidth: 1,
    }),
  ),
  both: Style.make({ overflow: 'auto' }),
  horizontal: Style.make({ overflowX: 'auto', overflowY: 'hidden' }),
  vertical: Style.make({ overflowX: 'hidden', overflowY: 'auto' }),
}

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
