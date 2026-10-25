import { Style, When } from '@pleat/core'
import type { ClassName } from '@pleat/foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  type ButtonBehaviorProps,
  type ButtonLinkBehaviorProps,
  renderButton,
  renderButtonLink,
} from '@/lib/button'
import type {
  Assert,
  ButtonSize,
  ButtonVariant,
  ComponentLayoutStyle,
  HasExactlyKeys,
} from './contracts'
import { joinStyles } from './button-group-join'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'

export type { ButtonSize, ButtonVariant } from './contracts'

const base = {
  root: Style.make({
    borderColor: tokens.transparent,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundClip: 'padding-box',
    boxShadow: tokens.shadowNone,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    transform: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty:
      'background-color, color, border-color, box-shadow, transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }).pipe(
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
    Style.when(When.active, { transform: interactionTokens.pressTransform }),
    Style.when(When.reducedMotion, {
      transform: 'none',
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  disabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
    pointerEvents: 'none',
  }),
}

const variants = {
  default: Style.make({
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  }).pipe(
    Style.when(When.hover, { backgroundColor: tokens.buttonPrimaryHover }),
  ),
  destructive: Style.make({
    backgroundColor: tokens.softDestructiveSurface,
    color: tokens.destructive,
  }).pipe(
    Style.when(When.hover, { backgroundColor: tokens.softDestructiveHover }),
  ),
  outline: Style.make({
    borderColor: tokens.border,
    borderWidth: 1,
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowSm,
    color: tokens.foreground,
  }).pipe(
    Style.when(When.aria('expanded', 'true'), {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
    Style.when(When.hover, { backgroundColor: tokens.muted }),
  ),
  secondary: Style.make({
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
  }).pipe(
    Style.when(When.hover, { backgroundColor: tokens.buttonSecondaryHover }),
  ),
  ghost: Style.make({
    backgroundColor: tokens.transparent,
    color: 'inherit',
  }).pipe(
    Style.when(When.aria('expanded', 'true'), {
      backgroundColor: tokens.muted,
      color: tokens.foreground,
    }),
    Style.when(When.hover, {
      backgroundColor: tokens.mutedHover,
      color: tokens.foreground,
    }),
  ),
  link: Style.make({
    backgroundColor: tokens.transparent,
    color: tokens.primary,
    textDecorationLine: 'none',
    textUnderlineOffset: '4px',
  }).pipe(Style.when(When.hover, { textDecorationLine: 'underline' })),
}

const sizes = {
  default: Style.make({
    gap: '0.375rem',
    paddingInline: '0.625rem',
    height: '2.25rem',
  }),
  xs: Style.make({
    borderRadius: foundationTokens.radiusMdCap8,
    gap: '0.25rem',
    paddingInline: '0.5rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    height: '1.5rem',
  }),
  sm: Style.make({
    borderRadius: foundationTokens.radiusMdCap10,
    gap: '0.25rem',
    paddingInline: '0.625rem',
    height: '2rem',
  }),
  lg: Style.make({
    gap: '0.375rem',
    paddingInline: '0.625rem',
    height: '2.5rem',
  }),
  icon: Style.make({ paddingInline: 0, height: '2.25rem', width: '2.25rem' }),
  'icon-xs': Style.make({
    borderRadius: foundationTokens.radiusMdCap8,
    paddingInline: 0,
    fontSize: '0.75rem',
    height: '1.5rem',
    width: '1.5rem',
  }),
  'icon-sm': Style.make({
    borderRadius: foundationTokens.radiusMdCap10,
    paddingInline: 0,
    height: '2rem',
    width: '2rem',
  }),
  'icon-lg': Style.make({
    paddingInline: 0,
    height: '2.5rem',
    width: '2.5rem',
  }),
}

/* Upstream tightens horizontal padding when an icon sits at an edge
   (has-data-[icon=inline-*]); StyleX cannot select descendants, so the
   docs pass `iconInset` explicitly. */
const iconInset = {
  startCompact: Style.make({ paddingLeft: '0.375rem' }),
  startRoomy: Style.make({ paddingLeft: '0.5rem' }),
  endCompact: Style.make({ paddingRight: '0.375rem' }),
  endRoomy: Style.make({ paddingRight: '0.5rem' }),
}

const shape = {
  rounded: Style.make({ borderRadius: foundationTokens.radiusFull }),
}

/* TW 'rounded-md' — for flat buttons that lose their radius when a
   size preset would otherwise carry it (sidebar-06 'Subscribe'). */
const cornerRadius = {
  md: Style.make({ borderRadius: foundationTokens.radiusMdCap10 }),
}

type _VariantMapIsExhaustive = Assert<
  HasExactlyKeys<typeof variants, ButtonVariant>
>
type _SizeMapIsExhaustive = Assert<HasExactlyKeys<typeof sizes, ButtonSize>>

const iconInsetFor = (size: ButtonSize, inset: 'start' | 'end') => {
  const compact = size === 'xs' || size === 'sm'
  return inset === 'start'
    ? compact
      ? iconInset.startCompact
      : iconInset.startRoomy
    : compact
      ? iconInset.endCompact
      : iconInset.endRoomy
}

export type ButtonProps<Msg> = ButtonBehaviorProps<Msg> &
  Readonly<{
    variant?: ButtonVariant
    size?: ButtonSize
    /** Edge-icon padding compensation matching has-data-[icon=inline-*]. */
    iconInset?: 'start' | 'end'
    /** Fully rounded pill shape (upstream `rounded-full`). */
    rounded?: boolean
    /** Explicit corner radius when the default doesn't apply. */
    radius?: 'md'
    /** Parent-layout positioning only. Add visual choices as named variants. */
    layoutStyle?: ComponentLayoutStyle | undefined
  }>

/** The full visual recipe for embedding the button look on another element
   (e.g. a DropdownMenu trigger). Prefer `button()` in normal use. */
export const buttonVisualStyles = ({
  variant = 'default',
  size = 'default',
}: Readonly<{
  variant?: ButtonVariant
  size?: ButtonSize
}> = {}): ReadonlyArray<Style.Style | ClassName> => [
  reset.button,
  base.root,
  variants[variant],
  sizes[size],
]

export const button = <Msg>(
  props: ButtonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'
  const size = props.size ?? 'default'
  return renderButton(
    props,
    [
      h.DataAttribute('variant', variant),
      ...(props.dataSize === undefined ? [h.DataAttribute('size', size)] : []),
      h.Class(
        className(
          reset.button,
          base.root,
          joinStyles.join,
          variants[variant],
          sizes[size],
          (props.isDisabled === true || props.isLoading === true) &&
            base.disabled,
          props.rounded === true && shape.rounded,
          props.radius === 'md' && cornerRadius.md,
          ...(props.iconInset === undefined
            ? []
            : [iconInsetFor(size, props.iconInset)]),
          props.layoutStyle,
        ),
      ),
    ],
    h,
  )
}

export type ButtonLinkProps = ButtonLinkBehaviorProps &
  Readonly<{
    variant?: ButtonVariant
    size?: ButtonSize
    /** Edge-icon padding compensation matching has-data-[icon=inline-*]. */
    iconInset?: 'start' | 'end'
    /** Fully rounded pill shape (upstream `rounded-full`). */
    rounded?: boolean
    /** Parent-layout positioning only. Add visual choices as named variants. */
    layoutStyle?: ComponentLayoutStyle | undefined
  }>

export const buttonLink = <Msg>(
  props: ButtonLinkProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'
  const size = props.size ?? 'default'
  return renderButtonLink(
    props,
    [
      h.DataAttribute('variant', variant),
      ...(props.dataSize === undefined ? [h.DataAttribute('size', size)] : []),
      h.Class(
        className(
          reset.button,
          base.root,
          joinStyles.join,
          variants[variant],
          sizes[size],
          props.rounded === true && shape.rounded,
          ...(props.iconInset === undefined
            ? []
            : [iconInsetFor(size, props.iconInset)]),
          props.layoutStyle,
        ),
      ),
    ],
    h,
  )
}
