import { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import * as MenubarBehavior from '@/lib/menubar'
import * as DropdownMenu from './dropdown-menu'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

export const Model = MenubarBehavior.Model
export type Model = MenubarBehavior.Model
export const Message = MenubarBehavior.Message
export type Message = MenubarBehavior.Message
export type OutMessage = MenubarBehavior.OutMessage
export const init = MenubarBehavior.init
export const update = MenubarBehavior.update

const styles = stylex.create({
  root: {
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.25rem',
    alignItems: 'center',
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowSm,
    display: 'flex',
    isolation: 'isolate',
    position: 'relative',
    height: '2.25rem',
  },
  rootRaised: { zIndex: 50 },
  trigger: {
    borderRadius: foundationTokens.radiusSm,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    backgroundColor: {
      default: tokens.transparent,
      ':focus-visible': tokens.accent,
      ':hover': tokens.accent,
    },
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    position: 'relative',
    textDecorationLine: {
      default: 'none',
      ':is([data-selected])': 'underline',
    },
    textDecorationThickness: '2px',
    textUnderlineOffset: '0.25rem',
    zIndex: 50,
  },
  menuHost: { position: 'relative' },
})

export type MenubarMenu<Item extends string, Msg> = Readonly<{
  id: string
  label: string
  isSelected?: boolean
  onSelect?: Msg
  model: DropdownMenu.Model
  toParentMessage: (message: DropdownMenu.Message) => Msg
  items: ReadonlyArray<Item>
  itemToConfig: (item: Item) => DropdownMenu.DropdownMenuItemConfig<Item>
  contentLayoutStyle?: ComponentLayoutStyle
}>
type SharedProps<Item extends string, Msg> = Readonly<{
  menus: ReadonlyArray<MenubarMenu<Item, Msg>>
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
  layoutStyle?: ComponentLayoutStyle
}>
export type MenubarProps<Item extends string, Msg> = SharedProps<Item, Msg> &
  Readonly<{ model: Model; toParentMessage: (message: Message) => Msg }>
type LegacyMenubarProps<Item extends string, Msg> = SharedProps<Item, Msg> &
  Readonly<{ onMove?: (index: number) => Msg; activeIndex?: number }>

const menuView = <Item extends string, Msg>(
  props: SharedProps<Item, Msg>,
  activeIndex: number,
  menuAttributes: (
    index: number,
  ) => ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Role('menubar'),
      h.DataAttribute('slot', 'menubar'),
      h.AriaLabel(props.ariaLabel ?? 'Application menu'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      h.Class(
        className(
          styles.root,
          props.menus.some(menu => menu.model.isOpen) && styles.rootRaised,
          props.layoutStyle,
        ),
      ),
    ],
    props.menus.map((menu, index) =>
      h.div(
        [
          h.Role('none'),
          h.DataAttribute('slot', 'menubar-menu'),
          h.Class(className(styles.menuHost)),
          ...menuAttributes(index),
        ],
        [
          DropdownMenu.dropdownMenu<Item, Msg>(
            {
              model: menu.model,
              toParentMessage: menu.toParentMessage,
              trigger: menu.label,
              triggerStyle: styles.trigger,
              triggerTabindex: activeIndex === index ? 0 : -1,
              triggerRole: 'menuitem',
              triggerIsSelected: menu.isSelected ?? false,
              ...(menu.onSelect === undefined
                ? {}
                : { onTriggerActivate: menu.onSelect }),
              items: menu.items,
              itemToConfig: menu.itemToConfig,
              ...(menu.contentLayoutStyle === undefined
                ? {}
                : { contentLayoutStyle: menu.contentLayoutStyle }),
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
      hoverFocus: props.menus.some(m => m.model.isOpen),
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
