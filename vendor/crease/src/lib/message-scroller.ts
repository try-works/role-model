import { Effect, Option, Queue, Schema as S, Stream } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import * as Mount from 'foldkit/mount'
import { defineMessageUnion } from 'foldkit/message'

export const Model = S.Struct({
  id: S.String,
  scrollTop: S.Number,
  scrollHeight: S.Number,
  clientHeight: S.Number,
  isReady: S.Boolean,
  isFollowing: S.Boolean,
  hasNewMessages: S.Boolean,
  pendingScrollVersion: S.Option(S.Number),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Scrolled: {
    scrollTop: S.Number,
    scrollHeight: S.Number,
    clientHeight: S.Number,
  },
  ObservedMessageScrollerViewport: {
    reason: S.Literals(['mount', 'user', 'content', 'resize']),
    scrollTop: S.Number,
    scrollHeight: S.Number,
    clientHeight: S.Number,
  },
  RequestedScroll: { direction: S.Literals(['start', 'end']) },
  CompletedMessageScrollerScrollTo: { version: S.Number },
})
export type Message = typeof Message.Type

export const init = (id: string): Model => ({
  id,
  scrollTop: 0,
  scrollHeight: 0,
  clientHeight: 0,
  isReady: false,
  isFollowing: true,
  hasNewMessages: false,
  pendingScrollVersion: Option.none(),
})

const ScrollTo = Command.define('MessageScrollerScrollTo', {
  args: {
    id: S.String,
    direction: S.Literals(['start', 'end']),
    version: S.Number,
    immediate: S.Boolean,
  },
  messages: [Message.CompletedMessageScrollerScrollTo],
  execute: ({ id, direction, version, immediate }) =>
    Effect.sync(() => {
      const viewport = document.getElementById(`${id}-viewport`)
      if (viewport instanceof HTMLElement) {
        const reduced =
          globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
          false
        viewport.scrollTo({
          top: direction === 'start' ? 0 : viewport.scrollHeight,
          behavior: immediate || reduced ? 'auto' : 'smooth',
        })
      }
    }).pipe(Effect.as(Message.CompletedMessageScrollerScrollTo({ version }))),
})

type UpdateReturn = Update.Return<Model, Message>
const atEnd = (
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): boolean => scrollHeight === 0 || scrollTop + clientHeight >= scrollHeight - 1
const requestScroll = (
  model: Model,
  direction: 'start' | 'end',
  immediate: boolean,
): UpdateReturn => {
  const version =
    (model.pendingScrollVersion._tag === 'Some'
      ? model.pendingScrollVersion.value
      : 0) + 1
  return {
    model: {
      ...model,
      isFollowing: direction === 'end',
      hasNewMessages: direction === 'end' ? false : model.hasNewMessages,
      pendingScrollVersion: Option.some(version),
    },
    commands: [ScrollTo({ id: model.id, direction, version, immediate })],
  }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'Scrolled':
      return update(
        model,
        Message['ObservedMessageScrollerViewport']({
          scrollTop: message.scrollTop,
          scrollHeight: message.scrollHeight,
          clientHeight: message.clientHeight,
          reason: 'user',
        }),
      )
    case 'ObservedMessageScrollerViewport': {
      const metrics = {
        scrollTop: message.scrollTop,
        scrollHeight: message.scrollHeight,
        clientHeight: message.clientHeight,
      }
      const isAtEnd = atEnd(
        message.scrollTop,
        message.scrollHeight,
        message.clientHeight,
      )
      if (message.reason === 'user')
        return {
          model: {
            ...model,
            ...metrics,
            isReady: true,
            isFollowing: isAtEnd,
            hasNewMessages: isAtEnd ? false : model.hasNewMessages,
          },
        }
      if (!model.isFollowing)
        return {
          model: {
            ...model,
            ...metrics,
            isReady: true,
            hasNewMessages:
              message.reason === 'content' ? true : model.hasNewMessages,
          },
        }
      return requestScroll(
        { ...model, ...metrics, isReady: true },
        'end',
        message.reason === 'mount',
      )
    }
    case 'RequestedScroll':
      return requestScroll(model, message.direction, false)
    case 'CompletedMessageScrollerScrollTo':
      return model.pendingScrollVersion._tag === 'Some' &&
        model.pendingScrollVersion.value === message.version
        ? {
            model: {
              ...model,
              pendingScrollVersion: Option.none(),
              isReady: true,
            },
          }
        : { model: model }
  }
}

const measure = (
  element: HTMLElement,
  reason: 'mount' | 'user' | 'content' | 'resize',
) =>
  Message['ObservedMessageScrollerViewport']({
    reason,
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  })

export const ObserveMessageScroller = Mount.defineStream(
  'ObserveMessageScroller',
  {
    messages: [Message.ObservedMessageScrollerViewport],
    execute: ({ element }) =>
      Stream.callback<typeof Message.ObservedMessageScrollerViewport.Type>(
        queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                if (!(element instanceof HTMLElement)) return undefined
                const emit = (
                  reason: 'mount' | 'user' | 'content' | 'resize',
                ) => Queue.offerUnsafe(queue, measure(element, reason))
                const onScroll = () => emit('user')
                const mutation = new MutationObserver(() => emit('content'))
                const resize = new ResizeObserver(() => emit('resize'))
                element.addEventListener('scroll', onScroll, { passive: true })
                mutation.observe(element, { childList: true, subtree: true })
                resize.observe(element)
                emit('mount')
                return { mutation, resize, onScroll }
              }),
              resource =>
                Effect.sync(() => {
                  if (
                    resource === undefined ||
                    !(element instanceof HTMLElement)
                  )
                    return
                  element.removeEventListener('scroll', resource.onScroll)
                  resource.mutation.disconnect()
                  resource.resize.disconnect()
                }),
            )
            return yield* Effect.never
          }),
      ),
  },
)

export const viewportMount = <Msg>(
  toParentMessage: (message: Message) => Msg,
) => Mount.mapMessage(ObserveMessageScroller(), toParentMessage)
