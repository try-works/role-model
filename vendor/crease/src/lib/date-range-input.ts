import { Effect, Option, Schema as S, pipe } from 'effect'

import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import * as Calendar from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'

import {
  Calendar as CalendarPrimitive,
  Popover as PopoverPrimitive,
} from '@foldkit/ui'

import { normalizeRange } from '@/lib/calendar'

/* Ported from Meta Astryx DateRangeInput (packages/core/src/DateRangeInput/)
   — examples and visual spec adapted to Crease UI tokens.

   The trigger is a button (astryx renders no freeform text input here): it
   toggles a popover holding a range calendar plus an optional preset sidebar.
   The committed range, the in-progress first click (`pendingStart`), and the
   span-cap window live in this Model — the embedded foldkit Calendar renders
   the day grid and emits `SelectedDate` per click, which `update` folds into
   range commits (first click → pending + constraint window; a completed
   commit keeps the popover open so the range can keep being adjusted, matching
   the docs Range Picker rather than astryx's close-on-commit).

   PORT NOTE: foldkit's calendar renders a single month; astryx defaults to
   two. `numberOfMonths` accepts 1|2 but clamps to one month. */

export const Range = S.Struct({
  start: Calendar.CalendarDate,
  end: Calendar.CalendarDate,
})
export type Range = typeof Range.Type

export const Model = S.Struct({
  id: S.String,
  /** BCP locale tag driving the trigger's range display format. */
  locale: S.String,
  value: S.Option(Range),
  /** First picked endpoint while a range is in progress. */
  pendingStart: S.Option(Calendar.CalendarDate),
  minRangeSpan: S.Number,
  maxRangeSpan: S.Option(S.Number),
  /** Base constraints stored separately so the pending-selection window can
   *  tighten and then restore them. */
  baseMinDate: S.Option(Calendar.CalendarDate),
  baseMaxDate: S.Option(Calendar.CalendarDate),
  baseDisabledDates: S.Array(Calendar.CalendarDate),
  baseDisabledDaysOfWeek: S.Array(Calendar.DayOfWeek),
  calendar: CalendarPrimitive.Model,
  popover: PopoverPrimitive.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotCalendarMessage: { message: CalendarPrimitive.Message },
  GotPopoverMessage: { message: PopoverPrimitive.Message },
  ClickedIcon: {},
  ClickedPreset: { range: Range },
  ClearedValue: {},
  CompletedFocusTrigger: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: { value: S.Option(Range) },
})
export type OutMessage = typeof OutMessage.Type

