import type { Update } from 'foldkit'
import { Option, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

/**
 * Skin-neutral Accordion behavior shared by every Crease renderer.
 *
 * Item definitions remain per-render inputs. The Model stores only stable
 * open values, so inserting or reordering items never moves interaction state
 * to another item.
 */

export const AccordionType = S.Literals(['single', 'multiple'])
export type AccordionType = typeof AccordionType.Type

export const Model = S.Struct({
  id: S.String,
  type: AccordionType,
  value: S.Array(S.String),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledItem: {
    value: S.String,
    isOpen: S.Boolean,
  },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: {
    value: S.Array(S.String),
    toggledValue: S.String,
    isOpen: S.Boolean,
  },
})
export type OutMessage = typeof OutMessage.Type

/** @deprecated Prefer `InitConfig.value`. Retained for registry compatibility. */
export type AccordionInitItem = Readonly<{
  value: string
  isOpen?: boolean
}>

export type InitConfig = Readonly<{
  id: string
  type?: AccordionType
  /** Stable values that start open. */
  value?: ReadonlyArray<string>
  /** @deprecated Use `value`. */
  items?: ReadonlyArray<AccordionInitItem>
}>

export type AccordionItem = Readonly<{
  value: string
  trigger: Html | string
  content: Html | string
  isDisabled?: boolean
}>

const normalizeValue = (
  type: AccordionType,
  value: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const unique = [...new Set(value)]
  return type === 'single' ? unique.slice(0, 1) : unique
}

export const init = (config: InitConfig): Model => {
  const type = config.type ?? 'single'
  const initialValue =
    config.value ??
    config.items
      ?.filter(item => item.isOpen === true)
      .map(item => item.value) ??
    []

  return {
    id: config.id,
    type,
    value: [...normalizeValue(type, initialValue)],
  }
}

/**
 * Conforms externally-owned open values without emitting an OutMessage.
 * Useful for route, storage, and domain-state reflection.
 */
export const reflect = (model: Model, value: ReadonlyArray<string>): Model => ({
  ...model,
  value: [...normalizeValue(model.type, value)],
})

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>

export const update = (model: Model, message: Message): UpdateReturn => {
  const value = message.isOpen
    ? model.type === 'single'
      ? [message.value]
      : [...normalizeValue('multiple', [...model.value, message.value])]
    : model.value.filter(currentValue => currentValue !== message.value)

  return {
    model: { ...model, value },
    outMessage: OutMessage.ChangedValue({
      value,
      toggledValue: message.value,
      isOpen: message.isOpen,
    }),
  }
}
