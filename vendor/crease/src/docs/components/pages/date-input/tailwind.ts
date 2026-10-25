import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { dateInputFixtures } from '@/docs/components/pages/date-input/shared'
import * as DateInput from '@/ui/date-input'
import type { SharedDateFormat } from '@/ui/date-input'

const PreviewMessages = defineMessageUnion({
  GotDateInputMessage: { slot: S.Number, message: DateInput.Message },
})
type PreviewMessage = typeof PreviewMessages.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('date-input'),
  inputs: S.Array(DateInput.Model),
  syncOnChange: S.Boolean,
  windowLabel: S.String,
})
type PreviewModel = typeof PreviewModel.Type

export const FORMAT_EXAMPLES = [
  { label: 'Short month (date)', format: 'date' },
  { label: 'Long month (date_long, default)', format: 'date_long' },
  { label: 'With weekday (date_weekday)', format: 'date_weekday' },
  { label: 'ISO 8601 (system_date)', format: 'system_date' },
  { label: 'Custom function', format: (iso: string) => `Ship by ${iso}` },
] as const satisfies ReadonlyArray<{
  label: string
  format: SharedDateFormat | ((iso: string) => string)
}>

export const VALIDATION_FIELDS = [
  {
    label: 'Event date',
    status: { type: 'error', message: 'This date is already booked' },
  },
  {
    label: 'Preferred date',
    status: { type: 'warning', message: 'This date falls on a holiday' },
  },
  {
    label: 'Start date',
    status: { type: 'success', message: 'Date confirmed' },
  },
] as const satisfies ReadonlyArray<{
  label: string
  status: DateInput.DateInputStatus
}>

const INITIAL_VALUES: Readonly<
  Record<string, ReadonlyArray<string | undefined>>
> = {
  DateInputClearable: ['2026-04-06'],
  DateInputFormats: [
    '2026-03-21',
    '2026-03-21',
    '2026-03-21',
    '2026-03-21',
    '2026-03-21',
  ],
  DateInputWithValidation: ['2026-01-25', '2026-12-25', '2026-03-10'],
}

const supporting = (text: string, h: HtmlBuilder<PreviewMessage>): Html =>
  h.p([h.Class('text-muted-foreground text-sm')], [text])

export const dateInputTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: index => {
    const fixture = dateInputFixtures[index] ?? dateInputFixtures[0]!
    const today = Calendar.fromDateInZone(new Date(), 'UTC')
    const min = Calendar.make(today.year, today.month, 8)
    const max = Calendar.make(today.year, today.month, 21)
    const monthName = new Intl.DateTimeFormat('en-US', {
      month: 'short',
    }).format(Calendar.toDateLocal(today))
    const values = INITIAL_VALUES[fixture.example] ?? [undefined]
    const isConstraints = fixture.kind === 'constraints'
    return {
      _docsPage: 'date-input',
      inputs: values.map((iso, i) =>
        DateInput.init({
          id: `docs-date-input-${String(index)}-${String(i)}`,
          today,
          ...(iso === undefined
            ? {}
            : { value: Option.getOrUndefined(DateInput.dateFromISO(iso)) }),
          ...(isConstraints ? { minDate: min, maxDate: max } : {}),
        }),
      ),
      syncOnChange: fixture.kind === 'formats',
      windowLabel: `${monthName} 8 – 21, ${String(today.year)}`,
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDateInputMessage': {
        const target = model.inputs[message.slot]
        if (target === undefined) return { model }
        const next = DateInput.update(target, message.message)
        const maybeOut = Option.fromNullishOr(next.outMessage)
        const maybeChanged =
          Option.isSome(maybeOut) && maybeOut.value._tag === 'ChangedValue'
            ? maybeOut.value.value
            : undefined
        const inputs = model.inputs.map((input, i) =>
          i === message.slot
            ? next.model
            : model.syncOnChange && maybeChanged !== undefined
              ? DateInput.reflect(input, maybeChanged)
              : input,
        )
        return {
          model: { ...model, inputs },
          commands: Command.mapMessages(next.commands ?? [], m =>
            PreviewMessages.GotDateInputMessage({
              slot: message.slot,
              message: m,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = dateInputFixtures[index] ?? dateInputFixtures[0]!
    const inputAt = (
      slot: number,
      props: Omit<
        DateInput.DateInputProps<PreviewMessage>,
        'model' | 'toParentMessage'
      >,
    ): Html =>
      DateInput.dateInput(
        {
          model: model.inputs[slot]!,
          toParentMessage: message =>
            PreviewMessages.GotDateInputMessage({ slot, message }),
          ...props,
        },
        h,
      )
    const stack = (children: ReadonlyArray<Html>): Html =>
      h.div([h.Class('grid w-full max-w-100 min-w-60 gap-4')], [...children])
    const selectedText = Option.match(model.inputs[0]?.value ?? Option.none(), {
      onNone: () => 'No date selected',
      onSome: date => `Selected: ${DateInput.dateToISO(date)}`,
    })
    const bookedText = Option.match(model.inputs[0]?.value ?? Option.none(), {
      onNone: () => 'Pick a date in the available range',
      onSome: date => `Booked: ${DateInput.dateToISO(date)}`,
    })
    switch (fixture.example) {
      case 'DateInputClearable':
        return stack([
          supporting(selectedText, h),
          inputAt(0, {
            label: 'Event date',
            description: 'Pick a date for your event',
            placeholder: 'Select a date',
            hasClear: true,
          }),
        ])
      case 'DateInputDateRange':
        return stack([
          supporting(bookedText, h),
          inputAt(0, {
            label: 'Booking date',
            description: `Available dates: ${model.windowLabel}`,
            placeholder: 'Select a booking date',
            presentation: 'adaptive-bottom-sheet',
          }),
        ])
      case 'DateInputFormats':
        return stack([
          supporting(
            'The same committed date, displayed with different formats.',
            h,
          ),
          ...FORMAT_EXAMPLES.map((entry, i) =>
            inputAt(i, { label: entry.label, format: entry.format }),
          ),
        ])
      case 'DateInputWithDescription':
        return stack([
          supporting('Helper text explains what the field expects', h),
          inputAt(0, {
            label: 'Start date',
            description: 'Your subscription begins on this date',
            placeholder: 'Select a start date',
          }),
        ])
      case 'DateInputWithValidation':
        return stack(
          VALIDATION_FIELDS.map((field, i) =>
            inputAt(i, { label: field.label, status: field.status }),
          ),
        )
      default:
        return stack([
          inputAt(0, {
            label: 'Start date',
            placeholder: 'Select a date',
            hasClear: true,
          }),
        ])
    }
  },
})
