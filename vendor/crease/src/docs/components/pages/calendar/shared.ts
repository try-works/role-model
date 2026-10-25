import { DatePart, type LocaleConfig } from 'foldkit/calendar'
import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export const germanCalendarLocale: LocaleConfig = {
  firstDayOfWeek: 'Monday',
  monthNames: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  shortMonthNames: [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez',
  ],
  dayNames: [
    'Sonntag',
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
  ],
  shortDayNames: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  longFormat: [
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '. ' }),
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  shortFormat: [
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '. ' }),
    DatePart.ShortMonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  ariaLabelFormat: [
    DatePart.DayName(),
    DatePart.LiteralText({ text: ', ' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '. ' }),
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

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In a week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
] as const

const BOOKED_DATES = [3, 12, 13, 14, 15] as const

export type CalendarFixture = Readonly<{
  title: string
  description: string
  heroOnly?: boolean
  layout: 'single' | 'range' | 'presets' | 'time' | 'jalali'
  bordered?: boolean
  card?: boolean
  weekNumbers?: boolean
  direction?: 'rtl'
  roomy?: boolean
  sectionId?: string
  booked?: boolean
  localized?: boolean
}>

export const calendarFixtures: Readonly<Array<CalendarFixture>> = [
  {
    title: 'Demo',
    description:
      'A bordered calendar with the selected date owned by the parent.',
    heroOnly: true,
    layout: 'single',
    bordered: true,
  },
  {
    title: 'Persian / Hijri / Jalali Calendar',
    description:
      'A Persian calendar — Jalali month grid via the shared conversion helpers.',
    layout: 'jalali',
    sectionId: 'persian-hijri-jalali-calendar',
  },
  {
    title: 'Basic',
    description: 'A basic calendar component with a rounded border.',
    layout: 'single',
    bordered: true,
  },
  {
    title: 'Range Calendar',
    description:
      'The parent owns both range endpoints; Calendar decorates the start, middle, and end cells. Interactive drag-to-range is not a foldkit calendar mode.',
    layout: 'range',
    bordered: true,
  },
  {
    title: 'Month and Year Selector',
    description:
      'Click the month-year heading to drill into the month grid, then the year grid — the foldkit equivalent of upstream caption dropdowns.',
    layout: 'single',
    bordered: true,
  },
  {
    title: 'Presets',
    description:
      'Preset buttons select relative dates and focus the calendar on the result.',
    layout: 'presets',
    card: true,
  },
  {
    title: 'Date and Time Picker',
    description: 'A calendar with start and end time fields.',
    layout: 'time',
    card: true,
  },
  {
    title: 'Booked dates',
    description:
      'Unavailable dates are disabled via init config and cannot be selected.',
    layout: 'single',
    booked: true,
  },
  {
    title: 'Custom Cell Size',
    description:
      'Customize cell size via the cell-size token — roomier cells, same model.',
    layout: 'single',
    roomy: true,
    bordered: true,
  },
  {
    title: 'Week Numbers',
    description: 'Show ISO week numbers in a leading column.',
    layout: 'single',
    weekNumbers: true,
    card: true,
  },
  {
    title: 'RTL',
    description: 'Right-to-left direction mirrors navigation and labels.',
    layout: 'single',
    direction: 'rtl',
    localized: true,
  },
]

const bookedDatesSource = `
    disabledDates: [${BOOKED_DATES.map(
      day => `{ year: 2026, month: 7, day: ${day} }`,
    ).join(', ')}],`

const calendarPropsSource = (
  f: CalendarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  const parts: Array<string> = [
    `model: model.calendar`,
    `maybeSelectedDate: ${f.layout === 'range' ? 'Option.none()' : 'model.selectedDate'}`,
    `toParentMessage: message =>
              Message['GotCalendarMessage']({ message })`,
  ]
  if (f.layout === 'range')
    parts.push(`range: { start: model.rangeStart, end: model.rangeEnd }`)
  if (f.weekNumbers === true) parts.push('weekNumbers: true')
  if (f.direction === 'rtl') parts.push(`direction: 'rtl'`)
  if (f.layout === 'presets')
    parts.push(
      isSx
        ? `density: 'flush',\n            size: 'comfortable'`
        : `class: 'p-0 [--cell-size:--spacing(9.5)]'`,
    )
  if (f.layout === 'time')
    parts.push(isSx ? `density: 'flush'` : `class: 'p-0'`)
  if (f.roomy === true)
    parts.push(
      isSx ? `size: 'comfortable'` : `class: '[--cell-size:--spacing(10)]'`,
    )
  return parts.join(',\n            ')
}

