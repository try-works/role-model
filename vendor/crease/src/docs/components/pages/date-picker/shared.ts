import { DatePart, type LocaleConfig } from 'foldkit/calendar'
import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type DatePickerFixtureKind =
  | 'demo'
  | 'basic'
  | 'range'
  | 'dob'
  | 'input'
  | 'time'
  | 'natural'
  | 'rtl'

export type DatePickerFixture = Readonly<{
  title: string
  kind: DatePickerFixtureKind
  heroOnly?: boolean
}>

export const datePickerFixtures: ReadonlyArray<DatePickerFixture> = [
  { title: 'Pick a date', kind: 'demo', heroOnly: true },
  { title: 'Basic', kind: 'basic' },
  { title: 'Range Picker', kind: 'range' },
  { title: 'Date of Birth', kind: 'dob' },
  { title: 'Input', kind: 'input' },
  { title: 'Time Picker', kind: 'time' },
  { title: 'Natural Language Picker', kind: 'natural' },
  { title: 'RTL', kind: 'rtl' },
]

export const arabicCalendarLocale: LocaleConfig = {
  firstDayOfWeek: 'Saturday',
  monthNames: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
  shortMonthNames: [
    'ينا',
    'فبر',
    'مار',
    'أبر',
    'ماي',
    'يون',
    'يول',
    'أغس',
    'سبت',
    'أكت',
    'نوف',
    'ديس',
  ],
  dayNames: [
    'الأحد',
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ],
  shortDayNames: ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  longFormat: [
    DatePart.DayName(),
    DatePart.LiteralText({ text: '، ' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  shortFormat: [
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.ShortMonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  ariaLabelFormat: [
    DatePart.DayName(),
    DatePart.LiteralText({ text: '، ' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  monthYearFormat: [
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
}

/* Helpers emitted into generated sources: English display formatting plus the
   small parsers the Input and Natural Language examples use. */
const FORMAT_HELPERS = `const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatDisplay = (date: FoldkitCalendar.CalendarDate): string =>
  MONTH_NAMES[date.month - 1] + ' ' + String(date.day).padStart(2, '0') + ', ' + String(date.year)
const formatCompact = (date: FoldkitCalendar.CalendarDate): string =>
  SHORT_MONTH_NAMES[date.month - 1] + ' ' + String(date.day).padStart(2, '0') + ', ' + String(date.year)
const formatUs = (date: FoldkitCalendar.CalendarDate): string =>
  String(date.month) + '/' + String(date.day) + '/' + String(date.year)`

const PARSE_INPUT = `const parseInputDate = (value: string): Option.Option<FoldkitCalendar.CalendarDate> => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? Option.none()
    : Option.some({ year: parsed.getFullYear(), month: parsed.getMonth() + 1, day: parsed.getDate() })
}`

const PARSE_NATURAL = `const parseNaturalDate = (value: string, today: FoldkitCalendar.CalendarDate): Option.Option<FoldkitCalendar.CalendarDate> => {
  const parsed = parseDate(value, new Date(Date.UTC(today.year, today.month - 1, today.day)))
  return parsed === null
    ? Option.none()
    : Option.some(FoldkitCalendar.fromDateInZone(parsed, 'UTC'))
}`

/* Emits for the single-date kinds (demo, basic, dob, time, rtl) — one
   DatePicker model driven by the parent-owned selectedDate. */
const pickerSource = (
  fixture: DatePickerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const dir = isStyleX ? 'stylex' : 'ui'
  const kind = fixture.kind
  const isRtl = kind === 'rtl'
  const isTime = kind === 'time'
  const withChevron = kind === 'demo' || isTime || isRtl
  const needsField = kind !== 'demo'
  const labelText =
    kind === 'basic'
      ? 'Date'
      : kind === 'dob'
        ? 'Date of birth'
        : isTime
          ? 'Date'
          : undefined
  const placeholder =
    kind === 'demo' || kind === 'basic'
      ? 'Pick a date'
      : isRtl
        ? 'اختر تاريخًا'
        : 'Select date'
  const formatFn = kind === 'dob' ? 'formatUs' : 'formatDisplay'

  const triggerContentEmit =
    kind === 'basic' || kind === 'dob'
      ? `      triggerContent: maybeDate => Option.match(maybeDate, {
        onNone: () => h.span([], ['${placeholder}']),
        onSome: date => h.span([], [${formatFn}(date)]),
      }),`
      : `      triggerContent: maybeDate => h.span([h.Class(${isStyleX ? 'className(styles.triggerRow)' : `'flex w-full items-center justify-between'`})], [
        Option.match(maybeDate, {
          onNone: () => h.span([], ['${placeholder}']),
          onSome: date => h.span([], [${formatFn}(date)]),
        }),
        Icon.chevronDown({ class: ${isStyleX ? 'className(styles.chevron)' : `'size-4 opacity-50'`} }, h),
      ]),`

  const datePickerCall = `DatePicker.datePicker({
      model: model.datePicker,
      maybeSelectedDate: model.selectedDate,
      toParentMessage: message => GotDatePickerMessage({ message }),
      name: 'date',
      ariaLabel: '${placeholder}',
${triggerContentEmit}
      ${isStyleX ? `triggerLayoutStyle: styles.${kind === 'demo' ? 'demoTrigger' : 'trigger'}` : `triggerClass: 'w-44 justify-start font-normal'`},${
        isRtl
          ? `
      direction: 'rtl',`
          : ''
      }
    }, h)`

  const pickerBlock = needsField
    ? `Field.field({ children: [
      Field.fieldLabel({ for: 'date-picker', children: ['${labelText}'] }, h),
      ${isStyleX ? `h.div([h.Class(className(styles.fieldWrap))], [${datePickerCall}])` : `h.div([h.Class('mx-auto w-44')], [${datePickerCall}])`},
    ] }, h)`
    : `h.div([], [${datePickerCall}])`

  const view = `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Date Picker — ${fixture.title}',
  body: h.main([], [
    ${
      isTime
        ? `${isStyleX ? `h.div([h.Class(className(styles.timeRow))], [` : `Field.fieldGroup({ class: 'mx-auto w-full max-w-sm flex-row flex-wrap items-start', children: [`}
      Field.field({ ${isStyleX ? `layoutStyle: layoutStyle({ width: "11rem" })` : `class: 'w-44'`}, children: [
        Field.fieldLabel({ for: DatePicker.triggerId(model.datePicker.id), children: ['Date'] }, h),
        ${datePickerCall},
      ] }, h),
      Field.field({ ${isStyleX ? `layoutStyle: layoutStyle({ width: "9rem" })` : `class: 'w-36'`}, children: [
        Field.fieldLabel({ for: TimeInput.pickerButtonId(model.timeInput), children: ['Time'] }, h),
        TimeInput.timeInput({
          model: model.timeInput,
          toParentMessage: message => GotTimeInputMessage({ message }),
          id: 'time-picker-optional', label: 'Time', isLabelHidden: true,
          presentation: 'select', hourFormat: '24h', name: 'time',
          value: model.timeValue,
        }, h),
      ] }, h),
    ${isStyleX ? '])' : '] }, h)'}`
        : pickerBlock
    },
  ]),
})`

  return foldkitApplication({
    title: `Date Picker — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'

`
    : ''
}import * as DatePicker from '@/${dir}/date-picker'${
      needsField
        ? `
import * as Field from '@/${dir}/field'`
        : ''
    }${
      isTime
        ? `
import * as TimeInput from '@/${dir}/time-input'`
        : ''
    }${
      withChevron
        ? `
import * as Icon from '@/lib/icon'`
        : ''
    }${
      isRtl
        ? `

const arabicCalendarLocale: FoldkitCalendar.LocaleConfig = ${JSON.stringify(arabicCalendarLocale)}`
        : ''
    }${
      isStyleX
        ? `

const styles = stylex.create({
  triggerRow: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { height: '1rem', width: '1rem', opacity: 0.5 },
  trigger: { width: '11rem' },
  demoTrigger: { width: '13.25rem' },
  fieldWrap: { width: '11rem', marginInline: 'auto' },${
    isTime
      ? `
  timeField: { width: '9rem' },
  dateField: { width: '11rem' },
  timeRow: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.5rem', marginInline: 'auto', maxWidth: '22rem' },`
      : ''
  }
})`
        : ''
    }

${FORMAT_HELPERS}`,
    model: `export const Model = S.Struct({
  datePicker: DatePicker.Model,
  selectedDate: S.Option(FoldkitCalendar.CalendarDate),${
    isTime
      ? `
  timeValue: S.String,` +
        `
  timeInput: TimeInput.Model,`
      : ''
  }
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotDatePickerMessage = taggedStruct('GotDatePickerMessage', { message: DatePicker.Message });${
      isTime
        ? `
export const GotTimeInputMessage = taggedStruct('GotTimeInputMessage', { message: TimeInput.Message });`
        : ''
    }
export const Message = S.Union([GotDatePickerMessage${isTime ? ', GotTimeInputMessage' : ''}])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    datePicker: DatePicker.init({ id: 'docs-date-picker', today: FoldkitCalendar.fromDateInZone(new Date(), 'UTC'), isAnimated: true${isRtl ? ', locale: arabicCalendarLocale' : ''} }),
    selectedDate: Option.none(),${
      isTime
        ? `
    timeValue: '10:30',
    timeInput: TimeInput.init({ id: 'docs-date-picker-time' }),`
        : ''
    }
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDatePickerMessage': {
      const next = ${isRtl ? 'DatePicker.updateForRtl' : 'DatePicker.update'}(model.datePicker, message.message)
      const maybeOut = Option.fromNullishOr(next.outMessage)
      const selectedDate = Option.match(maybeOut, {
        onNone: () => model.selectedDate,
        onSome: out => out._tag === 'SelectedDate' ? Option.some(out.date) : out._tag === 'ClearedDate' ? Option.none() : model.selectedDate,
      })
      return { model: { ...model, datePicker: next.model, selectedDate }, commands: Command.mapMessages(next.commands ?? [], child => GotDatePickerMessage({ message: child })) }
    }${
      isTime
        ? `
    case 'GotTimeInputMessage': {
      const next = TimeInput.update(model.timeInput, message.message)
      return {
        model: { ...model, timeInput: next.model, timeValue: next.outMessage === undefined ? model.timeValue : Option.getOrElse(next.outMessage.value, () => '') },
        commands: Command.mapMessages(next.commands ?? [], child => GotTimeInputMessage({ message: child })),
      }
    }`
        : ''
    }
  }
}`,
    view,
  })
}

/* Range: parent-owned endpoints rendered through the Calendar's range option,
   opened from a Popover trigger. */
const rangeSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const dir = isStyleX ? 'stylex' : 'ui'
  return foldkitApplication({
    title: 'Date Picker — Range Picker',
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'

`
    : ''
}import * as Calendar from '@/${dir}/calendar'
import * as Field from '@/${dir}/field'
import * as Icon from '@/lib/icon'
import * as Popover from '@/${dir}/popover'

// @/${dir}/date-picker is single-date only — range selection composes
// Popover + Calendar with the endpoints owned by the app model.

${FORMAT_HELPERS}${
      isStyleX
        ? `

const styles = stylex.create({
  triggerRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  icon: { height: '1rem', width: '1rem' },
  rangeTrigger: { width: '15rem' },
  field: { width: '15rem', marginInline: 'auto' },
})`
        : ''
    }`,
    model: `export const Model = S.Struct({
  calendar: Calendar.Model,
  popover: Popover.Model,
  rangeStart: S.Option(FoldkitCalendar.CalendarDate),
  rangeEnd: S.Option(FoldkitCalendar.CalendarDate),
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotCalendarMessage = taggedStruct('GotCalendarMessage', { message: Calendar.Message });
export const GotPopoverMessage = taggedStruct('GotPopoverMessage', { message: Popover.Message });
export const Message = S.Union([GotCalendarMessage, GotPopoverMessage])
export type Message = typeof Message.Type`,
    init: `const initialStart = { year: 2026, month: 1, day: 20 }
const initialEnd = { year: 2026, month: 2, day: 9 }
export const init = (): Update.Return<Model, Message> => ({
  model: {
    calendar: Calendar.init({ id: 'docs-range-calendar', today: FoldkitCalendar.fromDateInZone(new Date(), 'UTC'), initialViewDate: initialStart }),
    popover: Popover.init({ id: 'docs-range-popover' }),
    rangeStart: Option.some(initialStart),
    rangeEnd: Option.some(initialEnd),
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotCalendarMessage': {
      const next = Calendar.update(model.calendar, message.message)
      const out = Option.fromNullishOr(next.outMessage)
      const maybeDate = Option.match(out, {
        onNone: () => Option.none(),
        onSome: value => value._tag === 'SelectedDate' ? Option.some(value.date) : Option.none(),
      })
      const range = Option.match(maybeDate, {
        onNone: () => ({ rangeStart: model.rangeStart, rangeEnd: model.rangeEnd }),
        onSome: date =>
          Option.match(model.rangeStart, {
            onNone: () => ({ rangeStart: Option.some(date), rangeEnd: Option.none() }),
            onSome: start =>
              Option.match(model.rangeEnd, {
                onNone: () =>
                  FoldkitCalendar.isBefore(date, start)
                    ? { rangeStart: Option.some(date), rangeEnd: Option.some(start) }
                    : { rangeStart: Option.some(start), rangeEnd: Option.some(date) },
                onSome: () => ({ rangeStart: Option.some(date), rangeEnd: Option.none() }),
              }),
          }),
      })
      return {
        model: { ...model, calendar: next.model, ...range },
        commands: Command.mapMessages(next.commands ?? [], child => GotCalendarMessage({ message: child })),
      }
    }
    case 'GotPopoverMessage': {
      const next = Popover.update(model.popover, message.message)
      return { model: { ...model, popover: next.model }, commands: Command.mapMessages(next.commands ?? [], child => GotPopoverMessage({ message: child })) }
    }
  }
}`,
    view: `const rangeText = (model: Model): string =>
  Option.match(model.rangeStart, {
    onNone: () => 'Pick a date',
    onSome: start =>
      Option.match(model.rangeEnd, {
        onNone: () => formatCompact(start),
        onSome: end => formatCompact(start) + ' - ' + formatCompact(end),
      }),
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Date Picker — Range Picker',
  body: h.main([], [
    Field.field({ ${isStyleX ? `layoutStyle: layoutStyle({ width: "15rem", marginInline: "auto" })` : `class: 'mx-auto w-60'`}, children: [
      Field.fieldLabel({ for: 'date-picker-range', children: ['Date Picker Range'] }, h),
      Popover.popover({
        model: model.popover,
        toParentMessage: message => GotPopoverMessage({ message }),
        align: 'start',
        trigger: h.span([h.Class(${isStyleX ? `className(styles.triggerRow)` : `'flex items-center gap-2'`})], [
          Icon.calendarIcon({ class: ${isStyleX ? `className(styles.icon)` : `'size-4'`} }, h),
          rangeText(model),
        ]),
        ${isStyleX ? `triggerLayoutStyle: styles.rangeTrigger` : `triggerClass: 'inline-flex h-8 w-60 items-center justify-start gap-2 whitespace-nowrap rounded-md border border-input bg-background px-2.5 text-sm font-normal shadow-xs'`},
        content: (() => {
          const range = Option.match(model.rangeStart, {
            onNone: () => Option.none(),
            onSome: start =>
              Option.match(model.rangeEnd, {
                onNone: () => Option.some({ start, end: start }),
                onSome: end => Option.some({ start, end }),
              }),
          })
          return Calendar.calendar({
            model: model.calendar,
            maybeSelectedDate: Option.none(),
            toParentMessage: message => GotCalendarMessage({ message }),
            ...(Option.isSome(range) ? { range: range.value } : {}),
          }, h)
        })(),
        ${isStyleX ? '' : `class: 'w-auto p-0',`}
      }, h),
    ] }, h),
  ]),
})`,
  })
}

/* Input + Natural Language: an InputGroup whose trailing icon button opens a
   calendar Popover; typing parses free text into the selected date. */
/* Input + Natural Language: an InputGroup whose trailing icon button is a
   DatePicker trigger; typing parses free text into the selected date. */
const inputLikeSource = (
  fixture: DatePickerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const dir = isStyleX ? 'stylex' : 'ui'
  const isNatural = fixture.kind === 'natural'
  const label = isNatural ? 'Schedule Date' : 'Subscription Date'
  const inputId = isNatural ? 'date-optional' : 'date-required'
  const placeholder = isNatural ? 'Tomorrow or next week' : 'June 01, 2025'
  const parseFn = isNatural
    ? `parseNaturalDate(message.value, today)`
    : 'parseInputDate(message.value)'

  return foldkitApplication({
    title: `Date Picker — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'

`
    : ''
}import * as DatePicker from '@/${dir}/date-picker'
import * as Field from '@/${dir}/field'
import * as Icon from '@/lib/icon'
import * as InputGroup from '@/${dir}/input-group'${
      isNatural
        ? `
import { parseDate } from 'chrono-node'`
        : ''
    }

${FORMAT_HELPERS}

${isNatural ? PARSE_NATURAL : PARSE_INPUT}${
      isStyleX
        ? `

const styles = stylex.create({
  field: { width: ${isNatural ? `'20rem'` : `'12rem'`}, marginInline: 'auto' },
  triggerRow: { display: 'flex', alignItems: 'center' },
  trigger: { height: '1.25rem', width: '1.25rem' },
  icon: { height: '1rem', width: '1rem' },
  srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)' },
})`
        : ''
    }`,
    model: `export const Model = S.Struct({
  datePicker: DatePicker.Model,
  selectedDate: S.Option(FoldkitCalendar.CalendarDate),
  inputValue: S.String,
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotDatePickerMessage = taggedStruct('GotDatePickerMessage', { message: DatePicker.Message });
export const ChangedInput = taggedStruct('ChangedInput', { value: S.String });
export const PressedKeyInInput = taggedStruct('PressedKeyInInput', { key: S.String });
export const Message = S.Union([GotDatePickerMessage, ChangedInput, PressedKeyInInput])
export type Message = typeof Message.Type`,
    init: `const today = FoldkitCalendar.fromDateInZone(new Date(), 'UTC')
const initialDate = ${isNatural ? 'FoldkitCalendar.addDays(today, 2)' : '{ year: 2025, month: 6, day: 1 }'}
export const init = (): Update.Return<Model, Message> => ({
  model: {
    datePicker: DatePicker.init({ id: 'docs-date-picker', today, initialViewDate: initialDate, isAnimated: true }),
    selectedDate: Option.some(initialDate),
    inputValue: ${isNatural ? `'In 2 days'` : 'formatDisplay(initialDate)'},
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDatePickerMessage': {
      const next = DatePicker.update(model.datePicker, message.message)
      const out = Option.fromNullishOr(next.outMessage)
      const maybeDate = Option.match(out, {
        onNone: () => Option.none(),
        onSome: value => value._tag === 'SelectedDate' ? Option.some(value.date) : Option.none(),
      })
      return {
        model: {
          ...model,
          datePicker: next.model,
          selectedDate: Option.match(maybeDate, { onNone: () => model.selectedDate, onSome: date => Option.some(date) }),
          inputValue: Option.match(maybeDate, { onNone: () => model.inputValue, onSome: formatDisplay }),
        },
        commands: Command.mapMessages(next.commands ?? [], child => GotDatePickerMessage({ message: child })),
      }
    }
    case 'ChangedInput': {
      const parsed = ${parseFn}
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
      return { model: { ...model, datePicker: next.model }, commands: Command.mapMessages(next.commands ?? [], child => GotDatePickerMessage({ message: child })) }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Date Picker — ${fixture.title}',
  body: h.main([], [
    Field.field({ ${isStyleX ? `layoutStyle: layoutStyle({ width: "15rem", marginInline: "auto" })` : `class: 'mx-auto ${isNatural ? 'max-w-xs' : 'w-48'}'`}, children: [
      Field.fieldLabel({ for: '${inputId}', children: ['${label}'] }, h),
      InputGroup.inputGroup({ children: [
        InputGroup.inputGroupInput({
          id: '${inputId}',
          value: model.inputValue,
          onInput: value => ChangedInput({ value }),
          onKeyDown: key => PressedKeyInInput({ key }),
          placeholder: '${placeholder}',
        }, h),
        InputGroup.inputGroupAddon({ align: 'inline-end', children: [
          DatePicker.datePicker({
            model: model.datePicker,
            maybeSelectedDate: model.selectedDate,
            toParentMessage: message => GotDatePickerMessage({ message }),
            ariaLabel: 'Select date',
            triggerContent: () => h.span([h.Class(${isStyleX ? `className(styles.triggerRow)` : `'flex items-center'`})], [
              Icon.calendarIcon({ class: ${isStyleX ? `className(styles.icon)` : `'size-4'`} }, h),
              h.span([h.Class(${isStyleX ? 'className(styles.srOnly)' : "'sr-only'"})], ['Select date']),
            ]),
            ${isStyleX ? `triggerLayoutStyle: styles.trigger` : `triggerClass: 'inline-flex h-5 w-5 items-center justify-center rounded-sm'`},
          }, h),
        ] }, h),
      ] }, h),
    ] }, h),
  ]),
})`,
  })
}

const sourceFor = (
  fixture: DatePickerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  fixture.kind === 'range'
    ? rangeSource(renderer)
    : fixture.kind === 'input' || fixture.kind === 'natural'
      ? inputLikeSource(fixture, renderer)
      : pickerSource(fixture, renderer)

const datePickerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  datePickerFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: sourceFor(fixture, renderer),
  }))

export const datePickerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, datePickerExamplesFor(renderer))
