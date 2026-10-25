import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  checkboxField,
  menubarFixtures,
  menubarSpecs,
  menubarTargets,
  radioField,
  type MarkerSpecItem,
} from '@/docs/components/pages/menubar/shared'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Icon from '@/lib/icon'
import * as Menubar from '@/ui/menubar'

const MenuTarget = S.Literals(menubarTargets)
type MenuTarget = typeof MenuTarget.Type

const MenubarPreviewModel = S.Struct({
  _docsPage: S.Literal('menubar'),
  file: DropdownMenu.Model,
  edit: DropdownMenu.Model,
  view: DropdownMenu.Model,
  profiles: DropdownMenu.Model,
  format: DropdownMenu.Model,
  theme: DropdownMenu.Model,
  more: DropdownMenu.Model,
  menubar: Menubar.Model,
  selectedMenu: S.Option(MenuTarget),
  menuTargets: S.Array(MenuTarget),
  checkedBookmarksBar: S.Boolean,
  checkedFullUrls: S.Boolean,
  checkedStrikethrough: S.Boolean,
  checkedCode: S.Boolean,
  checkedSuperscript: S.Boolean,
  radioUser: S.String,
  radioTheme: S.String,
})
type MenubarPreviewModel = S.Schema.Type<typeof MenubarPreviewModel>

const MenubarPreviewMessage = defineMessageUnion({
  SelectedMenubarMenu: { target: MenuTarget },
  GotMenuMessage: { target: MenuTarget, message: DropdownMenu.Message },
  GotMenubarMessage: { message: Menubar.Message },
})
type MenubarPreviewMessage = typeof MenubarPreviewMessage.Type

const ActionMenu = DropdownMenu.create<string>()

const checkedValue = (
  item: MarkerSpecItem,
  model: MenubarPreviewModel,
): boolean => {
  const field = checkboxField[item.id]
  if (item.kind === 'checkbox' && field !== undefined) {
    return model[field]
  }
  const rfield = radioField[item.id]
  if (item.kind === 'radio' && rfield !== undefined) {
    return model[rfield] === item.id
  }
  return false
}

const configFor = (
  item: MarkerSpecItem,
  model: MenubarPreviewModel,
  h: HtmlBuilder<MenubarPreviewMessage>,
): DropdownMenu.DropdownMenuItemConfig<string> => ({
  label: item.label,
  ...(item.icon === undefined ? {} : { icon: Icon.icon(item.icon, {}, h) }),
  ...(item.shortcut === undefined ? {} : { shortcut: item.shortcut }),
  ...(item.kind === undefined ? {} : { kind: item.kind }),
  ...(item.kind === undefined ? {} : { isChecked: checkedValue(item, model) }),
  ...(item.inset === true ? { isInset: true } : {}),
  ...(item.disabled === true ? { isDisabled: true } : {}),
  ...(item.destructive === true ? { variant: 'destructive' as const } : {}),
  ...(item.separatorBefore === true ? { separatorBefore: true } : {}),
  ...(item.submenu === undefined
    ? {}
    : {
        submenu: {
          items: item.submenu.map(child => child.id),
          itemToConfig: (
            child: string,
          ): DropdownMenu.DropdownMenuItemConfig<string> =>
            configFor(
              item.submenu?.find(candidate => candidate.id === child) ?? {
                id: child,
                label: child,
              },
              model,
              h,
            ),
        },
      }),
})

const applySelection = (
  model: MenubarPreviewModel,
  value: string,
): MenubarPreviewModel => {
  const field = checkboxField[value]
  if (field !== undefined) {
    return { ...model, [field]: !model[field] }
  }
  const rfield = radioField[value]
  if (rfield !== undefined) {
    return { ...model, [rfield]: value }
  }
  return model
}

export const menubarTailwindPreviewProgram = definePreviewProgram<
  MenubarPreviewModel,
  MenubarPreviewMessage