const calendarViewSource = (
  f: CalendarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => `Calendar.calendar({
            ${calendarPropsSource(f, renderer)},
          }, h)`

const borderedSource = (
  f: CalendarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  inner: string,
): string => {
  const wrapped = `h.div(
          [h.Class(${renderer !== 'tailwind' ? 'className(styles.bordered)' : `'rounded-lg border w-fit'`})],
          [${inner}],
        )`
  return wrapped
}

const presetsSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  return `Card.card({
          ${isSx ? 'layoutStyle: layoutStyle({ marginInline: "auto", maxWidth: "18.75rem", width: "fit-content" }),' : `class: 'mx-auto w-fit max-w-[300px]',`}
          size: 'sm',
          children: [
            Card.cardContent({
              children: [
                ${calendarViewSource(
                  { title: '', description: '', layout: 'presets' },
                  renderer,
                )},
              ],
            }, h),
            Card.cardFooter({
              children: PRESETS.map(preset =>
                Button.button({
                  variant: 'outline',
                  size: 'sm',
                  onClick: Message.ClickedPreset({ days: preset.days }),
                  ${isSx ? 'layoutStyle: layoutStyle({ flexGrow: "1" }),' : `class: 'flex-1',`}
                  children: [preset.label],
                }, h),
              ),
            }, h),
          ],
        }, h)`
}

const timeFieldSource = (
  field: 'start' | 'end',
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const label = field === 'start' ? 'Start Time' : 'End Time'
  const id = field === 'start' ? 'time-from' : 'time-to'
  const msg = field === 'start' ? 'ChangedStartTime' : 'ChangedEndTime'
  const modelField = field === 'start' ? 'startTime' : 'endTime'
  return `Field.field({
                  children: [
                    Field.fieldLabel({ for: '${id}', children: ['${label}'] }, h),
                    Field.fieldContent({
                      children: [
                        InputGroup.inputGroup({
                          children: [
                            InputGroup.inputGroupInput({
                              id: '${id}',
                              type: 'time',
                              step: '1',
                              value: model.${modelField},
                              onInput: value =>
                                Message['${msg}']({ value }),
                              ariaLabel: '${label}',
                              ${
                                renderer !== 'tailwind'
                                  ? ''
                                  : `class: 'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',`
                              }
                            }, h),
                            InputGroup.inputGroupAddon({
                              children: [
                                Icon.icon('clock', ${renderer !== 'tailwind' ? '{ class: className(styles.icon) }' : `{ class: 'size-4 text-muted-foreground' }`}, h),
                              ],
                            }, h),
                          ],
                        }, h),
                      ],
                    }, h),
                  ],
                }, h)`
}

const timePickerSource = (
  f: CalendarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  return `Card.card({
          ${isSx ? 'layoutStyle: layoutStyle({ marginInline: "auto", maxWidth: "18.75rem", width: "fit-content" }),' : `class: 'mx-auto w-fit',`}
          size: 'sm',
          children: [${
            isSx
              ? `\n            h.style(
              [],
              [
                "input[type='time'] { appearance: none; }\\n" +
                  "input[type='time']::-webkit-calendar-picker-indicator { display: none; }",
              ],
            ),`
              : ''
          }
            Card.cardContent({
              children: [
                ${calendarViewSource(f, renderer)},
              ],
            }, h),
            Card.cardFooter({
              children: [
                Field.fieldGroup({
                  children: [
                    ${timeFieldSource('start', renderer)},
                    ${timeFieldSource('end', renderer)},
                  ],
                }, h),
              ],
            }, h),
          ],
        }, h)`
}

const viewBodySource = (
  fixture: CalendarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  if (fixture.layout === 'presets') return presetsSource(renderer)
  if (fixture.layout === 'time') return timePickerSource(fixture, renderer)
  const calendar = calendarViewSource(fixture, renderer)
  if (fixture.card === true) {
    const isSx = renderer !== 'tailwind'
    return `Card.card({
          ${isSx ? 'layoutStyle: layoutStyle({ marginInline: "auto", maxWidth: "18.75rem", width: "fit-content" }),' : `class: 'mx-auto w-fit p-0',`}
          children: [
            Card.cardContent({
              children: [${calendar}],
            }, h),
          ],
        }, h)`
  }
  return fixture.bordered === true
    ? borderedSource(fixture, renderer, calendar)
    : calendar
}

