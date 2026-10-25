import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type {
  Assert,
  BadgeVariant,
  ComponentLayoutStyle,
  HasExactlyKeys,
} from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

export type { BadgeVariant } from './contracts'

/* StyleX port of shadcn/ui badge.tsx (radix-vega). Tailwind's
   has-data-[icon=*] padding compensation becomes the `iconInset` prop and
   `[a]:hover` styles become the `anchor` map applied when `href` is set. */
const base = stylex.create({
  root: {
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'background-color, color, border-color, box-shadow',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  },
  iconInsetStart: {
    paddingLeft: '0.375rem',
  },
  iconInsetEnd: {
    paddingRight: '0.375rem',
  },
})

const variants = stylex.create({
  default: {
    borderColor: tokens.transparent,
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  secondary: {
    borderColor: tokens.transparent,
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
  },
  destructive: {
    borderColor: tokens.transparent,
    backgroundColor: tokens.badgeDestructiveSurface,
    color: tokens.destructive,
  },
  outline: {
    /* TW emits border-border (var(--border), preset-scoped), not the static
       --color-border default. */
    borderColor: tokens.border,
    backgroundColor: tokens.transparent,
    color: tokens.foreground,
  },
  ghost: {
    borderColor: tokens.transparent,
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.badgeMutedHover,
    },
    color: {
      default: tokens.foreground,
      ':hover': tokens.mutedForeground,
    },
  },
  link: {
    borderColor: tokens.transparent,
    backgroundColor: tokens.transparent,
    color: tokens.primary,
    textDecorationLine: { default: 'none', ':hover': 'underline' },
    textUnderlineOffset: '0.25rem',
  },
})

/* Upstream scopes hover tints to anchors ([a]:hover) so non-interactive
   badges do not highlight. StyleX cannot select ancestors, so these apply
   only when the badge renders as a link. */
const anchor = stylex.create({
  default: {
    backgroundColor: {
      default: tokens.primary,
      ':hover': tokens.badgePrimaryHover,
    },
  },
  secondary: {
    backgroundColor: {
      default: tokens.secondary,
      ':hover': tokens.badgeSecondaryHover,
    },
  },
  destructive: {
    backgroundColor: {
      default: tokens.badgeDestructiveSurface,
      ':hover': tokens.badgeDestructiveHover,
    },
  },
  outline: {
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.muted,
    },
    color: {
      default: tokens.foreground,
      ':hover': tokens.mutedForeground,
    },
  },
  ghost: {},
  link: {},
})

type _VariantMapIsExhaustive = Assert<
  HasExactlyKeys<typeof variants, BadgeVariant>
>

export type BadgeProps = Readonly<{
  children: ReadonlyArray<Html | string>
  variant?: BadgeVariant
  /** Parent-layout positioning only. Add visual choices as named variants. */
  layoutStyle?: ComponentLayoutStyle
  /** Padding compensation matching has-data-[icon=inline-start|end]. */
  iconInset?: 'start' | 'end'
  /** Renders the badge as an anchor pointing at this URL. */
  href?: string
}>

export const badge = <Msg>(props: BadgeProps, h: HtmlBuilder<Msg>): Html => {
  const variant = props.variant ?? 'default'
  const attributes = [
    h.DataAttribute('slot', 'badge'),
    h.DataAttribute('variant', variant),
    h.Class(
      className(
        reset.link,
        base.root,
        variants[variant],
        ...(props.href === undefined ? [] : [anchor[variant]]),
        ...(props.iconInset === undefined
          ? []
          : [
              props.iconInset === 'start'
                ? base.iconInsetStart
                : base.iconInsetEnd,
            ]),
        props.layoutStyle,
      ),
    ),
    ...(props.href === undefined ? [] : [h.Href(props.href)]),
  ]
  return props.href === undefined
    ? h.span(attributes, [...props.children])
    : h.a(attributes, [...props.children])
}
