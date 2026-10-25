import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import { Option } from 'effect'

import type { Html, HtmlBuilder } from 'foldkit/html'
import type * as FoldkitCalendar from 'foldkit/calendar'

import {
  Calendar as CalendarPrimitive,
  DatePicker as DatePickerPrimitive,
  Popover as PopoverPrimitive,
} from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import {
  dateToISO,
  formatSharedDate,
  type SharedDateFormat,
} from '@/lib/date-parse'
import {
  init,
  inputId,
  Message,
  Model,
  OutMessage,
  reflect,
  reflectConstraints,
  update,
} from '@/lib/date-input'
import { calendarView } from '@/stylex/calendar'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { themedAnchor } from './overlay-boundary'
import { overlayStyles } from './overlay-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx DateInput (packages/core/src/DateInput/) — examples
   and visual spec adapted to Crease UI tokens.

   astryx inputWrapperStyles.base: flex row, 4px/8px padding, 8px radius, the
   input border color, and an inset border-emphasized@30% shadow on hover that
   becomes the accent ring on focus-within. inputDark (var(--input) at 30%) and
   ringSoft (var(--ring) at 50%) carry those two states.

   PORT NOTE: `presentation` accepts astryx's full union but only 'popover'
   renders — foldkit has no bottom-sheet or native-picker surface.
   PORT NOTE: `numberOfMonths` accepts 1|2 but foldkit renders one month.
   PORT NOTE: `labelTooltip`/`disabledMessage` tooltips are not rendered; the
   values are still accepted so astryx call sites port unchanged. */

export {
  init,
  inputId,
  Message,
  Model,
  OutMessage,
  reflect,
  reflectConstraints,
  update,
}