type Needs = Readonly<{
  range: boolean
  presets: boolean
  time: boolean
  booked: boolean
  card: boolean
  localized: boolean
}>

const needsFor = (f: CalendarFixture): Needs => ({
  range: f.layout === 'range',
  presets: f.layout === 'presets',
  time: f.layout === 'time',
  booked: f.booked === true,
  card: f.card === true,
  localized: f.localized === true,
})

const componentImports = (
  needs: Needs,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const root = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const imports: Array<string> = []
  if (needs.card) imports.push(`import * as Card from '@/${root}/card'`)
  if (needs.presets) imports.push(`import * as Button from '@/${root}/button'`)
  if (needs.time) {
    imports.push(`import * as Field from '@/${root}/field'`)
    imports.push(`import * as InputGroup from '@/${root}/input-group'`)
    imports.push(`import * as Icon from '@/lib/icon'`)
  }
  if (renderer !== 'tailwind')
    imports.push(
      `import * as stylex from '@stylexjs/stylex'`,
      `import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'`,
    )
  return imports.join('\n')
}

const stylesSource = (f: CalendarFixture): string => {
  const parts: Array<string> = []
  if (f.card === true)
    parts.push(
      `  cardFit: { marginInline: 'auto', maxWidth: '18.75rem', width: 'fit-content' },`,
    )
  if (f.layout === 'presets') parts.push(`  presetButton: { flexGrow: '1' },`)
  if (f.layout === 'time')
    parts.push(`  icon: { height: '1rem', width: '1rem' },`)
  if (f.bordered === true)
    parts.push(
      `  bordered: { borderColor: 'var(--border)', borderRadius: '0.5rem', borderStyle: 'solid', borderWidth: 1, width: 'fit-content' },`,
    )
  if (parts.length === 0) return ''
  return `
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${parts.join('\n')}
});`
}

