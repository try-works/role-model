import { Effect, Option, Schema as S } from 'effect'

import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import * as Calendar from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'

import {
  Calendar as CalendarPrimitive,
  DatePicker as DatePickerPrimitive,
  Popover as PopoverPrimitive,
} from '@foldkit/ui'

import { parseDateInput } from '@/lib/date-parse'
import {
  adjustTime,
  clampTime,
  formatISOTime,
  isTimeInRange,
  parseTimeInput,
} from '@/lib/time-parse'

/* Ported from Meta Astryx DateTimeInput (packages/core/src/DateTimeInput/)
   — examples and visual spec adapted to Crease UI tokens.

   One committed value {date, time} — astryx's ISODateTimeString
   ("YYYY-MM-DDTHH:MM[:SS]"). Both halves must be set before ChangedValue
   fires: picking a date with no committed time fills the time from the wall
   clock; typing a time with no committed date stays uncommitted.

   Min/max constrain the calendar; when the committed date lands exactly on
   a bound's date, that bound's time also clamps the time commit.

   PORT NOTE: foldkit's calendar renders a single month; astryx defaults to
   two. `numberOfMonths` accepts 1|2 but clamps to one month.
   PORT NOTE: `dateConstraints` predicate functions can't be folded into the
   calendar's declarative disabled sets — use `disabledDates`/`disabledDaysOfWeek`
   at init/reflectConstraints instead.
   PORT NOTE: the time listbox keeps option highlight local to the view —
   keyboard ArrowUp/Down still step the committed time by
   `timeIncrementMinutes`; Enter/Tab commit pending text exactly like
   astryx's blur commit. */

export const DateTime = S.Struct({
  date: Calendar.CalendarDate,
  /** ISO "HH:MM[:SS]". */
  time: S.String,
})
export type DateTime = typeof DateTime.Type

export const Model = S.Struct({
  id: S.String,
  locale: S.String,
  hourFormat: S.Literals(['12h', '24h']),
  hasSeconds: S.Boolean,
  value: S.Option(DateTime),
  /** Same-day min/max bounds for the time half. */
  minDateTime: S.Option(DateTime),
  maxDateTime: S.Option(DateTime),
  pendingDateInput: S.Option(S.String),
  isDateInputInvalid: S.Boolean,
  isDateInputFocused: S.Boolean,
  pendingTimeInput: S.Option(S.String),
  isTimeInputInvalid: S.Boolean,
  isTimeInputFocused: S.Boolean,
  timeIncrementMinutes: S.Number,
  /** Whether the time half opens a preset-time listbox (timeOptionInterval). */
  hasTimeOptions: S.Boolean,
  datePicker: DatePickerPrimitive.Model,
  timePopover: PopoverPrimitive.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotDatePickerMessage: { message: DatePickerPrimitive.Message },
  GotTimePopoverMessage: { message: PopoverPrimitive.Message },
  UpdatedDateInputValue: { value: S.String },
  FocusedDateInput: {},
  BlurredDateInput: {},
  ClickedDateInput: {},
  PressedDateInputKey: { key: S.String, isAlt: S.Boolean },
  UpdatedTimeInputValue: { value: S.String },
  FocusedTimeInput: {},
  BlurredTimeInput: {},
  ClickedTimeInput: {},
  PressedTimeInputKey: { key: S.String, isAlt: S.Boolean },
  ClickedTimeOption: { time: S.String },
  ClickedIcon: {},
  ClearedInput: {},
  CompletedFocusDateInput: {},
  CompletedFocusTimeInput: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: { value: S.Option(DateTime) },
})
export type OutMessage = typeof OutMessage.Type

export const dateInputId = (id: string): string => `${id}-date`
export const timeInputId = (id: string): string => `${id}-time`

