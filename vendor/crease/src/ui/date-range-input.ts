import { Option } from 'effect'

import type { Html, HtmlBuilder } from 'foldkit/html'
import * as FoldkitCalendar from 'foldkit/calendar'

import {
  Calendar as CalendarPrimitive,
  Popover as PopoverPrimitive,
} from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import {
  formatRangeDisplay,
  init,
  isPresetSelectable,
  Message,
  Model,
  OutMessage,
  type Range,
  reflect,
  reflectConstraints,
  update,
} from '@/lib/date-range-input'
import { cn } from '@/lib/utils'
import { calendarView } from '@/ui/calendar'

/* Ported from Meta Astryx DateRangeInput (packages/core/src/DateRangeInput/)
   — examples and visual spec adapted to Crease UI tokens.

   The trigger is a button: icon button + text trigger share the popover's
   toggle. The panel lays a preset sidebar beside a single-month calendar.

   PORT NOTE: foldkit's calendar renders a single month; astryx defaults to
   two. `numberOfMonths` accepts 1|2 but clamps to one month.
   PORT NOTE: `dateConstraints` predicate functions can't be folded into the
   calendar's declarative disabled sets — use `disabledDates`/`disabledDaysOfWeek`
   at init/reflectConstraints instead.
   PORT NOTE: `labelTooltip`/`disabledMessage` tooltips are not rendered; the
   values are still accepted so astryx call sites port unchanged. */

export {
  formatRangeDisplay,
  init,
  isPresetSelectable,
  Message,
  Model,
  OutMessage,
  reflect,
  reflectConstraints,
  update,
}

export type { Range }

export { dateFromISO, dateToISO } from '@/lib/date-parse'

export type DateRangePreset = Readonly<{
  label: string
  getRange: () => Range
}>

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
  error: 'border-destructive',
  warning: 'border-warning',
  success: 'border-success',
}

const WRAPPER_SIZE_CLASS: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'h-7 min-w-45',
  md: 'h-8 min-w-45',
  lg: 'h-9 min-w-45',
}

const ICON_BUTTON_CLASS =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4'

const TRIGGER_CLASS =
  'block min-w-0 flex-1 cursor-pointer overflow-hidden bg-transparent text-start text-sm text-nowrap text-ellipsis outline-hidden disabled:cursor-default'

const TRIGGER_PLACEHOLDER_CLASS = 'text-muted-foreground'

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
  'z-50 w-auto max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-hidden transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95'

const POPOVER_LAYOUT_CLASS = 'flex flex-col sm:flex-row'

const PRESET_SIDEBAR_CLASS =
  'grid min-w-0 grid-cols-2 gap-1 border-b border-input p-3 sm:flex sm:min-w-35 sm:flex-col sm:border-e sm:border-b-0'

const PRESET_BUTTON_CLASS =
  'block w-full cursor-pointer rounded-md bg-transparent px-2 py-1 text-start text-sm text-foreground outline-hidden transition-colors hover:bg-accent disabled:cursor-default disabled:text-muted-foreground disabled:opacity-50 aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground'

const BACKDROP_CLASS = 'fixed inset-0 z-40'

export type DateRangeInputStatus = Readonly<{
  type: 'error' | 'warning' | 'success'
  message?: string
}>

export type DateRangeInputProps<Msg> = Readonly<{
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
  status?: DateRangeInputStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  /** Astryx shows it as a label tooltip; accepted but not rendered. */
  labelTooltip?: string
  width?: number
  size?: 'sm' | 'md' | 'lg'
  presets?: ReadonlyArray<DateRangePreset>
  hasClear?: boolean
  isBusy?: boolean
  placeholder?: string
  /** PORT NOTE: foldkit's calendar renders a single month; 2 is accepted for
   *  prop compatibility and clamps to one month. */
  numberOfMonths?: 1 | 2
  /** 0 = Sunday … 6 = Saturday; maps onto the calendar locale's
   *  firstDayOfWeek. Requires re-init or a matching calendarLocale. */
  weekStartsOn?: number
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
        ? Icon.icon('octagon-x', { class: 'size-4' }, h)
        : type === 'warning'
          ? Icon.icon('triangle-alert', { class: 'size-4' }, h)
          : Icon.icon('circle-check', { class: 'size-4' }, h),
    ],
  )

