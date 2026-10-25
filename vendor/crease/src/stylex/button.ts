import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
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
import { joinStyles } from './button-group-join.stylex'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'

export type { ButtonSize, ButtonVariant } from './contracts'

const base = stylex.create({
  root: {
    borderColor: {
      default: tokens.transparent,
      ':focus-visible': tokens.ring,
    },
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundClip: 'padding-box',
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    transform: {
      default: 'none',
      ':active': interactionTokens.pressTransform,
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionDuration: {
      default: interactionTokens.motionFast,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty:
      'background-color, color, border-color, box-shadow, transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  disabled: {
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
    pointerEvents: 'none',
  },
})

const variants = stylex.create({
  default: {
    backgroundColor: {
      default: tokens.primary,
      ':hover': tokens.buttonPrimaryHover,
    },
    color: tokens.primaryForeground,
  },
  destructive: {
    backgroundColor: {
      default: tokens.softDestructiveSurface,
      ':hover': tokens.softDestructiveHover,
    },
    color: tokens.destructive,
  },
  outline: {
    /* TW emits border-border (var(--border), preset-scoped). */
    borderColor: tokens.border,
    borderWidth: 1,
    backgroundColor: {
      default: tokens.background,
      ':is([aria-expanded="true"])': tokens.muted,
      ':hover': tokens.muted,
    },
    boxShadow: tokens.shadowSm,
    color: {
      default: tokens.foreground,
      ':is([aria-expanded="true"])': tokens.foreground,
    },
  },
  secondary: {
    backgroundColor: {
      default: tokens.secondary,
      ':hover': tokens.buttonSecondaryHover,
    },
    color: tokens.secondaryForeground,
  },
  ghost: {
    backgroundColor: {
      default: tokens.transparent,
      ':is([aria-expanded="true"])': tokens.muted,
      ':hover': tokens.mutedHover,
    },
    color: {
      default: 'inherit',
      ':is([aria-expanded="true"])': tokens.foreground,
      ':hover': tokens.foreground,
    },
  },
  link: {
    backgroundColor: tokens.transparent,
    color: tokens.primary,
    textDecorationLine: {
      default: 'none',
      ':hover': 'underline',
    },
    textUnderlineOffset: '4px',
  },
})

const sizes = stylex.create({
  default: {
    gap: '0.375rem',
    paddingInline: '0.625rem',
    height: '2.25rem',
  },
  xs: {
    borderRadius: foundationTokens.radiusMdCap8,
    gap: '0.25rem',
    paddingInline: '0.5rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    height: '1.5rem',
  },
  sm: {
    borderRadius: foundationTokens.radiusMdCap10,
    gap: '0.25rem',
    paddingInline: '0.625rem',
    height: '2rem',
  },
  lg: {
    gap: '0.375rem',
    paddingInline: '0.625rem',
    height: '2.5rem',
  },
  icon: {
    paddingInline: 0,
    height: '2.25rem',
    width: '2.25rem',
  },
  'icon-xs': {
    borderRadius: foundationTokens.radiusMdCap8,
    paddingInline: 0,
    fontSize: '0.75rem',
    height: '1.5rem',
    width: '1.5rem',
  },
  'icon-sm': {
    borderRadius: foundationTokens.radiusMdCap10,
    paddingInline: 0,
    height: '2rem',
    width: '2rem',
  },
  'icon-lg': {
    paddingInline: 0,
    height: '2.5rem',
    width: '2.5rem',
  },
})

/* Upstream tightens horizontal padding when an icon sits at an edge
   (has-data-[icon=inline-*]); StyleX cannot select descendants, so the
   docs pass `iconInset` explicitly. */
const iconInset = stylex.create({
  startCompact: { paddingLeft: '0.375rem' },
  startRoomy: { paddingLeft: '0.5rem' },
  endCompact: { paddingRight: '0.375rem' },
  endRoomy: { paddingRight: '0.5rem' },
})

const shape = stylex.create({
  rounded: { borderRadius: foundationTokens.radiusFull },
})

/* TW 'rounded-md' — for flat buttons that lose their radius when a
   size preset would otherwise carry it (sidebar-06 'Subscribe'). */
const cornerRadius = stylex.create({
  md: { borderRadius: foundationTokens.radiusMdCap10 },
})

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
    layoutStyle?: ComponentLayoutStyle
  }>

/** The full visual recipe for embedding the button look on another element
   (e.g. a DropdownMenu trigger). Prefer `button()` in normal use. */
export const buttonVisualStyles = ({
  variant = 'default',
  size = 'default',
}: Readonly<{
  variant?: ButtonVariant
  size?: ButtonSize
}> = {}): ReadonlyArray<StaticStyles> => [
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
    layoutStyle?: ComponentLayoutStyle
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
