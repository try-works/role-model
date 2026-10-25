import { Option } from 'effect'

import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  Calendar as CalendarPrimitive,
  DatePicker as DatePickerPrimitive,
  Popover as PopoverPrimitive,
} from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import {
  type SharedDateFormat,
  dateFromISO,
  dateToISO,
  formatSharedDate,
} from '@/lib/date-parse'
import {
  type DateTime,
  Message,
  Model,
  OutMessage,
  init,
  reflect,
  reflectConstraints,
  update,
} from '@/lib/date-time-input'
import {
  formatDisplayTime12h,
  formatDisplayTime24h,
  formatISOTime,
} from '@/lib/time-parse'
import { cn } from '@/lib/utils'
import { calendarView } from '@/ui/calendar'

/* Ported from Meta Astryx DateTimeInput (packages/core/src/DateTimeInput/)
   — examples and visual spec adapted to Crease UI tokens.

   Two sibling input wrappers share one field: the date half toggles a
   calendar popover, the time half takes typed entry (ArrowUp/Down step the
   committed time by `timeIncrementMinutes`) and optionally opens a
   preset-time listbox when `timeOptionInterval` is set.

   PORT NOTE: foldkit's calendar renders a single month; astryx defaults to
   two. `numberOfMonths` accepts 1|2 but clamps to one month.
   PORT NOTE: `labelTooltip`/`disabledMessage` tooltips are not rendered; the
   values are still accepted so astryx call sites port unchanged.
   PORT NOTE: the preset-time listbox has no roving activedescendant;
   ArrowUp/Down step the committed time instead. */

export {
  type DateTime,
  Message,
  Model,
  OutMessage,
  init,
  reflect,
  reflectConstraints,
  update,
}

export { dateFromISO, dateToISO } from '@/lib/date-parse'
export {
  formatDisplayTime12h,
  formatDisplayTime24h,
  formatISOTime,
} from '@/lib/time-parse'
export type { SharedDateFormat }

const FIELD_CLASS = 'grid gap-2'

const LABEL_CLASS =
  'flex items-center gap-2 text-sm leading-none font-medium select-none'

const OPTIONAL_CLASS = 'font-normal text-muted-foreground'

const DESCRIPTION_CLASS = 'text-muted-foreground text-sm'

/** astryx `styles.row` — flex wrap so each segment can grow onto its own
 *  full-width row; both wrappers share the 196px basis. */
const ROW_CLASS = 'flex flex-wrap gap-2'

const WRAPPER_CLASS =
  'relative flex min-w-0 flex-1 basis-49 items-center gap-2 rounded-md border border-input bg-transparent dark:bg-input/30 py-1 px-2 shadow-xs transition-[color,box-shadow] outline-none hover:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--input)_30%,transparent)] focus-within:border-ring focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_50%,transparent)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[invalid=true]:border-destructive dark:data-[invalid=true]:focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--destructive)_40%,transparent)] data-[invalid=true]:focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--destructive)_20%,transparent)]'

const WRAPPER_STATUS_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error: 'border-destructive',
  warning: 'border-warning',
  success: 'border-success',
}

const WRAPPER_SIZE_CLASS: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-9',
}

const ICON_BUTTON_CLASS =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4'

const ICON_CLASS = 'inline-flex shrink-0 items-center justify-center'

const INPUT_CLASS =
  'block min-w-0 flex-1 bg-transparent font-(inherit) text-sm text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed data-[invalid=true]:text-muted-foreground'

const CLEAR_BUTTON_CLASS =
  'inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden transition-colors hover:bg-accent hover:text-foreground [&>svg]:size-3.5'

const SPINNER_CLASS =
  'inline-flex shrink-0 animate-spin items-center justify-center text-muted-foreground [&>svg]:size-4'

const STATUS_ICON_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error: 'inline-flex shrink-0 items-center text-destructive [&>svg]:size-4',
  warning: 'inline-flex shrink-0 items-center text-warning [&>svg]:size-4',
  success: 'inline-flex shrink-0 items-center text-success [&>svg]:size-4',
}

const STATUS_MESSAGE_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error: 'text-sm text-destructive',
  warning: 'text-sm text-warning',
  success: 'text-sm text-success',
}

const PANEL_CLASS =
  'z-50 w-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-hidden'

const BACKDROP_CLASS = 'fixed inset-0 z-40'

/** astryx `styles.timeListbox` — capped height, per-option padding mirrors
 *  the selector/typeahead dropdown lists. */
