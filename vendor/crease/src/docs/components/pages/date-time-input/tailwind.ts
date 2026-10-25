import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  VALIDATION_FIELDS,
  dateTimeInputFixtures,
} from '@/docs/components/pages/date-time-input/shared'
import * as DateTimeInput from '@/ui/date-time-input'

const PreviewMessages = defineMessageUnion({
  GotDateTimeInputMessage: {
    slot: S.Number,
    message: DateTimeInput.Message,
  },
})
type PreviewMessage = typeof PreviewMessages.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('date-time-input'),
  inputs: S.Array(DateTimeInput.Model),
})
type PreviewModel = typeof PreviewModel.Type

const toDateTime = (value: {
  date: string
  time: string
}): DateTimeInput.DateTime | undefined =>
  Option.match(DateTimeInput.dateFromISO(value.date), {
    onNone: () => undefined,
    onSome: date => ({ date, time: value.time }),
  })

export const dateTimeInputTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: index => {
    const fixture = dateTimeInputFixtures[index] ?? dateTimeInputFixtures[0]!
    const today = Calendar.fromDateInZone(new Date(), 'UTC')
    const values: ReadonlyArray<DateTimeInput.DateTime | undefined> =
      fixture.kind === 'validation'
        ? VALIDATION_FIELDS.map(field => toDateTime(field.value))
        : [
            fixture.initialValue === undefined
              ? undefined
              : toDateTime(fixture.initialValue),
          ]
    return {
      _docsPage: 'date-time-input',
      inputs: values.map((value, i) =>
        DateTimeInput.init({
          id: `docs-date-time-input-${String(index)}-${String(i)}`,
          today,
          ...(fixture.timeOptionInterval === undefined
            ? {}
            : { hasTimeOptions: true }),
          ...(value === undefined ? {} : { value }),
        }),
      ),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDateTimeInputMessage': {
        const target = model.inputs[message.slot]
        if (target === undefined) return { model }
        const next = DateTimeInput.update(target, message.message)
        const inputs = model.inputs.map((input, i) =>
          i === message.slot ? next.model : input,
        )
        return {
          model: { ...model, inputs },
          commands: Command.mapMessages(next.commands ?? [], m =>
            PreviewMessages.GotDateTimeInputMessage({
              slot: message.slot,
              message: m,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = dateTimeInputFixtures[index] ?? dateTimeInputFixtures[0]!
    const stack = (children: ReadonlyArray<Html>): Html =>
      h.div([h.Class('grid w-full min-w-60 max-w-100 gap-4')], [...children])
    const inputAt = (
      slot: number,
      props: Omit<
        DateTimeInput.DateTimeInputProps<PreviewMessage>,
        'model' | 'toParentMessage' | 'label'
      > & { label: string },
    ): Html =>
      DateTimeInput.dateTimeInput(
        {
          model: model.inputs[slot]!,
          toParentMessage: message =>
            PreviewMessages.GotDateTimeInputMessage({ slot, message }),
          ...props,
        },
        h,
      )
    switch (fixture.example) {
      case 'DateTimeInputWithValidation':
        return stack(
          VALIDATION_FIELDS.map((field, i) =>
            inputAt(i, { label: field.label, status: field.status }),
          ),
        )
      default:
        return stack([
          inputAt(0, {
            label: 'Meeting time',
            placeholder: 'Select a date',
            hasClear: true,
            ...(fixture.timeOptionInterval === undefined
              ? {}
              : { timeOptionInterval: fixture.timeOptionInterval }),
          }),
        ])
    }
  },
})
