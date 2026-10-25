import { Style, When } from '@pleat/core'
const styles = {
  alignHorizontalCenter: Style.make({
    left: '50%',
    transform: 'translateX(-50%)',
  }),
  alignHorizontalEnd: Style.make({ right: 0 }),
  alignHorizontalStart: Style.make({ left: 0 }),
  alignVerticalCenter: Style.make({
    top: '50%',
    transform: 'translateY(-50%)',
  }),
  alignVerticalEnd: Style.make({ bottom: 0 }),
  alignVerticalStart: Style.make({ top: 0 }),
  backdrop: Style.make({
    cursor: interactionTokens.cursorDefault,
    inset: 0,
    position: 'fixed',
    zIndex: 40,
  }),
  bottom: Style.make({ marginTop: '0.25rem', top: '100%' }),
  indicator: Style.make({
    alignItems: 'center',
    display: 'flex',
    height: '0.875rem',
    justifyContent: 'center',
    left: '0.5rem',
    position: 'absolute',
    width: '0.875rem',
  }),
  destructive: Style.make({
    backgroundColor: tokens.transparent,
    color: tokens.destructive,
  }).pipe(
    Style.when(When.pseudo(':is([data-active="true"], [data-selected])'), {
      backgroundColor: tokens.softDestructiveSurface,
    }),
    Style.when(When.hover, { backgroundColor: tokens.softDestructiveSurface }),
  ),
  inset: Style.make({ paddingLeft: '2rem' }),
  label: Style.make({ flexGrow: 1 }),
  left: Style.make({ marginRight: '0.25rem', right: '100%' }),
  root: Style.make({ display: 'inline-flex', position: 'relative' }),
  sidebarAction: Style.make({ display: 'contents' }),
  right: Style.make({ left: '100%', marginLeft: '0.25rem' }),
  menuContent: Style.make({
    minWidth: '8rem',
    overflow: 'visible',
    padding: '0.25rem',
    position: 'absolute',
    width: 'max-content',
  }),
  submenuPanel: Style.make({
    minWidth: '8rem',
    overflow: 'visible',
    padding: '0.25rem',
    width: 'max-content',
    zIndex: 50,
  }),
  separatorMargins: layoutStyle({ marginBlock: '0.25rem' }),
  shortcut: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    letterSpacing: '0.1em',
    marginLeft: 'auto',
  }),
  top: Style.make({ bottom: '100%', marginBottom: '0.25rem' }),
}

const isStaticStyle = (value: unknown): value is Style.Style =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

import type { Update } from 'foldkit'
import { Option, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/lib/icon'
import * as Behavior from '@/lib/dropdown-menu-behavior'
import { overlayStyles } from './overlay-tokens'
import * as Button from './button'
import { joinStyles } from './button-group-join'
import { separator } from './separator'
import type {
  ButtonSize,
  ButtonVariant,
  ComponentLayoutStyle,
} from './contracts'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'

import { layoutStyle } from './contracts'
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  activeIndex: S.Number,
  activeSubmenuIndex: S.Number,
  openSubmenuIndex: S.Option(S.Number),
  anchorX: S.Option(S.Number),
  anchorY: S.Option(S.Number),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Opened: {},
  AnchoredAt: { x: S.Number, y: S.Number },
  OpenedFromContext: {},
  OpenedAt: { x: S.Number, y: S.Number },
  Closed: {},
  ActivatedItem: { index: S.Number },
  OpenedSubmenu: { index: S.Number },
  ActivatedSubmenuItem: {
    index: S.Number,
  },
  ClosedSubmenu: {},
  SelectedItem: {
    item: S.String,
    index: S.Number,
    staysOpenOnSelect: S.Boolean,
  },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Selected: { value: S.String, index: S.Number },
})
export type OutMessage<Item extends string = string> = Readonly<{
  _tag: 'Selected'
  value: Item
  index: number
}>

