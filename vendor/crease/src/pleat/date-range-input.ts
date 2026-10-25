import { Style, When, Global } from '@pleat/core'
import { reset } from '@/pleat/reset'
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
import { calendarView } from '@/pleat/calendar'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { themedAnchor } from './overlay-boundary'
import { overlayStyles } from './overlay-tokens'
import { className } from './style'
import { tokens } from './tokens'

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

const styles = {
  field: Style.make({ gap: '0.5rem', display: 'grid' }),
  root: Style.make({ position: 'relative' }),
  label: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  }),
  optional: Style.make({ color: tokens.mutedForeground, fontWeight: 400 }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  wrapper: Style.make({
    borderColor: tokens.input,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: tokens.inputSurface,
    boxShadow: foundationTokens.shadowXs,
    display: 'flex',
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    transitionTimingFunction: interactionTokens.easingStandard,
    minWidth: '11.25rem',
  }).pipe(
    Style.when(When.focusWithin, {
      borderColor: tokens.ring,
      boxShadow: `inset 0 0 0 2px ${foundationTokens.ringSoft}`,
    }),
    Style.when(When.hover, {
      boxShadow: `inset 0 0 0 2px ${foundationTokens.inputDark}`,
    }),
  ),
  wrapperDisabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  }),
  wrapperInvalid: Style.make({
    borderColor: tokens.destructive,
    boxShadow: foundationTokens.shadowXs,
  }).pipe(
    Style.when(When.focusWithin, {
      boxShadow: `inset 0 0 0 2px ${foundationTokens.destructiveRingSoft}`,
    }),
    Style.when(When.hover, {
      boxShadow: `inset 0 0 0 2px ${foundationTokens.inputDark}`,
    }),
  ),
  wrapperError: Style.make({ borderColor: tokens.destructive }),
  wrapperWarning: Style.make({ borderColor: tokens.alertWarning }),
  wrapperSuccess: Style.make({ borderColor: tokens.alertSuccess }),
  sizeSm: Style.make({ height: '1.75rem' }),
  sizeMd: Style.make({ height: '2rem' }),
  sizeLg: Style.make({ height: '2.25rem' }),
  iconButton: Style.make({
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.foreground,
    }),
  ),
  iconButtonDisabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  }),
  trigger: Style.make({
    overflow: 'hidden',
    backgroundColor: 'transparent',
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'block',
    flexBasis: '0%',
    flexGrow: 1,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textAlign: 'start',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  }).pipe(
    Style.when(When.disabled, { cursor: interactionTokens.cursorDefault }),
  ),
  triggerPlaceholder: Style.make({ color: tokens.mutedForeground }),
  clearButton: Style.make({
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1.25rem',
    width: '1.25rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.foreground,
    }),
  ),
  spinner: Style.make({
    animationDuration: interactionTokens.motionLoopFast,
    animationIterationCount: 'infinite',
    animationName: Global.keyframes('date-range-input-kf1', {
      to: { transform: 'rotate(360deg)' },
    }),
    animationTimingFunction: interactionTokens.easingLinear,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
  }),
  statusError: Style.make({
    color: tokens.destructive,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  }),
  statusWarning: Style.make({
    color: tokens.alertWarning,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  }),
  statusSuccess: Style.make({
    color: tokens.alertSuccess,
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  }),
  statusMessageError: Style.make({
    color: tokens.destructive,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  statusMessageWarning: Style.make({
    color: tokens.alertWarning,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  statusMessageSuccess: Style.make({
    color: tokens.alertSuccess,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  panel: Style.make({
    padding: 0,
    maxWidth: 'calc(100vw - 2rem)',
    width: 'auto',
  }),
  popoverLayout: Style.make({ display: 'flex', flexDirection: 'column' }).pipe(
    Style.when(When.minWidth('640px'), { flexDirection: 'row' }),
  ),
  presetSidebar: Style.make({
    borderBlockEndColor: tokens.input,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    borderInlineEndColor: tokens.input,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: 0,
    display: 'grid',
    flexDirection: 'column',
    gap: '0.25rem',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    minWidth: 0,
    padding: '0.75rem',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      borderBlockEndWidth: 0,
      borderInlineEndWidth: 1,
      display: 'flex',
      minWidth: '8.75rem',
    }),
  ),
  presetButton: Style.make({
    backgroundColor: 'transparent',
    borderRadius: foundationTokens.radiusMd,
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'block',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    textAlign: 'start',
    width: '100%',
  }).pipe(
    Style.when(When.hover, { backgroundColor: tokens.accent }),
    Style.when(When.disabled, { cursor: interactionTokens.cursorDefault }),
  ),
  presetButtonActive: Style.make({
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  }),
  presetButtonDisabled: Style.make({
    color: tokens.mutedForeground,
    opacity: 0.5,
  }),
  iconSize: Style.make({ height: '1rem', width: '1rem' }),
  clearIconSize: Style.make({ height: '0.875rem', width: '0.875rem' }),
  requiredMark: Style.make({ color: tokens.destructive }),
}

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
  /** Parent-layout positioning only. Add visual choices as named variants. */
  layoutStyle?: ComponentLayoutStyle | undefined
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
    status,
    statusVariant = 'attached',
    width,
    size = 'md',
    presets,
    hasClear = true,
    isBusy = false,
    placeholder = 'Select date range',
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
      anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
      focusSelector: '[role="grid"]',
      isDisabled: isEffectivelyDisabled,
      ariaLabelledBy: labelId,
      toView: ({ button, panel, backdrop, isVisible }) =>
        /* Backdrop+panel portal to #foldkit-portal-root; keep them siblings
           of the wrapper (inside a neutral outer div) so wrapper diffs never
           reference portaled nodes (insertBefore crash on clear insert). */
        h.div(
          [
            h.DataAttribute('slot', 'date-range-input'),
            h.DataAttribute('invalid', isInvalid ? 'true' : 'false'),
            ...(direction === undefined ? [] : [h.Dir(direction)]),
            h.Class(
              className(
                styles.root,
                isEffectivelyDisabled && styles.wrapperDisabled,
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
                  className(
                    styles.wrapper,
                    SIZE_STYLE[size],
                    status === undefined
                      ? false
                      : status.type === 'error'
                        ? styles.wrapperError
                        : status.type === 'warning'
                          ? styles.wrapperWarning
                          : styles.wrapperSuccess,
                    isInvalid && styles.wrapperInvalid,
                    isEffectivelyDisabled && styles.wrapperDisabled,
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
                    h.Class(
                      className(
                        reset.button,
                        styles.iconButton,
                        isEffectivelyDisabled && styles.iconButtonDisabled,
                      ),
                    ),
                  ],
                  [
                    Icon.icon(
                      'calendar',
                      { class: className(styles.iconSize) },
                      h,
                    ),
                  ],
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
                      className(
                        reset.button,
                        styles.trigger,
                        displayValue === '' && styles.triggerPlaceholder,
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
                ...(isBusy
                  ? [
                      h.span(
                        [
                          h.Class(className(styles.spinner)),
                          h.AriaHidden(true),
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
                ...(status === undefined ? [] : [statusIcon(status.type, h)]),
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
                      h.DataAttribute('slot', 'popover-content'),
                      h.Class(className(overlayStyles.panel, styles.panel)),
                    ],
                    [
                      h.div(
                        [
                          h.DataAttribute('slot', 'popover-layout'),
                          h.Class(className(styles.popoverLayout)),
                        ],
                        [
                          ...(presets === undefined || presets.length === 0
                            ? []
                            : [
                                h.div(
                                  [
                                    h.Role('group'),
                                    h.AriaLabel('Preset date ranges'),
                                    h.Class(className(styles.presetSidebar)),
                                  ],
                                  presets.map(preset => {
                                    const range = preset.getRange()
                                    const isActive = Option.isSome(model.value)
                                      ? FoldkitCalendar.isEqual(
                                          model.value.value.start,
                                          range.start,
                                        ) &&
                                        FoldkitCalendar.isEqual(
                                          model.value.value.end,
                                          range.end,
                                        )
                                      : false
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
                                            Message.ClickedPreset({ range }),
                                          ),
                                        ),
                                        h.Class(
                                          className(
                                            reset.button,
                                            styles.presetButton,
                                            isActive &&
                                              styles.presetButtonActive,
                                            isPresetDisabled &&
                                              styles.presetButtonDisabled,
                                          ),
                                        ),
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
      ...(width === undefined ? [] : [h.Style({ width: `${width}px` })]),
      h.Class(className(styles.field, props.layoutStyle)),
    ],
    [
      ...(isLabelHidden
        ? []
        : [
            h.span(
              [h.Id(labelId), h.Class(className(styles.label))],
              [
                label,
                ...(isRequired
                  ? [
                      h.span(
                        [
                          h.Class(className(styles.requiredMark)),
                          h.AriaHidden(true),
                        ],
                        ['*'],
                      ),
                    ]
                  : []),
                ...(isOptional
                  ? [
                      h.span(
                        [h.Class(className(styles.optional))],
                        ['(optional)'],
                      ),
                    ]
                  : []),
              ],
            ),
          ]),
      popoverView,
      ...(description === undefined
        ? []
        : [
            h.p(
              [
                h.Id(descriptionId),
                h.Class(className(reset.text, styles.description)),
              ],
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
                h.Class(className(STATUS_MESSAGE_STYLE[status.type])),
              ],
              [status.message],
            ),
          ]),
    ],
  )
}
