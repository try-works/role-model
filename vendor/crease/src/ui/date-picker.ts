import { Option } from 'effect'
import * as FoldkitCalendar from 'foldkit/calendar'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { DatePicker as DatePickerPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import { mirrorNavigationKeyForRtl } from '@/lib/calendar'
import { themedAnchor, themedPopoverPanel } from '@/lib/overlay-boundary'
import { buttonVariants } from '@/ui/button'
import { calendarView } from '@/ui/calendar'
import { cn } from '@/lib/utils'

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

// `align-top` removes the baseline strut the primitive's block wrapper divs add
// below the inline-flex trigger, which otherwise nudges the trigger upward.
const TRIGGER_CLASS = 'w-[240px] justify-start text-left font-normal align-top'

const PANEL_CLASS =
  'z-50 w-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-hidden transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 max-sm:!fixed max-sm:!inset-x-3 max-sm:!bottom-3 max-sm:!top-auto max-sm:!w-auto max-sm:!transform-none max-sm:!z-[100]'

const BACKDROP_CLASS = 'fixed inset-0 z-40 max-sm:z-[90]'

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
  class?: string
  triggerClass?: string
  /** Overrides the trigger's inner content (receives the selected date). */
  triggerContent?: (
    maybeDate: Option.Option<FoldkitCalendar.CalendarDate>,
  ) => Html
  panelClass?: string
  calendarClass?: string
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
            [hd.Class('contents')],
            [
              Icon.calendarIcon({}, h),
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
            ...(props.calendarClass === undefined
              ? {}
              : { class: props.calendarClass }),
            ...(props.direction === undefined
              ? {}
              : { direction: props.direction }),
          },
          h,
        ),
      isDisabled: props.isDisabled ?? false,
      ...(props.name === undefined ? {} : { name: props.name }),
      ...(props.class === undefined ? {} : { className: props.class }),
      triggerClassName: cn(
        buttonVariants({ variant: 'outline' }),
        TRIGGER_CLASS,
        isEmpty ? 'text-muted-foreground' : undefined,
        props.triggerClass,
      ),
      triggerAttributes: childAttributes([
        hd.DataAttribute('slot', 'popover-trigger'),
      ]),
      panelClassName: cn(
        props.mobilePresentation === 'popover'
          ? PANEL_CLASS.replaceAll(/max-sm:[^ ]+ ?/g, '')
          : PANEL_CLASS,
        props.panelClass,
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
      backdropClassName: BACKDROP_CLASS,
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
      h.Class('grid gap-2'),
    ],
    [
      h.label(
        [h.For(inputId), h.Class('text-sm font-medium')],
        [props.inputLabel],
      ),
      h.div(
        [h.Class('flex flex-wrap items-center gap-2')],
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
            h.Class(
              'h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm',
            ),
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
                h.Class('text-sm text-destructive'),
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
