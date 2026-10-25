/* Ported from Meta Astryx Timestamp formatter leaves (formatInstant.ts,
   formatRelativeTime.ts, tooltipEntries.ts) — pure date/instant formatting
   shared by the tailwind and stylex Timestamp ports. The astryx locale
   provider resolves to the host default ('en'). */

export type TimestampFormat =
  | 'relative'
  | 'relative_short'
  | 'auto'
  | 'date'
  | 'date_long'
  | 'date_weekday'
  | 'date_time'
  | 'time'
  | 'system_date'
  | 'system_date_time'
  | 'system_time'
  | 'unix_seconds'

export type InstantFormat =
  | Exclude<TimestampFormat, 'relative' | 'relative_short' | 'auto'>
  | 'full'

export type TimestampTooltipFormat = InstantFormat

export type TimestampTooltipEntry = Readonly<{
  /** IANA time zone identifier; omit or pass 'local' for the viewer's zone. */
  timezoneID?: string
  /** How this line renders the instant. @default 'full' */
  format?: TimestampTooltipFormat
  /** Label shown beside the time. */
  label?: string
  /** Whether this row shows a copy button. @default false */
  isCopyable?: boolean
}>

export type TimestampTooltipLine = Readonly<{
  label?: string
  value: string
  isCopyable: boolean
}>

// =============================================================================
// formatInstant
// =============================================================================

const FULL_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
}

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
}

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  ...TIME_OPTIONS,
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

const DATE_LONG_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

const DATE_WEEKDAY_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

const pad = (n: number): string => String(n).padStart(2, '0')

interface WallClock {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly hour: number
  readonly minute: number
  readonly second: number
}

const getTimeZoneParts = (instant: number, timezoneID: string): WallClock => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneID,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    calendar: 'gregory',
  }).formatToParts(new Date(instant))

  const lookup = Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]),
  )

  return {
    year: lookup['year'] as number,
    month: lookup['month'] as number,
    day: lookup['day'] as number,
    hour: lookup['hour'] as number,
    minute: lookup['minute'] as number,
    second: lookup['second'] as number,
  }
}

const getWallClock = (date: Date, timeZone: string | undefined): WallClock =>
  timeZone === undefined
    ? {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
      }
    : getTimeZoneParts(date.getTime(), timeZone)

export const formatInstant = (
  date: Date,
  format: InstantFormat,
  options?: {
    readonly timeZone?: string
    readonly isTimezoneShown?: boolean
    readonly timeZoneNameStyle?: 'short' | 'long'
  },
): string => {
  const {
    timeZone,
    isTimezoneShown = false,
    timeZoneNameStyle = 'short',
  } = options ?? {}
  const zone = timeZone === undefined ? {} : { timeZone }
  const zoneName = isTimezoneShown ? { timeZoneName: 'short' as const } : {}

  switch (format) {
    case 'full':
      return new Intl.DateTimeFormat('en', {
        ...FULL_OPTIONS,
        timeZoneName: timeZoneNameStyle,
        ...zone,
        calendar: 'gregory',
      }).format(date)
    case 'date':
      return new Intl.DateTimeFormat('en', {
        ...DATE_OPTIONS,
        ...zone,
        calendar: 'gregory',
      }).format(date)
    case 'date_long':
      return new Intl.DateTimeFormat('en', {
        ...DATE_LONG_OPTIONS,
        ...zone,
        calendar: 'gregory',
      }).format(date)
    case 'date_weekday':
      return new Intl.DateTimeFormat('en', {
        ...DATE_WEEKDAY_OPTIONS,
        ...zone,
        calendar: 'gregory',
      }).format(date)
    case 'date_time':
      return new Intl.DateTimeFormat('en', {
        ...DATE_TIME_OPTIONS,
        ...zoneName,
        ...zone,
        calendar: 'gregory',
      }).format(date)
    case 'time':
      return new Intl.DateTimeFormat('en', {
        ...TIME_OPTIONS,
        ...zoneName,
        ...zone,
      }).format(date)
    case 'system_date': {
      const w = getWallClock(date, timeZone)
      return `${w.year}-${pad(w.month)}-${pad(w.day)}`
    }
    case 'system_date_time': {
      const w = getWallClock(date, timeZone)
      return `${w.year}-${pad(w.month)}-${pad(w.day)} ${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`
    }
    case 'system_time': {
      const w = getWallClock(date, timeZone)
      return `${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`
    }
    case 'unix_seconds':
      return String(Math.floor(date.getTime() / 1000))
  }
}

