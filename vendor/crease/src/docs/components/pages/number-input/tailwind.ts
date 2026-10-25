import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  numberInputFixtures,
  type NumberInputFixtureEntry,
} from '@/docs/components/pages/number-input/shared'
import * as NumberInput from '@/ui/number-input'

const GotNumberInputMessage = defineMessageUnion({
  GotNumberInputMessage: {
    index: S.Number,
    message: NumberInput.Message,
  },
})
type GotNumberInputMessage = typeof GotNumberInputMessage.Type

const NumberInputPreviewModel = S.Struct({
  _docsPage: S.Literal('number-input'),
  inputs: S.Array(
    S.Struct({ input: NumberInput.Model, value: S.Option(S.Number) }),
  ),
})
type NumberInputPreviewModel = typeof NumberInputPreviewModel.Type

const entryProps = (
  entry: NumberInputFixtureEntry,
  input: NumberInput.Model,
  value: Option.Option<number>,
  entryIndex: number,
): NumberInput.NumberInputProps<GotNumberInputMessage> => ({
  model: input,
  toParentMessage: message =>
    GotNumberInputMessage.GotNumberInputMessage({ index: entryIndex, message }),
  id: input.id,
  label: entry.label,
  value: Option.getOrNull(value),
  ...(entry.placeholder === undefined
    ? {}
    : { placeholder: entry.placeholder }),
  ...(entry.units === undefined ? {} : { units: entry.units }),
  ...(entry.min === undefined ? {} : { min: entry.min }),
  ...(entry.max === undefined ? {} : { max: entry.max }),
  ...(entry.description === undefined
    ? {}
    : { description: entry.description }),
  ...(entry.status === undefined ? {} : { status: entry.status }),
  ...(entry.formatValue === 'items'
    ? { formatValue: (number: number) => `${String(number)} items` }
    : {}),
  ...(entry.hasClear === true ? { hasClear: true } : {}),
  ...(entry.hasNumberSteppers === true ? { hasNumberSteppers: true } : {}),
})

export const numberInputTailwindPreviewProgram = definePreviewProgram<
  NumberInputPreviewModel,
  GotNumberInputMessage
>({
  Model: NumberInputPreviewModel,
  Message: GotNumberInputMessage,
  init: index => {
    const fixture = numberInputFixtures[index] ?? numberInputFixtures[0]
    return {
      _docsPage: 'number-input',
      inputs: fixture.entries.map(entry => ({
        input: NumberInput.init({
          id: `docs-number-input-${String(index)}-${entry.id}`,
        }),
        value:
          entry.initialValue === undefined
            ? Option.none()
            : Option.some(entry.initialValue),
      })),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotNumberInputMessage': {
        const entry = model.inputs[message.index]
        if (entry === undefined) return { model }
        const next = NumberInput.update(entry.input, message.message)
        const commands = next.commands ?? []
        const value = Option.match(Option.fromNullishOr(next.outMessage), {
          onNone: () => entry.value,
          onSome: changed => changed.value,
        })
        const inputs = model.inputs.map((candidate, i) =>
          i === message.index ? { input: next.model, value } : candidate,
        )
        return {
          model: { ...model, inputs },
          commands: Command.mapMessages(commands, next2 =>
            GotNumberInputMessage.GotNumberInputMessage({
              index: message.index,
              message: next2,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = numberInputFixtures[index] ?? numberInputFixtures[0]
    return h.div(
      [h.Class('flex w-full max-w-md flex-col gap-4')],
      model.inputs.map((entry, entryIndex) =>
        NumberInput.numberInput(
          entryProps(
            fixture.entries[entryIndex] ?? fixture.entries[0]!,
            entry.input,
            entry.value,
            entryIndex,
          ),
          h,
        ),
      ),
    )
  },
})
