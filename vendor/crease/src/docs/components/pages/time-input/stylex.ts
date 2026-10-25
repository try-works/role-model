import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { previewLayout } from '@/docs/components/preview-layout.stylex'
import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  timeInputFixtures,
  type TimeInputFixtureEntry,
} from '@/docs/components/pages/time-input/shared'
import * as TimeInput from '@/stylex/time-input'

const GotTimeInputMessage = defineMessageUnion({
  GotTimeInputMessage: {
    index: S.Number,
    message: TimeInput.Message,
  },
})
type GotTimeInputMessage = typeof GotTimeInputMessage.Type

const TimeInputPreviewModel = S.Struct({
  _docsPage: S.Literal('time-input'),
  inputs: S.Array(
    S.Struct({ input: TimeInput.Model, value: S.Option(S.String) }),
  ),
})
type TimeInputPreviewModel = typeof TimeInputPreviewModel.Type

const entryProps = (
  entry: TimeInputFixtureEntry,
  input: TimeInput.Model,
  value: Option.Option<string>,
  entryIndex: number,
): TimeInput.TimeInputProps<GotTimeInputMessage> => ({
  model: input,
  toParentMessage: message =>
    GotTimeInputMessage.GotTimeInputMessage({ index: entryIndex, message }),
  id: `docs-time-input-${entry.id}`,
  label: entry.label,
  value: Option.getOrNull(value),
  ...(entry.presentation === undefined
    ? {}
    : { presentation: entry.presentation }),
  ...(entry.placeholder === undefined
    ? {}
    : { placeholder: entry.placeholder }),
  ...(entry.min === undefined ? {} : { min: entry.min }),
  ...(entry.max === undefined ? {} : { max: entry.max }),
  ...(entry.increment === undefined ? {} : { increment: entry.increment }),
  ...(entry.hourFormat === undefined ? {} : { hourFormat: entry.hourFormat }),
  ...(entry.hasSeconds === true ? { hasSeconds: true } : {}),
  ...(entry.hasClear === true ? { hasClear: true } : {}),
  ...(entry.isDisabled === true ? { isDisabled: true } : {}),
  ...(entry.description === undefined
    ? {}
    : { description: entry.description }),
  ...(entry.status === undefined ? {} : { status: entry.status }),
})

export const timeInputStylexPreviewProgram = definePreviewProgram<
  TimeInputPreviewModel,
  GotTimeInputMessage
>({
  Model: TimeInputPreviewModel,
  Message: GotTimeInputMessage,
  init: index => {
    const fixture = timeInputFixtures[index] ?? timeInputFixtures[0]
    return {
      _docsPage: 'time-input',
      inputs: fixture.entries.map(entry => ({
        input: TimeInput.init({ id: `docs-time-input-${entry.id}` }),
        value:
          entry.initialValue === undefined
            ? Option.none()
            : Option.some(entry.initialValue),
      })),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotTimeInputMessage': {
        const entry = model.inputs[message.index]
        if (entry === undefined) return { model }
        const next = TimeInput.update(entry.input, message.message)
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
            GotTimeInputMessage.GotTimeInputMessage({
              index: message.index,
              message: next2,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = timeInputFixtures[index] ?? timeInputFixtures[0]
    return h.div(
      [
        h.Class(className(previewLayout.compactForm)),
        h.Style({ maxWidth: `${String(fixture.maxWidth)}px` }),
      ],
      [
        ...(fixture.heading === undefined
          ? []
          : [
              h.p(
                [h.Class(className(reset.text, previewLayout.caption))],
                [fixture.heading],
              ),
            ]),
        ...model.inputs.map((entry, entryIndex) =>
          TimeInput.timeInput(
            entryProps(
              fixture.entries[entryIndex] ?? fixture.entries[0]!,
              entry.input,
              entry.value,
              entryIndex,
            ),
            h,
          ),
        ),
      ],
    )
  },
})

export const timeInputStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = timeInputFixtures[exampleIndex] ?? timeInputFixtures[0]
  const previewModel = model as {
    inputs: ReadonlyArray<{
      input: TimeInput.Model
      value: Option.Option<string>
    }>
  }
  return h.div(
    [
      h.Class(className(previewLayout.compactForm)),
      h.Style({ maxWidth: `${String(fixture.maxWidth)}px` }),
    ],
    [
      ...(fixture.heading === undefined
        ? []
        : [
            h.p(
              [h.Class(className(reset.text, previewLayout.caption))],
              [fixture.heading],
            ),
          ]),
      ...previewModel.inputs.map((entry, entryIndex) => {
        const fixtureEntry = fixture.entries[entryIndex] ?? fixture.entries[0]!
        return TimeInput.timeInput(
          {
            model: entry.input,
            toParentMessage: message =>
              onMessageJson(
                JSON.stringify({
                  _tag: 'GotTimeInputMessage',
                  index: entryIndex,
                  message,
                }),
              ),
            id: `docs-time-input-${fixtureEntry.id}`,
            label: fixtureEntry.label,
            value: Option.getOrNull(entry.value),
            ...(fixtureEntry.presentation === undefined
              ? {}
              : { presentation: fixtureEntry.presentation }),
            ...(fixtureEntry.placeholder === undefined
              ? {}
              : { placeholder: fixtureEntry.placeholder }),
            ...(fixtureEntry.min === undefined
              ? {}
              : { min: fixtureEntry.min }),
            ...(fixtureEntry.max === undefined
              ? {}
              : { max: fixtureEntry.max }),
            ...(fixtureEntry.increment === undefined
              ? {}
              : { increment: fixtureEntry.increment }),
            ...(fixtureEntry.hourFormat === undefined
              ? {}
              : { hourFormat: fixtureEntry.hourFormat }),
            ...(fixtureEntry.hasSeconds === true ? { hasSeconds: true } : {}),
            ...(fixtureEntry.hasClear === true ? { hasClear: true } : {}),
            ...(fixtureEntry.isDisabled === true ? { isDisabled: true } : {}),
            ...(fixtureEntry.description === undefined
              ? {}
              : { description: fixtureEntry.description }),
            ...(fixtureEntry.status === undefined
              ? {}
              : { status: fixtureEntry.status }),
          },
          h,
        )
      }),
    ],
  )
}
