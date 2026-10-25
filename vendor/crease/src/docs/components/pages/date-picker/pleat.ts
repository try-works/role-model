import { Style } from '@pleat/core'
import { Option } from 'effect'
import type * as FoldkitCalendar from 'foldkit/calendar'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  arabicCalendarLocale,
  datePickerFixtures,
  type DatePickerFixtureKind,
} from '@/docs/components/pages/date-picker/shared'
import * as Calendar from '@/pleat/calendar'
import * as DatePicker from '@/pleat/date-picker'
import * as Field from '@/pleat/field'
import * as Icon from '@/lib/icon'
import * as TimeInput from '@/pleat/time-input'
import * as InputGroup from '@/pleat/input-group'
import * as Popover from '@/pleat/popover'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { className } from '@/pleat/style'
import { tokens } from '../../../../pleat/tokens'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  triggerRow: Style.make({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  }),
  chevron: Style.make({
    flexShrink: 0,
    opacity: 0.5,
    height: '1rem',
    width: '1rem',
  }),
  trigger: layoutStyle({ width: '11rem' }),
  demoTrigger: layoutStyle({ width: '11rem' }),
  rangeTrigger: Style.make({
    borderColor: tokens.input,
    borderRadius: 'calc(var(--radius) - 2px)',
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundClip: 'border-box',
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowSm,
    color: tokens.foreground,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 400,
    justifyContent: 'flex-start',
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: '15rem',
  }),
  iconTrigger: Style.make({
    borderRadius: '0.375rem',
    alignItems: 'center',
    justifyContent: 'center',
    height: '1.25rem',
    width: '1.25rem',
  }),
  icon: Style.make({ height: '1rem', width: '1rem' }),
  iconShrink: Style.make({ flexShrink: 0, height: '1rem', width: '1rem' }),
  srOnly: Style.make({
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    height: '1px',
    width: '1px',
  }),
  field44: layoutStyle({ marginInline: 'auto', width: '11rem' }),
  field48: layoutStyle({ marginInline: 'auto', width: '12rem' }),
  field60: layoutStyle({ marginInline: 'auto', width: '15rem' }),
  fieldNatural: layoutStyle({ marginInline: 'auto', maxWidth: '20rem' }),
  timeRow: Style.make({
    marginInline: 'auto',
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: '22rem',
    width: '100%',
  }),
  timeField: layoutStyle({ width: '9rem' }),
  fullField: layoutStyle({ width: '11rem' }),
  centerRow: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
  }),
  iconRow: Style.make({ alignItems: 'center', display: 'flex' }),
}

interface Preview {
  kind: string
  datePicker: DatePicker.Model
  calendar: Calendar.Model
  popover: Popover.Model
  selectedDate: Option.Option<FoldkitCalendar.CalendarDate>
  rangeStart: Option.Option<FoldkitCalendar.CalendarDate>
  rangeEnd: Option.Option<FoldkitCalendar.CalendarDate>
  inputValue: string
  timeValue: string
  timeInput: TimeInput.Model
}

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

const picker = <Msg>(
  kind: DatePickerFixtureKind,
  preview: Preview,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const isRtl = kind === 'rtl'
  const placeholder =
    kind === 'demo' || kind === 'basic'
      ? 'Pick a date'
      : isRtl
        ? 'اختر تاريخًا'
        : 'Select date'
  const format =
    kind === 'dob' ? formatUs : isRtl ? formatArabic : formatDisplay
  const withChevron = kind === 'demo' || kind === 'time' || isRtl
  return DatePicker.datePicker(
    {
      model: preview.datePicker,
      maybeSelectedDate: preview.selectedDate,
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({ _tag: 'GotDatePickerMessage', message }),
        ),
      name: 'date',
      ariaLabel: placeholder,
      triggerContent: maybeDate =>
        withChevron
          ? h.span(
              [h.Class(className(styles.triggerRow))],
              [
                Option.match(maybeDate, {
                  onNone: () => h.span([], [placeholder]),
                  onSome: date => h.span([], [format(date)]),
                }),
                Icon.chevronDown({ class: className(styles.chevron) }, h),
              ],
            )
          : Option.match(maybeDate, {
              onNone: () => h.span([], [placeholder]),
              onSome: date => h.span([], [format(date)]),
            }),
      triggerLayoutStyle: kind === 'demo' ? styles.demoTrigger : styles.trigger,
      ...(isRtl ? { direction: 'rtl' as const } : {}),
    },
    h,
  )
}

