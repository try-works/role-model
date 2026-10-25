import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Token (packages/core/src/Token/Token.tsx) — examples
   and visual spec adapted to Crease UI tokens. The 11 astryx color names are
   preserved for API parity, but crease's grayscale-first palette has no
   dedicated green/teal/cyan/purple/pink tokens — those map to the nearest
   chart/destructive tokens (see PORT-NOTEs below). Astryx's translated
   remove-label and LinkProvider integration are ported as plain English
   strings and a plain anchor. */

export type TokenColor =
  | 'default'
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'pink'
export type TokenSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Readonly<Record<TokenSize, string>> = {
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-7',
}

const COLOR_CLASS: Readonly<Record<TokenColor, string>> = {
  default: 'bg-muted text-foreground',
  gray: 'bg-muted text-muted-foreground',
  red: 'bg-destructive/10 text-destructive',
  /* PORT-NOTE: no dedicated token hue; chart-1 is the nearest orange. */
  orange: 'bg-chart-1/10 text-chart-1',
  /* PORT-NOTE: needs a yellow-ink token — chart-4 surface + chart-5 amber ink. */
  yellow: 'bg-chart-4/15 text-chart-5',
  /* PORT-NOTE: crease has no green token; chart-2 (the success tone) stands in. */
  green: 'bg-chart-2/10 text-chart-2',
  /* PORT-NOTE: teal shares the chart-2 family with green at a deeper tint. */
  teal: 'bg-chart-2/15 text-chart-2',
  /* PORT-NOTE: crease has no cyan token; lightest chart-2 tint stands in. */
  cyan: 'bg-chart-2/25 text-chart-2',
  /* PORT-NOTE: crease has no accent-blue token; chart-3 (navy) stands in. */
  blue: 'bg-chart-3/10 text-chart-3',
  /* PORT-NOTE: crease has no purple token; deeper chart-3 tint stands in. */
  purple: 'bg-chart-3/15 text-chart-3',
  /* PORT-NOTE: crease has no pink token; a deeper destructive tint stands in. */
  pink: 'bg-destructive/15 text-destructive',
}

const BASE_CLASS =
  'inline-flex max-w-full items-center gap-1 overflow-hidden rounded-[4px] px-2 py-0 text-xs leading-5 font-medium whitespace-nowrap no-underline'
const LABEL_CLASS = 'min-w-0 truncate'
const REMOVE_BUTTON_CLASS =
  'relative inline-flex size-4 -me-1 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 text-current focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'
const DISABLED_CLASS = 'pointer-events-none cursor-default opacity-50'
/* astryx tints the chip background 5% on hover / 10% on press via a
   background-image overlay; brightness gives the same perceptual darken. */
const INTERACTIVE_CLASS =
  'cursor-pointer transition-[filter] duration-150 ease-in-out motion-reduce:transition-none hover:brightness-95 active:brightness-90'

export type TokenProps<Msg> = Readonly<{
  /** Text shown inside the token. */
  label: string
  /** Semantic colorway; 'default' is the neutral gray chip. */
  color?: TokenColor
  /** Chip height: sm 20px, md 24px, lg 28px. */
  size?: TokenSize
  /** Leading glyph, e.g. `h => Icon.tag({ class: 'size-3' }, h)`. */
  icon?: <M>(h: HtmlBuilder<M>) => Html
  /** Trailing content such as a count badge, rendered before the remove button. */
  endContent?: ReadonlyArray<Html>
  /** Hides the label visually; the label still becomes the aria-label. */
  isLabelHidden?: boolean
  /** Link target — renders the token as an anchor. */
  href?: string
  /** Message sent on activate; makes the token a clickable button. */
  onClick?: Msg
  /** Message sent from the trailing remove affordance. */
  onRemove?: Msg
  /** Muted look and blocks all interaction. */
  isDisabled?: boolean
  /** Extra accessible description (aria-description). */
  description?: string
  class?: string
}>

export const token = <Msg>(
  props: TokenProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'md'
  const color = props.color ?? 'default'
  const isDisabled = props.isDisabled === true
  const isLink = props.href !== undefined && !isDisabled
  const isClickable = props.onClick !== undefined && !isDisabled && !isLink
  const hasRemove = props.onRemove !== undefined && !isDisabled
  const isInteractive = isLink || isClickable

  const baseClass = cn(
    BASE_CLASS,
    SIZE_CLASS[size],
    COLOR_CLASS[color],
    isInteractive && INTERACTIVE_CLASS,
    isDisabled && DISABLED_CLASS,
    props.class,
  )

  const labelChildren: ReadonlyArray<Html> = [
    h.span(
      [h.Class(cn(LABEL_CLASS, props.isLabelHidden === true && 'sr-only'))],
      [props.label],
    ),
  ]
  const contentChildren: ReadonlyArray<Html> = [
    ...(props.icon === undefined ? [] : [props.icon(h)]),
    ...labelChildren,
    ...(props.endContent === undefined ? [] : [...props.endContent]),
  ]

  const removeButton = hasRemove
    ? h.button(
        [
          h.Type('button'),
          h.AriaLabel(`Remove ${props.label}`),
          h.Class(REMOVE_BUTTON_CLASS),
          h.OnClick(props.onRemove as Msg, { propagation: 'Stop' }),
        ],
        [Icon.x({ class: 'size-3' }, h)],
      )
    : h.empty

  const sharedAttrs = [
    h.DataAttribute('slot', 'token'),
    h.DataAttribute('color', color),
    h.DataAttribute('size', size),
    ...(isDisabled ? [h.DataAttribute('disabled', 'true')] : []),
    ...(props.isLabelHidden === true ? [h.AriaLabel(props.label)] : []),
    ...(props.description === undefined
      ? []
      : [h.AriaDescription(props.description)]),
  ]

  if (isLink && hasRemove) {
    /* astryx TokenLink: the anchor and remove button are siblings so the
       remove button is not nested inside the link. */
    return h.span(
      [...sharedAttrs, h.Class(baseClass)],
      [
        h.a(
          [
            h.Href(props.href as string),
            h.Class(
              'inline-flex min-w-0 flex-1 items-center gap-1 no-underline text-inherit',
            ),
          ],
          contentChildren,
        ),
        removeButton,
      ],
    )
  }

  if (isLink) {
    return h.a(
      [...sharedAttrs, h.Href(props.href as string), h.Class(baseClass)],
      [...contentChildren],
    )
  }

  if (isClickable) {
    /* astryx TokenClickable: a span shell whose click region is a reset
       inline button around the content, so a token stays valid in text. */
    return h.span(
      [...sharedAttrs, h.Class(baseClass), h.OnClick(props.onClick as Msg)],
      [
        h.button(
          [
            h.Type('button'),
            h.Class(
              '[all:unset] inline-flex min-w-0 flex-1 items-center gap-1 overflow-hidden cursor-pointer',
            ),
            h.OnClick(props.onClick as Msg, { propagation: 'Stop' }),
          ],
          contentChildren,
        ),
      ],
    )
  }

  return h.span(
    [...sharedAttrs, h.Class(baseClass)],
    [...contentChildren, removeButton],
  )
}
