import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { complexTokens } from './complex-tokens.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx AvatarGroup (packages/core/src/AvatarGroup/) and
   Avatar/AvatarStatusDot.tsx — examples and visual spec adapted to Crease UI
   tokens. Astryx threads the overlap amount through React context onto every
   child; StyleX cannot emit child selectors, so the group sets the inherited
   `--avatar-group-overlap` custom property and each member is expected to read
   it (this component's own overflow chip does; crease `avatar` members take
   `layoutStyle` with `marginInlineStart: 'var(--avatar-group-overlap)'` and
   `ring: true` for the surface ring — see the docs page). The roving-tabindex
   list focus and translated overflow label are not ported. */

export type AvatarGroupSize = 'sm' | 'md' | 'lg' | number

const AVATAR_SIZE_PX: Readonly<Record<'sm' | 'md' | 'lg', number>> = {
  sm: 24,
  md: 32,
  lg: 40,
}

const OVERLAP_RATIO = 0.25

const resolveAvatarSize = (size: AvatarGroupSize | undefined): number =>
  typeof size === 'number' ? size : AVATAR_SIZE_PX[size ?? 'md']

export type AvatarShape = 'circle' | 'rounded' | 'square'

const styles = stylex.create({
  group: {
    alignItems: 'center',
    display: 'inline-flex',
  },
  overflow: {
    borderColor: tokens.background,
    borderStyle: 'solid',
    borderWidth: '2px',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    boxSizing: 'border-box',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontWeight: 500,
    justifyContent: 'center',
    position: 'relative',
    userSelect: 'none',
  },
  overflowCircle: { borderRadius: foundationTokens.radiusFull },
  overflowRounded: { borderRadius: foundationTokens.radiusMd },
  overflowSquare: { borderRadius: '0px' },
  overflowButton: {
    outline: {
      default: 'none',
      ':focus-visible': complexTokens.focusOutline,
    },
    paddingBlock: 0,
    cursor: interactionTokens.cursorAction,
  },
  dot: {
    borderColor: tokens.background,
    borderStyle: 'solid',
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
  },
  dotRound: { borderRadius: '50%' },
  dotSuccess: {
    backgroundColor: tokens.alertSuccess,
    color: tokens.background,
  },
  dotNeutral: {
    backgroundColor: tokens.background,
    color: tokens.mutedForeground,
  },
  dotError: { backgroundColor: tokens.destructive, color: tokens.background },
})

