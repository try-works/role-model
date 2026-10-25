import { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import * as DropdownMenu from '@/ui/dropdown-menu'
import * as MenubarBehavior from '@/lib/menubar'
import { cn } from '@/lib/utils'

export const Model = MenubarBehavior.Model
export type Model = MenubarBehavior.Model
export const Message = MenubarBehavior.Message
export type Message = MenubarBehavior.Message
export type OutMessage = MenubarBehavior.OutMessage
export const init = MenubarBehavior.init
export const update = MenubarBehavior.update

export type MenubarMenu<Item extends string, Msg> = Readonly<{
  id: string
  label: string
  isSelected?: boolean
  onSelect?: Msg
  model: DropdownMenu.Model
  toParentMessage: (message: DropdownMenu.Message) => Msg
  items: ReadonlyArray<Item>
  itemToConfig: (item: Item) => DropdownMenu.DropdownMenuItemConfig<Item>
  contentClass?: string
}>

type SharedProps<Item extends string, Msg> = Readonly<{
  menus: ReadonlyArray<MenubarMenu<Item, Msg>>
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
  class?: string
}>

export type MenubarProps<Item extends string, Msg> = SharedProps<Item, Msg> &
  Readonly<{
    model: Model
    toParentMessage: (message: Message) => Msg
  }>

type LegacyMenubarProps<Item extends string, Msg> = SharedProps<Item, Msg> &
  Readonly<{
    onMove?: (index: number) => Msg
    activeIndex?: number
  }>

const ROOT_CLASS =
  'relative isolate flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-xs'
const TRIGGER_CLASS =
  'relative z-50 rounded-sm px-2 py-1 text-sm font-medium outline-none hover:bg-accent focus-visible:bg-accent'

const menuView = <Item extends string, Msg>(
  props: SharedProps<Item, Msg>,
  activeIndex: number,
  menuAttributes: (
    index: number,
  ) => ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  h: HtmlBuilder<Msg>,
): Html => {
  const anyOpen = props.menus.some(menu => menu.model.isOpen)
  return h.div(
    [
      h.Role('menubar'),
      h.DataAttribute('slot', 'menubar'),
      h.AriaLabel(props.ariaLabel ?? 'Application menu'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      // Keep all triggers above the open menu's backdrop in one stacking context.
      h.Class(cn(ROOT_CLASS, anyOpen && 'z-50', props.class)),
    ],
    props.menus.map((menu, index) =>
      h.div(
        [
          h.Role('none'),
          h.DataAttribute('slot', 'menubar-menu'),
          h.Class('relative'),
          ...menuAttributes(index),
        ],
        [
          DropdownMenu.dropdownMenu<Item, Msg>(
            {
              model: menu.model,
              toParentMessage: menu.toParentMessage,
              trigger: menu.label,
              triggerTabindex: activeIndex === index ? 0 : -1,
              triggerRole: 'menuitem',
              triggerIsSelected: menu.isSelected ?? false,
              ...(menu.onSelect === undefined
                ? {}
                : { onTriggerActivate: menu.onSelect }),
              triggerClass: cn(
                TRIGGER_CLASS,
                menu.isSelected
                  ? 'underline decoration-2 underline-offset-4'
                  : undefined,
              ),
              items: menu.items,
              itemToConfig: menu.itemToConfig,
              ...(menu.contentClass === undefined
                ? {}
                : { contentClass: menu.contentClass }),
              align: 'start',
              ariaLabel: menu.label,
              ...(props.direction === undefined
                ? {}
                : { direction: props.direction }),
            },
            h,
          ),
        ],
      ),
    ),
  )
}

const renderMenubar = <Item extends string, Msg>(
  props: MenubarProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: MenubarBehavior.behavior.view,
    viewInputs: {
      triggerIds: props.menus.map(menu => `${menu.model.id}-trigger`),
      ...(props.direction === undefined ? {} : { direction: props.direction }),
      shouldMoveTopLevel: (index, key) => {
        const menu = props.menus[index]
        if (menu === undefined || !menu.model.isOpen) return true
        if (key === 'Home' || key === 'End') return false
        if (Option.isSome(menu.model.openSubmenuIndex)) return false
        const forward = props.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
        const active = menu.items[menu.model.activeIndex]
        return (
          key !== forward ||
          active === undefined ||
          menu.itemToConfig(active).submenu === undefined
        )
      },
      hoverFocus: props.menus.some(menu => menu.model.isOpen),
      toView: menus =>
        menuView(
          props,
          props.model.activeIndex,
          index => menus[index]?.attributes ?? [],
          h,
        ),
    },
    toParentMessage: props.toParentMessage,
  })

const renderLegacy = <Item extends string, Msg>(
  props: LegacyMenubarProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  menuView(
    props,
    props.activeIndex ?? 0,
    index => [
      h.OnKeyDownPreventDefault(key => {
        if (props.onMove === undefined || props.menus.length === 0)
          return Option.none()
        const forward = props.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
        const backward = props.direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
        if (key !== forward && key !== backward) return Option.none()
        return Option.some(
          props.onMove(
            (index + (key === forward ? 1 : -1) + props.menus.length) %
              props.menus.length,
          ),
        )
      }),
    ],
    h,
  )

export function menubar<Item extends string, Msg>(
  props: MenubarProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html
export function menubar<Item extends string, Msg>(
  props: LegacyMenubarProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html
export function menubar<Item extends string, Msg>(
  props: MenubarProps<Item, Msg> | LegacyMenubarProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html {
  return 'model' in props ? renderMenubar(props, h) : renderLegacy(props, h)
}
