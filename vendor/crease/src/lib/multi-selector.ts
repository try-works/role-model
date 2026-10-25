import { Option, Schema as S } from 'effect'

import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog, Listbox as ListboxPrimitive, Popover } from '@foldkit/ui'
import * as Drawer from './drawer'

/* Ported from Meta Astryx MultiSelector (packages/core/src/MultiSelector/)
   — examples and visual spec adapted to Crease UI tokens.

   foldkit's Multi Listbox supplies the trigger button and anchored option
   panel; the selection lives HERE (astryx's controlled `value`) and is
   folded from the primitive's Selected out-message plus the select-all
   pseudo-option and the trigger's clear-all button. ChangedValues is the
   onChange out-message. */

export const Model = S.Struct({
  id: S.String,
  values: S.Array(S.String),
  /** The selectable option values the select-all row toggles; seeded at
   *  init and refreshed via `reflectOptions` when options change. */
  optionValues: S.Array(S.String),
  listbox: ListboxPrimitive.Multi.Model,
  query: S.String,
  popover: Popover.Model,
  drawer: Drawer.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotListboxMessage: { message: ListboxPrimitive.Message },
  GotPopoverMessage: { message: Popover.Message },
  ChangedSearch: { query: S.String },
  ClickedSelectAll: { optionValues: S.Array(S.String) },
  RequestedOpenDrawer: { initialIndex: S.optionalKey(S.Number) },
  RequestedCloseDrawer: {},
  GotDrawerMessage: { message: Drawer.Message },
  ClickedClearAll: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValues: { values: S.Array(S.String) },
})
export type OutMessage = typeof OutMessage.Type

/** Pseudo-option value for the select-all row; its activation toggles the
 *  whole visible option set instead of a single item. */
export const SELECT_ALL_VALUE = '__select_all__'

export const init = (
  config: Readonly<{
    id: string
    values?: ReadonlyArray<string>
    optionValues?: ReadonlyArray<string>
    isAnimated?: boolean
  }>,
): Model => ({
  id: config.id,
  values: [...(config.values ?? [])],
  optionValues: [...(config.optionValues ?? [])],
  query: '',
  popover: Popover.init({
    id: `${config.id}-listbox`,
    isAnimated: config.isAnimated ?? true,
  }),
  drawer: Drawer.init({
    id: `${config.id}-drawer`,
    isAnimated: config.isAnimated ?? true,
  }),
  listbox: ListboxPrimitive.Multi.init({
    id: `${config.id}-listbox`,
    isAnimated: config.isAnimated ?? true,
  }),
})

/** Syncs the committed selection when it derives from external state. */
export const reflect = (
  model: Model,
  values: ReadonlyArray<string>,
): Model => ({ ...model, values: [...values] })

/** Refreshes the option set the select-all row toggles (called by views
 *  when the option list changes — e.g. search results). */
export const reflectOptions = (
  model: Model,
  optionValues: ReadonlyArray<string>,
): Model => ({ ...model, optionValues: [...optionValues] })

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const emitChange = (
  model: Model,
  values: ReadonlyArray<string>,
): UpdateReturn => ({
  model: { ...model, values: [...values] },
  outMessage: OutMessage.ChangedValues({ values: [...values] }),
})

/** `allValues` is the set the select-all row covers (the currently visible
 *  options — a filtered list toggles only what it shows). */
const toggleSelectAll = (
  model: Model,
  allValues: ReadonlyArray<string>,
): UpdateReturn => {
  const allSelected =
    allValues.length > 0 &&
    allValues.every(value => model.values.includes(value))
  if (allValues.length === 0) return { model }
  return emitChange(
    model,
    allSelected
      ? model.values.filter(value => !allValues.includes(value))
      : [...new Set([...model.values, ...allValues])],
  )
}

const toggleValue = (
  model: Model,
  value: string,
  allValues: ReadonlyArray<string>,
): UpdateReturn => {
  if (value === SELECT_ALL_VALUE) {
    return toggleSelectAll(model, allValues)
  }
  return model.values.includes(value)
    ? emitChange(
        model,
        model.values.filter(v => v !== value),
      )
    : emitChange(model, [...model.values, value])
}

const liftListbox = (
  model: Model,
  message: ListboxPrimitive.Message,
): UpdateReturn => {
  const result = listboxBundle.update(model.listbox, message)
  const liftedCommands = Command.mapMessages(result.commands ?? [], m =>
    Message.GotListboxMessage({ message: m }),
  )
  switch (result.outMessage?._tag) {
    case 'Selected': {
      const folded = toggleValue(
        { ...model, listbox: result.model },
        result.outMessage.value,
        model.optionValues,
      )
      return {
        model: folded.model,
        commands: [...liftedCommands, ...(folded.commands ?? [])],
        ...(folded.outMessage === undefined
          ? {}
          : { outMessage: folded.outMessage }),
      }
    }
    default:
      return {
        model: { ...model, listbox: result.model },
        commands: liftedCommands,
      }
  }
}

const listboxBundle = ListboxPrimitive.Multi.create<string>()

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotListboxMessage':
      return liftListbox(model, message.message)
    case 'GotPopoverMessage': {
      const result = Popover.update(model.popover, message.message)
      const isOpen = result.model.isOpen
      // Popover owns positioning, dismissal, animation, and focus. The
      // embedded listbox supplies option navigation and selection only here.
      const listbox =
        isOpen === model.popover.isOpen
          ? model.listbox
          : {
              ...model.listbox,
              isOpen,
              maybeActiveItemIndex: Option.none(),
              searchQuery: '',
            }
      return {
        model: {
          ...model,
          popover: result.model,
          listbox,
          query: isOpen ? model.query : '',
        },
        commands: Command.mapMessages(result.commands ?? [], next =>
          Message.GotPopoverMessage({ message: next }),
        ),
      }
    }
    case 'ChangedSearch':
      return {
        model: {
          ...model,
          query: message.query,
          listbox: {
            ...model.listbox,
            maybeActiveItemIndex: Option.none(),
            searchQuery: '',
          },
        },
      }
    case 'ClickedSelectAll':
      return toggleSelectAll(model, message.optionValues)
    case 'RequestedOpenDrawer': {
      if (model.drawer.dialog.isOpen) return { model }
      const result = Drawer.open(model.drawer)
      return {
        model: {
          ...model,
          drawer: result.model,
          listbox: {
            ...model.listbox,
            isOpen: true,
            searchQuery: '',
            maybeActiveItemIndex: Option.fromUndefinedOr(message.initialIndex),
          },
        },
        commands: Command.mapMessages(result.commands ?? [], next =>
          Message.GotDrawerMessage({ message: next }),
        ),
      }
    }
    case 'RequestedCloseDrawer':
      return update(
        model,
        Message.GotDrawerMessage({
          message: Drawer.Message.GotDrawerDialogMessage({
            message: Dialog.Message.RequestedClose(),
          }),
        }),
      )
    case 'GotDrawerMessage': {
      const result = Drawer.update(model.drawer, message.message)
      const isOpen = result.model.dialog.isOpen
      return {
        model: {
          ...model,
          drawer: result.model,
          query: isOpen ? model.query : '',
          listbox: {
            ...model.listbox,
            isOpen,
            maybeActiveItemIndex: isOpen
              ? model.listbox.maybeActiveItemIndex
              : Option.none(),
          },
        },
        commands: Command.mapMessages(result.commands ?? [], next =>
          Message.GotDrawerMessage({ message: next }),
        ),
      }
    }
    case 'ClickedClearAll':
      return model.values.length === 0 ? { model } : emitChange(model, [])
  }
}
