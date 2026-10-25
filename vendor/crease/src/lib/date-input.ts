import { Effect, Option, Schema as S, pipe } from 'effect'

import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import * as Calendar from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'

import { DatePicker as DatePickerPrimitive } from '@foldkit/ui'

import { parseDateInput } from '@/lib/date-parse'

/* Ported from Meta Astryx DateInput (packages/core/src/DateInput/) — examples
   and visual spec adapted to Crease UI tokens.

   The popover + calendar state live in an embedded foldkit DatePicker.Model,
   whose slices this component drives directly (DatePicker.view renders its own
   trigger, which does not fit the input-wrapper layout). The committed date
   and pending text live here in the Model; `reflect` syncs the value when it
   derives from external state, and `ChangedValue` is the onChange OutMessage.

   PORT NOTE: Astryx's input click / ArrowDown open the popover while keeping
   focus in the input (popover.show({ skipAutoFocus: true })). foldkit's
   Popover always issues FocusPanel on open, so this port sets `isOpen` on the
   embedded popover model directly for those paths, trading the enter
   animation for astryx's keep-focus-in-input semantics. */

export const Model = S.Struct({
  id: S.String,
  /** BCP locale tag driving typed-date parsing and display formatting. */
  locale: S.String,
  value: S.Option(Calendar.CalendarDate),
  /** Pending text while editing; none means the committed date is displayed. */
  pendingInput: S.Option(S.String),
  isInputInvalid: S.Boolean,
  isInputFocused: S.Boolean,
  datePicker: DatePickerPrimitive.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotDatePickerMessage: { message: DatePickerPrimitive.Message },
  UpdatedInputValue: { value: S.String },
  FocusedInput: {},
  BlurredInput: {},
  ClickedInput: {},
  PressedInputKey: { key: S.String, isAlt: S.Boolean },
  ClearedInput: {},
  CompletedFocusInput: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: { value: S.Option(Calendar.CalendarDate) },
})
export type OutMessage = typeof OutMessage.Type

export const inputId = (id: string): string => `${id}-input`

export const init = (
  config: Readonly<{
    id: string
    today: Calendar.CalendarDate
    value?: Calendar.CalendarDate | undefined
    isAnimated?: boolean
    locale?: string
    calendarLocale?: Calendar.LocaleConfig
    minDate?: Calendar.CalendarDate
    maxDate?: Calendar.CalendarDate
    disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
    disabledDates?: ReadonlyArray<Calendar.CalendarDate>
  }>,
): Model => {
  const maybeValue = Option.fromNullishOr(config.value)
  return {
    id: config.id,
    locale: config.locale ?? 'en',
    value: maybeValue,
    pendingInput: Option.none(),
    isInputInvalid: false,
    isInputFocused: false,
    datePicker: DatePickerPrimitive.init({
      id: config.id,
      today: config.today,
      ...(Option.isSome(maybeValue)
        ? { initialViewDate: maybeValue.value }
        : {}),
      ...(config.isAnimated === undefined
        ? {}
        : { isAnimated: config.isAnimated }),
      ...(config.calendarLocale === undefined
        ? {}
        : { locale: config.calendarLocale }),
      ...(config.minDate === undefined ? {} : { minDate: config.minDate }),
      ...(config.maxDate === undefined ? {} : { maxDate: config.maxDate }),
      ...(config.disabledDaysOfWeek === undefined
        ? {}
        : { disabledDaysOfWeek: config.disabledDaysOfWeek }),
      ...(config.disabledDates === undefined
        ? {}
        : { disabledDates: config.disabledDates }),
    }),
  }
}

/** Syncs the committed value when it derives from external state, moving the
 *  calendar's view and cursor onto the date so reopening shows its month. */
export const reflect = (
  model: Model,
  maybeValue: Option.Option<Calendar.CalendarDate>,
): Model => ({
  ...model,
  value: maybeValue,
  pendingInput: Option.none(),
  isInputInvalid: false,
  datePicker: Option.match(maybeValue, {
    onNone: () => model.datePicker,
    onSome: date => DatePickerPrimitive.focusDate(model.datePicker, date),
  }),
})

