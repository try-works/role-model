import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import * as Tooltip from './tooltip'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import type {
  TextColor,
  TextDisplay,
  TextSize,
  TextType,
  TextWeight,
} from './text'
import { text } from './text'
import { tokens } from './tokens'

/* Ported from Meta Astryx Link (packages/core/src/Link/Link.tsx) — examples and
   visual spec adapted to Crease UI tokens. */

const BLANK_TARGET_REL_TOKENS = ['noopener', 'noreferrer'] as const

const computeTargetAndRel = (
  target: string | undefined,
  rel: string | undefined,
): { target?: string; rel?: string } => {
  if (target !== '_blank') {
    return {
      ...(target === undefined ? {} : { target }),
      ...(rel === undefined ? {} : { rel }),
    }
  }
  const tokens = rel?.split(/\s+/).filter(Boolean) ?? []
  for (const token of BLANK_TARGET_REL_TOKENS) {
    if (!tokens.includes(token)) {
      tokens.push(token)
    }
  }
  return { target, rel: tokens.join(' ') }
}

const styles = {
  base: Style.make({
    gap: '2px',
    alignItems: 'center',
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    textDecorationLine: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, text-decoration',
    transitionTimingFunction: interactionTokens.easingStandard,
  }).pipe(
    Style.when(When.pseudo(':is(:disabled,[aria-disabled="true"])'), {
      cursor: interactionTokens.cursorDefault,
    }),
    Style.when(When.hover, { textDecorationLine: 'underline' }),
  ),
  buttonReset: Style.make({
    padding: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    position: 'relative',
  }),
  hasUnderline: Style.make({ textDecorationLine: 'underline' }),
  disabled: Style.make({
    cursor: interactionTokens.cursorDefault,
    opacity: 0.5,
    pointerEvents: 'none',
  }),
  focusVisible: Style.empty.pipe(
    Style.when(When.focusVisible, {
      outlineColor: tokens.ring,
      outlineOffset: '3px',
      outlineStyle: 'solid',
      outlineWidth: '2px',
    }),
  ),
  pressedBackground: Style.make({ backgroundColor: 'transparent' }).pipe(
    Style.when(When.active, {
      backgroundColor: foundationTokens.foregroundSoft,
    }),
  ),
  externalIcon: Style.make({
    flexShrink: 0,
    height: '0.625rem',
    width: '0.625rem',
  }),
  visuallyHidden: Style.make({
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  }),
}

const linkColorStyles = {
  primary: Style.make({ color: tokens.foreground }).pipe(
    Style.when(When.hover, { color: foundationTokens.foregroundMuted }),
  ),
  secondary: Style.make({ color: tokens.mutedForeground }).pipe(
    Style.when(When.hover, { color: foundationTokens.foregroundMuted }),
  ),
  disabled: Style.make({ color: tokens.mutedForeground, opacity: 0.5 }),
  placeholder: Style.make({ color: tokens.mutedForeground }),
  accent: Style.make({ color: tokens.primary }).pipe(
    Style.when(When.hover, { color: tokens.primaryHover }),
  ),
  inherit: Style.make({ color: 'currentColor' }),
}

export type LinkVariant = 'default' | 'underlined'

export type LinkProps<Msg> = Readonly<{
  children: ReadonlyArray<Html | string>
  href?: string
  label?: string
  variant?: LinkVariant
  hasUnderline?: boolean
  isDisabled?: boolean
  isExternalLink?: boolean
  newTabLabel?: string
  target?: string
  rel?: string
  download?: string
  onClick?: Msg
  /** The parent owns the Tooltip model and routes its messages through Tooltip.update. */
  tooltip?: Pick<
    Tooltip.TooltipProps<Msg>,
    | 'model'
    | 'toParentMessage'
    | 'content'
    | 'side'
    | 'align'
    | 'showArrow'
    | 'gap'
    | 'offset'
  >
  isStandalone?: boolean
  type?: TextType
  size?: TextSize
  weight?: TextWeight
  color?: TextColor
  display?: TextDisplay
  maxLines?: number
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export const link = <Msg>(props: LinkProps<Msg>, h: HtmlBuilder<Msg>): Html => {
  const color = props.color ?? 'accent'
  const variant = props.variant ?? 'default'
  const hasUnderline = variant === 'underlined' || props.hasUnderline === true
  const isDisabled = props.isDisabled ?? false
  const isExternalLink = props.isExternalLink ?? false
  const newTabLabel = props.newTabLabel ?? '(opens in new tab)'
  const { target, rel } = computeTargetAndRel(
    isExternalLink ? '_blank' : props.target,
    props.rel,
  )
  const renderAsButton = props.href === undefined

  const sharedContent = [
    text(
      {
        type: props.type ?? 'body',
        ...(props.size === undefined ? {} : { size: props.size }),
        ...(props.weight === undefined ? {} : { weight: props.weight }),
        color,
        display: props.display ?? 'inline',
        ...(props.maxLines === undefined ? {} : { maxLines: props.maxLines }),
        children: props.children,
      },
      h,
    ),
    ...(isExternalLink && !renderAsButton
      ? [
          Icon.icon<Msg>(
            'external-link',
            { class: className(styles.externalIcon) },
            h,
          ),
          h.span(
            [
              h.DataAttribute('slot', 'link-new-tab-label'),
              h.Class(className(styles.visuallyHidden)),
            ],
            [newTabLabel],
          ),
        ]
      : []),
  ]

  const sharedStyles = [
    styles.base,
    linkColorStyles[color],
    styles.focusVisible,
    ...(isDisabled ? [styles.disabled] : []),
    ...(hasUnderline ? [styles.hasUnderline] : []),
  ]

  const renderLink = (
    attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  ): Html => {
    if (renderAsButton) {
      return h.button(
        [
          ...attributes,
          h.DataAttribute('slot', 'link'),
          h.DataAttribute('variant', variant),
          h.DataAttribute('color', color),
          h.Type('button'),
          h.Class(
            className(
              reset.button,
              ...sharedStyles,
              styles.buttonReset,
              ...(isDisabled ? [] : [styles.pressedBackground]),
              props.layoutStyle,
            ),
          ),
          ...(isDisabled
            ? [h.AriaDisabled(true), h.Tabindex(-1), h.Disabled(true)]
            : []),
          ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
          ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
        ],
        sharedContent,
      )
    }

    if (isDisabled) {
      return h.a(
        [
          ...attributes,
          h.DataAttribute('slot', 'link'),
          h.DataAttribute('variant', variant),
          h.DataAttribute('color', color),
          h.Class(className(reset.link, ...sharedStyles, props.layoutStyle)),
          h.AriaDisabled(true),
          h.Tabindex(-1),
          ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
        ],
        sharedContent,
      )
    }

    return h.a(
      [
        ...attributes,
        h.DataAttribute('slot', 'link'),
        h.DataAttribute('variant', variant),
        h.DataAttribute('color', color),
        h.Class(
          className(
            reset.link,
            ...sharedStyles,
            styles.pressedBackground,
            props.layoutStyle,
          ),
        ),
        h.Href(props.href ?? ''),
        ...(target === undefined ? [] : [h.Target(target)]),
        ...(rel === undefined ? [] : [h.Rel(rel)]),
        ...(props.download === undefined ? [] : [h.Download(props.download)]),
        ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
        ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ],
      sharedContent,
    )
  }
  return props.tooltip === undefined
    ? renderLink([])
    : Tooltip.tooltip(
        {
          ...props.tooltip,
          isDisabled,
          renderTrigger: renderLink,
        },
        h,
      )
}