const TIME_LISTBOX_CLASS = 'box-border max-h-75 min-w-40 overflow-y-auto p-1'

const TIME_OPTION_CLASS =
  'box-border flex w-full items-center rounded-sm px-2 py-1.5 text-start text-sm text-foreground aria-selected:font-medium hover:bg-accent'

const TIME_OPTION_SIZE_CLASS: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'py-1 px-2',
  md: '',
  lg: 'py-2',
}

export type DateTimeInputStatus = Readonly<{
  type: 'error' | 'warning' | 'success'
  message?: string
}>

export type DateTimeInputProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  label: string
  isLabelHidden?: boolean
  description?: string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  /** Astryx shows it as a focus ring tooltip; accepted but not rendered. */
  disabledMessage?: string
  isReadOnly?: boolean
  status?: DateTimeInputStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  /** Astryx shows it as a label tooltip; accepted but not rendered. */
  labelTooltip?: string
  width?: number
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  timePlaceholder?: string
  timeLabel?: string
  format?: SharedDateFormat
  hasClear?: boolean
  isBusy?: boolean
  /** Minute cadence for the preset-time listbox; omit for a plain input. */
  timeOptionInterval?: number
  /** PORT NOTE: foldkit's calendar renders a single month; 2 is accepted for
   *  prop compatibility and clamps to one month. */
  numberOfMonths?: 1 | 2
  /** 0 = Sunday … 6 = Saturday; maps onto the calendar locale's
   *  firstDayOfWeek. Requires re-init or a matching calendarLocale. */
  weekStartsOn?: number
  /** Name for the submitted hidden input ("YYYY-MM-DDTHH:MM[:SS]"). */
  htmlName?: string
  class?: string
  direction?: 'ltr' | 'rtl'
}>

const statusIcon = <Msg>(
  type: 'error' | 'warning' | 'success',
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(STATUS_ICON_CLASS[type]), h.AriaHidden(true)],
    [
      type === 'error'
        ? Icon.octagonX({ class: 'size-4' }, h)
        : type === 'warning'
          ? Icon.triangleAlert({ class: 'size-4' }, h)
          : Icon.circleCheck({ class: 'size-4' }, h),
    ],
  )