/** Min/max/disabled constraints live on the embedded calendar; the picker
 *  exposes reflect* helpers for each. This bundle applies them together. */
export const reflectConstraints = (
  model: Model,
  constraints: Readonly<{
    minDate?: Option.Option<Calendar.CalendarDate>
    maxDate?: Option.Option<Calendar.CalendarDate>
    disabledDates?: ReadonlyArray<Calendar.CalendarDate>
    disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
  }>,
): Model => ({
  ...model,
  datePicker: pipe(
    model.datePicker,
    datePicker =>
      constraints.minDate === undefined
        ? datePicker
        : DatePickerPrimitive.reflectMinDate(datePicker, constraints.minDate),
    datePicker =>
      constraints.maxDate === undefined
        ? datePicker
        : DatePickerPrimitive.reflectMaxDate(datePicker, constraints.maxDate),
    datePicker =>
      constraints.disabledDates === undefined
        ? datePicker
        : DatePickerPrimitive.reflectDisabledDates(
            datePicker,
            constraints.disabledDates,
          ),
    datePicker =>
      constraints.disabledDaysOfWeek === undefined
        ? datePicker
        : DatePickerPrimitive.reflectDisabledDaysOfWeek(
            datePicker,
            constraints.disabledDaysOfWeek,
          ),
  ),
})

