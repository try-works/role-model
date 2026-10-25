import { reset } from '@/stylex/reset'
import { Option } from 'effect'
import * as FoldkitCalendar from 'foldkit/calendar'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { DatePicker as DatePickerPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import { mirrorNavigationKeyForRtl } from '@/lib/calendar'
import { calendarView } from './calendar'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { overlayStyles } from './overlay-tokens.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { themedAnchor, themedPopoverPanel } from './overlay-boundary'
import { className } from './style'
import { tokens } from './tokens.stylex'

const styles = stylex.create({
  contents: { display: 'contents' },
  icon: { flexShrink: 0 },
  empty: { color: tokens.mutedForeground },
  panel: { padding: 0, maxWidth: 'calc(100vw - 2rem)', width: 'auto' },
  trigger: {
    fontWeight: 400,
    justifyContent: 'flex-start',
    textAlign: 'left',
    width: '15rem',
  },
  triggerButton: {
    borderColor: { default: tokens.border, ':focus-visible': tokens.ring },
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundClip: 'padding-box',
    backgroundColor: {
      default: tokens.background,
      ':is([aria-expanded="true"])': tokens.muted,
      ':hover': tokens.muted,
    },
    boxShadow: {
      default: tokens.shadowSm,
      ':focus-visible': tokens.focusRingShadow,
    },
    color: 'inherit',
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    opacity: {
      default: 1,
      ':is([data-disabled], [aria-disabled="true"])': 0.5,
    },
    outlineStyle: 'none',
    // Removes the baseline strut the primitive's block wrapper divs add below
    // the inline-flex trigger, which otherwise nudges the trigger upward.
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
    height: '2.25rem',
  },
  field: { gap: '0.5rem', display: 'grid' },
  fieldRow: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  },
  input: {
    borderColor: tokens.border,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingInline: '0.75rem',
    backgroundColor: tokens.background,
    flexBasis: '0%',
    flexGrow: 1,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '2.5rem',
    minWidth: 0,
  },
  inputLabel: { fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.25rem' },
  error: {
    color: tokens.destructive,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  mobileDialog: {
    position: {
      default: null,
      // eslint-disable-next-line @stylexjs/valid-styles -- reason: Override Foldkit's inline positioning for the mobile dialog.
      '@media (max-width: 639px)': 'fixed !important',
    },
    bottom: { default: null, '@media (max-width: 639px)': '0.75rem' },
    left: { default: null, '@media (max-width: 639px)': '0.75rem !important' },
    maxWidth: {
      default: null,
      '@media (max-width: 639px)': 'calc(100vw - 1.5rem)',
    },
    right: { default: null, '@media (max-width: 639px)': '0.75rem' },
    top: { default: null, '@media (max-width: 639px)': 'auto !important' },
    width: { default: null, '@media (max-width: 639px)': 'auto' },
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* Ported from shadcn's date-picker demo on top of foldkit DatePicker.

   DatePicker is config-driven, so trigger/panel/backdrop classes are passed
   through their ClassName inputs and every supplemental attribute bundle is
   wrapped with childAttributes. The popover uses foldkit's forced inline
   positioning; no Style attribute is emitted here. */

export const Model = DatePickerPrimitive.Model
export type Model = typeof Model.Type
export const Message = DatePickerPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = DatePickerPrimitive.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = DatePickerPrimitive.init
export const update = DatePickerPrimitive.update
export const open = DatePickerPrimitive.open
export const close = DatePickerPrimitive.close
export const selectDate = DatePickerPrimitive.selectDate
export const clear = DatePickerPrimitive.clear
export const focusDate = DatePickerPrimitive.focusDate
export const reflectMinDate = DatePickerPrimitive.reflectMinDate
export const reflectMaxDate = DatePickerPrimitive.reflectMaxDate
export const reflectDisabledDates = DatePickerPrimitive.reflectDisabledDates
export const reflectDisabledDaysOfWeek =
  DatePickerPrimitive.reflectDisabledDaysOfWeek
export const triggerId = DatePickerPrimitive.triggerId

/** Wraps update for right-to-left pickers: the embedded calendar's grid is
 *  mirrored visually, so ArrowLeft/ArrowRight inside the calendar submodel
 *  must swap to move the cursor in the visual direction. */
export const updateForRtl = (
  model: Model,
  message: Message,
): ReturnType<typeof update> =>
  update(
    model,
    message._tag === 'GotCalendarMessage'
      ? Message.GotCalendarMessage({
          message: mirrorNavigationKeyForRtl(message.message),
        })
      : message,
  )

const TRIGGER_CLASS = styles.triggerButton

const PANEL_CLASS = styles.panel

const BACKDROP_CLASS = overlayStyles.backdrop

type DatePickerTextInput<Msg> =
  | Readonly<{
      query: string
      onQueryInput: (value: string) => Msg
      inputLabel: string
      parseError?: string
    }>
  | Readonly<{
      query?: never
      onQueryInput?: never
      inputLabel?: never
      parseError?: never
    }>
export type DatePickerProps<Msg> = Readonly<{
  model: Model
  maybeSelectedDate: Option.Option<FoldkitCalendar.CalendarDate>
  toParentMessage: (message: Message) => Msg
  placeholder?: string
  formatDate?: (date: FoldkitCalendar.CalendarDate) => string
  name?: string
  isDisabled?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
  layoutStyle?: ComponentLayoutStyle
  triggerLayoutStyle?: ComponentLayoutStyle
  /** Overrides the trigger's inner content (receives the selected date). */
  triggerContent?: (
    maybeDate: Option.Option<FoldkitCalendar.CalendarDate>,
  ) => Html
  panelLayoutStyle?: ComponentLayoutStyle
  calendarLayoutStyle?: ComponentLayoutStyle
  mobilePresentation?: 'dialog' | 'popover'
  direction?: 'ltr' | 'rtl'
}> &
  DatePickerTextInput<Msg>

export const datePicker = <Msg>(
  props: DatePickerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const hd = h
  const isEmpty = Option.isNone(props.maybeSelectedDate)
  const formatDate =
    props.formatDate ??
    ((date: FoldkitCalendar.CalendarDate): string =>
      FoldkitCalendar.formatLong(date, props.model.calendar.locale))

  const picker = h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: DatePickerPrimitive.view,
    viewInputs: {
      maybeSelectedDate: props.maybeSelectedDate,
      anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
      triggerContent:
        props.triggerContent ??
        (maybeDate =>
          hd.span(
            [hd.Class(className(styles.contents))],
            [
              Icon.calendarIcon({ class: className(styles.icon) }, h),
              Option.match(maybeDate, {
                onNone: () => props.placeholder ?? 'Pick a date',
                onSome: formatDate,
              }),
            ],
          )),
      toCalendarView: attributes =>
        calendarView(
          attributes,
          {
            ...(props.calendarLayoutStyle === undefined
              ? {}
              : { layoutStyle: props.calendarLayoutStyle }),
            ...(props.direction === undefined
              ? {}
              : { direction: props.direction }),
          },
          h,
        ),
      isDisabled: props.isDisabled ?? false,
      ...(props.name === undefined ? {} : { name: props.name }),
      ...(props.layoutStyle === undefined
        ? {}
        : { className: className(props.layoutStyle) }),
      triggerClassName: cn(
        reset.button,
        TRIGGER_CLASS,
        styles.trigger,
        isEmpty ? styles.empty : undefined,
        props.triggerLayoutStyle,
      ),
      triggerAttributes: childAttributes([
        hd.DataAttribute('slot', 'popover-trigger'),
      ]),
      panelClassName: cn(
        overlayStyles.panel,
        PANEL_CLASS,
        props.mobilePresentation === 'popover'
          ? undefined
          : styles.mobileDialog,
        props.panelLayoutStyle,
      ),
      panelAttributes: childAttributes([
        hd.OnMount(
          themedPopoverPanel(
            `${props.model.popover.id}-button`,
            { placement: 'bottom-start', gap: 4 },
            message =>
              props.toParentMessage(
                DatePickerPrimitive.Message.GotPopoverMessage({ message }),
              ),
            `#${props.model.calendar.id}-grid`,
          ),
        ),
        hd.DataAttribute('slot', 'popover-content'),
        hd.Role('dialog'),
      ]),
      backdropClassName: className(BACKDROP_CLASS),
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      ...(props.ariaLabelledBy === undefined
        ? {}
        : { ariaLabelledBy: props.ariaLabelledBy }),
    },
    toParentMessage: props.toParentMessage,
  })
  if (props.query === undefined) return picker
  const inputId = `${props.model.id}-input`
  const errorId = `${props.model.id}-error`
  return h.div(
    [
      h.DataAttribute('slot', 'date-picker-field'),
      h.DataAttribute(
        'mobile-presentation',
        props.mobilePresentation ?? 'dialog',
      ),
      h.Class(className(styles.field)),
    ],
    [
      h.label(
        [h.For(inputId), h.Class(className(styles.inputLabel))],
        [props.inputLabel],
      ),
      h.div(
        [h.Class(className(styles.fieldRow))],
        [
          h.input([
            h.Id(inputId),
            h.Type('text'),
            h.Value(props.query),
            h.OnInput(props.onQueryInput),
            h.AriaInvalid(props.parseError !== undefined),
            ...(props.parseError === undefined
              ? []
              : [h.AriaDescribedBy(errorId)]),
            h.Placeholder('YYYY-MM-DD'),
            h.Class(className(reset.input, styles.input)),
          ]),
          picker,
        ],
      ),
      ...(props.parseError === undefined
        ? []
        : [
            h.p(
              [
                h.Id(errorId),
                h.Role('alert'),
                h.Class(className(reset.text, styles.error)),
              ],
              [props.parseError],
            ),
          ]),
    ],
  )
}

/*
   Minimal wiring:

   // Model: { datePicker: DatePicker.Model }
   // Message: GotDatePickerMessage({ message: DatePicker.Message })
   // Init:
   // datePicker: DatePicker.init({
   //   id: 'due-date',
   //   today,
   //   isAnimated: true,
   // })
   // Update: DatePicker.update(model.datePicker, message)
   // View:
   // datePicker({
   //   model: model.datePicker,
   //   toParentMessage: message => GotDatePickerMessage({ message }),
   // })
*/