export const init = (
  config: Readonly<{
    id: string
    today: Calendar.CalendarDate
    value?: Range | undefined
    isAnimated?: boolean
    locale?: string
    calendarLocale?: Calendar.LocaleConfig
    minDate?: Calendar.CalendarDate
    maxDate?: Calendar.CalendarDate
    disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
    disabledDates?: ReadonlyArray<Calendar.CalendarDate>
    minRangeSpan?: number
    maxRangeSpan?: number
  }>,
): Model => {
  const maybeValue = Option.fromNullishOr(config.value)
  return {
    id: config.id,
    locale: config.locale ?? 'en',
    value: maybeValue,
    pendingStart: Option.none(),
    minRangeSpan: Math.max(1, config.minRangeSpan ?? 1),
    maxRangeSpan: Option.fromNullishOr(config.maxRangeSpan),
    baseMinDate: Option.fromNullishOr(config.minDate),
    baseMaxDate: Option.fromNullishOr(config.maxDate),
    baseDisabledDates: [...(config.disabledDates ?? [])],
    baseDisabledDaysOfWeek: [...(config.disabledDaysOfWeek ?? [])],
    calendar: CalendarPrimitive.init({
      id: `${config.id}-calendar`,
      today: config.today,
      ...(Option.isSome(maybeValue)
        ? { initialViewDate: maybeValue.value.start }
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
    popover: PopoverPrimitive.init({
      id: `${config.id}-popover`,
      ...(config.isAnimated === undefined
        ? {}
        : { isAnimated: config.isAnimated }),
    }),
  }
}

const ordinal = (date: Calendar.CalendarDate): number =>
  date.year * 10_000 + date.month * 100 + date.day

export const isDateSelectable = (
  model: Model,
  date: Calendar.CalendarDate,
): boolean =>
  !Option.match(model.baseMinDate, {
    onNone: () => false,
    onSome: min => ordinal(date) < ordinal(min),
  }) &&
  !Option.match(model.baseMaxDate, {
    onNone: () => false,
    onSome: max => ordinal(date) > ordinal(max),
  }) &&
  !model.baseDisabledDaysOfWeek.includes(Calendar.dayOfWeek(date)) &&
  !model.baseDisabledDates.some(disabled => ordinal(disabled) === ordinal(date))

/** Inclusive day count spanned by a normalized range — astryx counts both
 *  endpoints, so a one-day range spans 1. */
export const rangeSpan = (range: Range): number =>
  Math.abs(ordinal(range.end) - ordinal(range.start)) + 1

export const isRangeCommittable = (model: Model, range: Range): boolean =>
  Option.match(model.maxRangeSpan, {
    onNone: () => true,
    onSome: max => rangeSpan(range) <= max,
  }) && rangeSpan(range) >= model.minRangeSpan

/** Whether a preset stays committable: astryx keeps out-of-window presets
 *  visible but disabled. */
export const isPresetSelectable = (model: Model, range: Range): boolean =>
  isRangeCommittable(model, range) &&
  isDateSelectable(model, range.start) &&
  isDateSelectable(model, range.end)

/** The calendar constraints while a start day is pending: the max-span window
 *  clamps both ends around the start, and the min-span interior days (all but
 *  the start itself, which stays clickable) join the disabled set. */
const applyPendingWindow = (
  model: Model,
  pendingStart: Option.Option<Calendar.CalendarDate>,
): CalendarPrimitive.Model =>
  Option.match(pendingStart, {
    onNone: () =>
      pipe(
        model.calendar,
        calendar =>
          CalendarPrimitive.reflectMinDate(calendar, model.baseMinDate),
        calendar =>
          CalendarPrimitive.reflectMaxDate(calendar, model.baseMaxDate),
        calendar =>
          CalendarPrimitive.reflectDisabledDates(
            calendar,
            model.baseDisabledDates,
          ),
      ),
    onSome: start => {
      /* astryx only clamps the window when maxRangeSpan is set: reachable days
         sit within span-1 of the anchor in either direction. With no cap,
         only the base min/max bounds apply — every other day stays pickable. */
      const effectiveMin = Option.match(model.maxRangeSpan, {
        onNone: () => model.baseMinDate,
        onSome: span => {
          const windowMin = Calendar.subtractDays(start, span - 1)
          return Option.match(model.baseMinDate, {
            onNone: () => Option.some(windowMin),
            onSome: base =>
              Option.some(
                ordinal(windowMin) > ordinal(base) ? windowMin : base,
              ),
          })
        },
      })
      const effectiveMax = Option.match(model.maxRangeSpan, {
        onNone: () => model.baseMaxDate,
        onSome: span => {
          const windowMax = Calendar.addDays(start, span - 1)
          return Option.match(model.baseMaxDate, {
            onNone: () => Option.some(windowMax),
            onSome: base =>
              Option.some(
                ordinal(windowMax) < ordinal(base) ? windowMax : base,
              ),
          })
        },
      })
      /* astryx disables days at distance 1..minRangeSpan-2 from the anchor on
         BOTH sides (absolute distance); the anchor itself stays selectable. */
      const interior: Calendar.CalendarDate[] = []
      for (let i = 1; i < model.minRangeSpan - 1; i += 1) {
        interior.push(
          Calendar.addDays(start, i),
          Calendar.subtractDays(start, i),
        )
      }
      return pipe(
        model.calendar,
        calendar => CalendarPrimitive.reflectMinDate(calendar, effectiveMin),
        calendar => CalendarPrimitive.reflectMaxDate(calendar, effectiveMax),
        calendar =>
          CalendarPrimitive.reflectDisabledDates(calendar, [
            ...model.baseDisabledDates,
            ...interior,
          ]),
      )
    },
  })

const beginPending = (model: Model, date: Calendar.CalendarDate): Model => {
  const pending = { ...model, pendingStart: Option.some(date) }
  return {
    ...pending,
    calendar: applyPendingWindow(pending, pending.pendingStart),
  }
}

const clearPending = (model: Model): Model => {
  const cleared = { ...model, pendingStart: Option.none() }
  return { ...cleared, calendar: applyPendingWindow(cleared, Option.none()) }
}

const commitRange = (model: Model, range: Range): UpdateReturn => {
  const normalized = normalizeRange(range)
  const committed = clearPending({
    ...model,
    value: Option.some(normalized),
    calendar: CalendarPrimitive.focusDate(model.calendar, normalized.start),
  })
  return {
    model: {
      ...committed,
      calendar: CalendarPrimitive.dropToDays(committed.calendar),
    },
    outMessage: OutMessage.ChangedValue({ value: Option.some(normalized) }),
  }
}

const clearValue = (model: Model): UpdateReturn => ({
  model: clearPending({ ...model, value: Option.none() }),
  outMessage: OutMessage.ChangedValue({ value: Option.none() }),
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const liftCalendar = (
  model: Model,
  result: ReturnType<typeof CalendarPrimitive.update>,
): UpdateReturn => ({
  model: { ...model, calendar: result.model },
  ...(result.commands === undefined
    ? {}
    : {
        commands: Command.mapMessages(result.commands, message =>
          Message.GotCalendarMessage({ message }),
        ),
      }),
})

const liftPopover = (
  model: Model,
  result: ReturnType<typeof PopoverPrimitive.update>,
): UpdateReturn => ({
  model: { ...model, popover: result.model },
  ...(result.commands === undefined
    ? {}
    : {
        commands: Command.mapMessages(result.commands, message =>
          Message.GotPopoverMessage({ message }),
        ),
      }),
})

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotCalendarMessage': {
      const result = CalendarPrimitive.update(model.calendar, message.message)
      const out = result.outMessage
      if (out === undefined || out._tag !== 'SelectedDate') {
        return liftCalendar(model, result)
      }
      const date = out.date
      if (!isDateSelectable(model, date)) {
        return liftCalendar(model, result)
      }
      return Option.match(model.pendingStart, {
        onNone: () => {
          const lifted = liftCalendar(model, result)
          const pending = beginPending(lifted.model, date)
          return { ...lifted, model: pending }
        },
        onSome: start => {
          const lifted = liftCalendar(model, result)
          if (ordinal(start) === ordinal(date) && model.minRangeSpan > 1) {
            // astryx cancels the in-progress selection when re-clicking the
            // start under a minimum span so the start can be moved.
            return { ...lifted, model: clearPending(lifted.model) }
          }
          const committed = commitRange(lifted.model, { start, end: date })
          const commands = [
            ...(lifted.commands ?? []),
            ...(committed.commands ?? []),
          ]
          return {
            ...committed,
            ...(commands.length === 0 ? {} : { commands }),
          }
        },
      })
    }
    case 'GotPopoverMessage': {
      const result = PopoverPrimitive.update(model.popover, message.message)
      const lifted = liftPopover(model, result)
      const out = result.outMessage
      if (out === undefined) {
        return lifted
      }
      // Closing the popover discards an in-progress first click and restores
      // the base constraint window; opening drops the calendar back to days.
      return {
        ...lifted,
        model:
          out._tag === 'Closed'
            ? clearPending(lifted.model)
            : {
                ...lifted.model,
                calendar: CalendarPrimitive.dropToDays(lifted.model.calendar),
              },
      }
    }
    case 'ClickedIcon':
      return model.popover.isOpen
        ? update(
            model,
            Message.GotPopoverMessage({
              message: PopoverPrimitive.Message.RequestedClose(),
            }),
          )
        : update(
            model,
            Message.GotPopoverMessage({
              message: PopoverPrimitive.Message.RequestedOpen(),
            }),
          )
    case 'ClickedPreset':
      return isPresetSelectable(model, message.range)
        ? commitRange(model, message.range)
        : { model }
    case 'ClearedValue':
      return clearValue(model)
    case 'CompletedFocusTrigger':
      return { model }
  }
}

/** Syncs the committed range when it derives from external state, moving the
 *  calendar's view and cursor onto the start so reopening shows its month. */
export const reflect = (
  model: Model,
  maybeValue: Option.Option<Range>,
): Model => ({
  ...clearPending({ ...model, value: maybeValue }),
  calendar: Option.match(maybeValue, {
    onNone: () =>
      applyPendingWindow(
        clearPending({ ...model, value: maybeValue }),
        Option.none(),
      ),
    onSome: range =>
      CalendarPrimitive.focusDate(
        applyPendingWindow(
          clearPending({ ...model, value: maybeValue }),
          Option.none(),
        ),
        range.start,
      ),
  }),
})

/** Replaces the base min/max/disabled constraints. The pending-selection
 *  window is recomputed on top of the new base. */
export const reflectConstraints = (
  model: Model,
  constraints: Readonly<{
    minDate?: Option.Option<Calendar.CalendarDate>
    maxDate?: Option.Option<Calendar.CalendarDate>
    disabledDates?: ReadonlyArray<Calendar.CalendarDate>
    disabledDaysOfWeek?: ReadonlyArray<Calendar.DayOfWeek>
  }>,
): Model => {
  const rebased: Model = {
    ...model,
    baseMinDate:
      constraints.minDate === undefined
        ? model.baseMinDate
        : constraints.minDate,
    baseMaxDate:
      constraints.maxDate === undefined
        ? model.baseMaxDate
        : constraints.maxDate,
    baseDisabledDates:
      constraints.disabledDates === undefined
        ? model.baseDisabledDates
        : [...constraints.disabledDates],
    baseDisabledDaysOfWeek:
      constraints.disabledDaysOfWeek === undefined
        ? model.baseDisabledDaysOfWeek
        : [...constraints.disabledDaysOfWeek],
  }
  return {
    ...rebased,
    calendar: pipe(
      applyPendingWindow(rebased, rebased.pendingStart),
      calendar =>
        constraints.disabledDaysOfWeek === undefined
          ? calendar
          : CalendarPrimitive.reflectDisabledDaysOfWeek(
              calendar,
              constraints.disabledDaysOfWeek,
            ),
    ),
  }
}

/** astryx's trigger label: same-year ranges drop the year, otherwise both
 *  endpoints show the short-with-year form. */
export const formatRangeDisplay = (
  value: Option.Option<Range>,
  today: Calendar.CalendarDate,
  locale = 'en',
): string =>
  Option.match(value, {
    onNone: () => '',
    onSome: range => {
      const normalized = normalizeRange(range)
      const sameYear =
        normalized.start.year === normalized.end.year &&
        normalized.start.year === today.year
      const format = new Intl.DateTimeFormat(
        locale,
        sameYear
          ? { month: 'short', day: 'numeric' }
          : { month: 'short', day: 'numeric', year: 'numeric' },
      )
      return `${format.format(Calendar.toDateLocal(normalized.start))} – ${format.format(Calendar.toDateLocal(normalized.end))}`
    },
  })

export const FocusTrigger = Command.define('FocusDateRangeInputTrigger', {
  args: { id: S.String },
  messages: [Message.CompletedFocusTrigger],
  execute: ({ id }) =>
    Dom.focus(`[id="${id}-popover-button"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusTrigger()),
    ),
})
