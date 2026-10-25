import type { Option } from 'effect'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Combobox as ComboboxPrimitive } from '@foldkit/ui'

import {
  createInlineCommandView,
  filterCommandItems,
  retainCommandQuery,
} from '@/lib/command'
import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

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

const ROOT_CLASS =
  'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground'

const INPUT_WRAPPER_CLASS = 'flex h-9 items-center gap-2 border-b px-3'

const INPUT_CLASS =
  'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

const SEARCH_BUTTON_CLASS =
  'order-first shrink-0 opacity-50 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const CONTENT_CLASS = 'w-full overflow-hidden'

const LIST_CLASS =
  'max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto p-1'

const ITEM_CLASS =
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[active]:bg-accent data-[active]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"

const GROUP_CLASS =
  'overflow-hidden p-1 text-foreground [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group-heading]]:text-muted-foreground'

const SEPARATOR_CLASS = '-mx-1 h-px bg-border'

const SHORTCUT_CLASS = 'ml-auto text-xs tracking-widest text-muted-foreground'

export type CommandItemConfig = Readonly<{
  content: Html | string
  searchText?: string
  shortcut?: Html | string
  class?: string
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
  class?: string
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
  className: string | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [h.DataAttribute('slot', 'command-group-heading'), h.Class(cn(className))],
    [content],
  )
}

export const commandShortcut = <Msg>(
  content: Html | string,
  className: string | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'command-shortcut'),
      h.Class(cn(SHORTCUT_CLASS, className)),
    ],
    [content],
  )
}

export const commandSeparator = <Msg>(
  className: string | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.Role('separator'),
      h.DataAttribute('slot', 'command-separator'),
      h.Class(cn(SEPARATOR_CLASS, className)),
    ],
    [],
  )
}

export const commandEmpty = <Msg>(
  content: Html | string,
  className: string | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'command-empty'),
      h.Class(cn('py-6 text-center text-sm', className)),
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
          className: cn(ITEM_CLASS, config.class),
          content: hc.span(
            [hc.DataAttribute('slot', 'command-item'), hc.Class('contents')],
            [
              config.content,
              ...(config.shortcut === undefined
                ? []
                : [commandShortcut(config.shortcut, '', h)]),
            ],
          ),
        }
      },
      inputClassName: INPUT_CLASS,
      inputAttributes: childAttributes([
        hc.DataAttribute('slot', 'command-input'),
      ]),
      ...(props.placeholder === undefined
        ? {}
        : { inputPlaceholder: props.placeholder }),
      inputWrapperClassName: INPUT_WRAPPER_CLASS,
      inputWrapperAttributes: childAttributes([
        hc.DataAttribute('slot', 'command-input-wrapper'),
      ]),
      buttonContent: Icon.search({ class: 'size-4' }, h),
      buttonClassName: SEARCH_BUTTON_CLASS,
      itemsClassName: CONTENT_CLASS,
      itemsAttributes: childAttributes([
        hc.DataAttribute('slot', 'command-list'),
      ]),
      itemsScrollClassName: LIST_CLASS,
      className: cn(ROOT_CLASS, props.class),
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
                    content: commandGroupHeading(heading, '', h),
                  }
            },
            groupClassName: GROUP_CLASS,
            groupAttributes: childAttributes([
              hc.DataAttribute('slot', 'command-group'),
            ]),
            separatorClassName: SEPARATOR_CLASS,
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
              h.Class('py-6 text-center text-sm'),
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
