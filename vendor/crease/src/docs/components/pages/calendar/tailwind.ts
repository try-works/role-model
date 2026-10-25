import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  calendarFixtures,
  germanCalendarLocale,
  type CalendarFixture,
} from '@/docs/components/pages/calendar/shared'
import {
  FA_DAY_NAMES,
  FA_MONTH_NAMES,
  faDigits,
  jalaliMonthCells,
  toJalaali,
  type JalaliCell,
  type JalaliDate,
} from '@/lib/jalali'
import * as Button from '@/ui/button'
import * as Calendar from '@/ui/calendar'
import * as Card from '@/ui/card'
import * as Field from '@/ui/field'
import * as Icon from '@/lib/icon'
import * as InputGroup from '@/ui/input-group'

const JalaliDay = S.Struct({
  year: S.Int,
  month: S.Int,
  day: S.Int,
})

const Message = defineMessageUnion({
  GotCalendarPreviewMessage: { message: Calendar.Message },
  ClickedPreset: { days: S.Int },
  ChangedStartTime: { value: S.String },
  ChangedEndTime: { value: S.String },
  ClickedJalaliDay: { date: JalaliDay },
  PressedJalaliPreviousMonth: {},
  PressedJalaliNextMonth: {},
})
type Message = typeof Message.Type

const Model = S.Struct({
  _docsPage: S.Literal('calendar'),
  calendar: Calendar.Model,
  selectedDate: S.Option(FoldkitCalendar.CalendarDate),
  rangeStart: FoldkitCalendar.CalendarDate,
  rangeEnd: FoldkitCalendar.CalendarDate,
  startTime: S.String,
  endTime: S.String,
  jalaliViewYear: S.Int,
  jalaliViewMonth: S.Int,
  jalaliDay: S.Option(JalaliDay),
  jalaliToday: JalaliDay,
})
type Model = typeof Model.Type

const BOOKED_DATES = [3, 12, 13, 14, 15].map(
  (day): FoldkitCalendar.CalendarDate => ({ year: 2026, month: 7, day }),
)

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In a week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
] as const

const TODAY: FoldkitCalendar.CalendarDate = { year: 2026, month: 7, day: 28 }