export const init = (
  config: Readonly<{
    id: string
    today: Calendar.CalendarDate
    locale?: string
    hourFormat?: '12h' | '24h'
    hasSeconds?: boolean
    value?: DateTime | undefined
    minDate?: Calendar.CalendarDate
    maxDate?: Calendar.CalendarDate
    minDateTime?: DateTime
    maxDateTime?: DateTime
    disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
    disabledDates?: ReadonlyArray<Calendar.CalendarDate>
    timeIncrementMinutes?: number
    hasTimeOptions?: boolean
    isAnimated?: boolean
  }>,
): Model => {
  const maybeValue = Option.fromNullishOr(config.value)
  return {
    id: config.id,
    locale: config.locale ?? 'en-US',
    hourFormat: config.hourFormat ?? '12h',
    hasSeconds: config.hasSeconds ?? false,
    value: maybeValue,
    minDateTime: Option.fromNullishOr(config.minDateTime),
    maxDateTime: Option.fromNullishOr(config.maxDateTime),
    pendingDateInput: Option.none(),
    isDateInputInvalid: false,
    isDateInputFocused: false,
    pendingTimeInput: Option.none(),
    isTimeInputInvalid: false,
    isTimeInputFocused: false,
    timeIncrementMinutes: config.timeIncrementMinutes ?? 1,
    hasTimeOptions: config.hasTimeOptions ?? false,
    datePicker: DatePickerPrimitive.init({
      id: `${config.id}-date-picker`,
      today: config.today,
      ...(Option.isSome(maybeValue)
        ? { initialViewDate: maybeValue.value.date }
        : {}),
      ...(config.isAnimated !== undefined
        ? { isAnimated: config.isAnimated }
        : {}),
      ...(config.minDate !== undefined ? { minDate: config.minDate } : {}),
      ...(config.maxDate !== undefined ? { maxDate: config.maxDate } : {}),
      ...(config.disabledDaysOfWeek !== undefined
        ? { disabledDaysOfWeek: [...config.disabledDaysOfWeek] }
        : {}),
      ...(config.disabledDates !== undefined
        ? { disabledDates: [...config.disabledDates] }
        : {}),
    }),
    timePopover: PopoverPrimitive.init({
      id: `${config.id}-time-popover`,
      contentFocus: true,
      isAnimated: config.isAnimated ?? true,
    }),
  }
}

/** Re-init a model with a new `value` (controlled-component handoff). */
export const reflect = (model: Model, value: DateTime | undefined): Model => ({
  ...model,
  value: Option.fromNullishOr(value),
})

export const reflectConstraints = (
  model: Model,
  constraints: Readonly<{
    minDate?: Calendar.CalendarDate
    maxDate?: Calendar.CalendarDate
    minDateTime?: DateTime
    maxDateTime?: DateTime
    disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
    disabledDates?: ReadonlyArray<Calendar.CalendarDate>
  }>,
): Model => {
  const picker = model.datePicker
  const withMin =
    constraints.minDate === undefined
      ? picker
      : DatePickerPrimitive.reflectMinDate(
          picker,
          Option.fromNullishOr(constraints.minDate),
        )
  const withMax =
    constraints.maxDate === undefined
      ? withMin
      : DatePickerPrimitive.reflectMaxDate(
          withMin,
          Option.fromNullishOr(constraints.maxDate),
        )
  const withDates =
    constraints.disabledDates === undefined
      ? withMax
      : DatePickerPrimitive.reflectDisabledDates(
          withMax,
          constraints.disabledDates,
        )
  const withDays =
    constraints.disabledDaysOfWeek === undefined
      ? withDates
      : DatePickerPrimitive.reflectDisabledDaysOfWeek(
          withDates,
          constraints.disabledDaysOfWeek,
        )
  return {
    ...model,
    datePicker: withDays,
    minDateTime:
      constraints.minDateTime === undefined
        ? model.minDateTime
        : Option.some(constraints.minDateTime),
    maxDateTime:
      constraints.maxDateTime === undefined
        ? model.maxDateTime
        : Option.some(constraints.maxDateTime),
  }
}

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

/** Same-day time bounds: a min bound applies its time only when `date`
 *  equals the bound's date. */
const timeBoundsFor = (
  model: Model,
  date: Calendar.CalendarDate,
): { min?: string | undefined; max?: string | undefined } => ({
  min: Option.match(model.minDateTime, {
    onNone: () => undefined,
    onSome: min => (Calendar.isEqual(date, min.date) ? min.time : undefined),
  }),
  max: Option.match(model.maxDateTime, {
    onNone: () => undefined,
    onSome: max => (Calendar.isEqual(date, max.date) ? max.time : undefined),
  }),
})

/** Bounds for a time commit against the committed date — or the loose
 *  min/max times when no date is committed yet. */
const currentTimeBounds = (
  model: Model,
): { min?: string | undefined; max?: string | undefined } =>
  Option.match(model.value, {
    onNone: () => ({
      min: Option.getOrUndefined(model.minDateTime)?.time,
      max: Option.getOrUndefined(model.maxDateTime)?.time,
    }),
    onSome: value => timeBoundsFor(model, value.date),
  })

