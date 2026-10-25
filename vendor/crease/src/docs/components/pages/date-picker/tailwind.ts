import { parseDate } from 'chrono-node'
import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  arabicCalendarLocale,
  datePickerFixtures,
  type DatePickerFixtureKind,
} from '@/docs/components/pages/date-picker/shared'
import * as Calendar from '@/ui/calendar'
import * as DatePicker from '@/ui/date-picker'
import * as Field from '@/ui/field'
import * as Icon from '@/lib/icon'
import * as TimeInput from '@/ui/time-input'
import * as InputGroup from '@/ui/input-group'
import * as Popover from '@/ui/popover'

const Message = defineMessageUnion({
  GotDatePickerMessage: { message: DatePicker.Message },
  GotCalendarMessage: { message: Calendar.Message },
  GotPopoverMessage: { message: Popover.Message },
  ChangedInput: { value: S.String },
  PressedKeyInInput: { key: S.String },
  GotTimeInputMessage: { message: TimeInput.Message },
})
type Message = typeof Message.Type

const Model = S.Struct({
  _docsPage: S.Literal('date-picker'),
  kind: S.String,
  datePicker: DatePicker.Model,
  calendar: Calendar.Model,
  popover: Popover.Model,
  selectedDate: S.Option(FoldkitCalendar.CalendarDate),
  rangeStart: S.Option(FoldkitCalendar.CalendarDate),
  rangeEnd: S.Option(FoldkitCalendar.CalendarDate),
  inputValue: S.String,
  timeValue: S.String,
  timeInput: TimeInput.Model,
})
type Model = typeof Model.Type

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatDisplay = (date: FoldkitCalendar.CalendarDate): string =>
  `${MONTH_NAMES[date.month - 1]} ${String(date.day).padStart(2, '0')}, ${date.year}`
const formatCompact = (date: FoldkitCalendar.CalendarDate): string =>
  `${SHORT_MONTH_NAMES[date.month - 1]} ${String(date.day).padStart(2, '0')}, ${date.year}`
const formatUs = (date: FoldkitCalendar.CalendarDate): string =>
  `${date.month}/${date.day}/${date.year}`
const formatArabic = (date: FoldkitCalendar.CalendarDate): string =>
  `${arabicCalendarLocale.monthNames[date.month - 1]} ${date.day}، ${date.year}`

const parseInputDate = (
  value: string,
): Option.Option<FoldkitCalendar.CalendarDate> => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? Option.none()
    : Option.some({
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
      })
}

const parseNaturalDate = (
  value: string,
  today: FoldkitCalendar.CalendarDate,
): Option.Option<FoldkitCalendar.CalendarDate> => {
  const parsed = parseDate(
    value,
    new Date(Date.UTC(today.year, today.month - 1, today.day)),
  )
  return parsed === null
    ? Option.none()
    : Option.some(FoldkitCalendar.fromDateInZone(parsed, 'UTC'))
}

const initPicker = (
  id: string,
  isRtl: boolean,
  initialViewDate?: FoldkitCalendar.CalendarDate,
): DatePicker.Model =>
  DatePicker.init({
    id,
    today: FoldkitCalendar.fromDateInZone(new Date(), 'UTC'),
    isAnimated: true,
    ...(isRtl ? { locale: arabicCalendarLocale } : {}),
    ...(initialViewDate === undefined ? {} : { initialViewDate }),
  })

export const datePickerTailwindPreviewProgram = definePreviewProgram<
  Model,
  Message
