import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import * as MessageScrollerBehavior from '@/lib/message-scroller'
import { cn } from '@/lib/utils'

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
  class?: string
}>

export const messageScroller = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'message-scroller'),
      h.Class(
        cn(
          'group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const messageScrollerViewport = <Msg>(
  props: ChildrenProps &
    Readonly<{
      model: Model
      toParentMessage: (message: Message) => Msg
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
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
        cn(
          'size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain data-[pending-scroll=true]:invisible',
          props.class,
        ),
      ),
      h.OnMount(MessageScrollerBehavior.viewportMount(props.toParentMessage)),
    ],
    [...props.children],
  )
}

export const messageScrollerContent = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'message-scroller-content'),
      h.Class(cn('flex h-max min-h-full flex-col gap-8', props.class)),
    ],
    [...props.children],
  )
}

export const messageScrollerItem = <Msg>(
  props: ChildrenProps &
    Readonly<{ scrollAnchor?: boolean; messageId?: string }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'message-scroller-item'),
      ...(props.scrollAnchor === true
        ? [h.DataAttribute('scroll-anchor', '')]
        : []),
      ...(props.messageId === undefined
        ? []
        : [h.DataAttribute('message-id', props.messageId)]),
      h.Class(
        cn(
          'min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const messageScrollerButton = <Msg>(
  props: Readonly<{
    model: Model
    toParentMessage: (message: Message) => Msg
    direction?: 'start' | 'end'
    class?: string
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
        cn(
          'absolute left-1/2 z-10 flex size-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-md border bg-background text-foreground transition-[transform,opacity,background-color] duration-200 hover:bg-muted data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[direction=end]:bottom-4 data-[direction=start]:top-4 data-[direction=start]:[&_svg]:rotate-180',
          props.class,
        ),
      ),
    ],
    [
      Icon.arrowDown<Msg>({ class: 'size-4' }, h),
      h.span(
        [h.Class('sr-only')],
        [direction === 'end' ? 'Scroll to end' : 'Scroll to start'],
      ),
    ],
  )
}