export const dateTimeInput = <Msg>(
  props: DateTimeInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const toParent = props.toParentMessage
  const isEffectivelyDisabled =
    props.isDisabled === true || props.isBusy === true
  const isInvalid =
    props.status?.type === 'error' ||
    model.isDateInputInvalid ||
    model.isTimeInputInvalid
  const isDateInvalid =
    model.isDateInputInvalid || props.status?.type === 'error'
  const isTimeInvalid =
    model.isTimeInputInvalid || props.status?.type === 'error'

  const resolvedDateInputId = `${model.id}-date`
  const resolvedTimeInputId = `${model.id}-time`
  const labelId = `${model.id}-label`
  const descriptionId = `${model.id}-description`
  const statusMessageId = `${model.id}-status-message`
  const describedBy = [
    props.description === undefined ? undefined : descriptionId,
    props.status?.message === undefined ||
    (props.statusVariant ?? 'attached') === 'tooltip'
      ? undefined
      : statusMessageId,
    ...(model.isDateInputInvalid ? [`${model.id}-invalid-date`] : []),
    ...(model.isTimeInputInvalid ? [`${model.id}-invalid-time`] : []),
  ]
    .filter((id): id is string => id !== undefined)
    .join(' ')

  const size = props.size ?? 'md'
  const today = model.datePicker.calendar.today
  const dateText = Option.getOrElse(model.pendingDateInput, () =>
    Option.match(model.value, {
      onNone: () => '',
      onSome: value =>
        formatSharedDate(value.date, props.format ?? 'date', model.locale),
    }),
  )
  const timeText = Option.getOrElse(model.pendingTimeInput, () =>
    Option.match(model.value, {
      onNone: () => '',
      onSome: value =>
        model.hourFormat === '12h'
          ? formatDisplayTime12h(value.time, model.hasSeconds)
          : formatDisplayTime24h(value.time, model.hasSeconds),
    }),
  )

  const resolvedTimeLabel = props.timeLabel ?? `${props.label} time`
  const resolvedTimePlaceholder =
    props.timePlaceholder ?? (model.hourFormat === '12h' ? 'h:mm AM' : 'HH:mm')

  const timeOptions: ReadonlyArray<{ iso: string; label: string }> =
    props.timeOptionInterval === undefined || !model.hasTimeOptions
      ? []
      : Array.from(
          {
            length: Math.floor((24 * 60) / props.timeOptionInterval),
          },
          (_, i) => i * props.timeOptionInterval!,
        ).map(minutes => {
          const time = {
            hour: Math.floor(minutes / 60),
            minute: minutes % 60,
            second: 0,
          }
          const iso = formatISOTime(time, false)
          return {
            iso,
            label:
              model.hourFormat === '12h'
                ? formatDisplayTime12h(iso, false)
                : formatDisplayTime24h(iso, false),
          }
        })

  const selectedTimeISO = Option.match(model.value, {
    onNone: () => undefined,
    onSome: value => value.time,
  })

  const wrapperClass = (invalid: boolean) =>
    cn(
      WRAPPER_CLASS,
      WRAPPER_SIZE_CLASS[size],
      props.status === undefined
        ? undefined
        : WRAPPER_STATUS_CLASS[props.status.type],
      invalid ? 'data-[invalid=true]' : undefined,
    )

  const datePopoverView = h.submodel({
    slotId: model.datePicker.popover.id,
    model: model.datePicker.popover,
    view: PopoverPrimitive.view,
    viewInputs: {
      anchor: { placement: 'bottom-start', gap: 4 },
      focusSelector: '[role="grid"]',
      isDisabled: isEffectivelyDisabled,
      ariaLabelledBy: labelId,
      toView: ({ button, panel, backdrop, isVisible }) =>
        /* Backdrop+panel portal to #foldkit-portal-root; keep them siblings
           of the segment (inside a neutral outer div) so segment diffs never
           reference portaled nodes (insertBefore crash on clear insert). */
        h.div(
          [],
          [
            h.div(
              [
                h.DataAttribute('slot', 'date-time-input-date-segment'),
                h.DataAttribute('invalid', String(isDateInvalid)),
                ...(isEffectivelyDisabled ? [h.AriaDisabled(true)] : []),
                h.Class(wrapperClass(isDateInvalid)),
              ],
              [
                h.button(
                  [
                    ...button,
                    h.DataAttribute('slot', 'date-time-input-date-toggle'),
                    h.AriaLabel(
                      model.datePicker.popover.isOpen
                        ? 'Close calendar'
                        : 'Open calendar',
                    ),
                    h.Tabindex(-1),
                    ...(isEffectivelyDisabled ? [h.Disabled(true)] : []),
                    h.Class(ICON_BUTTON_CLASS),
                  ],
                  [Icon.calendarIcon({ class: 'size-4' }, h)],
                ),
                h.input([
                  h.Id(resolvedDateInputId),
                  h.Type('text'),
                  h.Role('combobox'),
                  h.AriaHasPopup('dialog'),
                  h.AriaExpanded(model.datePicker.popover.isOpen),
                  ...(model.datePicker.popover.isOpen
                    ? [h.AriaControls(`${model.datePicker.popover.id}-panel`)]
                    : []),
                  h.AriaAutocomplete('none'),
                  h.Value(dateText),
                  h.Placeholder(props.placeholder ?? 'Select a date'),
                  h.AriaLabelledBy(labelId),
                  ...(describedBy === ''
                    ? []
                    : [h.AriaDescribedBy(describedBy)]),
                  ...(props.isRequired === true ? [h.AriaRequired(true)] : []),
                  ...(isDateInvalid ? [h.AriaInvalid(true)] : []),
                  ...(props.isBusy === true ? [h.AriaBusy(true)] : []),
                  ...(isEffectivelyDisabled ? [h.Disabled(true)] : []),
                  ...(props.isReadOnly === true ? [h.Readonly(true)] : []),
                  h.OnInput(value =>
                    toParent(Message.UpdatedDateInputValue({ value })),
                  ),
                  h.OnFocus(toParent(Message.FocusedDateInput())),
                  h.OnBlur(toParent(Message.BlurredDateInput())),
                  h.OnClick(toParent(Message.ClickedDateInput())),
                  h.OnKeyDown((key, modifiers) =>
                    toParent(
                      Message.PressedDateInputKey({
                        key,
                        isAlt: modifiers.altKey,
                      }),
                    ),
                  ),
                  h.Class(INPUT_CLASS),
                  h.DataAttribute('invalid', String(isDateInvalid)),
                ]),
                ...(props.hasClear === true &&
                Option.isSome(model.value) &&
                !isEffectivelyDisabled
                  ? [
                      h.button(
                        [
                          h.Type('button'),
                          h.Tabindex(-1),
                          h.AriaLabel(`Clear ${props.label}`),
                          h.OnClick(toParent(Message.ClearedInput())),
                          h.Class(CLEAR_BUTTON_CLASS),
                        ],
                        [Icon.x({ class: 'size-3.5' }, h)],
                      ),
                    ]
                  : []),
                ...(props.isBusy === true
                  ? [
                      h.span(
                        [h.AriaHidden(true), h.Class(SPINNER_CLASS)],
                        [Icon.loaderCircle({ class: 'size-4' }, h)],
                      ),
                    ]
                  : []),
                ...(props.status === undefined
                  ? []
                  : [statusIcon(props.status.type, h)]),
              ],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class(BACKDROP_CLASS)], []),
                  h.div(
                    [
                      ...panel,
                      h.DataAttribute('slot', 'date-time-input-content'),
                      h.Class(PANEL_CLASS),
                    ],
                    [
                      h.submodel({
                        slotId: model.datePicker.calendar.id,
                        model: model.datePicker.calendar,
                        view: CalendarPrimitive.view,
                        viewInputs: {
                          maybeSelectedDate: Option.map(
                            model.value,
                            value => value.date,
                          ),
                          toView: attributes =>
                            calendarView(
                              attributes,
                              {
                                ...(props.direction === undefined
                                  ? {}
                                  : { direction: props.direction }),
                              },
                              h,
                            ),
                        },
                        toParentMessage: message =>
                          toParent(
                            Message.GotDatePickerMessage({
                              message:
                                DatePickerPrimitive.Message.GotCalendarMessage({
                                  message,
                                }),
                            }),
                          ),
                      }),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message =>
      toParent(
        Message.GotDatePickerMessage({
          message: DatePickerPrimitive.Message.GotPopoverMessage({
            message,
          }),
        }),
      ),
  })

  const timeHalf = h.submodel({
    slotId: model.timePopover.id,
    model: model.timePopover,
    view: PopoverPrimitive.view,
    viewInputs: {
      anchor: { placement: 'bottom-start', gap: 4 },
      focusSelector: '[role="listbox"]',
      isDisabled: isEffectivelyDisabled,
      ariaLabel: resolvedTimeLabel,
      toView: ({ panel, backdrop, isVisible }) =>
        /* Same portal-safety rule as the date segment: backdrop+panel must be
           siblings of the segment, inside a neutral outer div. */
        h.div(
          [],
          [
            h.div(
              [
                h.DataAttribute('slot', 'date-time-input-time-segment'),
                /* The popover's anchor mount positions the panel against
                   `${id}-button`; the time half has no dedicated button
                   element (the input keeps the combobox role), so the
                   segment wrapper carries the anchor id. Without it the
                   mount can not find its anchor and the panel stays
                   visibility:hidden. */
                ...(model.hasTimeOptions
                  ? [h.Id(`${model.timePopover.id}-button`)]
                  : []),
                h.DataAttribute('invalid', String(isTimeInvalid)),
                ...(isEffectivelyDisabled ? [h.AriaDisabled(true)] : []),
                h.Class(wrapperClass(isTimeInvalid)),
              ],
              [
                h.span(
                  [h.AriaHidden(true), h.Class(ICON_CLASS)],
                  [Icon.clock({ class: 'size-4 text-muted-foreground' }, h)],
                ),
                h.input([
                  h.Id(resolvedTimeInputId),
                  h.Type('text'),
                  h.Value(timeText),
                  h.Placeholder(resolvedTimePlaceholder),
                  h.AriaLabel(resolvedTimeLabel),
                  ...(model.hasTimeOptions
                    ? [
                        h.Role('combobox'),
                        h.AriaExpanded(model.timePopover.isOpen),
                        h.AriaAutocomplete('list'),
                        ...(model.timePopover.isOpen
                          ? [h.AriaControls(`${model.timePopover.id}-panel`)]
                          : []),
                      ]
                    : []),
                  ...(describedBy === ''
                    ? []
                    : [h.AriaDescribedBy(describedBy)]),
                  ...(props.isRequired === true ? [h.AriaRequired(true)] : []),
                  ...(isTimeInvalid ? [h.AriaInvalid(true)] : []),
                  ...(props.isBusy === true ? [h.AriaBusy(true)] : []),
                  ...(isEffectivelyDisabled ? [h.Disabled(true)] : []),
                  ...(props.isReadOnly === true ? [h.Readonly(true)] : []),
                  h.OnInput(value =>
                    toParent(Message.UpdatedTimeInputValue({ value })),
                  ),
                  h.OnFocus(toParent(Message.FocusedTimeInput())),
                  h.OnBlur(toParent(Message.BlurredTimeInput())),
                  h.OnClick(toParent(Message.ClickedTimeInput())),
                  h.OnKeyDown((key, modifiers) =>
                    toParent(
                      Message.PressedTimeInputKey({
                        key,
                        isAlt: modifiers.altKey,
                      }),
                    ),
                  ),
                  h.Class(INPUT_CLASS),
                  h.DataAttribute('invalid', String(isTimeInvalid)),
                ]),
              ],
            ),
            ...(isVisible && timeOptions.length > 0
              ? [
                  h.div([...backdrop, h.Class(BACKDROP_CLASS)], []),
                  h.div(
                    [
                      ...panel,
                      h.DataAttribute('slot', 'date-time-input-time-listbox'),
                      h.Class(PANEL_CLASS),
                    ],
                    [
                      h.div(
                        [
                          h.Role('listbox'),
                          h.AriaLabel(`${resolvedTimeLabel} options`),
                          h.Class(TIME_LISTBOX_CLASS),
                        ],
                        timeOptions.map(option =>
                          h.div(
                            [
                              h.Role('option'),
                              h.AriaSelected(option.iso === selectedTimeISO),
                              h.Tabindex(-1),
                              h.OnClick(
                                toParent(
                                  Message.ClickedTimeOption({
                                    time: option.iso,
                                  }),
                                ),
                              ),
                              h.Class(
                                cn(
                                  TIME_OPTION_CLASS,
                                  TIME_OPTION_SIZE_CLASS[size],
                                ),
                              ),
                            ],
                            [option.label],
                          ),
                        ),
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message =>
      toParent(Message.GotTimePopoverMessage({ message })),
  })

  const field = h.div(
    [
      h.DataAttribute('slot', 'field'),
      h.Role('group'),
      h.DataAttribute('invalid', String(isInvalid)),
      h.Class(
        cn(
          FIELD_CLASS,
          props.width !== undefined ? 'w-full' : 'w-fit',
          props.class,
        ),
      ),
      ...(props.width === undefined
        ? []
        : [h.Style({ width: `${String(props.width)}px` })]),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
    ],
    [
      h.label(
        [
          h.Id(labelId),
          h.DataAttribute('slot', 'field-label'),
          h.Class(
            cn(
              LABEL_CLASS,
              props.isLabelHidden === true ? 'sr-only' : undefined,
            ),
          ),
        ],
        [
          props.label,
          ...(props.isRequired === true
            ? [h.span([h.AriaHidden(true), h.Class('text-destructive')], ['*'])]
            : []),
          ...(props.isOptional === true
            ? [h.span([h.Class(OPTIONAL_CLASS)], [' (optional)'])]
            : []),
        ],
      ),
      h.div([h.Class(ROW_CLASS)], [datePopoverView, timeHalf]),
      ...(props.description === undefined
        ? []
        : [
            h.p(
              [h.Id(descriptionId), h.Class(DESCRIPTION_CLASS)],
              [props.description],
            ),
          ]),
      ...(props.status?.message === undefined ||
      (props.statusVariant ?? 'attached') === 'tooltip'
        ? []
        : [
            h.div(
              [
                h.Id(statusMessageId),
                h.Role('status'),
                h.Class(STATUS_MESSAGE_CLASS[props.status.type]),
              ],
              [props.status.message],
            ),
          ]),
      ...(model.isDateInputInvalid
        ? [
            h.div(
              [
                h.Id(`${model.id}-invalid-date`),
                h.Role('alert'),
                h.Class('sr-only'),
              ],
              ['Invalid date'],
            ),
          ]
        : []),
      ...(model.isTimeInputInvalid
        ? [
            h.div(
              [
                h.Id(`${model.id}-invalid-time`),
                h.Role('alert'),
                h.Class('sr-only'),
              ],
              ['Invalid time'],
            ),
          ]
        : []),
      ...(props.htmlName === undefined
        ? []
        : [
            h.input([
              h.Type('hidden'),
              h.Name(props.htmlName),
              h.Value(
                Option.match(model.value, {
                  onNone: () => '',
                  onSome: value => `${dateToISO(value.date)}T${value.time}`,
                }),
              ),
            ]),
          ]),
    ],
  )

  return field
}