export type AvatarGroupProps = Readonly<{
  /** Accessible name for the group; defaults to "Avatar group". */
  ariaLabel?: string
  /** Shared avatar size used to compute the 25% overlap. Defaults to 'md'. */
  avatarSize?: AvatarGroupSize
  children: ReadonlyArray<Html>
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

/**
 * Groups avatars with a 25% overlap. Children read the inherited
 * `--avatar-group-overlap` custom property for their margin; the surface ring
 * comes from each avatar's own `ring` prop.
 */
export const avatarGroup = <Msg>(
  props: AvatarGroupProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = resolveAvatarSize(props.avatarSize)
  const overlap = Math.round(size * OVERLAP_RATIO)
  return h.div(
    [
      h.Role('group'),
      h.AriaLabel(props.ariaLabel ?? 'Avatar group'),
      h.DataAttribute('slot', 'avatar-group'),
      h.Class(className(styles.group, props.layoutStyle)),
      h.Style({
        '--avatar-group-overlap': `${-overlap}px`,
        paddingInlineStart: `${overlap}px`,
      }),
    ],
    [...props.children],
  )
}

export type AvatarGroupOverflowProps<Msg> = Readonly<{
  /** Number of hidden avatars; rendered as "+N" when no children are given. */
  count?: number
  /** Shared avatar size (px or named); the overflow chip is size + 4px to span the ring. */
  avatarSize?: AvatarGroupSize
  /** Matches the group members' avatar shape. */
  shape?: AvatarShape
  /** Custom content replacing the "+N" label. */
  children?: ReadonlyArray<Html>
  /** When set, the overflow renders as a button. */
  onClick?: Msg
  /** Accessible label override; defaults to "N more". */
  ariaLabel?: string
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

/** The "+N" chip at the end of an avatar group. */
export const avatarGroupOverflow = <Msg>(
  props: AvatarGroupOverflowProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = resolveAvatarSize(props.avatarSize)
  const shape = props.shape ?? 'circle'
  const count = props.count ?? 0
  const chipSize = size + 4
  const fontSize = Math.max(12, Math.round(size * 0.35))
  const ariaLabel =
    props.ariaLabel ??
    (props.children === undefined && count > 0 ? `${count} more` : undefined)
  const content =
    props.children !== undefined
      ? [...props.children]
      : [count > 0 ? `+${count}` : '']

  const sharedAttrs = [
    h.DataAttribute('slot', 'avatar-group-overflow'),
    ...(ariaLabel === undefined ? [] : [h.AriaLabel(ariaLabel)]),
    h.Class(
      className(
        styles.overflow,
        shape === 'circle'
          ? styles.overflowCircle
          : shape === 'rounded'
            ? styles.overflowRounded
            : styles.overflowSquare,
        props.layoutStyle,
      ),
    ),
    h.Style({
      minWidth: `${chipSize}px`,
      height: `${chipSize}px`,
      fontSize: `${fontSize}px`,
      lineHeight: '1',
      marginInlineStart: 'var(--avatar-group-overlap)',
    }),
  ]

  return props.onClick === undefined
    ? h.span(sharedAttrs, content)
    : h.button(
        [
          ...sharedAttrs,
          h.Type('button'),
          h.DataAttribute('avatar-item', 'true'),
          h.Class(className(reset.button, styles.overflowButton)),
          h.OnClick(props.onClick),
        ],
        content,
      )
}

export type AvatarStatusDotVariant = 'success' | 'neutral' | 'error'
export type AvatarStatusDotSize = 'xsm' | 'sm' | 'md' | 'lg' | 'xl' | number

type DotTier = Readonly<{
  dot: number
  border: number
  icon: number
  stroke: number
}>

const DOT_TIER_SMALL: DotTier = { dot: 10, border: 1, icon: 0, stroke: 1 }
const DOT_TIER_MEDIUM: DotTier = { dot: 20, border: 2, icon: 12, stroke: 1.5 }
const DOT_TIER_LARGE: DotTier = { dot: 32, border: 4, icon: 18, stroke: 2 }

const ASTRYX_AVATAR_SIZE_PX: Readonly<
  Record<'xsm' | 'sm' | 'md' | 'lg' | 'xl', number>
> = {
  xsm: 20,
  sm: 24,
  md: 36,
  lg: 48,
  xl: 128,
}

const resolveStatusDotSize = (size: AvatarStatusDotSize | undefined): number =>
  typeof size === 'number' ? size : ASTRYX_AVATAR_SIZE_PX[size ?? 'md']

const dotTier = (avatarSize: number): DotTier =>
  avatarSize <= 36
    ? DOT_TIER_SMALL
    : avatarSize <= 72
      ? DOT_TIER_MEDIUM
      : DOT_TIER_LARGE

const statusDotGlyph = <Msg>(
  variant: AvatarStatusDotVariant,
  field: number,
  strokeWidth: number,
  h: HtmlBuilder<Msg>,
): Html => {
  const center = field / 2
  const radius = (field - strokeWidth) / 2
  const spanStart = (field * (1 - 0.75)) / 2 + strokeWidth / 2
  const spanEnd = (field * (1 + 0.75)) / 2 - strokeWidth / 2
  const children =
    variant === 'neutral'
      ? [
          h.circle(
            [h.Cx(String(center)), h.Cy(String(center)), h.R(String(radius))],
            [],
          ),
        ]
      : variant === 'error'
        ? [
            h.line(
              [
                h.X1(String(spanStart)),
                h.X2(String(spanEnd)),
                h.Y1(String(center)),
                h.Y2(String(center)),
              ],
              [],
            ),
          ]
        : []
  return h.svg(
    [
      h.Class(className(reset.svg)),
      h.AriaHidden(true),
      h.ViewBox(`0 0 ${field} ${field}`),
      h.Width(String(field)),
      h.Height(String(field)),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth(String(strokeWidth)),
      h.StrokeLinecap('round'),
    ],
    children,
  )
}

export type AvatarStatusDotProps = Readonly<{
  /** Semantic tone: success (online), neutral (offline), error (busy). */
  variant: AvatarStatusDotVariant
  /** Driving avatar's size — picks the dot diameter tier (10/20/32px). */
  avatarSize?: AvatarStatusDotSize
  /** Accessible label for the status; omit for a decorative dot. */
  label?: string
  /** Custom glyph replacing the default (ignored at the smallest tier; icons render at 1em). */
  icon?: <M>(h: HtmlBuilder<M>) => Html
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

/** Status badge dot for the corner of an avatar (online/offline/busy). */
export const avatarStatusDot = <Msg>(
  props: AvatarStatusDotProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const avatarSize = resolveStatusDotSize(props.avatarSize)
  const tier = dotTier(avatarSize)
  const field = tier.dot - tier.border * 2
  const useIcon = props.icon !== undefined && tier.icon > 0
  const variantStyle =
    props.variant === 'success'
      ? styles.dotSuccess
      : props.variant === 'neutral'
        ? styles.dotNeutral
        : styles.dotError
  const content = useIcon
    ? [props.icon?.(h) ?? h.empty]
    : [statusDotGlyph(props.variant, field, tier.stroke, h)]

  return h.div(
    [
      h.DataAttribute('slot', 'avatar-status-dot'),
      h.DataAttribute('variant', props.variant),
      ...(props.label === undefined
        ? [h.AriaHidden(true)]
        : [h.Role('img'), h.AriaLabel(props.label)]),
      h.Class(
        className(styles.dot, styles.dotRound, variantStyle, props.layoutStyle),
      ),
      h.Style({
        width: `${tier.dot}px`,
        height: `${tier.dot}px`,
        borderWidth: `${tier.border}px`,
        ...(useIcon ? { fontSize: `${tier.icon}px` } : {}),
      }),
    ],
    content,
  )
}