export const FocusInput = Command.define('FocusDateInputInput', {
  args: { inputId: S.String },
  messages: [Message.CompletedFocusInput],
  execute: ({ inputId }) =>
    Dom.focus(`[id="${inputId}"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusInput()),
    ),
})

const isDateSelectable = (
  model: Model,
  date: Calendar.CalendarDate,
): boolean => {
  const calendar = model.datePicker.calendar
  return !(
    Option.exists(calendar.maybeMinDate, min => Calendar.isBefore(date, min)) ||
    Option.exists(calendar.maybeMaxDate, max => Calendar.isAfter(date, max)) ||
    calendar.disabledDaysOfWeek.includes(Calendar.dayOfWeek(date)) ||
    calendar.disabledDates.some(Calendar.isEqual(date))
  )
}

/** astryx skipAutoFocus open: show the panel without moving focus out of the
 *  input (foldkit's FocusPanel command is bypassed on purpose). */
const openKeepingFocus = (model: Model): Model => ({
  ...model,
  datePicker: {
    ...model.datePicker,
    popover: { ...model.datePicker.popover, isOpen: true },
  },
})

/** Escape/blur-style close that leaves focus in the input instead of returning
 *  it to the popover's trigger button. */
const closeKeepingFocus = (model: Model): Model => ({
  ...model,
  datePicker: {
    ...model.datePicker,
    calendar: { ...model.datePicker.calendar, viewMode: 'Days' },
    popover: { ...model.datePicker.popover, isOpen: false },
  },
})

/** Commits pending text when it parses to a selectable date; on failure marks
 *  the input invalid and keeps the raw text visible (astryx commitPendingInput). */
const commitPending = (
  model: Model,
): {
  model: Model
  outMessage?: OutMessage
} => {
  const pending = Option.getOrNull(model.pendingInput)
  if (pending === null) {
    return { model }
  }
  const trimmed = pending.trim()
  if (trimmed === '') {
    return {
      model: { ...model, pendingInput: Option.none(), isInputInvalid: false },
    }
  }
  const maybeDate = parseDateInput(trimmed, model.locale)
  if (Option.isSome(maybeDate) && isDateSelectable(model, maybeDate.value)) {
    return {
      model: {
        ...model,
        value: maybeDate,
        pendingInput: Option.none(),
        isInputInvalid: false,
        datePicker: DatePickerPrimitive.focusDate(
          model.datePicker,
          maybeDate.value,
        ),
      },
      outMessage: OutMessage.ChangedValue({ value: maybeDate }),
    }
  }
  return { model: { ...model, isInputInvalid: true } }
}

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const liftDatePicker = (
  model: Model,
  result: ReturnType<typeof DatePickerPrimitive.update>,
): UpdateReturn => {
  const commands = Command.mapMessages(result.commands ?? [], message =>
    Message.GotDatePickerMessage({ message }),
  )
  // astryx refocuses the input whenever the popover hides; foldkit returns
  // focus to the trigger button, so append a FocusInput that wins by ordering.
  const popoverClosed =
    model.datePicker.popover.isOpen && !result.model.popover.isOpen
  return {
    model: { ...model, datePicker: result.model },
    ...(commands.length === 0 && !popoverClosed
      ? {}
      : {
          commands: [
            ...commands,
            ...(popoverClosed
              ? [FocusInput({ inputId: inputId(model.id) })]
              : []),
          ],
        }),
  }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotDatePickerMessage': {
      const result = DatePickerPrimitive.update(
        model.datePicker,
        message.message,
      )
      const lifted = liftDatePicker(model, result)
      const out = result.outMessage
      if (out === undefined) {
        return lifted
      }
      if (out._tag === 'SelectedDate') {
        return {
          ...lifted,
          model: {
            ...lifted.model,
            value: Option.some(out.date),
            pendingInput: Option.none(),
            isInputInvalid: false,
          },
          outMessage: OutMessage.ChangedValue({
            value: Option.some(out.date),
          }),
        }
      }
      if (out._tag === 'ClearedDate') {
        return {
          ...lifted,
          model: { ...lifted.model, value: Option.none() },
          outMessage: OutMessage.ChangedValue({ value: Option.none() }),
        }
      }
      return lifted
    }
    case 'UpdatedInputValue': {
      if (message.value === '') {
        return {
          model: {
            ...model,
            pendingInput: Option.some(''),
            isInputInvalid: false,
          },
        }
      }
      const maybeDate = parseDateInput(message.value, model.locale)
      if (
        Option.isSome(maybeDate) &&
        isDateSelectable(model, maybeDate.value)
      ) {
        // astryx commits a fully-typed date immediately and navigates the
        // calendar's cursor without opening or closing the popover.
        return {
          model: {
            ...model,
            value: maybeDate,
            pendingInput: Option.none(),
            isInputInvalid: false,
            datePicker: DatePickerPrimitive.focusDate(
              model.datePicker,
              maybeDate.value,
            ),
          },
          outMessage: OutMessage.ChangedValue({ value: maybeDate }),
        }
      }
      return {
        model: { ...model, pendingInput: Option.some(message.value) },
      }
    }
    case 'FocusedInput':
      return { model: { ...model, isInputFocused: true } }
    case 'BlurredInput': {
      const committed = commitPending(model)
      return {
        model: { ...committed.model, isInputFocused: false },
        ...(committed.outMessage === undefined
          ? {}
          : { outMessage: committed.outMessage }),
      }
    }
    case 'ClickedInput':
      return model.datePicker.popover.isOpen
        ? { model }
        : { model: openKeepingFocus(model) }
    case 'PressedInputKey':
      switch (message.key) {
        case 'ArrowDown':
          return model.datePicker.popover.isOpen
            ? { model }
            : { model: openKeepingFocus(model) }
        case 'Escape':
          return model.datePicker.popover.isOpen
            ? { model: closeKeepingFocus(model) }
            : { model }
        case 'Enter': {
          const committed = commitPending(model)
          return {
            model: committed.model,
            ...(committed.outMessage === undefined
              ? {}
              : { outMessage: committed.outMessage }),
          }
        }
        default:
          return { model }
      }
    case 'ClearedInput':
      return {
        model: {
          ...model,
          value: Option.none(),
          pendingInput: Option.none(),
          isInputInvalid: false,
        },
        commands: [FocusInput({ inputId: inputId(model.id) })],
        outMessage: OutMessage.ChangedValue({ value: Option.none() }),
      }
    case 'CompletedFocusInput':
      return { model }
  }
}

export const open = (model: Model): UpdateReturn =>
  liftDatePicker(model, DatePickerPrimitive.open(model.datePicker))

export const close = (model: Model): UpdateReturn =>
  liftDatePicker(model, DatePickerPrimitive.close(model.datePicker))
