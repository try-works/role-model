import { Option, Schema as S } from 'effect'

import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Mount from 'foldkit/mount'
import { defineMessageUnion } from 'foldkit/message'

import { Combobox as ComboboxPrimitive } from '@foldkit/ui'

const combobox = ComboboxPrimitive.Multi.create<string>()

/* Ported from Meta Astryx Tokenizer (packages/core/src/Tokenizer/)
   — examples and visual spec adapted to Crease UI tokens.

   Tokens render as inline chips before the input inside one flex-wrap
   wrapper. Selection is owned HERE (astryx's controlled `value`), folded
   from the foldkit Multi combobox's Selected out-message and token remove
   buttons; ChangedTokens is the onChange out-message.

   PORT NOTE: foldkit's combobox owns its input's keydown handling, so
   astryx's Backspace-on-empty-removes-last-token contract isn't reachable —
   tokens remove via their × button, the create row, or clear-all.
   PORT NOTE: overflow collapse counts tokens, not pixels — astryx measures
   the wrapper; crease truncates to the visible first row instead. */
export const Token = S.Struct({
  id: S.String,
  label: S.String,
})
export type Token = typeof Token.Type

export const Model = S.Struct({
  id: S.String,
  tokens: S.Array(Token),
  /** id → label registry so Selected out-messages (which carry only the
   *  value/id) can rebuild the token label. */
  itemLabels: S.Record(S.String, S.String),
  maxEntries: S.Option(S.Number),
  combobox: ComboboxPrimitive.Multi.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotComboboxMessage: { message: ComboboxPrimitive.Message },
  RemovedToken: { index: S.Number },
  ClickedClearAll: {},
  /** Expands a collapsed overflow view (inline/layer modes). */
  ClickedOverflow: {},
})
export type Message = typeof Message.Type

/** Use the complete field as the anchor, rather than the shrinking input slot.
 * Pass this through itemsAttributes to replace the primitive's default Mount;
 * its positioning, collision handling and prevent-blur behavior stay intact. */
export const panelMount = <Msg>(
  id: string,
  anchor: ComboboxPrimitive.AnchorConfig,
  send: (message: Message) => Msg,
) =>
  Mount.mapMessage(
    ComboboxPrimitive.AnchorCombobox({ buttonId: `${id}-wrapper`, anchor }),
    message => send(Message.GotComboboxMessage({ message })),
  )

export const OutMessage = defineMessageUnion({
  ChangedTokens: { tokens: S.Array(Token) },
})
export type OutMessage = typeof OutMessage.Type

/** Sentinel prefix distinguishing the free-text "Create" row from real
 *  search results (astryx uses '__xds_create__'). */
export const CREATE_ID_PREFIX = '__create__'

export const init = (
  config: Readonly<{
    id: string
    tokens?: ReadonlyArray<Token>
    items?: ReadonlyArray<Token>
    maxEntries?: number
    isAnimated?: boolean
  }>,
): Model => ({
  id: config.id,
  tokens: [...(config.tokens ?? [])],
  itemLabels: Object.fromEntries(
    [...(config.items ?? []), ...(config.tokens ?? [])].map(t => [
      t.id,
      t.label,
    ]),
  ),
  maxEntries: Option.fromNullishOr(config.maxEntries),
  combobox: ComboboxPrimitive.Multi.init({
    id: `${config.id}-combobox`,
    isAnimated: config.isAnimated ?? true,
  }),
})

/** Syncs the committed token list when it derives from external state. */
export const reflect = (model: Model, tokens: ReadonlyArray<Token>): Model => ({
  ...model,
  tokens: [...tokens],
  itemLabels: {
    ...model.itemLabels,
    ...Object.fromEntries(tokens.map(t => [t.id, t.label])),
  },
})

/** Registers item labels for later Selected folds — call when the item
 *  list changes (search results). */
export const reflectItems = (
  model: Model,
  items: ReadonlyArray<Token>,
): Model => ({
  ...model,
  itemLabels: {
    ...model.itemLabels,
    ...Object.fromEntries(items.map(t => [t.id, t.label])),
  },
})

const isAtMaxEntries = (model: Model): boolean =>
  Option.exists(model.maxEntries, max => model.tokens.length >= max)

const addToken = (model: Model, token: Token): UpdateReturn =>
  isAtMaxEntries(model) || model.tokens.some(t => t.id === token.id)
    ? { model }
    : {
        model: { ...model, tokens: [...model.tokens, token] },
        outMessage: OutMessage.ChangedTokens({
          tokens: [...model.tokens, token],
        }),
      }

const removeTokenAt = (model: Model, index: number): UpdateReturn => {
  const tokens = model.tokens.filter((_, i) => i !== index)
  return {
    model: { ...model, tokens },
    outMessage: OutMessage.ChangedTokens({ tokens }),
  }
}

const toggleValue = (model: Model, value: string): UpdateReturn => {
  const existing = model.tokens.findIndex(t => t.id === value)
  if (existing >= 0) {
    return removeTokenAt(model, existing)
  }
  if (value.startsWith(CREATE_ID_PREFIX)) {
    const created = value.slice(CREATE_ID_PREFIX.length)
    const added = addToken(model, { id: created, label: created })
    return added.outMessage === undefined
      ? added
      : {
          ...added,
          model: {
            ...added.model,
            combobox: { ...added.model.combobox, inputValue: '' },
          },
        }
  }
  return addToken(model, {
    id: value,
    label: model.itemLabels[value] ?? value,
  })
}

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const liftCombobox = (
  model: Model,
  message: ComboboxPrimitive.Message,
): UpdateReturn => {
  const result = combobox.update(model.combobox, message)
  const liftedCommands = Command.mapMessages(result.commands ?? [], m =>
    Message.GotComboboxMessage({ message: m }),
  )
  switch (result.outMessage?._tag) {
    case 'Selected': {
      const folded = toggleValue(
        { ...model, combobox: result.model },
        result.outMessage.value,
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
        model: { ...model, combobox: result.model },
        commands: liftedCommands,
      }
  }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotComboboxMessage':
      return liftCombobox(model, message.message)
    case 'RemovedToken':
      return removeTokenAt(model, message.index)
    case 'ClickedClearAll':
      return model.tokens.length === 0
        ? { model }
        : {
            model: { ...model, tokens: [] },
            outMessage: OutMessage.ChangedTokens({ tokens: [] }),
          }
    case 'ClickedOverflow':
      return { model }
  }
}