export const datePickerPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const preview = model as Preview
  const fixture = datePickerFixtures[index] ?? datePickerFixtures[0]!
  const kind = fixture.kind

  if (kind === 'range') {
    const rangeText = Option.match(preview.rangeStart, {
      onNone: () => 'Pick a date',
      onSome: start =>
        Option.match(preview.rangeEnd, {
          onNone: () => formatCompact(start),
          onSome: end => `${formatCompact(start)} - ${formatCompact(end)}`,
        }),
    })
    const rangeOption = Option.match(preview.rangeStart, {
      onNone: () => Option.none(),
      onSome: start =>
        Option.match(preview.rangeEnd, {
          onNone: () => Option.some({ start, end: start }),
          onSome: end => Option.some({ start, end }),
        }),
    })
    return Field.field(
      {
        layoutStyle: styles.field60,
        children: [
          Field.fieldLabel(
            { for: 'date-picker-range', children: ['Date Picker Range'] },
            h,
          ),
          Popover.popover(
            {
              model: preview.popover,
              toParentMessage: message =>
                onMessageJson(
                  JSON.stringify({ _tag: 'GotPopoverMessage', message }),
                ),
              align: 'start',
              trigger: h.span(
                [h.Class(className(styles.centerRow))],
                [
                  Icon.calendarIcon({ class: className(styles.icon) }, h),
                  rangeText,
                ],
              ),
              triggerLayoutStyle: styles.rangeTrigger as ComponentLayoutStyle,
              content: Calendar.calendar(
                {
                  model: preview.calendar,
                  maybeSelectedDate: Option.none(),
                  toParentMessage: message =>
                    onMessageJson(
                      JSON.stringify({ _tag: 'GotCalendarMessage', message }),
                    ),
                  ...(Option.isSome(rangeOption)
                    ? { range: rangeOption.value }
                    : {}),
                },
                h,
              ),
            },
            h,
          ),
        ],
      },
      h,
    )
  }

  if (kind === 'input' || kind === 'natural') {
    const isNatural = kind === 'natural'
    return Field.field(
      {
        layoutStyle: isNatural ? styles.fieldNatural : styles.field48,
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
                    value: preview.inputValue,
                    onInput: value =>
                      onMessageJson(
                        JSON.stringify({ _tag: 'ChangedInput', value }),
                      ),
                    onKeyDown: key =>
                      onMessageJson(
                        JSON.stringify({ _tag: 'PressedKeyInInput', key }),
                      ),
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
                          model: preview.datePicker,
                          maybeSelectedDate: preview.selectedDate,
                          toParentMessage: message =>
                            onMessageJson(
                              JSON.stringify({
                                _tag: 'GotDatePickerMessage',
                                message,
                              }),
                            ),
                          ariaLabel: 'Select date',
                          triggerContent: () =>
                            h.span(
                              [h.Class(className(styles.iconRow))],
                              [
                                Icon.calendarIcon(
                                  { class: className(styles.iconShrink) },
                                  h,
                                ),
                                h.span(
                                  [h.Class(className(styles.srOnly))],
                                  ['Select date'],
                                ),
                              ],
                            ),
                          triggerLayoutStyle:
                            styles.iconTrigger as ComponentLayoutStyle,
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

  if (kind === 'time') {
    return Field.fieldGroup(
      {
        layoutStyle: styles.timeRow as ComponentLayoutStyle,
        children: [
          Field.field(
            {
              layoutStyle: styles.fullField,
              children: [
                Field.fieldLabel(
                  {
                    for: DatePicker.triggerId(preview.datePicker.id),
                    children: ['Date'],
                  },
                  h,
                ),
                picker(kind, preview, onMessageJson, h),
              ],
            },
            h,
          ),
          Field.field(
            {
              layoutStyle: styles.timeField,
              children: [
                Field.fieldLabel(
                  {
                    for: TimeInput.pickerButtonId(preview.timeInput),
                    children: ['Time'],
                  },
                  h,
                ),
                TimeInput.timeInput(
                  {
                    model: preview.timeInput,
                    toParentMessage: message =>
                      onMessageJson(
                        JSON.stringify({
                          _tag: 'GotTimeInputMessage',
                          message,
                        }),
                      ),
                    id: 'time-picker-optional',
                    label: 'Time',
                    isLabelHidden: true,
                    presentation: 'select',
                    hourFormat: '24h',
                    name: 'time',
                    value: preview.timeValue,
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

  if (kind === 'demo') {
    return h.div([], [picker(kind, preview, onMessageJson, h)])
  }

  if (kind === 'rtl') {
    return h.div(
      [h.Dir('rtl'), h.Class(className(styles.field44))],
      [picker(kind, preview, onMessageJson, h)],
    )
  }

  return Field.field(
    {
      layoutStyle: styles.field44,
      children: [
        Field.fieldLabel(
          {
            for: 'date-picker',
            children: [kind === 'basic' ? 'Date' : 'Date of birth'],
          },
          h,
        ),
        picker(kind, preview, onMessageJson, h),
      ],
    },
    h,
  )
}