export const init = (
  config: Readonly<{ id: string; isAnimated?: boolean; isModal?: boolean }>,
): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  activeIndex: 0,
  activeSubmenuIndex: 0,
  openSubmenuIndex: Option.none(),
  anchorX: Option.none(),
  anchorY: Option.none(),
})

type UpdateReturn<Item extends string> = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage<Item>
>

const updateTyped = <Item extends string>(
  model: Model,
  message: Message,
): UpdateReturn<Item> => {
  const result = Behavior.update(model, message)
  return {
    model: result.model,
    ...(Option.isNone(result.selection)
      ? {}
      : {
          outMessage: OutMessage.Selected({
            value: result.selection.value.item,
            index: result.selection.value.index,
          }) as OutMessage<Item>,
        }),
  }
}

export const create = <Item extends string = string>() => ({
  update: (model: Model, message: Message): UpdateReturn<Item> =>
    updateTyped<Item>(model, message),
  open: (model: Model): UpdateReturn<Item> =>
    updateTyped<Item>(model, Message.Opened()),
  openAt: (model: Model, x: number, y: number): UpdateReturn<Item> =>
    updateTyped<Item>(model, Message.OpenedAt({ x, y })),
  close: (model: Model): UpdateReturn<Item> =>
    updateTyped<Item>(model, Message.Closed()),
  selectItem: (
    model: Model,
    item: Item,
    index: number,
    staysOpenOnSelect = false,
  ): UpdateReturn<Item> =>
    updateTyped<Item>(
      model,
      Message.SelectedItem({ item, index, staysOpenOnSelect }),
    ),
})

export const update = create().update
export const open = create().open
export const openAt = create().openAt
export const close = create().close
export const selectItem = create().selectItem

const CONTENT_CLASS = overlayStyles.panel
const ITEM_CLASS = overlayStyles.item
const SUBMENU_CLASS = overlayStyles.panel

export type DropdownMenuItemConfig<Item extends string = string> = Readonly<{
  label: Html | string
  icon?: Html
  shortcut?: Html | string
  variant?: 'default' | 'destructive'
  kind?: 'item' | 'checkbox' | 'radio'
  isChecked?: boolean
  isInset?: boolean
  isDisabled?: boolean
  group?: string
  submenu?: Readonly<{
    items: ReadonlyArray<Item>
    itemToConfig: (item: Item) => DropdownMenuItemConfig<Item>
  }>
  /** Render a separator above this item (upstream DropdownMenuSeparator). */
  separatorBefore?: boolean
}>

export type DropdownMenuSide = 'top' | 'right' | 'bottom' | 'left'
export type DropdownMenuAlign = 'start' | 'center' | 'end'

export type DropdownMenuProps<Item extends string, Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  trigger: Html | string
  placement?: 'inline' | 'sidebarAction'
  triggerLayoutStyle?: ComponentLayoutStyle | undefined
  /* Full StyleX styles for the trigger button (e.g. the sidebar menu-button
     look used by sidebar-06); takes precedence over triggerButtonVariant. */
  triggerStyle?: Style.Style | undefined
  /** Render the trigger with Crease UI Button (e.g. an icon-only more-actions). */
  triggerButtonVariant?: ButtonVariant
  triggerButtonSize?: ButtonSize
  triggerButtonRounded?: boolean
  triggerTabindex?: number
  triggerRole?: string
  /** aria-label on the trigger button — icon-only triggers need one. */
  triggerAriaLabel?: string
  triggerIsDisabled?: boolean
  triggerIsSelected?: boolean
  /** Selection of the trigger itself, separate from choosing a menu command. */
  onTriggerActivate?: Msg
  items: ReadonlyArray<Item>
  itemToConfig: (item: Item) => DropdownMenuItemConfig<Item>
  align?: DropdownMenuAlign
  side?: DropdownMenuSide
  ariaLabel?: string
  openOnContextMenu?: boolean
  direction?: 'ltr' | 'rtl'
  contentLayoutStyle?: ComponentLayoutStyle | undefined
  /** When true, selecting a checkbox or radio item toggles it without
   * closing the menu, so several entries can be edited in one open. */
  keepOpenOnCheckableSelect?: boolean
}>

