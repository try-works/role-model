import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx VisuallyHidden/VisuallyHidden.tsx — the canonical
   "visually hidden" clip block. `clip: rect(...)` (what Tailwind's `sr-only`
   emits) has the widest assistive-tech/browser support; astryx additionally
   pins the 1px box to the top-left and disables pointer/selection, so the
   hidden node can't catch clicks or be text-selected. */

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
  | 'p'
  | 'section'
  | 'small'
  | 'span'
  | 'strong'
  | 'ul'
  | 'ol'

export type VisuallyHiddenProps = Readonly<{
  /**
   * HTML tag to render as. Defaults to `'span'` (inline) for the common
   * icon-label case; pass a block element such as `'div'` when wrapping block
   * content or hosting an `aria-live` region. This is a structural choice,
   * not a visual one.
   * @default 'span'
   */
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
): Html => {
  return h[props.as ?? 'span'](
    [
      h.DataAttribute('slot', 'visually-hidden'),
      h.Class(cn('sr-only top-0 start-0 pointer-events-none select-none')),
      ...(props.ariaLive === undefined ? [] : [h.AriaLive(props.ariaLive)]),
      ...(props.role === undefined ? [] : [h.Role(props.role)]),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
    ],
    [...props.children],
  )
}
