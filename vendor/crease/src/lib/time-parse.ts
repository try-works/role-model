import { Option } from 'effect'

/* Ported from Meta Astryx utils/timeParser.ts — ISO time strings stay plain
   strings ("HH:MM" or "HH:MM:SS", 24-hour) and null returns become
   Option.none(). Parse/convert rules are verbatim: meridiem detection with
   optional dots, "1430"/"143000" numeric forms, colon-separated forms,
   midnight wrap-around on adjust. */

export type ParsedTime = Readonly<{
  hour: number
  minute: number
  second: number
}>

export const parseISOTime = (time: string): Option.Option<ParsedTime> => {
  if (!time) {
    return Option.none()
  }

  const parts = time.split(':')
  if (parts.length < 2 || parts.length > 3) {
    return Option.none()
  }

  const hour = Number.parseInt(parts[0] ?? '', 10)
  const minute = Number.parseInt(parts[1] ?? '', 10)
  const second = parts.length === 3 ? Number.parseInt(parts[2] ?? '', 10) : 0

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    Number.isNaN(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return Option.none()
  }

  return Option.some({ hour, minute, second })
}

export const formatISOTime = (
  time: ParsedTime,
  includeSeconds = false,
): string => {
  const hh = time.hour.toString().padStart(2, '0')
  const mm = time.minute.toString().padStart(2, '0')
  if (includeSeconds) {
    const ss = time.second.toString().padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${hh}:${mm}`
}

/** "14:30" -> "2:30 PM" */
export const formatDisplayTime12h = (
  time: string | undefined,
  includeSeconds = false,
): string => {
  if (time === undefined) {
    return ''
  }
  const parsed = Option.getOrNull(parseISOTime(time))
  if (parsed === null) {
    return ''
  }
  const hour12 =
    parsed.hour === 0 ? 12 : parsed.hour > 12 ? parsed.hour - 12 : parsed.hour
  const meridiem = parsed.hour < 12 ? 'AM' : 'PM'
  const mm = parsed.minute.toString().padStart(2, '0')
  if (includeSeconds) {
    const ss = parsed.second.toString().padStart(2, '0')
    return `${hour12}:${mm}:${ss} ${meridiem}`
  }
  return `${hour12}:${mm} ${meridiem}`
}

/** "14:30" -> "14:30" */
export const formatDisplayTime24h = (
  time: string | undefined,
  includeSeconds = false,
): string => {
  if (time === undefined) {
    return ''
  }
  const parsed = Option.getOrNull(parseISOTime(time))
  if (parsed === null) {
    return ''
  }
  const hh = parsed.hour.toString().padStart(2, '0')
  const mm = parsed.minute.toString().padStart(2, '0')
  if (includeSeconds) {
    const ss = parsed.second.toString().padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${hh}:${mm}`
}

/** Parses user input into an ISO time string. Accepts "2:30 PM", "2:30pm",
 *  "2:30 pm", "14:30", "1430", "143000", and "2pm"/"2 PM" (dotted meridiems
 *  like "p.m." too). */
export const parseTimeInput = (
  input: string,
  includeSeconds = false,
): Option.Option<string> => {
  if (!input) {
    return Option.none()
  }
  const trimmed = input.trim().toLowerCase()
  const isPM = /p\.?m?\.?\s*$/i.test(trimmed)
  const isAM = /a\.?m?\.?\s*$/i.test(trimmed)
  const hasMeridiem = isPM || isAM
  const timeStr = trimmed.replace(/\s*[ap]\.?m?\.?\s*$/i, '').trim()

  const convertHourTo24Hour = (hour: number): number | null => {
    if (!hasMeridiem) {
      return hour
    }
    if (hour < 1 || hour > 12) {
      return null
    }
    if (isPM && hour !== 12) {
      return hour + 12
    }
    if (isAM && hour === 12) {
      return 0
    }
    return hour
  }

  if (/^\d{1,2}$/.test(timeStr)) {
    const hour = Number.parseInt(timeStr, 10)
    if (hasMeridiem) {
      const hour24 = convertHourTo24Hour(hour)
      if (hour24 === null) {
        return Option.none()
      }
      return Option.some(
        formatISOTime({ hour: hour24, minute: 0, second: 0 }, includeSeconds),
      )
    }
    if (hour >= 0 && hour <= 23) {
      return Option.some(
        formatISOTime({ hour, minute: 0, second: 0 }, includeSeconds),
      )
    }
    return Option.none()
  }

  if (/^\d{4}$/.test(timeStr)) {
    const hour = Number.parseInt(timeStr.slice(0, 2), 10)
    const minute = Number.parseInt(timeStr.slice(2, 4), 10)
    const hour24 = convertHourTo24Hour(hour)
    if (
      hour24 !== null &&
      hour24 >= 0 &&
      hour24 <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return Option.some(
        formatISOTime({ hour: hour24, minute, second: 0 }, includeSeconds),
      )
    }
    return Option.none()
  }

  if (/^\d{6}$/.test(timeStr)) {
    const hour = Number.parseInt(timeStr.slice(0, 2), 10)
    const minute = Number.parseInt(timeStr.slice(2, 4), 10)
    const second = Number.parseInt(timeStr.slice(4, 6), 10)
    const hour24 = convertHourTo24Hour(hour)
    if (
      hour24 !== null &&
      hour24 >= 0 &&
      hour24 <= 23 &&
      minute >= 0 &&
      minute <= 59 &&
      second >= 0 &&
      second <= 59
    ) {
      return Option.some(
        formatISOTime({ hour: hour24, minute, second }, includeSeconds),
      )
    }
    return Option.none()
  }

  const colonParts = timeStr.split(':')
  if (colonParts.length >= 2 && colonParts.length <= 3) {
    let hour = Number.parseInt(colonParts[0] ?? '', 10)
    const minute = Number.parseInt(colonParts[1] ?? '', 10)
    const second =
      colonParts.length === 3 ? Number.parseInt(colonParts[2] ?? '', 10) : 0

    if (Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
      return Option.none()
    }
    if (minute < 0 || minute > 59 || second < 0 || second > 59) {
      return Option.none()
    }

    if (hasMeridiem) {
      if (hour < 1 || hour > 12) {
        return Option.none()
      }
      if (isPM && hour !== 12) {
        hour += 12
      }
      if (isAM && hour === 12) {
        hour = 0
      }
    } else if (hour < 0 || hour > 23) {
      return Option.none()
    }

    return Option.some(formatISOTime({ hour, minute, second }, includeSeconds))
  }

  return Option.none()
}

/** Compares two ISO time strings: negative when a < b, 0 when equal,
 *  positive when a > b. */
export const compareTime = (
  a: string | undefined,
  b: string | undefined,
): number => {
  if (!a && !b) {
    return 0
  }
  if (!a) {
    return -1
  }
  if (!b) {
    return 1
  }
  const parsedA = Option.getOrNull(parseISOTime(a))
  const parsedB = Option.getOrNull(parseISOTime(b))
  if (!parsedA && !parsedB) {
    return 0
  }
  if (!parsedA) {
    return -1
  }
  if (!parsedB) {
    return 1
  }
  return (
    parsedA.hour * 3600 +
    parsedA.minute * 60 +
    parsedA.second -
    (parsedB.hour * 3600 + parsedB.minute * 60 + parsedB.second)
  )
}

/** Inclusive min/max range check. */
export const isTimeInRange = (
  time: string,
  min?: string,
  max?: string,
): boolean =>
  !(min !== undefined && compareTime(time, min) < 0) &&
  !(max !== undefined && compareTime(time, max) > 0)

/** Clamps a time to a min/max range. */
export const clampTime = (
  time: string,
  min?: string,
  max?: string,
  includeSeconds = false,
): string => {
  const parsed = Option.getOrNull(parseISOTime(time))
  if (parsed === null) {
    return time
  }
  if (min !== undefined && compareTime(time, min) < 0) {
    const parsedMin = Option.getOrNull(parseISOTime(min))
    if (parsedMin !== null) {
      return formatISOTime(parsedMin, includeSeconds)
    }
  }
  if (max !== undefined && compareTime(time, max) > 0) {
    const parsedMax = Option.getOrNull(parseISOTime(max))
    if (parsedMax !== null) {
      return formatISOTime(parsedMax, includeSeconds)
    }
  }
  return time
}

/** Adds/subtracts minutes, wrapping around midnight. */
export const adjustTime = (
  time: string,
  deltaMinutes: number,
  includeSeconds = false,
): string => {
  const parsed = Option.getOrNull(parseISOTime(time))
  if (parsed === null) {
    return time
  }
  if (!Number.isFinite(deltaMinutes)) {
    return time
  }
  const totalMinutes =
    (((parsed.hour * 60 + parsed.minute + deltaMinutes) % (24 * 60)) +
      24 * 60) %
    (24 * 60)
  return formatISOTime(
    {
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60,
      second: parsed.second,
    },
    includeSeconds,
  )
}
