import { Option, Schema as S } from 'effect'

import * as Calendar from 'foldkit/calendar'

/* Ported from Meta Astryx utils/dateParser.ts + the shared `date*` members of
   utils/plainDate.ts — examples and visual spec adapted to Crease UI tokens.

   Astryx's `PlainDate` is foldkit's `CalendarDate`; ISO strings round-trip
   through foldkit's `CalendarDateFromIsoString` codec. The parse rules are
   verbatim: ISO first, English month names (with and without year), ASCII
   numeric dates whose separators must match, month-first vs day-first chosen
   by the locale, bare digits rejected, and a native `Date` fallback. */

export const dateToISO = (date: Calendar.CalendarDate): string =>
  S.encodeSync(Calendar.CalendarDateFromIsoString)(date)

export const dateFromISO = (
  iso: string,
): Option.Option<Calendar.CalendarDate> =>
  S.decodeUnknownOption(Calendar.CalendarDateFromIsoString)(iso)

/** Detects if the locale uses day-first date format (DD/MM/YYYY).
 *  US and a few others use month-first (MM/DD/YYYY). */
export const isLocaleDayFirst = (locale = 'en'): boolean => {
  const parts = new Intl.DateTimeFormat(locale, {
    calendar: 'gregory',
  }).formatToParts(new Date(2000, 0, 15))
  const dayIndex = parts.findIndex(part => part.type === 'day')
  const monthIndex = parts.findIndex(part => part.type === 'month')
  return dayIndex < monthIndex
}

const tryCreate = (
  year: number,
  month: number,
  day: number,
): Option.Option<Calendar.CalendarDate> => {
  try {
    return Option.some(Calendar.make(year, month, day))
  } catch {
    return Option.none()
  }
}

const MONTHS: Readonly<Record<string, number>> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
}

const parseMonthName = (name: string): Option.Option<number> =>
  Option.fromNullishOr(MONTHS[name.toLowerCase()])

const parseNumericDate = (
  first: number,
  second: number,
  year: number,
  locale: string,
): Option.Option<Calendar.CalendarDate> => {
  if (first > 12 && second <= 12) {
    return tryCreate(year, second, first)
  }
  if (second > 12 && first <= 12) {
    return tryCreate(year, first, second)
  }
  if (first > 12 && second > 12) {
    return Option.none()
  }
  return isLocaleDayFirst(locale)
    ? tryCreate(year, second, first)
    : tryCreate(year, first, second)
}

/** Parses user input into a CalendarDate.
 *
 *  Supports ISO dates, English month names, and ASCII numeric dates with or
 *  without a year. For ambiguous numeric input where both fields are at most
 *  12, `locale` selects month-first versus day-first order. */
export const parseDateInput = (
  input: string,
  locale = 'en',
): Option.Option<Calendar.CalendarDate> => {
  const trimmed = input.trim()
  if (!trimmed) {
    return Option.none()
  }

  const currentYear = new Date().getFullYear()

  // 1. ISO format first (YYYY-MM-DD) — always unambiguous
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    return tryCreate(
      Number(isoMatch[1]!),
      Number(isoMatch[2]!),
      Number(isoMatch[3]!),
    )
  }

  // 2. Month-name formats with year: "January 25, 2026" or "Jan 25, 2026"
  const monthFirstWithYear = trimmed.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
  )
  if (monthFirstWithYear) {
    const month = parseMonthName(monthFirstWithYear[1]!)
    if (Option.isSome(month)) {
      return tryCreate(
        Number(monthFirstWithYear[3]!),
        month.value,
        Number(monthFirstWithYear[2]!),
      )
    }
  }

  // "25 January 2026" or "25 Jan 2026"
  const dayFirstWithYear = trimmed.match(
    /^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/,
  )
  if (dayFirstWithYear) {
    const month = parseMonthName(dayFirstWithYear[2]!)
    if (Option.isSome(month)) {
      return tryCreate(
        Number(dayFirstWithYear[3]!),
        month.value,
        Number(dayFirstWithYear[1]!),
      )
    }
  }

  // 3. Month-name formats without year — defaults to current year
  const monthFirstNoYear = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})$/)
  if (monthFirstNoYear) {
    const month = parseMonthName(monthFirstNoYear[1]!)
    if (Option.isSome(month)) {
      return tryCreate(currentYear, month.value, Number(monthFirstNoYear[2]!))
    }
  }

  const dayFirstNoYear = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)$/)
  if (dayFirstNoYear) {
    const month = parseMonthName(dayFirstNoYear[2]!)
    if (Option.isSome(month)) {
      return tryCreate(currentYear, month.value, Number(dayFirstNoYear[1]!))
    }
  }

  // 4. Numeric formats with separators (/, -, .) with year — separators
  //    must match
  const numericWithYear = trimmed.match(
    /^(\d{1,2})([-/.])(\d{1,2})([-/.])(\d{4})$/,
  )
  if (numericWithYear) {
    if (numericWithYear[2] !== numericWithYear[4]) {
      return Option.none()
    }
    return parseNumericDate(
      Number(numericWithYear[1]!),
      Number(numericWithYear[3]!),
      Number(numericWithYear[5]!),
      locale,
    )
  }

  // 5. Numeric formats without year — defaults to current year
  const numericNoYear = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})$/)
  if (numericNoYear) {
    return parseNumericDate(
      Number(numericNoYear[1]!),
      Number(numericNoYear[2]!),
      currentYear,
      locale,
    )
  }

  // 6. Fall back to native Date parsing. Bare numeric input is an
  //    in-progress value, not a complete date — native parsing coerces it
  //    into arbitrary dates.
  if (/^\d+$/.test(trimmed)) {
    return Option.none()
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    const fromDate = Calendar.fromDateLocal(parsed)
    return tryCreate(fromDate.year, fromDate.month, fromDate.day)
  }

  return Option.none()
}

/** The date-only members of Timestamp's `format` vocabulary that a
 *  calendar-date field (no time-of-day) can render. `system_date` is emitted
 *  as a fixed ISO `YYYY-MM-DD` string rather than through `Intl`. */
export type SharedDateFormat =
  | 'date'
  | 'date_long'
  | 'date_weekday'
  | 'system_date'

const SHARED_DATE_FORMAT_OPTIONS: Readonly<
  Record<Exclude<SharedDateFormat, 'system_date'>, Intl.DateTimeFormatOptions>
> = {
  date: { month: 'short', day: 'numeric', year: 'numeric' },
  date_long: { year: 'numeric', month: 'long', day: 'numeric' },
  date_weekday: {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
}

/** Renders a CalendarDate using one of the SharedDateFormat members — the
 *  same entry point DateInput's display path uses in Astryx. */
export const formatSharedDate = (
  date: Calendar.CalendarDate,
  format: SharedDateFormat,
  locale = 'en',
): string =>
  format === 'system_date'
    ? dateToISO(date)
    : new Intl.DateTimeFormat(locale, {
        ...SHARED_DATE_FORMAT_OPTIONS[format],
        calendar: 'gregory',
      }).format(Calendar.toDateLocal(date))