const isTimeAllowed = (model: Model, time: string): boolean => {
  const bounds = currentTimeBounds(model)
  return isTimeInRange(time, bounds.min, bounds.max)
}

const timeNow = (hasSeconds: boolean): string => {
  const now = new Date()
  return formatISOTime(
    {
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    },
    hasSeconds,
  )
}

export const FocusDateInput = Command.define('DateTimeInput.FocusDateInput', {
  args: { inputId: S.String },
  messages: [Message.CompletedFocusDateInput],
  execute: ({ inputId }) =>
    Dom.focus(`[id="${inputId}"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusDateInput()),
    ),
})

export const FocusTimeInput = Command.define('DateTimeInput.FocusTimeInput', {
  args: { inputId: S.String },
  messages: [Message.CompletedFocusTimeInput],
  execute: ({ inputId }) =>
    Dom.focus(`[id="${inputId}"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusTimeInput()),
    ),
})

/** astryx skipAutoFocus open: show the panel without moving focus out of
 *  the input (foldkit's FocusPanel command is bypassed on purpose). */
const openDatePickerKeepingFocus = (
  model: Model,
): { model: Model; commands: ReadonlyArray<Command.Command<Message>> } => ({
  model: {
    ...model,
    datePicker: {
      ...model.datePicker,
      popover: { ...model.datePicker.popover, isOpen: true },
    },
  },
  commands: [FocusDateInput({ inputId: dateInputId(model.id) })],
})