>({
  Model: MenubarPreviewModel,
  Message: MenubarPreviewMessage,
  init: index => {
    const fixture = menubarFixtures[index] ?? menubarFixtures[0]
    return {
      _docsPage: 'menubar',
      file: DropdownMenu.init({ id: `menu-file-${String(index)}` }),
      edit: DropdownMenu.init({ id: `menu-edit-${String(index)}` }),
      view: DropdownMenu.init({ id: `menu-view-${String(index)}` }),
      profiles: DropdownMenu.init({ id: `menu-profiles-${String(index)}` }),
      format: DropdownMenu.init({ id: `menu-format-${String(index)}` }),
      theme: DropdownMenu.init({ id: `menu-theme-${String(index)}` }),
      more: DropdownMenu.init({ id: `menu-more-${String(index)}` }),
      menubar: Menubar.init({ id: `application-menubar-${String(index)}` }),
      selectedMenu: Option.none(),
      menuTargets: menubarSpecs[fixture.kind].map(menu => menu.target),
      checkedBookmarksBar: false,
      checkedFullUrls: true,
      checkedStrikethrough: true,
      checkedCode: false,
      checkedSuperscript: false,
      radioUser: 'benoit',
      radioTheme: 'system',
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'SelectedMenubarMenu':
        return {
          model: { ...model, selectedMenu: Option.some(message.target) },
        }
      case 'GotMenuMessage': {
        const menuOp = ActionMenu.update(model[message.target], message.message)
        const commands = menuOp.commands ?? []
        const maybeSelection = Option.fromNullishOr(menuOp.outMessage)
        const toggled = Option.match(maybeSelection, {
          onNone: () => model,
          onSome: selection => applySelection(model, selection.value),
        })
        const next = menubarTargets.reduce<MenubarPreviewModel>(
          (acc, target) => ({
            ...acc,
            [target]:
              target === message.target
                ? menuOp.model
                : DropdownMenu.close(acc[target]).model,
          }),
          toggled,
        )
        return {
          model: next,
          commands: Command.mapMessages(commands, next2 =>
            MenubarPreviewMessage.GotMenuMessage({
              target: message.target,
              message: next2,
            }),
          ),
        }
      }
      case 'GotMenubarMessage': {
        const menubarOp = Menubar.update(model.menubar, message.message)
        const commands = menubarOp.commands ?? []
        const maybeMove = Option.fromNullishOr(menubarOp.outMessage)
        const index = Option.match(maybeMove, {
          onNone: () => menubarOp.model.activeIndex,
          onSome: move => move.index,
        })
        const target = model.menuTargets[index]
        if (target === undefined) return { model: model }
        const next = menubarTargets.reduce<MenubarPreviewModel>(
          (acc, t) => ({
            ...acc,
            [t]: (t === target
              ? DropdownMenu.open(acc[t])
              : DropdownMenu.close(acc[t])
            ).model,
          }),
          { ...model, menubar: menubarOp.model },
        )
        return {
          model: next,
          commands: Command.mapMessages(commands, next2 =>
            MenubarPreviewMessage.GotMenubarMessage({ message: next2 }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = menubarFixtures[index] ?? menubarFixtures[0]
    const spec = menubarSpecs[fixture.kind]
    return h.div(
      [h.Class('flex flex-col items-center')],
      [
        Menubar.menubar<string, MenubarPreviewMessage>(
          {
            model: model.menubar,
            toParentMessage: message =>
              MenubarPreviewMessage.GotMenubarMessage({ message }),
            ariaLabel: 'Application menu',
            class: 'w-72',
            ...(fixture.direction === 'rtl'
              ? { direction: 'rtl' as const }
              : {}),
            menus: spec.map(menu => ({
              id: `menu-${menu.target}-${String(index)}`,
              label: menu.label,
              isSelected: Option.contains(model.selectedMenu, menu.target),
              onSelect: MenubarPreviewMessage.SelectedMenubarMenu({
                target: menu.target,
              }),
              model: model[menu.target],
              ...(menu.contentWidth === undefined
                ? {}
                : {
                    contentClass:
                      menu.contentWidth === '11rem' ? 'w-44' : 'w-64',
                  }),
              toParentMessage: message =>
                MenubarPreviewMessage.GotMenuMessage({
                  target: menu.target as MenuTarget,
                  message,
                }),
              items: menu.items.map(item => item.id),
              itemToConfig: item =>
                configFor(
                  menu.items.find(candidate => candidate.id === item) ?? {
                    id: item,
                    label: item,
                  },
                  model,
                  h,
                ),
            })),
          },
          h,
        ),
      ],
    )
  },
})
