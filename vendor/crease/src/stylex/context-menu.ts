import type { ComponentLayoutStyle } from './contracts'

import type { Html, HtmlBuilder } from 'foldkit/html'

import * as DropdownMenu from './dropdown-menu'

export const Model = DropdownMenu.Model
export type Model = DropdownMenu.Model
export const Message = DropdownMenu.Message
export type Message = DropdownMenu.Message
export type OutMessage<Item extends string = string> =
  DropdownMenu.OutMessage<Item>
export const init = DropdownMenu.init
export const create = DropdownMenu.create
export const update = DropdownMenu.update
export const open = DropdownMenu.open
export const openAt = DropdownMenu.openAt
export const close = DropdownMenu.close
export const selectItem = DropdownMenu.selectItem

export type ContextMenuItemConfig<Item extends string = string> =
  DropdownMenu.DropdownMenuItemConfig<Item>

export type ContextMenuProps<Item extends string, Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  trigger: Html | string
  items: ReadonlyArray<Item>
  itemToConfig: (item: Item) => ContextMenuItemConfig<Item>
  ariaLabel?: string
  layoutStyle?: ComponentLayoutStyle
  direction?: 'ltr' | 'rtl'
  /** Checkbox and radio items toggle without closing the menu. */
  keepOpenOnCheckableSelect?: boolean
}>

export const contextMenu = <Item extends string, Msg>(
  props: ContextMenuProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  DropdownMenu.dropdownMenu<Item, Msg>(
    {
      model: props.model,
      toParentMessage: props.toParentMessage,
      trigger: props.trigger,
      items: props.items,
      itemToConfig: props.itemToConfig,
      openOnContextMenu: true,
      ...(props.keepOpenOnCheckableSelect === undefined
        ? {}
        : { keepOpenOnCheckableSelect: props.keepOpenOnCheckableSelect }),
      ...(props.direction === undefined ? {} : { direction: props.direction }),
      ...(props.layoutStyle === undefined
        ? {}
        : { triggerLayoutStyle: props.layoutStyle }),
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
    },
    h,
  )
