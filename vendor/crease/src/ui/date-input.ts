import { Option } from 'effect'

import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'
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
import { cn } from '@/lib/utils'
import { calendarView } from '@/ui/calendar'

/* Ported from Meta Astryx DateInput (packages/core/src/DateInput/) — examples
   and visual spec adapted to Crease UI tokens.

   Astrxy's inputWrapperStyles.base maps onto crease's input-group chrome:
   flex row, 4px/8px padding, 8px radius, input border. Its hover ring is an
   inset shadow in the input border color at 30%, and focus-within switches to
   the accent ring — crease's ring token carries both.

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

const FIELD_CLASS = 'grid gap-2'

const LABEL_CLASS =
  'flex items-center gap-2 text-sm leading-none font-medium select-none'

const OPTIONAL_CLASS = 'font-normal text-muted-foreground'

const DESCRIPTION_CLASS = 'text-muted-foreground text-sm'

const WRAPPER_CLASS =
  'relative flex items-center gap-2 rounded-md border border-input bg-transparent dark:bg-input/30 py-1 px-2 shadow-xs transition-[color,box-shadow] outline-none hover:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--input)_30%,transparent)] focus-within:border-ring focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_50%,transparent)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[invalid=true]:border-destructive dark:data-[invalid=true]:focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--destructive)_40%,transparent)] data-[invalid=true]:focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--destructive)_20%,transparent)]'

const WRAPPER_STATUS_CLASS: Readonly<
  Record<'error' | 'warning' | 'success', string>
> = {
  error:
    'border-destructive focus-within:ring-destructive/20 dark:focus-within:ring-destructive/40',
  warning:
    'border-warning focus-within:ring-warning/20 dark:focus-within:ring-warning/40',
  success:
    'border-success focus-within:ring-success/20 dark:focus-within:ring-success/40',
}

const WRAPPER_SIZE_CLASS: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'min-h-7',
  md: 'min-h-8',
  lg: 'min-h-9',
}

const ICON_BUTTON_CLASS =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4'

const INPUT_CLASS =
  'min-w-0 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed data-[disabled]:opacity-50'

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
  'z-50 w-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-hidden transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95'

const BACKDROP_CLASS = 'fixed inset-0 z-40'

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
  class?: string
  direction?: 'ltr' | 'rtl'
  ariaLabel?: string
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
      ...(props.label === undefined
        ? []
        : [
            h.label(
              [
                h.Id(labelId),
                h.For(resolvedInputId),
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
                  ? [
                      h.span(
                        [h.AriaHidden(true), h.Class('text-destructive')],
                        ['*'],
                      ),
                    ]
                  : []),
                ...(props.isOptional === true
                  ? [h.span([h.Class(OPTIONAL_CLASS)], [' (optional)'])]
                  : []),
              ],
            ),
          ]),
      h.submodel({
        slotId: model.datePicker.popover.id,
        model: model.datePicker.popover,
        view: PopoverPrimitive.view,
        viewInputs: {
          anchor: { placement: 'bottom-start', gap: 4 },
          focusSelector: '[role="grid"]',
          isDisabled: props.isDisabled ?? false,
          ariaLabelledBy: labelId,
          toView: ({ button, panel, backdrop, isVisible }) =>
            h.div(
              [
                h.DataAttribute('slot', 'date-input-control'),
                h.Class('w-full'),
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
                      cn(
                        WRAPPER_CLASS,
                        WRAPPER_SIZE_CLASS[props.size ?? 'md'],
                        props.status === undefined
                          ? undefined
                          : WRAPPER_STATUS_CLASS[props.status.type],
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
                        h.Class(ICON_BUTTON_CLASS),
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
                      h.Class(INPUT_CLASS),
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
                /* The popover portals backdrop+panel to #foldkit-portal-root,
                   so they must be siblings of the wrapper — never children —
                   or a keyed-diff insert inside the wrapper (e.g. the clear
                   button appearing on commit) references the portaled
                   backdrop and crashes the patch (insertBefore NotFoundError). */
                ...(isVisible
                  ? [
                      h.div([...backdrop, h.Class(BACKDROP_CLASS)], []),
                      h.div(
                        [
                          ...panel,
                          h.DataAttribute('slot', 'date-input-content'),
                          h.Class(PANEL_CLASS),
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
                h.Class(DESCRIPTION_CLASS),
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
                h.Class(STATUS_MESSAGE_CLASS[props.status.type]),
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
                h.Class('sr-only'),
              ],
              ['Invalid date'],
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
                  onSome: dateToISO,
                }),
              ),
            ]),
          ]),
    ],
  )
  return field
}
