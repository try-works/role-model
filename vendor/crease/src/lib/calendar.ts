import { Array, Option, pipe } from 'effect'

import { Calendar as CalendarPrimitive } from '@foldkit/ui'
import * as Calendar from 'foldkit/calendar'

/** In a right-to-left calendar the day and picker grids are mirrored, so
 *  ArrowLeft and ArrowRight must swap to move the cursor in the visual
 *  direction the user expects. Home/End stay logical (first/last day of
 *  week). */
export const mirrorNavigationKeyForRtl = (
  message: CalendarPrimitive.Message,
): CalendarPrimitive.Message =>
  message._tag === 'PressedKeyOnGrid' &&
  (message.key === 'ArrowLeft' || message.key === 'ArrowRight')
    ? CalendarPrimitive.Message.PressedKeyOnGrid({
        key: message.key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft',
        isShift: message.isShift,
      })
    : message

const isDisabled = (
  model: CalendarPrimitive.Model,
  date: Calendar.CalendarDate,
): boolean =>
  Option.exists(model.maybeMinDate, min => Calendar.isBefore(date, min)) ||
  Option.exists(model.maybeMaxDate, max => Calendar.isAfter(date, max)) ||
  model.disabledDaysOfWeek.includes(Calendar.dayOfWeek(date)) ||
  model.disabledDates.some(Calendar.isEqual(date))

const fallbackFocus = (model: CalendarPrimitive.Model): Calendar.CalendarDate =>
  Option.getOrElse(model.maybeFocusedDate, () =>
    Calendar.make(model.viewYear, model.viewMonth, 1),
  )

/** Home/End jump to the week's edge day, but when that edge day is disabled
 *  the primitive's directional skip can spill the cursor into the adjacent
 *  month. Target the first (Home) or last (End) enabled day inside the
 *  focused week row instead so the cursor stays in the row the user sees. */
const weekEdgeTarget = (
  model: CalendarPrimitive.Model,
  edge: 'start' | 'end',
): Option.Option<Calendar.CalendarDate> => {
  const focused = fallbackFocus(model)
  const edgeDate =
    edge === 'start'
      ? Calendar.startOfWeek(focused, model.locale.firstDayOfWeek)
      : Calendar.endOfWeek(focused, model.locale.firstDayOfWeek)
  const step = edge === 'start' ? 1 : -1
  return pipe(
    Array.makeBy(7, index => Calendar.addDays(edgeDate, index * step)),
    Array.findFirst(date => !isDisabled(model, date)),
  )
}

/** Wraps the primitive update: Home/End land on the nearest enabled day
 *  within the focused week row rather than skipping across a month
 *  boundary. Every other message defers to the primitive unchanged. */
export const update = (
  model: CalendarPrimitive.Model,
  message: CalendarPrimitive.Message,
): ReturnType<typeof CalendarPrimitive.update> => {
  if (
    message._tag === 'PressedKeyOnGrid' &&
    (message.key === 'Home' || message.key === 'End')
  ) {
    const target = weekEdgeTarget(
      model,
      message.key === 'Home' ? 'start' : 'end',
    )
    if (Option.isSome(target)) {
      const nextModel = CalendarPrimitive.focusDate(model, target.value)
      const crossedMonth =
        target.value.year !== model.viewYear ||
        target.value.month !== model.viewMonth
      return {
        model: nextModel,
        ...(crossedMonth
          ? {
              outMessage: CalendarPrimitive.OutMessage.ChangedViewMonth({
                year: target.value.year,
                month: target.value.month,
              }),
            }
          : {}),
      }
    }
  }
  return CalendarPrimitive.update(model, message)
}

export type CalendarRange = Readonly<{
  start: Calendar.CalendarDate
  end: Calendar.CalendarDate
}>

export type RangePosition = 'outside' | 'single' | 'start' | 'middle' | 'end'

const ordinal = (date: Calendar.CalendarDate): number =>
  date.year * 10_000 + date.month * 100 + date.day

export const normalizeRange = (range: CalendarRange): CalendarRange =>
  ordinal(range.start) <= ordinal(range.end)
    ? range
    : { start: range.end, end: range.start }

export const rangePosition = (
  date: Calendar.CalendarDate,
  range: CalendarRange | undefined,
): RangePosition => {
  if (range === undefined) return 'outside'
  const normalized = normalizeRange(range)
  const value = ordinal(date)
  const start = ordinal(normalized.start)
  const end = ordinal(normalized.end)
  if (value < start || value > end) return 'outside'
  if (start === end) return 'single'
  if (value === start) return 'start'
  if (value === end) return 'end'
  return 'middle'
}

/** Convert an instant at the application boundary; Calendar itself stays zone-free. */
export const dateInTimeZone = (
  instant: Date,
  timeZone: string,
): Calendar.CalendarDate => Calendar.fromDateInZone(instant, timeZone)