// =============================================================================
// formatRelativeTime
// =============================================================================

const MINUTE = 60
const HOUR = 3600
const DAY = 86400
const MONTH = 30 * DAY
const YEAR = 365 * DAY
const FUTURE_SKEW_TOLERANCE = 30

type RelativeTimeStyle = 'long' | 'narrow'
type RelativeTimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year'

const formatters = new Map<string, Intl.RelativeTimeFormat>()

const getRelativeFormatter = (
  style: RelativeTimeStyle,
  numeric: Intl.RelativeTimeFormatNumeric,
): Intl.RelativeTimeFormat => {
  const key = `${style}:${numeric}`
  let formatter = formatters.get(key)
  if (formatter == null) {
    formatter = new Intl.RelativeTimeFormat('en', { numeric, style })
    formatters.set(key, formatter)
  }
  return formatter
}

export const formatRelativeTime = (
  date: Date,
  now: Date,
  style: RelativeTimeStyle,
): string => {
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000)
  const absDiff = Math.abs(diffSeconds)

  if (absDiff < 10 || (diffSeconds < 0 && absDiff <= FUTURE_SKEW_TOLERANCE)) {
    return getRelativeFormatter(style, 'auto').format(0, 'second')
  }

  let count: number
  let unit: RelativeTimeUnit
  if (absDiff < MINUTE) {
    count = absDiff
    unit = 'second'
  } else if (absDiff < HOUR) {
    count = Math.floor(absDiff / MINUTE)
    unit = 'minute'
  } else if (absDiff < DAY) {
    count = Math.floor(absDiff / HOUR)
    unit = 'hour'
  } else if (absDiff < MONTH) {
    count = Math.floor(absDiff / DAY)
    unit = 'day'
  } else if (absDiff < YEAR) {
    count = Math.floor(absDiff / MONTH)
    unit = 'month'
  } else {
    count = Math.floor(absDiff / YEAR)
    unit = 'year'
  }

  const value = diffSeconds < 0 ? count : -count
  const numeric =
    style === 'long' && unit === 'day' && value === -1 ? 'auto' : 'always'
  return getRelativeFormatter(style, numeric).format(value, unit)
}

// =============================================================================
// tooltipEntries
// =============================================================================

const LOCAL_ZONE_ALIAS = 'local'
const warnedTimezoneIDs = new Set<string>()

const resolveTimezoneID = (
  timezoneID: string | undefined,
): string | undefined => {
  if (
    timezoneID === undefined ||
    timezoneID.toLowerCase() === LOCAL_ZONE_ALIAS
  ) {
    return undefined
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezoneID })
  } catch {
    if (!warnedTimezoneIDs.has(timezoneID)) {
      warnedTimezoneIDs.add(timezoneID)
      console.warn(
        `Timestamp: unknown time zone ${JSON.stringify(timezoneID)} in tooltipEntries. Falling back to the viewer's time zone.`,
      )
    }
    return undefined
  }
  return timezoneID
}

const zoneKey = (resolved: string | undefined): string =>
  resolved === undefined ? LOCAL_ZONE_ALIAS : resolved.toLowerCase()

const shouldShowZoneName = (
  format: TimestampTooltipFormat,
  hasMultipleZones: boolean,
  isNamedZone: boolean,
): boolean => {
  if (format === 'full') {
    return true
  }
  if (format === 'date_time' || format === 'time') {
    return hasMultipleZones || isNamedZone
  }
  return false
}

export const formatTooltipLines = (
  date: Date,
  entries: ReadonlyArray<TimestampTooltipEntry>,
): ReadonlyArray<TimestampTooltipLine> => {
  const resolved = entries.map(entry => resolveTimezoneID(entry.timezoneID))
  const hasMultipleZones = new Set(resolved.map(zoneKey)).size > 1

  return entries.map((entry, index) => {
    const format = entry.format ?? 'full'
    const timeZone = resolved[index]

    return {
      ...(entry.label === undefined ? {} : { label: entry.label }),
      isCopyable: entry.isCopyable ?? false,
      value: formatInstant(date, format, {
        ...(timeZone === undefined ? {} : { timeZone }),
        isTimezoneShown: shouldShowZoneName(
          format,
          hasMultipleZones,
          timeZone !== undefined,
        ),
      }),
    }
  })
}