const closeDatePicker = (model: Model): Model => ({
  ...model,
  datePicker: {
    ...model.datePicker,
    popover: { ...model.datePicker.popover, isOpen: false },
  },
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const commitDate = (
  model: Model,
  date: Calendar.CalendarDate,
  keepOpen: boolean,
): UpdateReturn => {
  const bounds = timeBoundsFor(model, date)
  const effectiveTime = Option.match(model.value, {
    onNone: () =>
      clampTime(
        timeNow(model.hasSeconds),
        bounds.min,
        bounds.max,
        model.hasSeconds,
      ),
    onSome: value =>
      clampTime(value.time, bounds.min, bounds.max, model.hasSeconds),
  })
  const next = { date, time: effectiveTime }
  const changed = !Option.exists(
    model.value,
    value => Calendar.isEqual(value.date, date) && value.time === effectiveTime,
  )
  const committed: Model = {
    ...model,
    value: Option.some(next),
    pendingDateInput: Option.none(),
    isDateInputInvalid: false,
    datePicker: {
      ...model.datePicker,
      calendar: CalendarPrimitive.focusDate(model.datePicker.calendar, date),
    },
  }
  return {
    model: keepOpen ? committed : closeDatePicker(committed),
    ...(changed
      ? { outMessage: OutMessage.ChangedValue({ value: Option.some(next) }) }
      : {}),
  }
}

const commitDatePendingInput = (model: Model): UpdateReturn =>
  Option.match(model.pendingDateInput, {
    onNone: () => ({ model }),
    onSome: text => {
      const trimmed = text.trim()
      if (trimmed === '') {
        return Option.match(model.value, {
          onNone: () => ({
            model: { ...model, pendingDateInput: Option.none() },
          }),
          onSome: () => ({
            model: {
              ...model,
              pendingDateInput: Option.none(),
              value: Option.none(),
            },
            outMessage: OutMessage.ChangedValue({ value: Option.none() }),
          }),
        })
      }
      const parsed = Option.getOrNull(parseDateInput(trimmed, model.locale))
      if (parsed === null || !isDateSelectable(model, parsed)) {
        return {
          model: {
            ...model,
            pendingDateInput: Option.none(),
            isDateInputInvalid: true,
          },
        }
      }
      return commitDate(model, parsed, model.datePicker.popover.isOpen)
    },
  })

const commitTime = (model: Model, time: string): UpdateReturn =>
  Option.match(model.value, {
    onNone: () => ({
      model: {
        ...model,
        pendingTimeInput: Option.none(),
        isTimeInputInvalid: false,
      },
    }),
    onSome: value => {
      if (!isTimeAllowed(model, time)) {
        return {
          model: {
            ...model,
            pendingTimeInput: Option.none(),
            isTimeInputInvalid: true,
          },
        }
      }
      if (value.time === time) {
        return {
          model: {
            ...model,
            pendingTimeInput: Option.none(),
            isTimeInputInvalid: false,
          },
        }
      }
      const next = { ...value, time }
      return {
        model: {
          ...model,
          value: Option.some(next),
          pendingTimeInput: Option.none(),
          isTimeInputInvalid: false,
        },
        outMessage: OutMessage.ChangedValue({ value: Option.some(next) }),
      }
    },
  })

const commitTimePendingInput = (model: Model): UpdateReturn =>
  Option.match(model.pendingTimeInput, {
    onNone: () => ({ model }),
    onSome: text => {
      const trimmed = text.trim()
      if (trimmed === '') {
        return { model: { ...model, pendingTimeInput: Option.none() } }
      }
      const parsed = parseTimeInput(trimmed, model.hasSeconds)
      return Option.match(parsed, {
        onNone: () => ({
          model: {
            ...model,
            pendingTimeInput: Option.none(),
            isTimeInputInvalid: true,
          },
        }),
        onSome: time => commitTime(model, time),
      })
    },
  })

const stepTime = (model: Model, direction: 1 | -1): UpdateReturn => {
  const base = Option.match(model.value, {
    onNone: () => timeNow(model.hasSeconds),
    onSome: value => value.time,
  })
  const stepped = adjustTime(
    base,
    direction * model.timeIncrementMinutes,
    model.hasSeconds,
  )
  const bounds = currentTimeBounds(model)
  return commitTime(
    model,
    clampTime(stepped, bounds.min, bounds.max, model.hasSeconds),
  )
}

const withTimePopover = (
  model: Model,
  message: PopoverPrimitive.Message,
): UpdateReturn => {
  const result = PopoverPrimitive.update(model.timePopover, message)
  return {
    model: { ...model, timePopover: result.model },
    commands: Command.mapMessages(result.commands ?? [], m =>
      Message.GotTimePopoverMessage({ message: m }),
    ),
  }
}

const closeTimePopover = (model: Model): UpdateReturn =>
  model.timePopover.isOpen
    ? withTimePopover(model, PopoverPrimitive.Message.RequestedClose())
    : { model }

const openTimePopover = (model: Model): UpdateReturn =>
  model.hasTimeOptions && !model.timePopover.isOpen
    ? withTimePopover(model, PopoverPrimitive.Message.RequestedOpen())
    : { model }

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotDatePickerMessage': {
      const result = DatePickerPrimitive.update(
        model.datePicker,
        message.message,
      )
      switch (result.outMessage?._tag) {
        case 'SelectedDate':
          return commitDate(
            { ...model, datePicker: result.model },
            result.outMessage.date,
            false,
          )
        case 'ClearedDate':
          return {
            model: {
              ...model,
              datePicker: result.model,
              value: Option.none(),
            },
            outMessage: OutMessage.ChangedValue({ value: Option.none() }),
          }
        default:
          return { model: { ...model, datePicker: result.model } }
      }
    }
    case 'GotTimePopoverMessage': {
      const lifted = PopoverPrimitive.update(model.timePopover, message.message)
      return {
        model: { ...model, timePopover: lifted.model },
        commands: Command.mapMessages(lifted.commands ?? [], m =>
          Message.GotTimePopoverMessage({ message: m }),
        ),
      }
    }
    case 'UpdatedDateInputValue': {
      const text = message.value
      const parsed = Option.getOrNull(parseDateInput(text, model.locale))
      if (
        parsed !== null &&
        isDateSelectable(model, parsed) &&
        !Option.exists(model.value, v => Calendar.isEqual(v.date, parsed))
      ) {
        // Typed commit: keep the popover open and focus in the input.
        return commitDate(
          { ...model, pendingDateInput: Option.some(text) },
          parsed,
          true,
        )
      }
      return { model: { ...model, pendingDateInput: Option.some(text) } }
    }
    case 'FocusedDateInput':
      return { model: { ...model, isDateInputFocused: true } }
    case 'BlurredDateInput':
      return commitDatePendingInput({ ...model, isDateInputFocused: false })
    case 'ClickedDateInput': {
      const opened = openDatePickerKeepingFocus(model)
      return { model: opened.model, commands: opened.commands }
    }
    case 'PressedDateInputKey': {
      if (message.key === 'Enter') {
        return commitDatePendingInput(model)
      }
      if (
        message.key === 'ArrowDown' &&
        message.isAlt &&
        !model.datePicker.popover.isOpen
      ) {
        const opened = openDatePickerKeepingFocus(model)
        return { model: opened.model, commands: opened.commands }
      }
      if (message.key === 'Escape' && model.datePicker.popover.isOpen) {
        return { model: closeDatePicker(model) }
      }
      return { model }
    }
    case 'UpdatedTimeInputValue': {
      const text = message.value
      const parsed = parseTimeInput(text, model.hasSeconds)
      const base = {
        ...model,
        pendingTimeInput: Option.some(text),
        isTimeInputInvalid: false,
      }
      return Option.match(parsed, {
        onNone: () => ({ model: base }),
        onSome: time =>
          isTimeAllowed(model, time)
            ? commitTime(
                // Keep the typed text visible while the commit lands.
                { ...base, pendingTimeInput: Option.some(text) },
                time,
              )
            : { model: base },
      })
    }
    case 'FocusedTimeInput':
      /* astryx opens the listbox on click / Alt+ArrowDown only — never on
         focus — so the FocusTimeInput refocus after an option pick can not
         re-open it. */
      return { model: { ...model, isTimeInputFocused: true } }
    case 'BlurredTimeInput': {
      const committed = commitTimePendingInput({
        ...model,
        isTimeInputFocused: false,
      })
      /* With hasTimeOptions the anchor deliberately moves focus into the
         listbox, which blurs the input — closing here would make the popover
         vanish the moment it opens. Option picks, Tab, Escape and the backdrop
         still close it. */
      const closed: UpdateReturn = model.hasTimeOptions
        ? { model: committed.model }
        : closeTimePopover(committed.model)
      return {
        model: closed.model,
        ...(committed.outMessage === undefined
          ? {}
          : { outMessage: committed.outMessage }),
        ...(closed.commands === undefined ? {} : { commands: closed.commands }),
      }
    }
    case 'ClickedTimeInput':
      return openTimePopover(model)
    case 'PressedTimeInputKey': {
      if (message.key === 'Enter' || message.key === 'Tab') {
        const committed = commitTimePendingInput(model)
        const closed = closeTimePopover(committed.model)
        return {
          model: closed.model,
          ...(committed.outMessage === undefined
            ? {}
            : { outMessage: committed.outMessage }),
          ...(closed.commands === undefined
            ? {}
            : { commands: closed.commands }),
        }
      }
      if (
        message.key === 'ArrowDown' &&
        message.isAlt &&
        !model.timePopover.isOpen
      ) {
        // APG "open without moving" — same as astryx's Alt+ArrowDown binding.
        return openTimePopover(model)
      }
      if (message.key === 'ArrowUp' || message.key === 'ArrowDown') {
        return stepTime(model, message.key === 'ArrowUp' ? 1 : -1)
      }
      if (message.key === 'Escape' && model.timePopover.isOpen) {
        return closeTimePopover(model)
      }
      return { model }
    }
    case 'ClickedTimeOption': {
      const closed = closeTimePopover(model)
      if (!isTimeAllowed(model, message.time)) {
        return closed
      }
      const committed = commitTime(closed.model, message.time)
      return {
        model: committed.model,
        ...(committed.outMessage === undefined
          ? {}
          : { outMessage: committed.outMessage }),
        commands: [
          ...(closed.commands ?? []),
          ...(committed.commands ?? []),
          FocusTimeInput({ inputId: timeInputId(model.id) }),
        ],
      }
    }
    case 'ClickedIcon': {
      const requested = model.datePicker.popover.isOpen
        ? PopoverPrimitive.Message.RequestedClose()
        : PopoverPrimitive.Message.RequestedOpen()
      const lifted = DatePickerPrimitive.update(
        model.datePicker,
        DatePickerPrimitive.Message.GotPopoverMessage({
          message: requested,
        }),
      )
      return { model: { ...model, datePicker: lifted.model } }
    }
    case 'ClearedInput':
      return {
        model: {
          ...model,
          value: Option.none(),
          pendingDateInput: Option.none(),
          pendingTimeInput: Option.none(),
          isDateInputInvalid: false,
          isTimeInputInvalid: false,
        },
        outMessage: OutMessage.ChangedValue({ value: Option.none() }),
      }
    case 'CompletedFocusDateInput':
    case 'CompletedFocusTimeInput':
      return { model }
  }
}
