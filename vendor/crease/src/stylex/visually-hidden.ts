import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { className } from './style'

/* Ported from Meta Astryx VisuallyHidden/VisuallyHidden.tsx — the canonical
   "visually hidden" clip block. Uses `clip: rect(...)` (not clip-path) for
   the widest assistive-tech/browser support. `inset` pins the 1px box to the
   top-left so a positioned ancestor cannot reveal it, and pointer/selection
   are disabled so the hidden node can't catch clicks or be text-selected. */
const styles = stylex.create({
  visuallyHidden: {
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    insetBlockStart: 0,
    insetInlineStart: 0,
    pointerEvents: 'none',
    position: 'absolute',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  },
})

export type VisuallyHiddenElement =
  | 'article'
  | 'aside'
  | 'code'
  | 'div'
  | 'em'
  | 'footer'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'header'
  | 'label'
  | 'li'
  | 'main'
  | 'nav'
  | 'ol'
  | 'p'
  | 'section'
  | 'small'
  | 'span'
  | 'strong'
  | 'ul'

export type VisuallyHiddenProps = Readonly<{
  /** HTML tag to render as. Defaults to 'span'. */
  as?: VisuallyHiddenElement
  /** Optional live-region politeness for announced updates. */
  ariaLive?: 'polite' | 'assertive' | 'off'
  /** Optional ARIA role for the hidden element. */
  role?: string
  /** Optional element id. */
  id?: string
  children: ReadonlyArray<Html | string>
}>

export const visuallyHidden = <Msg>(
  props: VisuallyHiddenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h[props.as ?? 'span'](
    [
      h.DataAttribute('slot', 'visually-hidden'),
      h.Class(className(reset.text, styles.visuallyHidden)),
      ...(props.ariaLive === undefined ? [] : [h.AriaLive(props.ariaLive)]),
      ...(props.role === undefined ? [] : [h.Role(props.role)]),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
    ],
    [...props.children],
  )