const positionClass = (
  side: DropdownMenuSide,
  align: DropdownMenuAlign,
): ReadonlyArray<Style.Style> => [
  styles[side],
  side === 'top' || side === 'bottom'
    ? {
        start: styles.alignHorizontalStart,
        center: styles.alignHorizontalCenter,
        end: styles.alignHorizontalEnd,
      }[align]
    : {
        start: styles.alignVerticalStart,
        center: styles.alignVerticalCenter,
        end: styles.alignVerticalEnd,
      }[align],
]

/** CSS anchor-positioned menu placement: anchors the panel to the trigger and
 * lets `position-try` flip sides when it would overflow the viewport. */
const anchorPositionStyle = (
  id: string,
  side: DropdownMenuSide,
  align: DropdownMenuAlign,
): Record<string, string> => {
  const isBlock = side === 'top' || side === 'bottom'
  const alignInset = isBlock
    ? (
        {
          start: { left: 'anchor(left)' },
          center: { left: 'anchor(center)' },
          end: { right: 'anchor(right)' },
        } as const
      )[align]
    : (
        {
          start: { top: 'anchor(top)' },
          center: { top: 'anchor(center)' },
          end: { bottom: 'anchor(bottom)' },
        } as const
      )[align]
  const alignTransform =
    align === 'center'
      ? isBlock
        ? 'translateX(-50%)'
        : 'translateY(-50%)'
      : undefined
  const gap = '0.25rem'
  const sideInset =
    side === 'bottom'
      ? { top: `calc(anchor(bottom) + ${gap})` }
      : side === 'top'
        ? { bottom: `calc(anchor(top) + ${gap})` }
        : side === 'right'
          ? { left: `calc(anchor(right) + ${gap})` }
          : { right: `calc(anchor(left) + ${gap})` }
  return {
    position: 'fixed',
    positionAnchor: `--${id}-menu`,
    ...alignInset,
    ...sideInset,
    width: 'max-content',
    height: 'max-content',
    maxWidth: 'calc(100vw - 8px)',
    ...(alignTransform === undefined ? {} : { transform: alignTransform }),
    positionTry: isBlock
      ? 'flip-block'
      : 'flip-inline, flip-block, flip-inline flip-block',
    maxHeight: 'calc(100vh - 8px)',
    overflowY: 'auto',
  }
}

const menuKey = <Item extends string>(
  model: Model,
  items: ReadonlyArray<Item>,
  itemToConfig: (item: Item) => DropdownMenuItemConfig<Item>,
  key: string,
  direction: 'ltr' | 'rtl' = 'ltr',
  keepOpenOnCheckableSelect = false,
): Message | undefined => {
  const toBehavior = (
    item: Item,
    config: DropdownMenuItemConfig<Item>,
  ): Behavior.MenuItemBehavior<Item> => ({
    label: typeof config.label === 'string' ? config.label : item,
    isDisabled: config.isDisabled === true,
    staysOpenOnSelect:
      keepOpenOnCheckableSelect &&
      (config.kind === 'checkbox' || config.kind === 'radio'),
    ...(config.submenu === undefined
      ? {}
      : {
          submenu: {
            items: config.submenu.items,
            itemToBehavior: (child: Item) =>
              toBehavior(
                child,
                config.submenu?.itemToConfig(child) ?? { label: child },
              ),
          },
        }),
  })
  return Behavior.keyMessage(
    model,
    items,
    item => toBehavior(item, itemToConfig(item)),
    key,
    direction,
  )
}

