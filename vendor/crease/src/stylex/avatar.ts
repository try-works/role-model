import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { avatarScope } from './avatar.markers.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
export const Model = S.Struct({
  status: S.Literals(['loading', 'loaded', 'error']),
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  Loaded: {},
  Failed: {},
})
export type Message = typeof Message.Type
export const init = (): Model => ({ status: 'loading' })
export const update = (_model: Model, message: Message): Model => ({
  status: message._tag === 'Loaded' ? 'loaded' : 'error',
})
const styles = stylex.create({
  root: {
    overflow: 'hidden',
    display: 'flex',
    flexShrink: 0,
    position: 'relative',
    userSelect: 'none',
    height: '2rem',
    width: '2rem',
  },
  round: { borderRadius: '50%' },
  sm: { height: '1.5rem', width: '1.5rem' },
  lg: { height: '2.5rem', width: '2.5rem' },
  image: {
    aspectRatio: '1',
    position: 'relative',
    zIndex: 10,
    height: '100%',
    width: '100%',
  },
  loading: { opacity: 0 },
  fallback: {
    inset: 0,
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    color: tokens.foreground,
    display: 'flex',
    fontSize: {
      default: '0.875rem',
      [stylex.when.ancestor('[data-size=sm]', avatarScope)]: '0.75rem',
    },
    justifyContent: 'center',
    lineHeight: {
      default: '1.25rem',
      [stylex.when.ancestor('[data-size=sm]', avatarScope)]: '1rem',
    },
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
  ringed: { boxShadow: `0 0 0 2px ${tokens.background}` },
  overlap: { marginInlineEnd: '-0.5rem' },
  badge: {
    borderRadius: '50%',
    alignItems: 'center',
    backgroundColor: tokens.primary,
    boxShadow: `0 0 0 2px ${tokens.background}`,
    color: tokens.primaryForeground,
    display: 'inline-flex',
    justifyContent: 'center',
    position: 'absolute',
    userSelect: 'none',
    zIndex: 10,
    bottom: 0,
    right: 0,
  },
  badgeSm: { height: '0.5rem', width: '0.5rem' },
  badgeDefault: { height: '0.625rem', width: '0.625rem' },
  badgeLg: { height: '0.75rem', width: '0.75rem' },
  group: { display: 'flex' },
  groupCount: {
    borderRadius: '50%',
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    boxShadow: `0 0 0 2px ${tokens.background}`,
    color: tokens.foreground,
    display: 'flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    justifyContent: 'center',
    lineHeight: '1.25rem',
    position: 'relative',
    height: '2rem',
    width: '2rem',
  },
  groupCountSm: {
    fontSize: '0.75rem',
    lineHeight: '1rem',
    height: '1.5rem',
    width: '1.5rem',
  },
  groupCountLg: { height: '2.5rem', width: '2.5rem' },
  grayscale: { filter: 'grayscale(100%)' },
  badgeSuccess: { backgroundColor: foundationTokens.avatarBadgeSuccess },
})
export type AvatarProps = Readonly<{
  size?: 'default' | 'sm' | 'lg'
  ring?: boolean
  overlap?: boolean
  grayscale?: boolean
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
}>
export const avatar = <Msg>(p: AvatarProps, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'avatar'),
      h.DataAttribute('size', p.size ?? 'default'),
      h.Class(
        className(
          styles.root,
          styles.round,
          p.size === 'sm' && styles.sm,
          p.size === 'lg' && styles.lg,
          p.ring === true && styles.ringed,
          p.overlap === true && styles.overlap,
          p.grayscale === true && styles.grayscale,
          avatarScope,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export type AvatarImageProps = Readonly<{
  src: string
  alt: string
  grayscale?: boolean
  layoutStyle?: ComponentLayoutStyle
  model?: Model
}>
export const avatarImage = <Msg>(
  p: AvatarImageProps &
    Readonly<{ toParentMessage?: (message: Message) => Msg }>,
  h: HtmlBuilder<Msg>,
): Html =>
  p.model?.status === 'error'
    ? h.empty
    : h.img([
        h.DataAttribute('slot', 'avatar-image'),
        h.Src(p.src),
        h.Alt(p.alt),
        ...(p.toParentMessage === undefined
          ? []
          : [
              h.OnLoad(p.toParentMessage(Message.Loaded())),
              h.OnError(p.toParentMessage(Message.Failed())),
            ]),
        ...(p.model?.status === 'loaded'
          ? []
          : [h.DataAttribute('loading', '')]),
        h.Class(
          className(
            reset.media,
            styles.image,
            p.model?.status !== 'loaded' && styles.loading,
            p.grayscale === true && styles.grayscale,
            p.layoutStyle,
          ),
        ),
      ])
export type AvatarFallbackProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
  model?: Model
}>
export const avatarFallback = <Msg>(
  p: AvatarFallbackProps,
  h: HtmlBuilder<Msg>,
): Html =>
  p.model?.status === 'loaded'
    ? h.empty
    : h.div(
        [
          h.DataAttribute('slot', 'avatar-fallback'),
          h.Class(className(styles.fallback, styles.round, p.layoutStyle)),
        ],
        [...p.children],
      )

export type AvatarBadgeProps = Readonly<{
  size?: 'default' | 'sm' | 'lg'
  tone?: 'primary' | 'success'
  layoutStyle?: ComponentLayoutStyle
  children?: ReadonlyArray<Html | string>
}>
export const avatarBadge = <Msg>(
  p: AvatarBadgeProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'avatar-badge'),
      h.Class(
        className(
          styles.badge,
          p.tone === 'success' && styles.badgeSuccess,
          p.size === 'sm'
            ? styles.badgeSm
            : p.size === 'lg'
              ? styles.badgeLg
              : styles.badgeDefault,
          p.layoutStyle,
        ),
      ),
    ],
    [...(p.children ?? [])],
  )
export type AvatarGroupProps = Readonly<{
  grayscale?: boolean
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
}>
export const avatarGroup = <Msg>(
  p: AvatarGroupProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'avatar-group'),
      h.Class(
        className(
          styles.group,
          p.grayscale === true && styles.grayscale,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export type AvatarGroupCountProps = Readonly<{
  size?: 'default' | 'sm' | 'lg'
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
}>
export const avatarGroupCount = <Msg>(
  p: AvatarGroupCountProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'avatar-group-count'),
      h.Class(
        className(
          styles.groupCount,
          p.size === 'sm'
            ? styles.groupCountSm
            : p.size === 'lg'
              ? styles.groupCountLg
              : styles.groupCount,
          p.layoutStyle,
        ),
      ),
    ],
    [...(p.children ?? [])],
  )
