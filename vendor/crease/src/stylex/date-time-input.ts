import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
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
import { calendarView } from '@/stylex/calendar'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { themedAnchor } from './overlay-boundary'
import { overlayStyles } from './overlay-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

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

const styles = stylex.create({
  field: { gap: '0.5rem', display: 'grid' },
  label: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  },
  labelHidden: {
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  },
  requiredMark: { color: tokens.destructive },
  optional: { color: tokens.mutedForeground, fontWeight: 400 },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  row: { gap: '0.5rem', display: 'flex', flexWrap: 'wrap' },
  fullWidth: { width: '100%' },
  fieldFit: { width: 'fit-content' },
  wrapper: {
    borderColor: {
      default: tokens.input,
      ':focus-within': tokens.ring,
    },
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: tokens.inputSurface,
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-within': `inset 0 0 0 2px ${foundationTokens.ringSoft}`,
      ':hover': `inset 0 0 0 2px ${foundationTokens.inputDark}`,
    },
    display: 'flex',
    flexBasis: '12.25rem',
    flexGrow: 1,
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    transitionTimingFunction: interactionTokens.easingStandard,
    minWidth: 0,
  },
  wrapperDisabled: {
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  },
  wrapperInvalid: {
    borderColor: {
      default: tokens.destructive,
      ':focus-within': tokens.destructive,
    },
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-within': `inset 0 0 0 2px ${foundationTokens.destructiveRingSoft}`,
    },
  },
  wrapperError: {
    borderColor: {
      default: tokens.destructive,
      ':focus-within': tokens.destructive,
    },
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-within': `inset 0 0 0 2px ${foundationTokens.destructiveRingSoft}`,
    },
  },
  wrapperWarning: {
    borderColor: tokens.alertWarning,
  },
  wrapperSuccess: {
    borderColor: tokens.alertSuccess,
  },
  sizeSm: { height: '1.75rem' },
  sizeMd: { height: '2rem' },
  sizeLg: { height: '2.25rem' },
  iconButton: {
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.accent,
    },
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.foreground,
    },
    cursor: {
      default: interactionTokens.cursorAction,
      ':disabled': interactionTokens.cursorDefault,
    },
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  },
  icon: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'transparent',
    color: tokens.foreground,
    display: 'block',
    flexBasis: '0%',
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    minWidth: 0,
    '::placeholder': { color: tokens.mutedForeground },
  },
  inputInvalid: { color: tokens.mutedForeground },
  inputDisabled: { cursor: interactionTokens.cursorDisabled },
  clearButton: {
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.accent,
    },
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.foreground,
    },
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1.25rem',
    width: '1.25rem',
  },
  spinner: {
    animationDuration: interactionTokens.motionLoopFast,
    animationIterationCount: 'infinite',
    animationName: stylex.keyframes({
      to: { transform: 'rotate(360deg)' },
    }),
    animationTimingFunction: interactionTokens.easingLinear,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusError: {
    color: tokens.destructive,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusWarning: {
    color: tokens.alertWarning,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusSuccess: {
    color: tokens.alertSuccess,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusMessageError: {
    color: tokens.destructive,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  statusMessageWarning: {
    color: tokens.alertWarning,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  statusMessageSuccess: {
    color: tokens.alertSuccess,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  iconSize: { height: '1rem', width: '1rem' },
  clearIconSize: { height: '0.875rem', width: '0.875rem' },
  iconMuted: { color: tokens.mutedForeground, height: '1rem', width: '1rem' },
  panel: { padding: 0, width: 'auto' },
  timeListbox: {
    boxSizing: 'border-box',
    maxHeight: '18.75rem',
    minWidth: '10rem',
    overflowY: 'auto',
    padding: '0.25rem',
  },
  timeOption: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.accent,
    },
    borderRadius: foundationTokens.radiusSm,
    boxSizing: 'border-box',
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    textAlign: 'start',
    width: '100%',
  },
  timeOptionSelected: { fontWeight: 500 },
  timeOptionSm: { paddingBlock: '0.25rem', paddingInline: '0.5rem' },
  timeOptionLg: { paddingBlock: '0.5rem' },
  srOnly: {
    borderWidth: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: 1,
  },
})

const STATUS_STYLE = {
  error: styles.statusError,
  warning: styles.statusWarning,
  success: styles.statusSuccess,
} as const

const STATUS_MESSAGE_STYLE = {
  error: styles.statusMessageError,
  warning: styles.statusMessageWarning,
  success: styles.statusMessageSuccess,
} as const

const SIZE_STYLE = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
} as const

const TIME_OPTION_SIZE_STYLE = {
  sm: styles.timeOptionSm,
  md: null,
  lg: styles.timeOptionLg,
} as const

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
  /** Parent-layout positioning only. Add visual choices as named variants. */
  layoutStyle?: ComponentLayoutStyle
  direction?: 'ltr' | 'rtl'
}>

const statusIcon = <Msg>(
  type: 'error' | 'warning' | 'success',
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(className(STATUS_STYLE[type])), h.AriaHidden(true)],
    [
      type === 'error'
        ? Icon.icon('octagon-x', { class: className(styles.iconSize) }, h)
        : type === 'warning'
          ? Icon.icon(
              'triangle-alert',
              { class: className(styles.iconSize) },
              h,
            )
          : Icon.icon('circle-check', { class: className(styles.iconSize) }, h),
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
          { length: Math.floor((24 * 60) / props.timeOptionInterval) },
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

  const wrapperStyleArgs = (invalid: boolean): ReadonlyArray<StaticStyles> => [
    styles.wrapper,
    SIZE_STYLE[size],
    props.status === undefined
      ? null
      : props.status.type === 'error'
        ? styles.wrapperError
        : props.status.type === 'warning'
          ? styles.wrapperWarning
          : styles.wrapperSuccess,
    invalid && styles.wrapperInvalid,
    isEffectivelyDisabled && styles.wrapperDisabled,
  ]

  const datePopoverView = h.submodel({
    slotId: model.datePicker.popover.id,
    model: model.datePicker.popover,
    view: PopoverPrimitive.view,
    viewInputs: {
      anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
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
                h.Class(className(...wrapperStyleArgs(isDateInvalid))),
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
                    h.Class(className(reset.button, styles.iconButton)),
                  ],
                  [
                    Icon.icon(
                      'calendar',
                      { class: className(styles.iconSize) },
                      h,
                    ),
                  ],
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
                  ...(props.isReadOnly === true ? [h.AriaReadonly(true)] : []),
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
                  h.Class(
                    className(
                      reset.input,
                      styles.input,
                      isDateInvalid && styles.inputInvalid,
                      isEffectivelyDisabled && styles.inputDisabled,
                    ),
                  ),
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
                          h.Class(className(reset.button, styles.clearButton)),
                        ],
                        [
                          Icon.icon(
                            'x',
                            { class: className(styles.clearIconSize) },
                            h,
                          ),
                        ],
                      ),
                    ]
                  : []),
                ...(props.isBusy === true
                  ? [
                      h.span(
                        [
                          h.AriaHidden(true),
                          h.Class(className(styles.spinner)),
                        ],
                        [
                          Icon.icon(
                            'loader-circle',
                            { class: className(styles.iconSize) },
                            h,
                          ),
                        ],
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
                  h.div(
                    [...backdrop, h.Class(className(overlayStyles.backdrop))],
                    [],
                  ),
                  h.div(
                    [
                      ...panel,
                      h.DataAttribute('slot', 'date-time-input-content'),
                      h.Class(className(overlayStyles.panel, styles.panel)),
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
      anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
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
                h.Class(className(...wrapperStyleArgs(isTimeInvalid))),
              ],
              [
                h.span(
                  [h.AriaHidden(true), h.Class(className(styles.icon))],
                  [
                    Icon.icon(
                      'clock',
                      { class: className(styles.iconMuted) },
                      h,
                    ),
                  ],
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
                  ...(props.isReadOnly === true ? [h.AriaReadonly(true)] : []),
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
                  h.Class(
                    className(
                      reset.input,
                      styles.input,
                      isTimeInvalid && styles.inputInvalid,
                      isEffectivelyDisabled && styles.inputDisabled,
                    ),
                  ),
                ]),
              ],
            ),
            ...(isVisible && timeOptions.length > 0
              ? [
                  h.div(
                    [...backdrop, h.Class(className(overlayStyles.backdrop))],
                    [],
                  ),
                  h.div(
                    [
                      ...panel,
                      h.DataAttribute('slot', 'date-time-input-time-listbox'),
                      h.Class(className(overlayStyles.panel, styles.panel)),
                    ],
                    [
                      h.div(
                        [
                          h.Role('listbox'),
                          h.AriaLabel(`${resolvedTimeLabel} options`),
                          h.Class(className(styles.timeListbox)),
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
                                className(
                                  styles.timeOption,
                                  option.iso === selectedTimeISO &&
                                    styles.timeOptionSelected,
                                  TIME_OPTION_SIZE_STYLE[size],
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

  return h.div(
    [
      h.DataAttribute('slot', 'field'),
      h.Role('group'),
      h.DataAttribute('invalid', String(isInvalid)),
      h.Class(
        className(
          styles.field,
          props.width === undefined ? styles.fieldFit : styles.fullWidth,
          props.layoutStyle,
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
            className(
              styles.label,
              props.isLabelHidden === true && styles.labelHidden,
            ),
          ),
        ],
        [
          props.label,
          ...(props.isRequired === true
            ? [
                h.span(
                  [h.AriaHidden(true), h.Class(className(styles.requiredMark))],
                  ['*'],
                ),
              ]
            : []),
          ...(props.isOptional === true
            ? [h.span([h.Class(className(styles.optional))], [' (optional)'])]
            : []),
        ],
      ),
      h.div([h.Class(className(styles.row))], [datePopoverView, timeHalf]),
      ...(props.description === undefined
        ? []
        : [
            h.p(
              [
                h.Id(descriptionId),
                h.Class(className(reset.text, styles.description)),
              ],
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
                h.Class(className(STATUS_MESSAGE_STYLE[props.status.type])),
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
                h.Class(className(styles.srOnly)),
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
                h.Class(className(styles.srOnly)),
              ],
              ['Invalid time'],
            ),
          ]
        : []),
      ...(props.htmlName === undefined
        ? []
        : [
            h.input([
              h.Class(className(reset.input)),
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
}