export const dateRangeInput = <Msg>(
  props: DateRangeInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const {
    model,
    toParentMessage,
    label,
    isLabelHidden = false,
    description,
    isOptional = false,
    isRequired = false,
    isDisabled = false,
    isReadOnly = false,
    status,
    statusVariant = 'attached',
    width,
    size = 'md',
    presets,
    hasClear = true,
    isBusy = false,
    placeholder = 'Select date range',
    class: className,
    direction,
  } = props

  const isEffectivelyDisabled = isDisabled || isBusy
  const isInvalid = status?.type === 'error'

  const today = model.calendar.today
  const displayValue = formatRangeDisplay(model.value, today, model.locale)
  const triggerLabel = Option.isSome(model.value)
    ? `${label}: ${displayValue}`
    : `${label}: ${placeholder}`

  const descriptionId = `${model.id}-description`
  const statusMessageId = `${model.id}-status-message`
  const labelId = `${model.id}-label`
  const describedBy = [
    description === undefined ? undefined : descriptionId,
    statusVariant !== 'tooltip' && status?.message !== undefined
      ? statusMessageId
      : undefined,
  ]
    .filter((id): id is string => id !== undefined)
    .join(' ')

  const displayRange = Option.match(model.pendingStart, {
    onNone: () =>
      Option.map(model.value, range => ({
        start: range.start,
        end: range.end,
      })),
    onSome: start => Option.some({ start, end: start }),
  })

  const popoverView = h.submodel({
    slotId: model.popover.id,
    model: model.popover,
    view: PopoverPrimitive.view,
    viewInputs: {
      anchor: { placement: 'bottom-start', gap: 4 },
      focusSelector: '[role="grid"]',
      isDisabled: isEffectivelyDisabled,
      ariaLabelledBy: labelId,
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [
            h.DataAttribute('slot', 'date-range-input'),
            h.DataAttribute('invalid', isInvalid ? 'true' : 'false'),
            ...(direction === undefined ? [] : [h.Dir(direction)]),
            h.Class(
              cn(
                'relative',
                isEffectivelyDisabled && 'cursor-not-allowed opacity-50',
              ),
            ),
          ],
          [
            h.div(
              [
                h.DataAttribute('slot', 'date-range-input-wrapper'),
                h.AriaDisabled(isEffectivelyDisabled),
                h.DataAttribute('invalid', isInvalid ? 'true' : 'false'),
                h.Class(
                  cn(
                    WRAPPER_CLASS,
                    WRAPPER_SIZE_CLASS[size],
                    status === undefined
                      ? undefined
                      : WRAPPER_STATUS_CLASS[status.type],
                  ),
                ),
              ],
              [
                h.button(
                  [
                    h.Type('button'),
                    h.AriaLabel(isVisible ? 'Close calendar' : 'Open calendar'),
                    h.Tabindex(-1),
                    h.OnClick(toParentMessage(Message.ClickedIcon())),
                    ...(isEffectivelyDisabled ? [h.Disabled(true)] : []),
                    h.Class(ICON_BUTTON_CLASS),
                  ],
                  [Icon.calendarIcon({ class: 'size-4' }, h)],
                ),
                h.button(
                  [
                    ...button,
                    h.AriaLabel(triggerLabel),
                    ...(describedBy === ''
                      ? []
                      : [h.AriaDescribedBy(describedBy)]),
                    ...(isRequired ? [h.AriaRequired(true)] : []),
                    ...(isInvalid ? [h.AriaInvalid(true)] : []),
                    ...(isBusy ? [h.AriaBusy(true)] : []),
                    h.Class(
                      cn(
                        TRIGGER_CLASS,
                        displayValue === '' && TRIGGER_PLACEHOLDER_CLASS,
                      ),
                    ),
                  ],
                  [displayValue === '' ? placeholder : displayValue],
                ),
                ...(hasClear &&
                Option.isSome(model.value) &&
                !isEffectivelyDisabled
                  ? [
                      h.button(
                        [
                          h.Type('button'),
                          h.AriaLabel(`Clear ${label}`),
                          h.Tabindex(-1),
                          h.OnClick(toParentMessage(Message.ClearedValue())),
                          h.Class(CLEAR_BUTTON_CLASS),
                        ],
                        [Icon.x({ class: 'size-3.5' }, h)],
                      ),
                    ]
                  : []),
                ...(isBusy
                  ? [
                      h.span(
                        [h.Class(SPINNER_CLASS), h.AriaHidden(true)],
                        [Icon.loaderCircle({ class: 'size-4' }, h)],
                      ),
                    ]
                  : []),
                ...(status === undefined ? [] : [statusIcon(status.type, h)]),
              ],
            ),
            /* Backdrop+panel portal to #foldkit-portal-root; keep them
               siblings of the wrapper so wrapper diffs never reference
               portaled nodes (insertBefore crash on clear-button insert). */
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class(BACKDROP_CLASS)], []),
                  h.div(
                    [
                      ...panel,
                      h.DataAttribute('slot', 'popover-content'),
                      h.Class(PANEL_CLASS),
                    ],
                    [
                      h.div(
                        [
                          h.DataAttribute('slot', 'popover-layout'),
                          h.Class(POPOVER_LAYOUT_CLASS),
                        ],
                        [
                          ...(presets === undefined || presets.length === 0
                            ? []
                            : [
                                h.div(
                                  [
                                    h.Role('group'),
                                    h.AriaLabel('Preset date ranges'),
                                    h.Class(PRESET_SIDEBAR_CLASS),
                                  ],
                                  presets.map(preset => {
                                    const range = preset.getRange()
                                    const isActive = Option.match(model.value, {
                                      onNone: () => false,
                                      onSome: current =>
                                        FoldkitCalendar.isEqual(
                                          current.start,
                                          range.start,
                                        ) &&
                                        FoldkitCalendar.isEqual(
                                          current.end,
                                          range.end,
                                        ),
                                    })
                                    const isPresetDisabled =
                                      !isPresetSelectable(model, range)
                                    return h.button(
                                      [
                                        h.Type('button'),
                                        ...(isActive
                                          ? [h.AriaCurrent('true')]
                                          : []),
                                        ...(isPresetDisabled
                                          ? [h.Disabled(true)]
                                          : []),
                                        h.OnClick(
                                          toParentMessage(
                                            Message.ClickedPreset({
                                              range,
                                            }),
                                          ),
                                        ),
                                        h.Class(PRESET_BUTTON_CLASS),
                                      ],
                                      [preset.label],
                                    )
                                  }),
                                ),
                              ]),
                          h.submodel({
                            slotId: model.calendar.id,
                            model: model.calendar,
                            view: CalendarPrimitive.view,
                            viewInputs: {
                              maybeSelectedDate: Option.none(),
                              toView: calendarAttrs =>
                                calendarView(
                                  calendarAttrs,
                                  {
                                    ...(Option.isSome(displayRange)
                                      ? { range: displayRange.value }
                                      : {}),
                                    ...(direction === undefined
                                      ? {}
                                      : { direction }),
                                  },
                                  h,
                                ),
                            },
                            toParentMessage: calendarMessage =>
                              toParentMessage(
                                Message.GotCalendarMessage({
                                  message: calendarMessage,
                                }),
                              ),
                          }),
                        ],
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: popoverMessage =>
      toParentMessage(Message.GotPopoverMessage({ message: popoverMessage })),
  })

  return h.div(
    [
      h.DataAttribute('slot', 'field'),
      h.Role('group'),
      h.DataAttribute('invalid', isInvalid ? 'true' : 'false'),
      ...(describedBy === '' ? [] : []),
      ...(width === undefined ? [] : [h.Style({ width: `${width}px` })]),
      h.Class(cn(FIELD_CLASS, className)),
    ],
    [
      ...(isLabelHidden
        ? []
        : [
            h.span(
              [h.Id(labelId), h.Class(LABEL_CLASS)],
              [
                label,
                ...(isRequired
                  ? [
                      h.span(
                        [h.Class('text-destructive'), h.AriaHidden(true)],
                        ['*'],
                      ),
                    ]
                  : []),
                ...(isOptional
                  ? [h.span([h.Class(OPTIONAL_CLASS)], ['(optional)'])]
                  : []),
              ],
            ),
          ]),
      popoverView,
      ...(description === undefined
        ? []
        : [
            h.p(
              [h.Id(descriptionId), h.Class(DESCRIPTION_CLASS)],
              [description],
            ),
          ]),
      ...(statusVariant === 'tooltip' || status?.message === undefined
        ? []
        : [
            h.div(
              [
                h.Id(statusMessageId),
                h.Role('status'),
                h.Class(STATUS_MESSAGE_CLASS[status.type]),
              ],
              [status.message],
            ),
          ]),
    ],
  )
}
