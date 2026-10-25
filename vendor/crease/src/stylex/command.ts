import type { Option } from 'effect'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Combobox as ComboboxPrimitive } from '@foldkit/ui'

import {
  createInlineCommandView,
  filterCommandItems,
  retainCommandQuery,
} from '@/lib/command'
import * as Icon from '@/lib/icon'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { overlayStyles } from './overlay-tokens.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'

const styles = stylex.create({
  contents: { display: 'contents' },
  list: { overflow: 'hidden', width: '100%' },
  searchIcon: { opacity: 0.5, order: -1 },
  empty: {
    paddingBlock: '1.5rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    textAlign: 'center',
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* Ported from shadcn/ui command.tsx on top of foldkit's config-driven
   single-select Combobox submodel.

   Command's selected/highlighted state maps to foldkit's data-active
   attribute. The search input and results form one always-visible surface.

   PORT NOTE: global cmd-k dialog wiring is intentionally not included;
   consumers compose commandPalette with the dialog wrapper.

   Foldkit owns typed query, active-item, and selection updates; the command
   view keeps results in document flow and lets Escape reach its parent dialog. */

export const Model = ComboboxPrimitive.Model
export type Model = typeof Model.Type
export const Message = ComboboxPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = ComboboxPrimitive.OutMessage
export type OutMessage<Item extends string = string> =
  ComboboxPrimitive.OutMessage<Item>

export const init = ComboboxPrimitive.init

const ROOT_CLASS = overlayStyles.root

const INPUT_WRAPPER_CLASS = overlayStyles.inputWrapper

const INPUT_CLASS = overlayStyles.input

const SEARCH_BUTTON_CLASS = overlayStyles.icon

const CONTENT_CLASS = styles.list

const LIST_CLASS = overlayStyles.list

const ITEM_CLASS = overlayStyles.item

const GROUP_CLASS = overlayStyles.group

const SEPARATOR_CLASS = overlayStyles.separator

const SHORTCUT_CLASS = overlayStyles.shortcut

export type CommandItemConfig = Readonly<{
  content: Html | string
  searchText?: string
  shortcut?: Html | string
  layoutStyle?: ComponentLayoutStyle
  isDisabled?: boolean
}>

export type CommandProps<Item extends string, Msg> = Readonly<{
  model: Model
  maybeSelectedValue: Option.Option<Item>
  restingInputValue: string
  toParentMessage: (message: Message) => Msg
  items: ReadonlyArray<Item>
  itemToConfig: (item: Item) => CommandItemConfig
  placeholder?: string
  ariaLabel?: string
  layoutStyle?: ComponentLayoutStyle
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => Html | string | undefined
  status?: 'ready' | 'loading'
  loadingContent?: Html | string
  emptyContent?: Html | string
  maxVisibleItems?: number
  moreResultsContent?: (visible: number, total: number) => Html | string
}>

export const commandGroupHeading = <Msg>(
  content: Html | string,
  layoutStyle: ComponentLayoutStyle | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'command-group-heading'),
      h.Class(cn(overlayStyles.label, layoutStyle)),
    ],
    [content],
  )
}

export const commandShortcut = <Msg>(
  content: Html | string,
  layoutStyle: ComponentLayoutStyle | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'command-shortcut'),
      h.Class(cn(SHORTCUT_CLASS, layoutStyle)),
    ],
    [content],
  )
}

export const commandSeparator = <Msg>(
  layoutStyle: ComponentLayoutStyle | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.Role('separator'),
      h.DataAttribute('slot', 'command-separator'),
      h.Class(cn(SEPARATOR_CLASS, layoutStyle)),
    ],
    [],
  )
}

export const commandEmpty = <Msg>(
  content: Html | string,
  layoutStyle: ComponentLayoutStyle | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'command-empty'),
      h.Class(cn(styles.empty, layoutStyle)),
    ],
    [content],
  )
}