export { dateFromISO, dateToISO } from '@/lib/date-parse'

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
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  required: { color: tokens.destructive },
  optional: { color: tokens.mutedForeground, fontWeight: 400 },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
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
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    transitionTimingFunction: interactionTokens.easingStandard,
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
    borderColor: {
      default: tokens.alertWarning,
      ':focus-within': tokens.alertWarning,
    },
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-within': `inset 0 0 0 2px color-mix(in oklab, ${tokens.alertWarning} 50%, transparent)`,
    },
  },
  wrapperSuccess: {
    borderColor: {
      default: tokens.alertSuccess,
      ':focus-within': tokens.alertSuccess,
    },
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-within': `inset 0 0 0 2px color-mix(in oklab, ${tokens.alertSuccess} 50%, transparent)`,
    },
  },
  wrapperDisabled: {
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  },
  sizeSm: { minHeight: '1.75rem' },
  sizeMd: { minHeight: '2rem' },
  sizeLg: { minHeight: '2.25rem' },
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
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1.5rem',
    width: '1.5rem',
  },
  iconButtonDisabled: {
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  },
  input: {
    flex: '1',
    backgroundColor: tokens.transparent,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    minWidth: 0,
  },
  inputDisabled: { cursor: interactionTokens.cursorDisabled, opacity: 0.5 },
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
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1.25rem',
    width: '1.25rem',
  },
  spinner: {
    alignItems: 'center',
    animationDuration: interactionTokens.motionLoopFast,
    animationIterationCount: 'infinite',
    animationName: stylex.keyframes({
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    }),
    animationTimingFunction: interactionTokens.easingLinear,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
  },
  statusIconError: {
    alignItems: 'center',
    color: tokens.destructive,
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusIconWarning: {
    alignItems: 'center',
    color: tokens.alertWarning,
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusIconSuccess: {
    alignItems: 'center',
    color: tokens.alertSuccess,
    display: 'inline-flex',
    flexShrink: 0,
  },
  statusError: {
    color: tokens.destructive,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  statusWarning: {
    color: tokens.alertWarning,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  statusSuccess: {
    color: tokens.alertSuccess,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  control: { width: '100%' },
  panel: { padding: 0, width: 'auto' },
  fieldFit: { width: 'fit-content' },
  invalidAlert: {
    borderWidth: 0,
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
})

export type DateInputStatus = Readonly<{
  type: 'error' | 'warning' | 'success'
  message?: string
}>

export type DateInputProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  label?: string
  isLabelHidden?: boolean
  description?: string
  placeholder?: string
  isOptional?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  /** Astryx shows it as a focus ring tooltip; accepted but not rendered. */
  disabledMessage?: string
  isReadOnly?: boolean
  status?: DateInputStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  /** Astryx shows it as a label tooltip; accepted but not rendered. */
  labelTooltip?: string
  width?: number
  size?: 'sm' | 'md' | 'lg'
  format?: SharedDateFormat | ((iso: string) => string)
  hasClear?: boolean
  isBusy?: boolean
  /** PORT NOTE: foldkit's calendar renders a single month; 2 is accepted for
   *  prop compatibility and clamps to one month. */
  numberOfMonths?: 1 | 2
  /** 0 = Sunday … 6 = Saturday; maps onto the calendar locale's
   *  firstDayOfWeek. Requires re-init or a matching calendarLocale. */
  weekStartsOn?: number
  presentation?: 'popover' | 'adaptive-bottom-sheet' | 'native-picker'
  htmlName?: string
  inputId?: string
  layoutStyle?: ComponentLayoutStyle
  direction?: 'ltr' | 'rtl'
  ariaLabel?: string
}>

const WRAPPER_STATUS_STYLE = {
  error: styles.wrapperError,
  warning: styles.wrapperWarning,
  success: styles.wrapperSuccess,
} as const

const STATUS_ICON_STYLE = {
  error: styles.statusIconError,
  warning: styles.statusIconWarning,
  success: styles.statusIconSuccess,
} as const

const STATUS_MESSAGE_STYLE = {
  error: styles.statusError,
  warning: styles.statusWarning,
  success: styles.statusSuccess,
} as const

const SIZE_STYLE = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
} as const

const statusIcon = <Msg>(
  type: 'error' | 'warning' | 'success',
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(className(STATUS_ICON_STYLE[type])), h.AriaHidden(true)],
    [
      type === 'error'
        ? Icon.octagonX({ class: 'size-4' }, h)
        : type === 'warning'
          ? Icon.triangleAlert({ class: 'size-4' }, h)
          : Icon.circleCheck({ class: 'size-4' }, h),
    ],
  )

const formatValue = <Msg>(
  props: DateInputProps<Msg>,
  date: FoldkitCalendar.CalendarDate,
): string => {
  const format = props.format ?? 'date_long'
  return typeof format === 'function'
    ? format(dateToISO(date))
    : formatSharedDate(date, format, props.model.locale)
}

export const dateInput = <Msg>(
  props: DateInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const resolvedInputId = props.inputId ?? inputId(model.id)
  const labelId = `${model.id}-label`
  const descriptionId = `${model.id}-description`
  const statusMessageId = `${model.id}-status`
  const displayValue = Option.getOrElse(model.pendingInput, () =>
    Option.match(model.value, {
      onNone: () => '',
      onSome: date => formatValue(props, date),
    }),
  )
  const isOpen = model.datePicker.popover.isOpen
  const isInvalid = model.isInputInvalid || props.status?.type === 'error'
  const toParent = props.toParentMessage
  const describedBy = [
    props.description === undefined ? undefined : descriptionId,
    props.status?.message === undefined ||
    (props.statusVariant ?? 'attached') === 'tooltip'
      ? undefined
      : statusMessageId,
    ...(isInvalid ? [`${model.id}-invalid`] : []),
  ]
    .filter((id): id is string => id !== undefined)
    .join(' ')

  return h.div(
    [
      h.DataAttribute('slot', 'field'),
      h.Role('group'),
      h.DataAttribute('invalid', String(isInvalid)),
      h.Class(
        className(
          styles.field,
          ...(props.width === undefined ? [styles.fieldFit] : [styles.control]),
          props.layoutStyle,
        ),
      ),
      ...(props.width === undefined
        ? []
        : [h.Style({ width: `${String(props.width)}px` })]),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
    ],
    [
      ...(props.label === undefined
        ? []
        : [
            h.label(
              [
                h.Id(labelId),
                h.For(resolvedInputId),
                h.DataAttribute('slot', 'field-label'),
                h.Class(
                  className(
                    styles.label,
                    ...(props.isLabelHidden === true
                      ? [styles.labelHidden]
                      : []),
                  ),
                ),
              ],
              [
                props.label,
                ...(props.isRequired === true
                  ? [
                      h.span(
                        [
                          h.AriaHidden(true),
                          h.Class(className(styles.required)),
                        ],
                        ['*'],
                      ),
                    ]
                  : []),
                ...(props.isOptional === true
                  ? [
                      h.span(
                        [h.Class(className(styles.optional))],
                        [' (optional)'],
                      ),
                    ]
                  : []),
              ],
            ),
          ]),
      h.submodel({
        slotId: model.datePicker.popover.id,
        model: model.datePicker.popover,
        view: PopoverPrimitive.view,
        viewInputs: {
          anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
          focusSelector: '[role="grid"]',
          isDisabled: props.isDisabled ?? false,
          ariaLabelledBy: labelId,
          toView: ({ button, panel, backdrop, isVisible }) =>
            h.div(
              [
                h.DataAttribute('slot', 'date-input-control'),
                h.Class(className(styles.control)),
              ],
              [
                h.div(
                  [
                    h.DataAttribute('slot', 'date-input-wrapper'),
                    h.DataAttribute('invalid', String(isInvalid)),
                    ...(props.isDisabled === true
                      ? [h.AriaDisabled(true)]
                      : []),
                    h.Class(
                      className(
                        styles.wrapper,
                        SIZE_STYLE[props.size ?? 'md'],
                        ...(props.isDisabled === true
                          ? [styles.wrapperDisabled]
                          : []),
                        ...(isInvalid ? [styles.wrapperInvalid] : []),
                        ...(props.status === undefined
                          ? []
                          : [WRAPPER_STATUS_STYLE[props.status.type]]),
                      ),
                    ),
                  ],
                  [
                    h.button(
                      [
                        ...button,
                        h.DataAttribute('slot', 'date-input-trigger'),
                        h.AriaLabel('Choose date'),
                        ...(props.isDisabled === true
                          ? [h.Disabled(true)]
                          : []),
                        h.Class(
                          className(
                            reset.button,
                            styles.iconButton,
                            ...(props.isDisabled === true
                              ? [styles.iconButtonDisabled]
                              : []),
                          ),
                        ),
                      ],
                      [Icon.calendarIcon({ class: 'size-4' }, h)],
                    ),
                    h.input([
                      h.Id(resolvedInputId),
                      h.Type('text'),
                      h.Role('combobox'),
                      h.AriaHasPopup('dialog'),
                      h.AriaExpanded(isOpen),
                      ...(isOpen
                        ? [
                            h.AriaControls(
                              `${model.datePicker.popover.id}-panel`,
                            ),
                          ]
                        : []),
                      h.AriaAutocomplete('none'),
                      h.Value(displayValue),
                      h.Placeholder(props.placeholder ?? 'Select a date'),
                      ...(props.label !== undefined ||
                      props.ariaLabel === undefined
                        ? []
                        : [h.AriaLabel(props.ariaLabel)]),
                      ...(props.isDisabled === true
                        ? [h.Disabled(true), h.DataAttribute('disabled', '')]
                        : []),
                      ...(props.isReadOnly === true ? [h.Readonly(true)] : []),
                      ...(isInvalid ? [h.AriaInvalid(true)] : []),
                      ...(describedBy === ''
                        ? []
                        : [h.AriaDescribedBy(describedBy)]),
                      h.OnInput(value =>
                        toParent(Message.UpdatedInputValue({ value })),
                      ),
                      h.OnFocus(toParent(Message.FocusedInput())),
                      h.OnBlur(toParent(Message.BlurredInput())),
                      h.OnClick(toParent(Message.ClickedInput())),
                      h.OnKeyDown((key, modifiers) =>
                        toParent(
                          Message.PressedInputKey({
                            key,
                            isAlt: modifiers.altKey,
                          }),
                        ),
                      ),
                      h.Class(
                        className(
                          reset.input,
                          styles.input,
                          ...(props.isDisabled === true
                            ? [styles.inputDisabled]
                            : []),
                        ),
                      ),
                    ]),
                    ...(props.hasClear === true && Option.isSome(model.value)
                      ? [
                          h.button(
                            [
                              h.Type('button'),
                              h.Tabindex(-1),
                              h.AriaLabel('Clear date'),
                              h.OnClick(toParent(Message.ClearedInput())),
                              ...(props.isDisabled === true
                                ? [h.Disabled(true)]
                                : []),
                              h.Class(
                                className(reset.button, styles.clearButton),
                              ),
                            ],
                            [Icon.x({ class: 'size-3.5' }, h)],
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
                            [Icon.loaderCircle({ class: 'size-4' }, h)],
                          ),
                        ]
                      : []),
                    ...(props.status === undefined
                      ? []
                      : [statusIcon(props.status.type, h)]),
                  ],
                ),
                /* Backdrop+panel portal to #foldkit-portal-root; keep them
                   siblings of the wrapper so wrapper diffs never reference
                   portaled nodes (insertBefore crash on clear-button insert). */
                ...(isVisible
                  ? [
                      h.div(
                        [
                          ...backdrop,
                          h.Class(className(overlayStyles.backdrop)),
                        ],
                        [],
                      ),
                      h.div(
                        [
                          ...panel,
                          h.DataAttribute('slot', 'date-input-content'),
                          h.Class(className(overlayStyles.panel, styles.panel)),
                        ],
                        [
                          h.submodel({
                            slotId: model.datePicker.calendar.id,
                            model: model.datePicker.calendar,
                            view: CalendarPrimitive.view,
                            viewInputs: {
                              maybeSelectedDate: model.value,
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
                                    DatePickerPrimitive.Message.GotCalendarMessage(
                                      { message },
                                    ),
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
      }),
      ...(props.description === undefined
        ? []
        : [
            h.p(
              [
                h.Id(descriptionId),
                h.DataAttribute('slot', 'field-description'),
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
                h.DataAttribute('slot', 'field-status'),
                h.Role('status'),
                h.Class(className(STATUS_MESSAGE_STYLE[props.status.type])),
              ],
              [props.status.message],
            ),
          ]),
      ...(isInvalid
        ? [
            h.div(
              [
                h.Id(`${model.id}-invalid`),
                h.Role('alert'),
                h.Class(className(styles.invalidAlert)),
              ],
              ['Invalid date'],
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
                  onSome: dateToISO,
                }),
              ),
            ]),
          ]),
    ],
  )
}
