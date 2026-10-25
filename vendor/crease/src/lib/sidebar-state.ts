import type { Stream } from 'effect'
import { Effect, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Subscription from 'foldkit/subscription'

const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export const Model = S.Struct({
  isOpen: S.Boolean,
  isMobileOpen: S.Boolean,
  storageKey: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Toggled: {},
  ToggledMobile: {},
  SetMobileOpen: { isOpen: S.Boolean },
  CompletedSidebarPersist: {},
})
export type Message = typeof Message.Type

export const init = (
  config: Readonly<{ defaultOpen?: boolean; storageKey?: string }> = {},
): Model => ({
  isOpen: config.defaultOpen ?? true,
  isMobileOpen: false,
  storageKey: config.storageKey ?? 'sidebar_state',
})

const SidebarPersist = Command.define('SidebarPersist', {
  args: { key: S.String, isOpen: S.Boolean },
  messages: [Message.CompletedSidebarPersist],
  execute: ({ key, isOpen }) =>
    Effect.sync(() => {
      document.cookie = `${key}=${String(isOpen)}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`
    }).pipe(Effect.as(Message.CompletedSidebarPersist())),
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'Toggled': {
      const isOpen = !model.isOpen
      return {
        model: { ...model, isOpen },
        commands: [SidebarPersist({ key: model.storageKey, isOpen })],
      }
    }
    case 'ToggledMobile':
      return { model: { ...model, isMobileOpen: !model.isMobileOpen } }
    case 'SetMobileOpen':
      return { model: { ...model, isMobileOpen: message.isOpen } }
    case 'CompletedSidebarPersist':
      return { model: model }
  }
}

export const shortcut = <Msg>(
  toMessage: (message: Message) => Msg,
): Stream.Stream<Msg> =>
  Subscription.fromEventFilterMapPreventDefault<Document, 'keydown', Msg>({
    target: document,
    type: 'keydown',
    filterMapEvent: event =>
      event.key.toLowerCase() !== 'b' || (!event.metaKey && !event.ctrlKey)
        ? Option.none()
        : Option.some(toMessage(Message.Toggled())),
  })
