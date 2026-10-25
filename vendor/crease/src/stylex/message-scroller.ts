import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import * as MessageScrollerBehavior from '@/lib/message-scroller'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'

export const Model = MessageScrollerBehavior.Model
export type Model = MessageScrollerBehavior.Model
export const Scrolled = MessageScrollerBehavior.Message.Scrolled
export const ObservedViewport =
  MessageScrollerBehavior.Message.ObservedMessageScrollerViewport
export const RequestedScroll = MessageScrollerBehavior.Message.RequestedScroll
export const CompletedMessageScrollerScrollTo =
  MessageScrollerBehavior.Message.CompletedMessageScrollerScrollTo
export const Message = MessageScrollerBehavior.Message
export type Message = MessageScrollerBehavior.Message
export const init = MessageScrollerBehavior.init
export const update = MessageScrollerBehavior.update

type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>
const styles = stylex.create({
  button: {
    borderColor: tokens.border,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: {
      default: tokens.background,
      ':hover': tokens.muted,
    },
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    transform: 'translateX(-50%)',
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'transform, opacity, background-color',
    zIndex: 10,
    height: '2rem',
    left: '50%',
    width: '2rem',
  },
  buttonEnd: { bottom: '1rem' },
  buttonInactive: {
    opacity: 0,
    pointerEvents: 'none',
    transform: 'translateX(-50%) scale(0.95)',
  },
  buttonStart: { top: '1rem' },
  icon: { height: '1rem', width: '1rem' },
  iconStart: { rotate: '180deg', height: '1rem', width: '1rem' },
  content: {
    gap: '2rem',
    display: 'flex',
    flexDirection: 'column',
    height: 'max-content',
    minHeight: '100%',
  },
  item: {
    containIntrinsicSize: 'auto 10rem',
    contentVisibility: 'auto',
    flexShrink: 0,
    minWidth: 0,
  },
  root: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    minHeight: 0,
    width: '100%',
  },
  srOnly: {
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  },
  viewport: {
    overscrollBehavior: 'contain',
    height: '100%',
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
    width: '100%',
  },
  viewportPending: { visibility: 'hidden' },
})

export const messageScroller = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'message-scroller'),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [...props.children],
  )
export const messageScrollerViewport = <Msg>(
  props: ChildrenProps &
    Readonly<{ model: Model; toParentMessage: (message: Message) => Msg }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Id(`${props.model.id}-viewport`),
      h.DataAttribute('slot', 'message-scroller-viewport'),
      h.DataAttribute(
        'pending-scroll',
        String(
          !props.model.isReady ||
            props.model.pendingScrollVersion._tag === 'Some',
        ),
      ),
      h.DataAttribute('following', String(props.model.isFollowing)),
      h.DataAttribute('new-messages', String(props.model.hasNewMessages)),
      h.Class(
        className(
          styles.viewport,
          (!props.model.isReady ||
            props.model.pendingScrollVersion._tag === 'Some') &&
            styles.viewportPending,
          props.layoutStyle,
        ),
      ),
      h.OnMount(MessageScrollerBehavior.viewportMount(props.toParentMessage)),
    ],
    [...props.children],
  )
export const messageScrollerContent = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'message-scroller-content'),
      h.Class(className(styles.content, props.layoutStyle)),
    ],
    [...props.children],
  )
export const messageScrollerItem = <Msg>(
  props: ChildrenProps &
    Readonly<{ scrollAnchor?: boolean; messageId?: string }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'message-scroller-item'),
      ...(props.scrollAnchor === true
        ? [h.DataAttribute('scroll-anchor', '')]
        : []),
      ...(props.messageId === undefined
        ? []
        : [h.DataAttribute('message-id', props.messageId)]),
      h.Class(className(styles.item, props.layoutStyle)),
    ],
    [...props.children],
  )
export const messageScrollerButton = <Msg>(
  props: Readonly<{
    model: Model
    toParentMessage: (message: Message) => Msg
    direction?: 'start' | 'end'
    layoutStyle?: ComponentLayoutStyle
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const direction = props.direction ?? 'end'
  const isAtStart = props.model.scrollTop <= 1
  const isAtEnd =
    props.model.scrollHeight === 0 ||
    props.model.scrollTop + props.model.clientHeight >=
      props.model.scrollHeight - 1
  const isActive = direction === 'start' ? !isAtStart : !isAtEnd
  return h.button(
    [
      h.Type('button'),
      h.OnClick(props.toParentMessage(RequestedScroll({ direction }))),
      h.DataAttribute('slot', 'message-scroller-button'),
      h.DataAttribute('direction', direction),
      h.DataAttribute('active', String(isActive)),
      h.AriaHidden(!isActive),
      h.Tabindex(isActive ? 0 : -1),
      h.Class(
        className(
          reset.button,
          styles.button,
          direction === 'start' ? styles.buttonStart : styles.buttonEnd,
          !isActive && styles.buttonInactive,
          props.layoutStyle,
        ),
      ),
    ],
    [
      Icon.arrowDown<Msg>(
        {
          class: className(
            direction === 'start' ? styles.iconStart : styles.icon,
          ),
        },
        h,
      ),
      h.span(
        [h.Class(className(styles.srOnly))],
        [direction === 'end' ? 'Scroll to end' : 'Scroll to start'],
      ),
    ],
  )
}