const jalaliSource = (
  f: CalendarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  const dayButton = isSx
    ? `const jalaliDayButton = (
  cell: JalaliCell,
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  const selected =
    Option.isSome(model.selectedDay) && isSameDay(model.selectedDay.value, cell)
  const today = isSameDay(model.today, cell)
  return h.button(
    [
      h.Type('button'),
      h.Class(
        cx(
          styles.day,
          cell.inMonth ? styles.dayInMonth : styles.dayOutside,
          today && styles.dayToday,
          selected && styles.daySelected,
        ),
      ),
      ...(selected ? [h.AriaCurrent('date')] : []),
      h.OnClick(
        Message.ClickedDay({
          date: { year: cell.year, month: cell.month, day: cell.day },
        }),
      ),
    ],
    [faDigits(cell.day)],
  )
}`
    : `const jalaliDayButton = (
  cell: JalaliCell,
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  const selected =
    Option.isSome(model.selectedDay) && isSameDay(model.selectedDay.value, cell)
  const today = isSameDay(model.today, cell)
  return h.button(
    [
      h.Type('button'),
      h.Class(
        \`flex h-8 w-8 items-center justify-center rounded-md text-[0.8rem] transition-colors \${
          selected
            ? 'bg-primary text-primary-foreground'
            : today
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent'
        } \${cell.inMonth ? '' : 'text-muted-foreground opacity-50'}\`,
      ),
      ...(selected ? [h.AriaCurrent('date')] : []),
      h.OnClick(
        Message.ClickedDay({
          date: { year: cell.year, month: cell.month, day: cell.day },
        }),
      ),
    ],
    [faDigits(cell.day)],
  )
}`

  const dayNameCell = isSx
    ? `h.span([h.Class(cx(styles.dayName))], [dayName])`
    : `h.span(
              [
                h.Class(
                  'flex h-8 w-8 items-center justify-center text-[0.8rem] font-normal text-muted-foreground',
                ),
              ],
              [dayName],
            )`

  return foldkitApplication({
    title: `Calendar — ${f.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Button from '@/${isSx ? 'stylex' : 'ui'}/button'
import * as Icon from '@/lib/icon'
import {
  FA_DAY_NAMES,
  FA_MONTH_NAMES,
  faDigits,
  jalaliMonthCells,
  toJalaali,
  type JalaliCell,
  type JalaliDate,
} from '@/lib/jalali'

// @/${isSx ? 'stylex' : 'ui'}/calendar is Gregorian-only — the Jalali grid
// below implements the upstream Persian example via the conversion helpers.${
      isSx
        ? `
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cx = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  container: {
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: '0.75rem',
    width: 'fit-content',
  },
  header: { alignItems: 'center', display: 'flex', justifyContent: 'space-between' },
  title: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    marginTop: '0.5rem',
  },
  dayName: {
    alignItems: 'center',
    color: 'var(--muted-foreground)',
    display: 'flex',
    fontSize: '0.8rem',
    height: '2rem',
    justifyContent: 'center',
    width: '2rem',
  },
  day: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: '0.375rem',
    borderStyle: 'none',
    cursor: 'pointer',
    display: 'flex',
    fontSize: '0.8rem',
    height: '2rem',
    justifyContent: 'center',
    transitionProperty: 'background-color, color',
    transitionDuration: '150ms',
    width: '2rem',
  },
  dayInMonth: { color: 'var(--foreground)' },
  dayOutside: { color: 'var(--muted-foreground)', opacity: 0.5 },
  dayToday: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' },
  daySelected: {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
  },
  icon: { height: '1rem', width: '1rem' },
})`
        : ''
    }

const JalaliDay = S.Struct({
  year: S.Int,
  month: S.Int,
  day: S.Int,
})`,
    model: `export const Model = S.Struct({
  viewYear: S.Int,
  viewMonth: S.Int,
  selectedDay: S.Option(JalaliDay),
  today: JalaliDay,
})
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedDay: { date: JalaliDay },
  PressedPreviousMonth: {},
  PressedNextMonth: {},
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => {
  const now = new Date()
  return {
    model: {
      viewYear: 1404,
      viewMonth: 3,
      selectedDay: Option.some({ year: 1404, month: 3, day: 22 }),
      today: toJalaali({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      }),
    },
  }
}`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedDay':
      return { model: { ...model, selectedDay: Option.some(message.date) } }
    case 'PressedPreviousMonth':
      return {
        model: {
          ...model,
          viewYear:
            model.viewMonth === 1 ? model.viewYear - 1 : model.viewYear,
          viewMonth: model.viewMonth === 1 ? 12 : model.viewMonth - 1,
        },
      }
    case 'PressedNextMonth':
      return {
        model: {
          ...model,
          viewYear:
            model.viewMonth === 12 ? model.viewYear + 1 : model.viewYear,
          viewMonth: model.viewMonth === 12 ? 1 : model.viewMonth + 1,
        },
      }
  }
}`,
    view: `const isSameDay = (a: JalaliDate, b: JalaliDate): boolean =>
  a.year === b.year && a.month === b.month && a.day === b.day

${dayButton}