export const dropdownMenu = <Item extends string, Msg>(
  props: DropdownMenuProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const hasButtonTrigger =
    props.triggerStyle === undefined &&
    (props.triggerButtonVariant !== undefined ||
      props.triggerButtonSize !== undefined ||
      props.triggerButtonRounded !== undefined)
  const renderTrigger = (
    attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ): Html =>
    hasButtonTrigger
      ? Button.button(
          {
            variant: props.triggerButtonVariant ?? 'default',
            size: props.triggerButtonSize ?? 'default',
            rounded: props.triggerButtonRounded ?? false,
            isDisabled: props.triggerIsDisabled ?? false,
            slot: 'dropdown-menu-trigger',
            buttonAttributes: attributes,
            ...(props.triggerLayoutStyle === undefined
              ? {}
              : { layoutStyle: props.triggerLayoutStyle }),
            children,
          },
          h,
        )
      : h.button(attributes, children)
  const anchorX = Option.getOrUndefined(props.model.anchorX)
  const anchorY = Option.getOrUndefined(props.model.anchorY)
  const keyMessage = (key: string) => {
    const message = menuKey(
      props.model,
      props.items,
      props.itemToConfig,
      key,
      props.direction,
      props.keepOpenOnCheckableSelect,
    )
    return message === undefined
      ? Option.none()
      : Option.some(props.toParentMessage(message))
  }

  const renderItem = (
    item: Item,
    index: number,
    config: DropdownMenuItemConfig<Item>,
    isSubmenu = false,
  ): Html => {
    const active = isSubmenu
      ? props.model.activeSubmenuIndex === index - props.items.length
      : props.model.activeIndex === index
    const checked = config.isChecked ?? false
    const role =
      config.kind === 'checkbox'
        ? 'menuitemcheckbox'
        : config.kind === 'radio'
          ? 'menuitemradio'
          : config.submenu === undefined
            ? 'menuitem'
            : 'menuitem'
    return h.div(
      [
        h.Role(role),
        h.Tabindex(active ? 0 : -1),
        h.DataAttribute('active', String(active)),
        ...(config.kind === 'checkbox' || config.kind === 'radio'
          ? [h.AriaChecked(checked)]
          : []),
        ...(config.isDisabled === true
          ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
          : []),
        ...(config.submenu === undefined
          ? []
          : [
              h.AriaHasPopup('menu'),
              h.AriaExpanded(
                Option.contains(props.model.openSubmenuIndex, index),
              ),
              h.AriaControls(`${props.model.id}-submenu-${String(index)}`),
              h.Style({
                anchorName: `--${props.model.id}-sub-${String(index)}`,
              }),
            ]),
        ...(config.isDisabled === true
          ? []
          : [
              h.OnMouseEnter(
                props.toParentMessage(
                  isSubmenu
                    ? Message.ActivatedSubmenuItem({
                        index: index - props.items.length,
                      })
                    : config.submenu === undefined
                      ? Message.ActivatedItem({ index })
                      : Message.OpenedSubmenu({ index }),
                ),
              ),
            ]),
        ...(config.isDisabled === true || config.submenu !== undefined
          ? []
          : [
              h.OnClick(
                props.toParentMessage(
                  Message.SelectedItem({
                    item,
                    index,
                    staysOpenOnSelect:
                      props.keepOpenOnCheckableSelect === true &&
                      (config.kind === 'checkbox' || config.kind === 'radio'),
                  }),
                ),
              ),
            ]),
        h.Class(
          cn(
            ITEM_CLASS,
            config.isInset ||
              config.kind === 'checkbox' ||
              config.kind === 'radio'
              ? styles.inset
              : undefined,
            config.variant === 'destructive' ? styles.destructive : undefined,
          ),
        ),
      ],
      [
        ...(config.kind === 'checkbox' || config.kind === 'radio'
          ? [
              h.span(
                [h.Class(className(styles.indicator))],
                [
                  checked
                    ? Icon.check<Msg>(
                        { class: className(overlayStyles.icon) },
                        h,
                      )
                    : '',
                ],
              ),
            ]
          : []),
        ...(config.icon === undefined ? [] : [config.icon]),
        h.span([h.Class(className(styles.label))], [config.label]),
        ...(config.shortcut === undefined
          ? []
          : [h.span([h.Class(className(styles.shortcut))], [config.shortcut])]),
        ...(config.submenu === undefined
          ? []
          : [
              Icon.chevronRight<Msg>(
                { class: className(overlayStyles.icon) },
                h,
              ),
            ]),
      ],
    )
  }

  const submenuPanels: Array<Html> = []
  props.items.forEach((item, index) => {
    const config = props.itemToConfig(item)
    if (
      config.submenu === undefined ||
      !Option.contains(props.model.openSubmenuIndex, index)
    )
      return
    submenuPanels.push(
      h.div(
        [
          h.Role('menu'),
          h.AriaLabel(
            `${typeof config.label === 'string' ? config.label : 'Submenu'} submenu`,
          ),
          h.Id(`${props.model.id}-submenu-${String(index)}`),
          h.Class(
            cn(SUBMENU_CLASS, overlayStyles.floating, styles.submenuPanel),
          ),
          // Anchored to the parent item and rendered outside the scrollable
          // panel so the panel's overflow-y clip can't hide it.
          h.Style({
            position: 'fixed',
            positionAnchor: `--${props.model.id}-sub-${String(index)}`,
            ...(props.direction === 'rtl'
              ? { right: 'anchor(left)', marginRight: '0.25rem' }
              : { left: 'anchor(right)', marginLeft: '0.25rem' }),
            top: 'anchor(top)',
            positionTry: 'flip-inline, flip-block, flip-inline flip-block',
            maxHeight: 'calc(100vh - 8px)',
            overflowY: 'auto',
          }),
        ],
        config.submenu.items.map((child, childIndex) =>
          renderItem(
            child,
            props.items.length + childIndex,
            config.submenu?.itemToConfig(child) ?? { label: child },
            true,
          ),
        ),
      ),
    )
  })

  const grouped: Array<Html> = []
  let previousGroup: string | undefined
  props.items.forEach((item, index) => {
    const config = props.itemToConfig(item)
    if (config.group !== previousGroup || config.separatorBefore === true) {
      if (grouped.length > 0)
        grouped.push(
          separator(
            { decorative: false, layoutStyle: styles.separatorMargins },
            h,
          ),
        )
      if (config.group !== previousGroup && config.group !== undefined)
        grouped.push(
          h.div([h.Class(className(overlayStyles.label))], [config.group]),
        )
      previousGroup = config.group
    }
    grouped.push(renderItem(item, index, config))
  })

  return h.div(
    [
      h.DataAttribute('slot', 'dropdown-menu'),
      h.Class(
        className(
          styles.root,
          props.placement === 'sidebarAction' && styles.sidebarAction,
        ),
      ),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
    ],
    [
      renderTrigger(
        [
          h.Type('button'),
          ...(props.triggerRole === undefined
            ? []
            : [h.Role(props.triggerRole)]),
          ...(props.triggerAriaLabel === undefined
            ? []
            : [h.AriaLabel(props.triggerAriaLabel)]),
          ...(props.triggerIsDisabled === true
            ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
            : []),
          h.AriaHasPopup('menu'),
          h.Id(`${props.model.id}-trigger`),
          h.AriaExpanded(props.model.isOpen),
          h.AriaControls(`${props.model.id}-content`),
          ...(props.triggerIsSelected === true
            ? [h.DataAttribute('selected', ''), h.AriaCurrent('true')]
            : []),
          ...(props.onTriggerActivate === undefined ||
          props.triggerIsDisabled === true
            ? []
            : [
                h.OnClick(props.onTriggerActivate),
                h.OnKeyDownPreventDefault(key =>
                  (key === 'Enter' || key === ' ') &&
                  props.onTriggerActivate !== undefined
                    ? Option.some(props.onTriggerActivate)
                    : Option.none(),
                ),
              ]),
          ...(props.triggerIsDisabled === true
            ? []
            : props.openOnContextMenu === true
              ? [
                  h.OnContextMenu(
                    props.toParentMessage(Message.OpenedFromContext()),
                  ),
                  h.OnPointerDown(
                    (
                      _pointerType,
                      button,
                      _screenX,
                      _screenY,
                      _timeStamp,
                      clientX,
                      clientY,
                    ) =>
                      button === 2
                        ? Option.some(
                            props.toParentMessage(
                              Message.AnchoredAt({ x: clientX, y: clientY }),
                            ),
                          )
                        : Option.none(),
                  ),
                ]
              : [
                  h.OnClick(
                    props.toParentMessage(
                      props.model.isOpen ? Message.Closed() : Message.Opened(),
                    ),
                  ),
                ]),
          h.DataAttribute('slot', 'dropdown-menu-trigger'),
          h.Style({ anchorName: `--${props.model.id}-menu` }),
          ...(props.triggerTabindex === undefined
            ? []
            : [h.Tabindex(props.triggerTabindex)]),
          ...(hasButtonTrigger
            ? []
            : [
                h.Class(
                  className(
                    reset.button,
                    joinStyles.join,
                    props.triggerStyle,
                    props.triggerLayoutStyle,
                  ),
                ),
              ]),
          h.OnKeyDownPreventDefault((key, modifiers) => {
            const message = props.model.isOpen
              ? menuKey(
                  props.model,
                  props.items,
                  props.itemToConfig,
                  key,
                  props.direction,
                  props.keepOpenOnCheckableSelect,
                )
              : props.triggerIsDisabled === true
                ? undefined
                : props.openOnContextMenu === true &&
                    (key === 'ContextMenu' ||
                      (key === 'F10' && modifiers.shiftKey))
                  ? Message.Opened()
                  : key === 'ArrowDown' ||
                      key === 'ArrowUp' ||
                      key === 'Enter' ||
                      key === ' '
                    ? Message.Opened()
                    : undefined
            return message === undefined
              ? Option.none()
              : Option.some(props.toParentMessage(message))
          }),
        ],
        [props.trigger],
      ),
      ...(props.model.isOpen
        ? [
            h.div(
              [
                h.AriaHidden(true),
                h.OnClick(props.toParentMessage(Message.Closed())),
                h.Class(className(styles.backdrop)),
                h.DataAttribute('slot', 'dropdown-menu-backdrop'),
              ],
              [],
            ),
            h.div(
              [
                h.Role('menu'),
                h.Id(`${props.model.id}-content`),
                h.AriaLabel(props.ariaLabel ?? 'Menu'),
                h.Tabindex(0),
                h.OnKeyDownPreventDefault(keyMessage),
                h.DataAttribute('slot', 'dropdown-menu-content'),
                ...(anchorX !== undefined && anchorY !== undefined
                  ? [
                      h.Style({
                        position: 'fixed',
                        left: `clamp(4px, ${String(anchorX)}px, calc(100vw - 4px))`,
                        top: `clamp(4px, ${String(anchorY)}px, calc(100vh - 4px))`,
                        transform: `translate(min(0px, calc(100vw - ${String(anchorX)}px - 100% - 8px)), min(0px, calc(100vh - ${String(anchorY)}px - 100% - 8px)))`,
                        maxHeight: 'calc(100vh - 8px)',
                        overflowY: 'auto',
                      }),
                    ]
                  : [
                      h.Style(
                        anchorPositionStyle(
                          props.model.id,
                          props.side ?? 'bottom',
                          props.align ?? 'start',
                        ),
                      ),
                    ]),
                h.Class(
                  cn(
                    CONTENT_CLASS,
                    overlayStyles.floating,
                    styles.menuContent,
                    ...(anchorX !== undefined
                      ? []
                      : positionClass(
                          props.side ?? 'bottom',
                          props.align ?? 'start',
                        )),
                    ...(props.contentLayoutStyle === undefined
                      ? []
                      : [className(props.contentLayoutStyle)]),
                  ),
                ),
              ],
              grouped,
            ),
            ...submenuPanels,
          ]
        : []),
    ],
  )
}