>({
  Model,
  Message,
  init: index => {
    const fixture = datePickerFixtures[index] ?? datePickerFixtures[0]!
    const kind: DatePickerFixtureKind = fixture.kind
    const today = FoldkitCalendar.fromDateInZone(new Date(), 'UTC')
    const inputDate = { year: 2025, month: 6, day: 1 }
    const naturalDate = FoldkitCalendar.addDays(today, 2)
    return {
      _docsPage: 'date-picker',
      kind,
      datePicker: initPicker(
        `docs-date-picker-${index}`,
        kind === 'rtl',
        kind === 'input'
          ? inputDate
          : kind === 'natural'
            ? naturalDate
            : undefined,
      ),
      calendar: Calendar.init({
        id: `docs-calendar-${index}`,
        today,
        ...(kind === 'range'
          ? { initialViewDate: { year: 2026, month: 1, day: 20 } }
          : kind === 'input'
            ? { initialViewDate: inputDate }
            : kind === 'natural'
              ? { initialViewDate: naturalDate }
              : {}),
      }),
      popover: Popover.init({ id: `docs-popover-${index}` }),
      selectedDate:
        kind === 'input'
          ? Option.some(inputDate)
          : kind === 'natural'
            ? Option.some(naturalDate)
            : Option.none(),
      rangeStart:
        kind === 'range'
          ? Option.some<FoldkitCalendar.CalendarDate>({
              year: 2026,
              month: 1,
              day: 20,
            })
          : Option.none(),
      rangeEnd:
        kind === 'range'
          ? Option.some<FoldkitCalendar.CalendarDate>({
              year: 2026,
              month: 2,
              day: 9,
            })
          : Option.none(),
      inputValue:
        kind === 'input'
          ? formatDisplay(inputDate)
          : kind === 'natural'
            ? 'In 2 days'
            : '',
      timeValue: '10:30',
      timeInput: TimeInput.init({ id: `docs-date-picker-time-${index}` }),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDatePickerMessage': {
        const next = (
          model.kind === 'rtl' ? DatePicker.updateForRtl : DatePicker.update
        )(model.datePicker, message.message)
        const maybeOut = Option.fromNullishOr(next.outMessage)
        const selectedDate = Option.match(maybeOut, {
          onNone: () => model.selectedDate,
          onSome: out =>
            out._tag === 'SelectedDate'
              ? Option.some(out.date)
              : out._tag === 'ClearedDate'
                ? Option.none()
                : model.selectedDate,
        })
        const inputValue =
          model.kind === 'input' || model.kind === 'natural'
            ? Option.match(Option.fromNullishOr(next.outMessage), {
                onNone: () => model.inputValue,
                onSome: out =>
                  out._tag === 'SelectedDate'
                    ? formatDisplay(out.date)
                    : model.inputValue,
              })
            : model.inputValue
        return {
          model: { ...model, datePicker: next.model, selectedDate, inputValue },
          commands: Command.mapMessages(next.commands ?? [], child =>
            Message.GotDatePickerMessage({ message: child }),
          ),
        }
      }
      case 'GotCalendarMessage': {
        const next = Calendar.update(model.calendar, message.message)
        const out = Option.fromNullishOr(next.outMessage)
        const maybeDate = Option.match(out, {
          onNone: () => Option.none(),
          onSome: value =>
            value._tag === 'SelectedDate'
              ? Option.some(value.date)
              : Option.none(),
        })
        const base = {
          model: { ...model, calendar: next.model },
          commands: Command.mapMessages(next.commands ?? [], child =>
            Message.GotCalendarMessage({ message: child }),
          ),
        }
        return Option.match(maybeDate, {
          onNone: () => base,
          onSome: date => {
            if (model.kind === 'range') {
              const range = Option.match(model.rangeStart, {
                onNone: () => ({
                  rangeStart: Option.some(date),
                  rangeEnd: Option.none<FoldkitCalendar.CalendarDate>(),
                }),
                onSome: start =>
                  Option.match(model.rangeEnd, {
                    onNone: () =>
                      FoldkitCalendar.isBefore(date, start)
                        ? {
                            rangeStart: Option.some(date),
                            rangeEnd: Option.some(start),
                          }
                        : {
                            rangeStart: Option.some(start),
                            rangeEnd: Option.some(date),
                          },
                    onSome: () => ({
                      rangeStart: Option.some(date),
                      rangeEnd: Option.none<FoldkitCalendar.CalendarDate>(),
                    }),
                  }),
              })
              return { ...base, model: { ...base.model, ...range } }
            }
            const closed = Popover.close(model.popover)
            return {
              ...base,
              model: {
                ...base.model,
                popover: closed.model,
                selectedDate: Option.some(date),
                inputValue: formatDisplay(date),
              },
              commands: [
                ...base.commands,
                ...Command.mapMessages(closed.commands ?? [], child =>
                  Message.GotPopoverMessage({ message: child }),
                ),
              ],
            }
          },
        })
      }
      case 'GotPopoverMessage': {
        const next = Popover.update(model.popover, message.message)
        return {
          model: { ...model, popover: next.model },
          commands: Command.mapMessages(next.commands ?? [], child =>
            Message.GotPopoverMessage({ message: child }),
          ),
        }
      }
      case 'ChangedInput': {
        const today = FoldkitCalendar.fromDateInZone(new Date(), 'UTC')
        const parsed =
          model.kind === 'natural'
            ? parseNaturalDate(message.value, today)
            : parseInputDate(message.value)
        return {
          model: Option.match(parsed, {
            onNone: () => ({ ...model, inputValue: message.value }),
            onSome: date => ({
              ...model,
              inputValue: message.value,
              selectedDate: Option.some(date),
              datePicker: DatePicker.focusDate(model.datePicker, date),
            }),
          }),
          commands: [],
        }
      }
      case 'PressedKeyInInput': {
        if (message.key !== 'ArrowDown') return { model, commands: [] }
        const next = DatePicker.open(model.datePicker)
        return {
          model: { ...model, datePicker: next.model },
          commands: Command.mapMessages(next.commands ?? [], child =>
            Message.GotDatePickerMessage({ message: child }),
          ),
        }
      }
      case 'GotTimeInputMessage': {
        const next = TimeInput.update(model.timeInput, message.message)
        return {
          model: {
            ...model,
            timeInput: next.model,
            timeValue:
              next.outMessage === undefined
                ? model.timeValue
                : Option.getOrElse(next.outMessage.value, () => ''),
          },
          commands: Command.mapMessages(next.commands ?? [], child =>
            Message.GotTimeInputMessage({ message: child }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = datePickerFixtures[index] ?? datePickerFixtures[0]!
    const kind = fixture.kind
    if (kind === 'range') return rangeView(model, h)
    if (kind === 'input' || kind === 'natural')
      return inputLikeView(kind, model, h)
    return pickerView(kind, model, h)
  },
})

const chevronTriggerContent =
  (
    placeholder: string,
    format: (date: FoldkitCalendar.CalendarDate) => string,
  ) =>
  (
    maybeDate: Option.Option<FoldkitCalendar.CalendarDate>,
    h: HtmlBuilder<Message>,
  ) =>
    h.span(
      [h.Class('flex w-full items-center justify-between')],
      [
        Option.match(maybeDate, {
          onNone: () => h.span([], [placeholder]),
          onSome: date => h.span([], [format(date)]),
        }),
        Icon.chevronDown({ class: 'size-4 opacity-50' }, h),
      ],
    )

const textTriggerContent =
  (
    placeholder: string,
    format: (date: FoldkitCalendar.CalendarDate) => string,
  ) =>
  (
    maybeDate: Option.Option<FoldkitCalendar.CalendarDate>,
    h: HtmlBuilder<Message>,
  ) =>
    Option.match(maybeDate, {
      onNone: () => h.span([], [placeholder]),
      onSome: date => h.span([], [format(date)]),
    })

const pickerView = (
  kind: DatePickerFixtureKind,
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  const isRtl = kind === 'rtl'
  const withChevron = kind === 'demo' || kind === 'time' || isRtl
  const placeholder =
    kind === 'demo' || kind === 'basic'
      ? 'Pick a date'
      : isRtl
        ? 'اختر تاريخًا'
        : 'Select date'
  const format =
    kind === 'dob' ? formatUs : isRtl ? formatArabic : formatDisplay
  const triggerContent = (
    maybeDate: Option.Option<FoldkitCalendar.CalendarDate>,
  ) =>
    withChevron
      ? chevronTriggerContent(placeholder, format)(maybeDate, h)
      : textTriggerContent(placeholder, format)(maybeDate, h)

  const picker = DatePicker.datePicker(
    {
      model: model.datePicker,
      maybeSelectedDate: model.selectedDate,
      toParentMessage: message => Message.GotDatePickerMessage({ message }),
      name: 'date',
      ariaLabel: placeholder,
      triggerContent,
      triggerClass: 'w-44 justify-start font-normal',
      ...(isRtl ? { direction: 'rtl' as const } : {}),
    },
    h,
  )

  if (kind === 'time') {
    return Field.fieldGroup(
      {
        class: 'mx-auto w-full max-w-sm flex-row flex-wrap items-start',
        children: [
          Field.field(
            {
              class: 'w-44',
              children: [
                Field.fieldLabel(
                  {
                    for: DatePicker.triggerId(model.datePicker.id),
                    children: ['Date'],
                  },
                  h,
                ),
                picker,
              ],
            },
            h,
          ),
          Field.field(
            {
              class: 'w-36',
              children: [
                Field.fieldLabel(
                  {
                    for: TimeInput.pickerButtonId(model.timeInput),
                    children: ['Time'],
                  },
                  h,
                ),
                TimeInput.timeInput(
                  {
                    model: model.timeInput,
                    toParentMessage: message =>
                      Message.GotTimeInputMessage({ message }),
                    id: 'time-picker-optional',
                    label: 'Time',
                    isLabelHidden: true,
                    presentation: 'select',
                    hourFormat: '24h',
                    name: 'time',
                    value: model.timeValue,
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      },
      h,
    )
  }
  if (kind === 'demo') return h.div([], [picker])
  const labelText = kind === 'basic' ? 'Date' : 'Date of birth'
  if (isRtl) {
    return h.div([h.Dir('rtl'), h.Class('mx-auto w-44')], [picker])
  }
  return Field.field(
    {
      class: 'mx-auto w-44',
      children: [
        Field.fieldLabel({ for: 'date-picker', children: [labelText] }, h),
        picker,
      ],
    },
    h,
  )
}

const rangeView = (model: Model, h: HtmlBuilder<Message>) => {
  const rangeOption = Option.match(model.rangeStart, {
    onNone: () => Option.none(),
    onSome: start =>
      Option.match(model.rangeEnd, {
        onNone: () => Option.some({ start, end: start }),
        onSome: end => Option.some({ start, end }),
      }),
  })
  const rangeText = Option.match(model.rangeStart, {
    onNone: () => 'Pick a date',
    onSome: start =>
      Option.match(model.rangeEnd, {
        onNone: () => formatCompact(start),
        onSome: end => `${formatCompact(start)} - ${formatCompact(end)}`,
      }),
  })
  return Field.field(
    {
      class: 'mx-auto w-60',
      children: [
        Field.fieldLabel(
          { for: 'date-picker-range', children: ['Date Picker Range'] },
          h,
        ),
        Popover.popover(
          {
            model: model.popover,
            toParentMessage: message => Message.GotPopoverMessage({ message }),
            align: 'start',
            trigger: h.span(
              [h.Class('flex items-center gap-2')],
              [Icon.calendarIcon({ class: 'size-4' }, h), rangeText],
            ),
            triggerClass:
              'inline-flex h-8 w-60 items-center justify-start gap-2 whitespace-nowrap rounded-md border border-input bg-background px-2.5 text-sm font-normal shadow-xs',
            content: Calendar.calendar(
              {
                model: model.calendar,
                maybeSelectedDate: Option.none(),
                toParentMessage: message =>
                  Message.GotCalendarMessage({ message }),
                ...(Option.isSome(rangeOption)
                  ? { range: rangeOption.value }
                  : {}),
              },
              h,
            ),
            class: 'w-auto p-0',
          },
          h,
        ),
      ],
    },
    h,
  )
}

const inputLikeView = (
  kind: 'input' | 'natural',
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  const isNatural = kind === 'natural'
  return Field.field(
    {
      class: isNatural ? 'mx-auto max-w-xs' : 'mx-auto w-48',
      children: [
        Field.fieldLabel(
          {
            for: isNatural ? 'date-optional' : 'date-required',
            children: [isNatural ? 'Schedule Date' : 'Subscription Date'],
          },
          h,
        ),
        InputGroup.inputGroup(
          {
            children: [
              InputGroup.inputGroupInput(
                {
                  id: isNatural ? 'date-optional' : 'date-required',
                  value: model.inputValue,
                  onInput: value => Message.ChangedInput({ value }),
                  onKeyDown: key => Message.PressedKeyInInput({ key }),
                  placeholder: isNatural
                    ? 'Tomorrow or next week'
                    : 'June 01, 2025',
                },
                h,
              ),
              InputGroup.inputGroupAddon(
                {
                  align: 'inline-end',
                  children: [
                    DatePicker.datePicker(
                      {
                        model: model.datePicker,
                        maybeSelectedDate: model.selectedDate,
                        toParentMessage: message =>
                          Message.GotDatePickerMessage({ message }),
                        ariaLabel: 'Select date',
                        triggerContent: () =>
                          h.span(
                            [h.Class('flex items-center')],
                            [
                              Icon.calendarIcon({ class: 'size-4' }, h),
                              h.span([h.Class('sr-only')], ['Select date']),
                            ],
                          ),
                        triggerClass:
                          'inline-flex h-5 w-5 items-center justify-center rounded-sm',
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}
