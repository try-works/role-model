// Ported from astryx packages/core/src/TopNav (TopNav/TopNavMenu/TopNavMegaMenu
// hover + click behavior, useMenuHover delays).
import { Schema as S } from 'effect'
import { Command, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as NavMenu from './nav-menu'

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/** Menu kinds drive the astryx useMenuHover delay configuration:
    dropdown menus (TopNavMenu) show after 150ms and hide after 200ms;
    mega menus hide after 250ms; heading menus respond instantly. */
export type TopNavMenuKind = 'dropdown' | 'mega' | 'heading'

export const dropdownMenuKey = (index: number): string => `menu-${index}`

export const HEADING_MENU_KEY = 'heading-menu'

const navMenuConfig = (
  key: string,
  kind: TopNavMenuKind,
): NavMenu.InitConfig => {
  switch (kind) {
    case 'heading':
      return {
        id: `topnav-${key}`,
        showDelayMs: 0,
        closeDelayMs: 200,
        clickGuardMs: 500,
        ownsFocus: true,
      }
    case 'mega':
      return {
        id: `topnav-${key}`,
        showDelayMs: 150,
        closeDelayMs: 250,
        clickGuardMs: 500,
        ownsFocus: true,
      }
    case 'dropdown':
      return {
        id: `topnav-${key}`,
        showDelayMs: 150,
        closeDelayMs: 200,
        clickGuardMs: 500,
        ownsFocus: true,
      }
  }
}

export const Model = S.Struct({
  id: S.String,
  menus: S.Record(S.String, NavMenu.Model),
  menuKinds: S.Record(S.String, S.String),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotTopNavMenuMessage: { key: S.String, message: NavMenu.Message },
  PressedTopNavItem: { id: S.String },
  PressedTopNavMenuItem: { menuKey: S.String, itemTitle: S.String },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectedTopNavItem: { id: S.String },
  SelectedTopNavMenuItem: { menuKey: S.String, itemTitle: S.String },
  ChangedTopNavMenuOpen: { key: S.String, isOpen: S.Boolean },
})
export type OutMessage = typeof OutMessage.Type

export type InitConfig = Readonly<{ id: string }>

export const init = (config: InitConfig): Model => ({
  id: config.id,
  menus: {},
  menuKinds: {},
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

/** Lazily initializes (and remembers the kind of) the menu under `key`. */
export const menuFor = (
  model: Model,
  key: string,
  kind: TopNavMenuKind,
): NavMenu.Model => model.menus[key] ?? NavMenu.init(navMenuConfig(key, kind))

export const isMenuOpen = (model: Model, key: string): boolean =>
  model.menus[key] !== undefined && NavMenu.isOpen(model.menus[key])

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotTopNavMenuMessage': {
      const kind = (model.menuKinds[message.key] ??
        'dropdown') as TopNavMenuKind
      const menu = menuFor(model, message.key, kind)
      const wasOpen = NavMenu.isOpen(menu)
      const result = NavMenu.update(menu, message.message)
      const menus = { ...model.menus, [message.key]: result.model }
      const menuKinds =
        model.menuKinds[message.key] === undefined
          ? { ...model.menuKinds, [message.key]: kind }
          : model.menuKinds
      const isOpenNow = NavMenu.isOpen(result.model)
      return {
        model: { ...model, menus, menuKinds },
        commands: Command.mapMessages(result.commands ?? [], next =>
          Message.GotTopNavMenuMessage({ key: message.key, message: next }),
        ),
        ...(wasOpen === isOpenNow
          ? {}
          : {
              outMessage: OutMessage.ChangedTopNavMenuOpen({
                key: message.key,
                isOpen: isOpenNow,
              }),
            }),
      }
    }
    case 'PressedTopNavItem':
      return {
        model,
        outMessage: OutMessage.SelectedTopNavItem({ id: message.id }),
      }
    case 'PressedTopNavMenuItem': {
      // Item activation both dismisses the menu and reports the selection.
      const kind = (model.menuKinds[message.menuKey] ??
        'dropdown') as TopNavMenuKind
      const menu = menuFor(model, message.menuKey, kind)
      const result = NavMenu.update(menu, NavMenu.Message.SelectedNavMenuItem())
      const menus = { ...model.menus, [message.menuKey]: result.model }
      const menuKinds =
        model.menuKinds[message.menuKey] === undefined
          ? { ...model.menuKinds, [message.menuKey]: kind }
          : model.menuKinds
      return {
        model: { ...model, menus, menuKinds },
        commands: Command.mapMessages(result.commands ?? [], next =>
          Message.GotTopNavMenuMessage({
            key: message.menuKey,
            message: next,
          }),
        ),
        outMessage: OutMessage.SelectedTopNavMenuItem({
          menuKey: message.menuKey,
          itemTitle: message.itemTitle,
        }),
      } satisfies UpdateReturn
    }
  }
}
