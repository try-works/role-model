import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { complexTokens } from './complex-tokens.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx Token (packages/core/src/Token/Token.tsx) — examples
   and visual spec adapted to Crease UI tokens. The 11 astryx color names are
   preserved for API parity; crease has no dedicated tint tokens for the
   chromatic colors, so those backgrounds use astryx's own tint technique — a
   solid linear-gradient backgroundImage over the chart custom properties
   (see PORT-NOTEs). */

const styles = stylex.create({
  base: {
    borderRadius: foundationTokens.checkboxRadius,
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    textDecorationLine: 'none',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  sm: { height: '1.25rem' },
  md: { height: '1.5rem' },
  lg: { height: '1.75rem' },
  label: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  srOnly: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  interactive: {
    cursor: interactionTokens.cursorAction,
    filter: {
      default: 'none',
      '@media (hover: hover)': {
        default: 'none',
        ':hover': 'brightness(0.95)',
        ':active': 'brightness(0.9)',
      },
    },
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-image, filter',
    transitionTimingFunction: interactionTokens.easingStandard,
  },
  disabled: {
    cursor: interactionTokens.cursorDefault,
    opacity: 0.5,
    pointerEvents: 'none',
  },
  clickableButton: {
    padding: 0,
    borderStyle: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'currentColor',
    cursor: interactionTokens.cursorAction,
    display: 'inline',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    textAlign: 'start',
  },
  link: {
    flex: '1',
    gap: '0.25rem',
    alignItems: 'center',
    color: 'currentColor',
    display: 'inline-flex',
    textDecorationLine: 'none',
    minWidth: 0,
  },
  removeButton: {
    padding: 0,
    borderRadius: '50%',
    outline: {
      default: 'none',
      ':focus-visible': complexTokens.focusOutline,
    },
    alignItems: 'center',
    color: 'currentColor',
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    marginInlineEnd: '-0.25rem',
    position: 'relative',
    height: '1rem',
    width: '1rem',
  },
  iconXsm: { fontSize: '0.75rem' },
})

const colorDefault = stylex.create({
  root: { backgroundColor: foundationTokens.muted, color: tokens.foreground },
})
const colorGray = stylex.create({
  root: {
    backgroundColor: foundationTokens.muted,
    color: tokens.mutedForeground,
  },
})
const colorRed = stylex.create({
  root: {
    backgroundColor: foundationTokens.destructiveSoft,
    color: tokens.destructive,
  },
})
/* PORT-NOTE: needs tint tokens for chart hues — chromatic backgrounds are
   emulated with a solid gradient over the chart custom property. */
const colorOrange = stylex.create({
  root: {
    backgroundColor: complexTokens.chart1Soft10,
    color: complexTokens.chart1,
  },
})
const colorYellow = stylex.create({
  root: {
    backgroundColor: complexTokens.chart4Soft15,
    color: complexTokens.chart5,
  },
})
const colorGreen = stylex.create({
  root: {
    backgroundColor: complexTokens.chart2Soft10,
    color: tokens.alertSuccess,
  },
})
const colorTeal = stylex.create({
  root: {
    backgroundColor: complexTokens.chart2Soft15,
    color: complexTokens.chart2,
  },
})
const colorCyan = stylex.create({
  root: {
    backgroundColor: complexTokens.chart2Soft25,
    color: complexTokens.chart2,
  },
})
const colorBlue = stylex.create({
  root: {
    backgroundColor: complexTokens.chart3Soft10,
    color: complexTokens.chart3,
  },
})
const colorPurple = stylex.create({
  root: {
    backgroundColor: complexTokens.chart3Soft15,
    color: complexTokens.chart3,
  },
})
const colorPink = stylex.create({
  root: {
    backgroundColor: complexTokens.destructiveSoft15,
    color: tokens.destructive,
  },
})

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

const COLOR_STYLE = {
  default: colorDefault.root,
  gray: colorGray.root,
  red: colorRed.root,
  orange: colorOrange.root,
  yellow: colorYellow.root,
  green: colorGreen.root,
  teal: colorTeal.root,
  cyan: colorCyan.root,
  blue: colorBlue.root,
  purple: colorPurple.root,
  pink: colorPink.root,
} as const

export type TokenProps<Msg> = Readonly<{
  /** Text shown inside the token. */
  label: string
  /** Semantic colorway; 'default' is the neutral gray chip. */
  color?: TokenColor
  /** Chip height: sm 20px, md 24px, lg 28px. */
  size?: TokenSize
  /** Leading glyph, e.g. `h => Icon.tag({ class: className(styles.iconXsm) }, h)`. */
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
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
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

  const baseStyles = [
    styles.base,
    size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : styles.md,
    COLOR_STYLE[color],
    isInteractive && styles.interactive,
    isDisabled && styles.disabled,
  ] as const

  const labelChildren: ReadonlyArray<Html> = [
    h.span(
      [
        h.Class(
          className(
            styles.label,
            props.isLabelHidden === true && styles.srOnly,
          ),
        ),
      ],
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
          h.Class(className(reset.button, styles.removeButton)),
          h.OnClick(props.onRemove as Msg, { propagation: 'Stop' }),
        ],
        [Icon.x({ class: className(styles.iconXsm) }, h)],
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
      [...sharedAttrs, h.Class(className(...baseStyles, props.layoutStyle))],
      [
        h.a(
          [
            h.Href(props.href as string),
            h.Class(className(reset.link, styles.link)),
          ],
          contentChildren,
        ),
        removeButton,
      ],
    )
  }

  if (isLink) {
    return h.a(
      [
        ...sharedAttrs,
        h.Href(props.href as string),
        h.Class(className(reset.link, ...baseStyles, props.layoutStyle)),
      ],
      [...contentChildren],
    )
  }

  if (isClickable) {
    /* astryx TokenClickable: a span shell whose click region is a reset
       inline button around the content, so a token stays valid in text. */
    return h.span(
      [
        ...sharedAttrs,
        h.Class(className(...baseStyles, props.layoutStyle)),
        h.OnClick(props.onClick as Msg),
      ],
      [
        h.button(
          [
            h.Type('button'),
            h.Class(className(reset.button, styles.clickableButton)),
            h.OnClick(props.onClick as Msg, { propagation: 'Stop' }),
          ],
          contentChildren,
        ),
      ],
    )
  }

  return h.span(
    [...sharedAttrs, h.Class(className(...baseStyles, props.layoutStyle))],
    [...contentChildren, removeButton],
  )
}