const addDays = (
  date: FoldkitCalendar.CalendarDate,
  days: number,
): FoldkitCalendar.CalendarDate => {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

const fixtureOf = (index: number): CalendarFixture =>
  calendarFixtures[index] ?? {
    title: 'Demo',
    description: '',
    layout: 'single',
  }

const calendarView = (
  fixture: CalendarFixture,
  model: Model,
  h: HtmlBuilder<Message>,
) =>
  Calendar.calendar(
    {
      model: model.calendar,
      maybeSelectedDate: model.selectedDate,
      toParentMessage: message =>
        Message['GotCalendarPreviewMessage']({ message }),
      ...(fixture.layout === 'range'
        ? { range: { start: model.rangeStart, end: model.rangeEnd } }
        : {}),
      ...(fixture.weekNumbers === true ? { weekNumbers: true } : {}),
      ...(fixture.direction === 'rtl' ? { direction: 'rtl' as const } : {}),
      ...(fixture.layout === 'presets'
        ? { class: 'p-0 [--cell-size:--spacing(9.5)]' }
        : fixture.layout === 'time'
          ? { class: 'p-0' }
          : fixture.roomy === true
            ? { class: '[--cell-size:--spacing(10)]' }
            : {}),
    },
    h,
  )

const timeFieldView = (
  field: 'start' | 'end',
  model: Model,
  h: HtmlBuilder<Message>,
) =>
  Field.field(
    {
      children: [
        Field.fieldLabel(
          {
            for: field === 'start' ? 'time-from' : 'time-to',
            children: [field === 'start' ? 'Start Time' : 'End Time'],
          },
          h,
        ),
        Field.fieldContent(
          {
            children: [
              InputGroup.inputGroup(
                {
                  children: [
                    InputGroup.inputGroupInput(
                      {
                        id: field === 'start' ? 'time-from' : 'time-to',
                        type: 'time',
                        step: '1',
                        value:
                          field === 'start' ? model.startTime : model.endTime,
                        onInput: value =>
                          field === 'start'
                            ? Message.ChangedStartTime({ value })
                            : Message.ChangedEndTime({ value }),
                        ariaLabel:
                          field === 'start' ? 'Start Time' : 'End Time',
                        class:
                          'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
                      },
                      h,
                    ),
                    InputGroup.inputGroupAddon(
                      {
                        children: [
                          Icon.icon(
                            'clock',
                            { class: 'size-4 text-muted-foreground' },
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
        ),
      ],
    },
    h,
  )

const isSameJalaliDay = (a: JalaliDate, b: JalaliDate): boolean =>
  a.year === b.year && a.month === b.month && a.day === b.day

const jalaliDayButton = (
  cell: JalaliCell,
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  const selected =
    Option.isSome(model.jalaliDay) &&
    isSameJalaliDay(model.jalaliDay.value, cell)
  const today = isSameJalaliDay(model.jalaliToday, cell)
  return h.button(
    [
      h.Type('button'),
      h.Class(
        `flex h-8 w-8 items-center justify-center rounded-md text-[0.8rem] transition-colors ${
          selected
            ? 'bg-primary text-primary-foreground'
            : today
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent'
        } ${cell.inMonth ? '' : 'text-muted-foreground opacity-50'}`,
      ),
      ...(selected ? [h.AriaCurrent('date')] : []),
      h.OnClick(
        Message.ClickedJalaliDay({
          date: { year: cell.year, month: cell.month, day: cell.day },
        }),
      ),
    ],
    [faDigits(cell.day)],
  )
}

const jalaliView = (model: Model, h: HtmlBuilder<Message>) => {
  const cells = jalaliMonthCells(model.jalaliViewYear, model.jalaliViewMonth)
  return h.div(
    [h.Dir('rtl'), h.Class('rounded-lg border p-3 w-fit')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          Button.button(
            {
              variant: 'ghost',
              size: 'icon',
              ariaLabel: 'Previous month',
              onClick: Message.PressedJalaliPreviousMonth(),
              children: [Icon.chevronRight({ class: 'size-4' }, h)],
            },
            h,
          ),
          h.span(
            [h.Class('text-sm font-medium')],
            [
              `${FA_MONTH_NAMES[model.jalaliViewMonth - 1] ?? ''} ${faDigits(model.jalaliViewYear)}`,
            ],
          ),
          Button.button(
            {
              variant: 'ghost',
              size: 'icon',
              ariaLabel: 'Next month',
              onClick: Message.PressedJalaliNextMonth(),
              children: [Icon.chevronLeft({ class: 'size-4' }, h)],
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('mt-2 grid grid-cols-7 gap-0')],
        [
          ...FA_DAY_NAMES.map(dayName =>
            h.span(
              [
                h.Class(
                  'flex h-8 w-8 items-center justify-center text-[0.8rem] font-normal text-muted-foreground',
                ),
              ],
              [dayName],
            ),
          ),
          ...cells.map(cell => jalaliDayButton(cell, model, h)),
        ],
      ),
    ],
  )
}

const bodyView = (
  fixture: CalendarFixture,
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  if (fixture.layout === 'jalali') return jalaliView(model, h)
  if (fixture.layout === 'presets')
    return Card.card(
      {
        class: 'mx-auto w-fit max-w-[300px]',
        size: 'sm',
        children: [
          Card.cardContent(
            {
              children: [calendarView(fixture, model, h)],
            },
            h,
          ),
          Card.cardFooter(
            {
              class: 'flex flex-wrap gap-2 border-t',
              children: PRESETS.map(preset =>
                Button.button(
                  {
                    variant: 'outline',
                    size: 'sm',
                    class: 'flex-1',
                    onClick: Message.ClickedPreset({ days: preset.days }),
                    children: [preset.label],
                  },
                  h,
                ),
              ),
            },
            h,
          ),
        ],
      },
      h,
    )
  if (fixture.layout === 'time')
    return Card.card(
      {
        class: 'mx-auto w-fit',
        size: 'sm',
        children: [
          Card.cardContent({ children: [calendarView(fixture, model, h)] }, h),
          Card.cardFooter(
            {
              class: 'border-t bg-card',
              children: [
                Field.fieldGroup(
                  {
                    children: [
                      timeFieldView('start', model, h),
                      timeFieldView('end', model, h),
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
  const calendar = calendarView(fixture, model, h)
  if (fixture.card === true)
    return Card.card(
      {
        class: 'mx-auto w-fit p-0',
        children: [Card.cardContent({ children: [calendar] }, h)],
      },
      h,
    )
  if (fixture.bordered === true)
    return h.div([h.Class('rounded-lg border w-fit')], [calendar])
  return calendar
}

export const calendarTailwindPreviewProgram = definePreviewProgram<
  Model,
  Message
>({
  Model,
  Message,
  init: index => {
    const fixture = fixtureOf(index)
    const initialDate = { year: 2026, month: 7, day: 18 }
    return {
      _docsPage: 'calendar',
      calendar: Calendar.init({
        id: `docs-calendar-${String(index)}`,
        today: Calendar.dateInTimeZone(
          new Date('2026-07-28T12:00:00Z'),
          fixture.localized === true ? 'Europe/Berlin' : 'UTC',
        ),
        initialViewDate: initialDate,
        ...(fixture.localized === true ? { locale: germanCalendarLocale } : {}),
        ...(fixture.booked === true ? { disabledDates: BOOKED_DATES } : {}),
      }),
      selectedDate: Option.some(initialDate),
      rangeStart: { year: 2026, month: 7, day: 14 },
      rangeEnd: { year: 2026, month: 7, day: 20 },
      startTime: '10:30:00',
      endTime: '12:30:00',
      jalaliViewYear: 1404,
      jalaliViewMonth: 3,
      jalaliDay: Option.some({ year: 1404, month: 3, day: 22 }),
      jalaliToday: toJalaali({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
      }),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotCalendarPreviewMessage': {
        const {
          model: calendar,
          commands: calendarCommands,
          outMessage,
        } = Calendar.update(model.calendar, message.message)
        const output = Option.fromNullishOr(outMessage)
        return {
          model: {
            ...model,
            calendar,
            selectedDate: Option.match(output, {
              onNone: () => model.selectedDate,
              onSome: value =>
                value._tag === 'SelectedDate'
                  ? Option.some(value.date)
                  : model.selectedDate,
            }),
          },
          commands: Command.mapMessages(calendarCommands ?? [], next =>
            Message['GotCalendarPreviewMessage']({ message: next }),
          ),
        }
      }
      case 'ClickedPreset': {
        const date = addDays(TODAY, message.days)
        return {
          model: {
            ...model,
            calendar: Calendar.focusDate(model.calendar, date),
            selectedDate: Option.some(date),
          },
        }
      }
      case 'ChangedStartTime':
        return { model: { ...model, startTime: message.value } }
      case 'ChangedEndTime':
        return { model: { ...model, endTime: message.value } }
      case 'ClickedJalaliDay':
        return {
          model: { ...model, jalaliDay: Option.some(message.date) },
        }
      case 'PressedJalaliPreviousMonth':
        return {
          model: {
            ...model,
            jalaliViewYear:
              model.jalaliViewMonth === 1
                ? model.jalaliViewYear - 1
                : model.jalaliViewYear,
            jalaliViewMonth:
              model.jalaliViewMonth === 1 ? 12 : model.jalaliViewMonth - 1,
          },
        }
      case 'PressedJalaliNextMonth':
        return {
          model: {
            ...model,
            jalaliViewYear:
              model.jalaliViewMonth === 12
                ? model.jalaliViewYear + 1
                : model.jalaliViewYear,
            jalaliViewMonth:
              model.jalaliViewMonth === 12 ? 1 : model.jalaliViewMonth + 1,
          },
        }
    }
  },
  view: (index, model, h) => bodyView(fixtureOf(index), model, h),
})
