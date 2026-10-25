import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  dateRangeInputFixtures,
  presetDaysFor,
} from '@/docs/components/pages/date-range-input/shared'
import * as DateRangeInput from '@/ui/date-range-input'

const PreviewMessages = defineMessageUnion({
  GotDateRangeInputMessage: { slot: S.Number, message: DateRangeInput.Message },
})
type PreviewMessage = typeof PreviewMessages.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('date-range-input'),
  inputs: S.Array(DateRangeInput.Model),
})
type PreviewModel = typeof PreviewModel.Type

export const PRESETS_FOR = (
  example: string,
  today: Calendar.CalendarDate,
): ReadonlyArray<DateRangeInput.DateRangePreset> =>
  presetDaysFor(example).map(days => ({
    label: `Last ${String(days)} days`,
    getRange: () => ({
      start: Calendar.subtractDays(today, days),
      end: today,
    }),
  }))

export const VALIDATION_FIELDS = [
  {
    label: 'Booking period',
    value: { start: '2026-01-01', end: '2026-01-31' },
    status: {
      type: 'error',
      message: 'Selected dates are no longer available',
    },
  },
  {
    label: 'Preferred period',
    value: { start: '2026-06-01', end: '2026-06-30' },
    status: {
      type: 'warning',
      message: 'High demand — limited availability',
    },
  },
  {
    label: 'Confirmed period',
    value: { start: '2026-03-01', end: '2026-03-31' },
    status: { type: 'success', message: 'Dates confirmed and available' },
  },
] as const satisfies ReadonlyArray<{
  label: string
  value: { start: string; end: string }
  status: DateRangeInput.DateRangeInputStatus
}>

const toRange = (value: {
  start: string
  end: string
}): DateRangeInput.Range | undefined =>
  Option.match(
    Option.all({
      start: DateRangeInput.dateFromISO(value.start),
      end: DateRangeInput.dateFromISO(value.end),
    }),
    { onNone: () => undefined, onSome: range => range },
  )

const supporting = (text: string, h: HtmlBuilder<PreviewMessage>): Html =>
  h.p([h.Class('text-muted-foreground text-sm')], [text])

export const dateRangeInputTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: index => {
    const fixture = dateRangeInputFixtures[index] ?? dateRangeInputFixtures[0]!
    const today = Calendar.fromDateInZone(new Date(), 'UTC')
    const values: ReadonlyArray<DateRangeInput.Range | undefined> =
      fixture.kind === 'validation'
        ? VALIDATION_FIELDS.map(field => toRange(field.value))
        : [undefined]
    return {
      _docsPage: 'date-range-input',
      inputs: values.map((value, i) =>
        DateRangeInput.init({
          id: `docs-date-range-input-${String(index)}-${String(i)}`,
          today,
          ...(value === undefined ? {} : { value }),
        }),
      ),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDateRangeInputMessage': {
        const target = model.inputs[message.slot]
        if (target === undefined) return { model }
        const next = DateRangeInput.update(target, message.message)
        const inputs = model.inputs.map((input, i) =>
          i === message.slot ? next.model : input,
        )
        return {
          model: { ...model, inputs },
          commands: Command.mapMessages(next.commands ?? [], m =>
            PreviewMessages.GotDateRangeInputMessage({
              slot: message.slot,
              message: m,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = dateRangeInputFixtures[index] ?? dateRangeInputFixtures[0]!
    const today = Calendar.fromDateInZone(new Date(), 'UTC')
    const inputAt = (
      slot: number,
      props: Omit<
        DateRangeInput.DateRangeInputProps<PreviewMessage>,
        'model' | 'toParentMessage' | 'label'
      > & { label: string },
    ): Html =>
      DateRangeInput.dateRangeInput(
        {
          model: model.inputs[slot]!,
          toParentMessage: message =>
            PreviewMessages.GotDateRangeInputMessage({ slot, message }),
          ...props,
        },
        h,
      )
    const stack = (children: ReadonlyArray<Html>): Html =>
      h.div([h.Class('grid w-full max-w-100 gap-4')], [...children])
    switch (fixture.example) {
      case 'DateRangeInputWithPresets':
        return stack([
          supporting(
            Option.match(model.inputs[0]?.value ?? Option.none(), {
              onNone: () => 'No range selected',
              onSome: range =>
                `${DateRangeInput.dateToISO(range.start)} → ${DateRangeInput.dateToISO(range.end)}`,
            }),
            h,
          ),
          inputAt(0, {
            label: 'Report period',
            description: 'Use a preset or pick a custom range',
            presets: PRESETS_FOR(fixture.example, today),
          }),
        ])
      case 'DateRangeInputWithValidation':
        return stack(
          VALIDATION_FIELDS.map((field, i) =>
            inputAt(i, { label: field.label, status: field.status }),
          ),
        )
      default:
        return stack([
          inputAt(0, {
            label: 'Date range',
            presets: PRESETS_FOR(fixture.example, today),
          }),
        ])
    }
  },
})
