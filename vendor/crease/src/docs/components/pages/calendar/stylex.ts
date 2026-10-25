import { reset } from '@/stylex/reset'
import { Option } from 'effect'
import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  calendarFixtures,
  type CalendarFixture,
} from '@/docs/components/pages/calendar/shared'
import {
  FA_DAY_NAMES,
  FA_MONTH_NAMES,
  faDigits,
  jalaliMonthCells,
  type JalaliCell,
  type JalaliDate,
} from '@/lib/jalali'
import * as Button from '@/stylex/button'
import * as Calendar from '@/stylex/calendar'
import * as Card from '@/stylex/card'
import * as Field from '@/stylex/field'
import * as Icon from '@/lib/icon'
import * as InputGroup from '@/stylex/input-group'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'

const styles = stylex.create({
  cardFit: {
    marginInline: 'auto',
    boxShadow:
      'rgb(0 0 0 / 0.1) 0px 1px 3px 0px, rgb(0 0 0 / 0.1) 0px 1px 2px -1px',
    maxWidth: '18.75rem',
    width: 'fit-content',
  },
  cardFitBare: {
    marginInline: 'auto',
    boxShadow:
      'rgb(0 0 0 / 0.1) 0px 1px 3px 0px, rgb(0 0 0 / 0.1) 0px 1px 2px -1px',
    width: 'fit-content',
  },
  cardFitFlush: {
    marginInline: 'auto',
    paddingBlock: 0,
    boxShadow:
      'rgb(0 0 0 / 0.1) 0px 1px 3px 0px, rgb(0 0 0 / 0.1) 0px 1px 2px -1px',
    width: 'fit-content',
  },
  calendarInCard: {
    backgroundColor: 'transparent',
    lineHeight: 'calc(20 / 14)',
  },
  jalaliNavButton: {
    borderColor: 'transparent',
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 'normal',
    backgroundClip: 'padding-box',
  },
  footerPresets: {
    gap: '0.5rem',
    borderEndEndRadius: '0.875rem',
    borderEndStartRadius: '0.875rem',
    display: 'flex',
    flexWrap: 'wrap',
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    paddingTop: 'var(--card-spacing,1.5rem)',
  },
  footerTime: {
    backgroundColor: tokens.card,
    borderEndEndRadius: '0.875rem',
    borderEndStartRadius: '0.875rem',
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    paddingTop: 'var(--card-spacing,1.5rem)',
  },
  presetButton: {
    borderRadius: '0.5rem',
    backgroundClip: 'padding-box',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: 1,
  },
  bordered: {
    borderColor: tokens.border,
    borderRadius: '0.625rem',
    borderStyle: 'solid',
    borderWidth: 1,
    width: 'fit-content',
  },
  icon: { color: tokens.mutedForeground, height: '1rem', width: '1rem' },
  navIcon: { flexShrink: 0, height: '1rem', width: '1rem' },
  jalaliContainer: {
    padding: '0.75rem',
    borderColor: tokens.border,
    borderRadius: '0.625rem',
    borderStyle: 'solid',
    borderWidth: 1,
    width: 'fit-content',
  },
  jalaliHeader: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  jalaliTitle: { fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.25rem' },
  jalaliGrid: {
    gap: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    marginTop: '0.5rem',
  },
  jalaliDayName: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.8rem',
    fontWeight: 400,
    justifyContent: 'center',
    height: '2rem',
    width: '2rem',
  },
  jalaliDay: {
    borderRadius: '0.5rem',
    borderStyle: 'none',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    cursor: 'pointer',
    display: 'flex',
    fontSize: '0.8rem',
    justifyContent: 'center',
    transitionDuration: '150ms',
    transitionProperty: 'background-color, color',
    height: '2rem',
    width: '2rem',
  },
  jalaliDayInMonth: { color: tokens.foreground },
  jalaliDayOutside: { color: tokens.mutedForeground, opacity: 0.5 },
  jalaliDayToday: {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  jalaliDaySelected: {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
})

type PreviewModel = Readonly<{
  calendar: Calendar.Model
  selectedDate: Parameters<
    typeof Calendar.calendar<never>
  >[0]['maybeSelectedDate']
  rangeStart: { year: number; month: number; day: number }
  rangeEnd: { year: number; month: number; day: number }
  startTime: string
  endTime: string
  jalaliViewYear: number
  jalaliViewMonth: number
  jalaliDay: Option.Option<JalaliDate>
  jalaliToday: JalaliDate
}>

const fixtureOf = (index: number): CalendarFixture =>
  calendarFixtures[index] ?? {
    title: 'Demo',
    description: '',
    layout: 'single',
  }

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In a week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
] as const

const calendarView = <Msg>(
  fixture: CalendarFixture,
  preview: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  Calendar.calendar(
    {
      model: preview.calendar,
      maybeSelectedDate: preview.selectedDate,
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({ _tag: 'GotCalendarPreviewMessage', message }),
        ),
      ...(fixture.layout === 'range'
        ? { range: { start: preview.rangeStart, end: preview.rangeEnd } }
        : {}),
      ...(fixture.card === true ||
      fixture.layout === 'presets' ||
      fixture.layout === 'time'
        ? { layoutStyle: styles.calendarInCard as ComponentLayoutStyle }
        : {}),
      ...(fixture.weekNumbers === true ? { weekNumbers: true } : {}),
      ...(fixture.direction === 'rtl' ? { direction: 'rtl' as const } : {}),
      ...(fixture.layout === 'presets' || fixture.layout === 'time'
        ? { density: 'flush' as const }
        : {}),
      ...(fixture.roomy === true || fixture.layout === 'presets'
        ? { size: 'comfortable' as const }
        : {}),
    },
    h,
  )

const timeFieldView = <Msg>(
  field: 'start' | 'end',
  preview: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
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
                          field === 'start'
                            ? preview.startTime
                            : preview.endTime,
                        onInput: value =>
                          onMessageJson(
                            JSON.stringify({
                              _tag:
                                field === 'start'
                                  ? 'ChangedStartTime'
                                  : 'ChangedEndTime',
                              value,
                            }),
                          ),
                        ariaLabel:
                          field === 'start' ? 'Start Time' : 'End Time',
                      },
                      h,
                    ),
                    InputGroup.inputGroupAddon(
                      {
                        children: [
                          Icon.icon(
                            'clock',
                            { class: className(styles.icon) },
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

const jalaliDayButton = <Msg>(
  cell: JalaliCell,
  preview: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const selected =
    Option.isSome(preview.jalaliDay) &&
    isSameJalaliDay(preview.jalaliDay.value, cell)
  const today = isSameJalaliDay(preview.jalaliToday, cell)
  return h.button(
    [
      h.Type('button'),
      h.Class(
        className(
          reset.button,
          styles.jalaliDay,
          cell.inMonth ? styles.jalaliDayInMonth : styles.jalaliDayOutside,
          ...(today ? [styles.jalaliDayToday] : []),
          ...(selected ? [styles.jalaliDaySelected] : []),
        ),
      ),
      ...(selected ? [h.AriaCurrent('date')] : []),
      h.OnClick(
        onMessageJson(
          JSON.stringify({
            _tag: 'ClickedJalaliDay',
            date: { year: cell.year, month: cell.month, day: cell.day },
          }),
        ),
      ),
    ],
    [faDigits(cell.day)],
  )
}

const jalaliView = <Msg>(
  preview: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const cells = jalaliMonthCells(
    preview.jalaliViewYear,
    preview.jalaliViewMonth,
  )
  return h.div(
    [h.Dir('rtl'), h.Class(className(styles.jalaliContainer))],
    [
      h.div(
        [h.Class(className(styles.jalaliHeader))],
        [
          Button.button(
            {
              variant: 'ghost',
              size: 'icon',
              layoutStyle: styles.jalaliNavButton as ComponentLayoutStyle,
              ariaLabel: 'Previous month',
              onClick: onMessageJson(
                JSON.stringify({ _tag: 'PressedJalaliPreviousMonth' }),
              ),
              children: [
                Icon.chevronRight({ class: className(styles.navIcon) }, h),
              ],
            },
            h,
          ),
          h.span(
            [h.Class(className(styles.jalaliTitle))],
            [
              `${FA_MONTH_NAMES[preview.jalaliViewMonth - 1] ?? ''} ${faDigits(preview.jalaliViewYear)}`,
            ],
          ),
          Button.button(
            {
              variant: 'ghost',
              size: 'icon',
              layoutStyle: styles.jalaliNavButton as ComponentLayoutStyle,
              ariaLabel: 'Next month',
              onClick: onMessageJson(
                JSON.stringify({ _tag: 'PressedJalaliNextMonth' }),
              ),
              children: [
                Icon.chevronLeft({ class: className(styles.navIcon) }, h),
              ],
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class(className(styles.jalaliGrid))],
        [
          ...FA_DAY_NAMES.map(dayName =>
            h.span([h.Class(className(styles.jalaliDayName))], [dayName]),
          ),
          ...cells.map(cell =>
            jalaliDayButton(cell, preview, onMessageJson, h),
          ),
        ],
      ),
    ],
  )
}

export const calendarStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = fixtureOf(index)
  const preview = model as PreviewModel

  if (fixture.layout === 'jalali') return jalaliView(preview, onMessageJson, h)

  if (fixture.layout === 'presets')
    return Card.card(
      {
        size: 'sm',
        layoutStyle: styles.cardFit as ComponentLayoutStyle,
        children: [
          Card.cardContent(
            { children: [calendarView(fixture, preview, onMessageJson, h)] },
            h,
          ),
          Card.cardFooter(
            {
              layoutStyle: styles.footerPresets as ComponentLayoutStyle,
              children: PRESETS.map(preset =>
                Button.button(
                  {
                    variant: 'outline',
                    size: 'sm',
                    layoutStyle: styles.presetButton as ComponentLayoutStyle,
                    onClick: onMessageJson(
                      JSON.stringify({
                        _tag: 'ClickedPreset',
                        days: preset.days,
                      }),
                    ),
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
        size: 'sm',
        layoutStyle: styles.cardFitBare as ComponentLayoutStyle,
        children: [
          /* StyleX cannot address ::-webkit-calendar-picker-indicator; the
             raw rule hides the native picker icon the same way upstream's
             appearance-none class does. */
          h.style(
            [],
            [
              "input[type='time'] { appearance: none; }\n" +
                "input[type='time']::-webkit-calendar-picker-indicator { display: none; }",
            ],
          ),
          Card.cardContent(
            { children: [calendarView(fixture, preview, onMessageJson, h)] },
            h,
          ),
          Card.cardFooter(
            {
              layoutStyle: styles.footerTime as ComponentLayoutStyle,
              children: [
                Field.fieldGroup(
                  {
                    children: [
                      timeFieldView('start', preview, onMessageJson, h),
                      timeFieldView('end', preview, onMessageJson, h),
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

  const calendar = calendarView(fixture, preview, onMessageJson, h)

  if (fixture.card === true)
    return Card.card(
      {
        layoutStyle: styles.cardFitFlush as ComponentLayoutStyle,
        children: [Card.cardContent({ children: [calendar] }, h)],
      },
      h,
    )

  if (fixture.bordered === true)
    return h.div([h.Class(className(styles.bordered))], [calendar])

  return calendar
}
