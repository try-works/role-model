import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { messageScope } from './message.markers.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>
type MessageGroupProps = ChildrenProps &
  Readonly<{ ariaLabel?: string; live?: 'off' | 'polite' }>

const styles = stylex.create({
  avatar: {
    borderRadius: '50%',
    overflow: 'hidden',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: foundationTokens.muted,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    transform: {
      default: null,
      [stylex.when.ancestor(
        ':has([data-slot="message-footer"])',
        messageScope,
      )]: 'translateY(-2rem)',
    },
    minWidth: '2rem',
    width: 'fit-content',
  },
  content: {
    gap: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
    overflowWrap: 'break-word',
    minWidth: 0,
    width: '100%',
  },
  end: { flexDirection: 'row-reverse' },
  footer: {
    paddingInline: {
      default: '0.75rem',
      [stylex.when.ancestor(':has([data-variant="ghost"])', messageScope)]:
        '0rem',
    },
    alignItems: 'center',
    alignSelf: {
      default: null,
      [stylex.when.ancestor('[data-align="end"]', messageScope)]: 'flex-end',
    },
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: {
      default: null,
      [stylex.when.ancestor('[data-align="end"]', messageScope)]: 'flex-end',
    },
    lineHeight: '1rem',
    maxWidth: '100%',
    minWidth: 0,
  },
  group: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    paddingInline: {
      default: '0.75rem',
      [stylex.when.ancestor(':has([data-variant="ghost"])', messageScope)]:
        '0rem',
    },
    alignItems: 'center',
    alignSelf: {
      default: null,
      [stylex.when.ancestor('[data-align="end"]', messageScope)]: 'flex-end',
    },
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    maxWidth: '100%',
    minWidth: 0,
  },
  plain: {
    paddingInline: '0.75rem',
    alignItems: 'center',
    alignSelf: {
      default: null,
      [stylex.when.ancestor('[data-align="end"]', messageScope)]: 'flex-end',
    },
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    maxWidth: '100%',
    minWidth: 0,
  },
  message: {
    gap: '0.5rem',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    position: 'relative',
    minWidth: 0,
    width: '100%',
  },
  actions: {
    gap: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    alignSelf: {
      default: null,
      [stylex.when.ancestor('[data-align="end"]', messageScope)]: 'flex-end',
    },
    display: 'flex',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    maxWidth: '100%',
    minWidth: 0,
  },
})

const part = <Msg>(
  slot: string,
  style: StaticStyles,
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', slot),
      h.Class(className(style, props.layoutStyle)),
    ],
    [...props.children],
  )

export const messageGroup = <Msg>(
  props: MessageGroupProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'message-group'),
      ...(props.live === undefined || props.live === 'off'
        ? []
        : [h.Role('log'), h.AriaLive('polite')]),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.Class(className(styles.group, props.layoutStyle)),
    ],
    [...props.children],
  )

export const message = <Msg>(
  props: ChildrenProps &
    Readonly<{
      align?: 'start' | 'end'
      announcement?: 'none' | 'status'
      ariaLabel?: string
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const align = props.align ?? 'start'
  return h.div(
    [
      h.DataAttribute('slot', 'message'),
      h.DataAttribute('align', align),
      ...(props.announcement === 'status'
        ? [h.Role('status'), h.AriaLive('polite')]
        : []),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.Class(
        className(
          styles.message,
          align === 'end' && styles.end,
          messageScope,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
}

export const messageAvatar = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => part('message-avatar', styles.avatar, props, h)
export const messageContent = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => part('message-content', styles.content, props, h)
export const messageHeader = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => part('message-header', styles.header, props, h)
export const messageAuthor = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => part('message-author', styles.plain, props, h)
export const messageFooter = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => part('message-footer', styles.footer, props, h)
export const messageMetadata = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => part('message-metadata', styles.plain, props, h)
export const messageActions = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => part('message-actions', styles.actions, props, h)