const jalaliView = (model: Model, h: HtmlBuilder<Message>) => {
  const cells = jalaliMonthCells(model.viewYear, model.viewMonth)
  return h.div(
    [h.Dir('rtl'), h.Class(${isSx ? 'cx(styles.container)' : `'rounded-lg border p-3 w-fit'`})],
    [
      h.div([h.Class(${isSx ? 'cx(styles.header)' : `'flex items-center justify-between'`})], [
        Button.button(
          {
            variant: 'ghost',
            size: 'icon',
            ariaLabel: 'Previous month',
            onClick: Message.PressedPreviousMonth(),
            children: [Icon.chevronRight({ class: ${isSx ? 'cx(styles.icon)' : `'size-4'`} }, h)],
          },
          h,
        ),
        h.span(
          [h.Class(${isSx ? 'cx(styles.title)' : `'text-sm font-medium'`})],
          [
            \`\${FA_MONTH_NAMES[model.viewMonth - 1] ?? ''} \${faDigits(model.viewYear)}\`,
          ],
        ),
        Button.button(
          {
            variant: 'ghost',
            size: 'icon',
            ariaLabel: 'Next month',
            onClick: Message.PressedNextMonth(),
            children: [Icon.chevronLeft({ class: ${isSx ? 'cx(styles.icon)' : `'size-4'`} }, h)],
          },
          h,
        ),
      ]),
      h.div(
        [h.Class(${isSx ? 'cx(styles.grid)' : `'mt-2 grid grid-cols-7 gap-0'`})],
        [
          ...FA_DAY_NAMES.map(dayName =>
            ${dayNameCell},
          ),
          ...cells.map(cell => jalaliDayButton(cell, model, h)),
        ],
      ),
    ],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Calendar — ${f.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    jalaliView(model, h),
  ]),
})`,
  })
}

const source = (
  f: CalendarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  if (f.layout === 'jalali') return jalaliSource(f, renderer)
  const needs = needsFor(f)
  const tag = f.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const modelFields = [
    `  calendar: Calendar.Model,`,
    f.layout === 'range'
      ? `  rangeStart: FoldkitCalendar.CalendarDate,\n  rangeEnd: FoldkitCalendar.CalendarDate,`
      : `  selectedDate: S.Option(FoldkitCalendar.CalendarDate),`,
    needs.time ? `  startTime: S.String,\n  endTime: S.String,` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const messageFields = [
    `  GotCalendarMessage: { message: Calendar.Message },`,
    needs.presets ? `  ClickedPreset: { days: S.Int },` : '',
    needs.time
      ? `  ChangedStartTime: { value: S.String },\n  ChangedEndTime: { value: S.String },`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  const initFields = [
    `calendar: Calendar.init({
          id: 'docs-calendar',
          today: Calendar.dateInTimeZone(new Date('2026-07-28T12:00:00Z'), ${needs.localized ? "'Europe/Berlin'" : "'UTC'"}),
          initialViewDate: initialDate,${needs.localized ? '\n          locale,' : ''}${needs.booked ? bookedDatesSource : ''}
        })`,
    f.layout === 'range'
      ? `rangeStart: { year: 2026, month: 7, day: 14 },
        rangeEnd: { year: 2026, month: 7, day: 20 }`
      : `selectedDate: Option.some(initialDate)`,
    needs.time ? `startTime: '10:30:00',\n        endTime: '12:30:00'` : '',
  ]
    .filter(Boolean)
    .join(',\n        ')
  const updateCases = [
    `    case 'GotCalendarMessage': {
      const next = Calendar.update(model.calendar, message.message)
      const maybeOutput = Option.fromNullishOr(next.outMessage)
      return {
        model: {
          ...model,
          calendar: next.model,${
            f.layout === 'range'
              ? ''
              : `
          selectedDate: Option.match(maybeOutput, {
            onNone: () => model.selectedDate,
            onSome: output =>
              output._tag === 'SelectedDate'
                ? Option.some(output.date)
                : model.selectedDate,
          }),`
          }
        },
        commands: Command.mapMessages(
          next.commands ?? [],
          next => Message['GotCalendarMessage']({ message: next }),
        ),
      }
    }`,
    needs.presets
      ? `    case 'ClickedPreset': {
      const date = addDays(today, message.days)
      return {
        model: {
          ...model,
          calendar: Calendar.focusDate(model.calendar, date),
          selectedDate: Option.some(date),
        },
      }
    }`
      : '',
    needs.time
      ? `    case 'ChangedStartTime':
      return { model: { ...model, startTime: message.value } }
    case 'ChangedEndTime':
      return { model: { ...model, endTime: message.value } }`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  const localeDecl = needs.localized
    ? `const locale: FoldkitCalendar.LocaleConfig = ${JSON.stringify(germanCalendarLocale)}\n\n`
    : ''
  const helpers = needs.presets
    ? `const today = { year: 2026, month: 7, day: 28 } as const
const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In a week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
] as const
const addDays = (date: FoldkitCalendar.CalendarDate, days: number): FoldkitCalendar.CalendarDate => {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

`
    : ''
  return foldkitApplication({
    title: `Calendar — ${f.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import * as FoldkitCalendar from 'foldkit/calendar'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Calendar from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/calendar'
${componentImports(needs, renderer)}${renderer !== 'tailwind' ? stylesSource(f) : ''}`,
    model: `${localeDecl}export const Model = S.Struct({
${modelFields}
})
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
${messageFields}
});
export type Message = typeof Message.Type`,
    init: `const initialDate = { year: 2026, month: 7, day: 18 }
export const init = (): Update.Return<Model, Message> => ({
  model: {
        ${initFields},
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
${updateCases}
  }
}`,
    view: `${helpers}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Calendar — ${f.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${viewBodySource(f, renderer)},
  ]),
})`,
  })
}

const calendarExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  calendarFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    ...(fixture.sectionId === undefined
      ? {}
      : { sectionId: fixture.sectionId }),
    code: source(fixture, renderer),
  }))

export const calendarExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, calendarExamplesFor(renderer))