const renderCommand = <Item extends string, Msg>(
  commandView: ReturnType<typeof createInlineCommandView<Item>>,
  props: CommandProps<Item, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const hc = h
  const itemToSearchText = (item: Item): string => {
    const config = props.itemToConfig(item)
    return (
      config.searchText ??
      (typeof config.content === 'string' ? config.content : item)
    )
  }
  const filteredItems = filterCommandItems(
    props.items,
    props.model.inputValue,
    props.restingInputValue,
    itemToSearchText,
  )
  const visibleItems =
    props.status === 'loading'
      ? []
      : props.maxVisibleItems === undefined
        ? filteredItems
        : filteredItems.slice(0, Math.max(0, props.maxVisibleItems))

  const control = h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: commandView,
    viewInputs: {
      maybeSelectedValue: props.maybeSelectedValue,
      restingInputValue: props.restingInputValue,
      items: visibleItems,
      itemToValue: item => item,
      itemToDisplayText: itemToSearchText,
      isItemDisabled: item => props.itemToConfig(item).isDisabled ?? false,
      itemToConfig: item => {
        const config = props.itemToConfig(item)

        return {
          className: cn(ITEM_CLASS, config.layoutStyle),
          content: hc.span(
            [
              hc.DataAttribute('slot', 'command-item'),
              hc.Class(className(styles.contents)),
            ],
            [
              config.content,
              ...(config.shortcut === undefined
                ? []
                : [commandShortcut(config.shortcut, undefined, h)]),
            ],
          ),
        }
      },
      inputClassName: className(reset.input, INPUT_CLASS),
      inputAttributes: childAttributes([
        hc.DataAttribute('slot', 'command-input'),
      ]),
      ...(props.placeholder === undefined
        ? {}
        : { inputPlaceholder: props.placeholder }),
      inputWrapperClassName: className(INPUT_WRAPPER_CLASS),
      inputWrapperAttributes: childAttributes([
        hc.DataAttribute('slot', 'command-input-wrapper'),
      ]),
      buttonContent: Icon.search({ class: className(overlayStyles.icon) }, h),
      buttonClassName: className(SEARCH_BUTTON_CLASS, styles.searchIcon),
      itemsClassName: className(CONTENT_CLASS),
      itemsAttributes: childAttributes([
        hc.DataAttribute('slot', 'command-list'),
      ]),
      itemsScrollClassName: className(reset.list, LIST_CLASS),
      className: cn(ROOT_CLASS, props.layoutStyle),
      attributes: childAttributes([hc.DataAttribute('slot', 'command')]),
      ...(props.itemGroupKey === undefined
        ? {}
        : {
            itemGroupKey: props.itemGroupKey,
            groupToHeading: (groupKey: string) => {
              const heading = props.groupToHeading?.(groupKey)
              return heading === undefined
                ? undefined
                : {
                    content: commandGroupHeading(heading, undefined, h),
                  }
            },
            groupClassName: className(GROUP_CLASS),
            groupAttributes: childAttributes([
              hc.DataAttribute('slot', 'command-group'),
            ]),
            separatorClassName: className(SEPARATOR_CLASS),
            separatorAttributes: childAttributes([
              hc.DataAttribute('slot', 'command-separator'),
            ]),
          }),
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
    },
    toParentMessage: props.toParentMessage,
  })

  const statusContent =
    props.status === 'loading'
      ? (props.loadingContent ?? 'Loading commands…')
      : visibleItems.length === 0
        ? (props.emptyContent ?? 'No commands found.')
        : visibleItems.length < filteredItems.length
          ? (props.moreResultsContent?.(
              visibleItems.length,
              filteredItems.length,
            ) ??
            `Showing ${String(visibleItems.length)} of ${String(filteredItems.length)} commands. Refine your search for more.`)
          : undefined
  return statusContent === undefined
    ? control
    : h.div(
        [h.DataAttribute('slot', 'command-state')],
        [
          control,
          h.div(
            [
              h.Role('status'),
              h.AriaLive('polite'),
              h.Class(className(styles.empty)),
            ],
            [statusContent],
          ),
        ],
      )
}

export type CommandBundle<Item extends string> = Readonly<{
  update: ComboboxPrimitive.Bundle<Item>['update']
  selectItem: ComboboxPrimitive.Bundle<Item>['selectItem']
  open: ComboboxPrimitive.Bundle<Item>['open']
  close: ComboboxPrimitive.Bundle<Item>['close']
  command: <Msg>(props: CommandProps<Item, Msg>, h: HtmlBuilder<Msg>) => Html
}>
export const create = <Item extends string = string>(): CommandBundle<Item> => {
  const primitive = ComboboxPrimitive.create<Item>()
  const commandView = createInlineCommandView<Item>()
  return {
    update: (model, message) =>
      retainCommandQuery(model, primitive.update(model, message)),
    selectItem: (model, item, displayText) =>
      retainCommandQuery(model, primitive.selectItem(model, item, displayText)),
    open: primitive.open,
    close: primitive.close,
    command: (props, h) => renderCommand(commandView, props, h),
  }
}
const StringCommand = create<string>()
export const update = StringCommand.update
export const command = StringCommand.command
export const commandPalette = command

/*
   Minimal wiring:

   type Action = 'profile' | 'settings'
   const AppCommand = create<Action>()

   // Model: { command: Model }
   // Message: GotCommandMessage({ message: Message })
   // Init: command: init({ id: 'app-command', isAnimated: true })
   //
   // Update:
   // const commandOp__ = //   AppCommand.update(model.command, message);
    const command = commandOp__.model;
    const commands = commandOp__.commands ?? [];
    const maybeOutMessage = Option.fromNullishOr(commandOp__.outMessage);
   //
   // View:
   // command<Action, AppMessage>({
   //   model: model.command,
   //   toParentMessage: message => GotCommandMessage({ message }),
   //   items: ['profile', 'settings'],
   //   itemToConfig: item => ({
   //     content: item === 'profile' ? 'Profile' : 'Settings',
   //     shortcut: item === 'profile' ? '⌘P' : '⌘,',
   //   }),
   //   placeholder: 'Type a command or search...',
   // })
*/
