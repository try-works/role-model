import { Option, Schema as S } from 'effect'
import { Command, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Listbox } from '@foldkit/ui'

/* Ported from Meta Astryx TimeInput (packages/core/src/TimeInput) — typed time
   parsing ("2:30 PM", "2pm", "1430"), 12h/24h display, minute stepping, and
   min/max window clamping. Values travel as "HH:MM" / "HH:MM:SS" strings. */

export type TimeValue = string

const pad2 = (n: number): string => n.toString().padStart(2, '0')

/** Parses "HH:MM" or "HH:MM:SS" into minutes-since-midnight (+ seconds). */
export const parseISOTime = (
  value: string,
): Readonly<{ minutes: number; seconds: number }> | null => {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/u.exec(value.trim())
  if (match === null) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = match[3] === undefined ? 0 : Number(match[3])
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return { minutes: hours * 60 + minutes, seconds }
}

/** "HH:MM" or "HH:MM:SS" from minutes-since-midnight. */
export const formatISOTime = (
  minutes: number,
  seconds = 0,
  includeSeconds = false,
): string =>
  `${pad2(Math.floor(minutes / 60) % 24)}:${pad2(((minutes % 60) + 60) % 60)}${includeSeconds ? `:${pad2(seconds)}` : ''}`

export const formatDisplayTime = (
  value: string,
  options: Readonly<{
    hourFormat: '12h' | '24h'
    hasSeconds?: boolean | undefined
  }>,
): string => {
  const parsed = parseISOTime(value)
  if (parsed === null) return value
  const hours = Math.floor(parsed.minutes / 60)
  const minutes = parsed.minutes % 60
  const secondsPart =
    options.hasSeconds === true ? `:${pad2(parsed.seconds)}` : ''
  if (options.hourFormat === '24h') {
    return `${pad2(hours)}:${pad2(minutes)}${secondsPart}`
  }
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${pad2(minutes)}${secondsPart} ${period}`
}

/** astryx's flexible time parser: "2:30 PM", "2pm", "1430", "14:30:45". */
export const parseTimeInput = (
  input: string,
  includeSeconds: boolean,
): TimeValue | null => {
  const text = input.trim().toLowerCase()
  if (text === '') return null

  const meridiem = /([ap])\.?m?\.?$/u.exec(text)
  const meridiemShift = meridiem === null ? null : meridiem[1] === 'p'
  const core = meridiem === null ? text : text.slice(0, meridiem.index).trim()

  let hours: number | null = null
  let minutes = 0
  let seconds = 0

  const colonMatch = /^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/u.exec(core)
  const digitsMatch = /^(\d{3,6})$/u.exec(core)
  const singleMatch = /^(\d{1,2})$/u.exec(core)

  if (colonMatch !== null && core.includes(':')) {
    hours = Number(colonMatch[1])
    minutes = colonMatch[2] === undefined ? 0 : Number(colonMatch[2])
    seconds = colonMatch[3] === undefined ? 0 : Number(colonMatch[3])
  } else if (digitsMatch !== null) {
    const digits = digitsMatch[1] ?? ''
    const pad = digits.length % 2 === 0 ? digits : `0${digits}`
    hours = Number(pad.slice(0, 2))
    minutes = Number(pad.slice(2, 4))
    seconds = pad.length >= 6 ? Number(pad.slice(4, 6)) : 0
  } else if (singleMatch !== null) {
    hours = Number(singleMatch[1])
  } else {
    return null
  }

  if (hours === null || hours > 24 || minutes > 59 || seconds > 59) return null
  if (seconds > 0 && !includeSeconds) return null

  if (meridiemShift !== null) {
    if (hours > 12) return null
    if (meridiemShift) {
      hours = hours === 12 ? 12 : hours + 12
    } else {
      hours = hours === 12 ? 0 : hours
    }
  }
  if (hours === 24) hours = 0

  return formatISOTime(hours * 60 + minutes, seconds, includeSeconds)
}

/** Minute-of-day comparison for range checks. */
export const compareTime = (a: TimeValue, b: TimeValue): number => {
  const left = parseISOTime(a)
  const right = parseISOTime(b)
  if (left === null || right === null) return 0
  return left.minutes - right.minutes
}

export const isTimeInRange = (
  value: TimeValue,
  min: TimeValue | undefined,
  max: TimeValue | undefined,
): boolean =>
  (min === undefined || compareTime(value, min) >= 0) &&
  (max === undefined || compareTime(value, max) <= 0)

/** Shifts a time by `delta` minutes, wrapping inside the 24h day. */
export const adjustTime = (
  value: TimeValue,
  delta: number,
): TimeValue | null => {
  const parsed = parseISOTime(value)
  if (parsed === null) return null
  const minutes = (((parsed.minutes + delta) % 1440) + 1440) % 1440
  return formatISOTime(minutes, parsed.seconds, parsed.seconds > 0)
}

/** Parses any supported typed input AND reports whether it landed in range. */
export const resolveTimeDraft = (
  text: string,
  options: Readonly<{
    includeSeconds: boolean
    min?: TimeValue | undefined
    max?: TimeValue | undefined
  }>,
): Option.Option<TimeValue> => {
  const parsed = parseTimeInput(text, options.includeSeconds)
  if (parsed === null || !isTimeInRange(parsed, options.min, options.max)) {
    return Option.none()
  }
  return Option.some(parsed)
}

export type TimeInputCommit =
  | Readonly<{ kind: 'commit'; value: TimeValue }>
  | Readonly<{ kind: 'clear' }>
  | Readonly<{ kind: 'revert' }>

/** Blur/Enter resolution for the pending draft. */
export const resolveTimeInputCommit = (
  pendingInput: string | undefined,
  options: Readonly<{
    includeSeconds: boolean
    hasClear?: boolean | undefined
    min?: TimeValue | undefined
    max?: TimeValue | undefined
  }>,
): TimeInputCommit => {
  if (pendingInput === undefined) return { kind: 'revert' }
  if (pendingInput.trim() === '') {
    return { kind: 'clear' }
  }
  const resolved = resolveTimeDraft(pendingInput, options)
  return Option.match(resolved, {
    onSome: value => ({ kind: 'commit', value }) as TimeInputCommit,
    onNone: () => ({ kind: 'revert' }) as TimeInputCommit,
  })
}

/* --- Submodel ----------------------------------------------------------- */

export const TimePart = S.Literals(['hour', 'minute', 'second', 'period'])
export type TimePart = typeof TimePart.Type

export type TimePickerOptions = Readonly<{
  hourFormat: '12h' | '24h'
  hasSeconds: boolean
  min?: string | undefined
  max?: string | undefined
}>

/** Changes one segment, preserving the others and respecting the time window. */
export const resolveTimePart = (
  value: string | null | undefined,
  part: TimePart,
  selected: string,
  options: TimePickerOptions,
): string | null => {
  const base = parseISOTime(value ?? '') ??
    parseISOTime(options.min ?? '') ?? {
      minutes: 0,
      seconds: 0,
    }
  let hour = Math.floor(base.minutes / 60)
  let minute = base.minutes % 60
  let second = options.hasSeconds ? base.seconds : 0
  const number = /^\d{1,2}$/u.test(selected) ? Number(selected) : NaN
  switch (part) {
    case 'hour':
      if (options.hourFormat === '12h') {
        if (number < 1 || number > 12 || !Number.isInteger(number)) return null
        hour = (number % 12) + (hour >= 12 ? 12 : 0)
      } else {
        if (number < 0 || number > 23 || !Number.isInteger(number)) return null
        hour = number
      }
      break
    case 'minute':
    case 'second':
      if (number < 0 || number > 59 || !Number.isInteger(number)) return null
      if (part === 'minute') minute = number
      else if (options.hasSeconds) second = number
      else return null
      break
    case 'period':
      if (selected !== 'AM' && selected !== 'PM') return null
      hour = (hour % 12) + (selected === 'PM' ? 12 : 0)
      break
  }
  const candidate = hour * 3600 + minute * 60 + second
  const secondsOf = (time: string | undefined, fallback: number): number => {
    const parsed = parseISOTime(time ?? '')
    return parsed === null ? fallback : parsed.minutes * 60 + parsed.seconds
  }
  const minimumSeconds = secondsOf(options.min, 0)
  const maximumSeconds = secondsOf(options.max, 86399)
  const minimum = options.hasSeconds
    ? minimumSeconds
    : Math.ceil(minimumSeconds / 60) * 60
  const maximum = options.hasSeconds
    ? maximumSeconds
    : Math.floor(maximumSeconds / 60) * 60
  if (minimum > maximum) return null
  const clamped = Math.min(maximum, Math.max(minimum, candidate))
  // Hours at the edge of a window remain selectable, e.g. 10:00 -> 10:15.
  // Other segments never silently change the value the user just selected.
  if (clamped !== candidate) {
    if (part === 'hour' && Math.floor(clamped / 3600) !== hour) return null
    if (part === 'period' && clamped >= 43200 !== hour >= 12) return null
    if (part === 'minute' || part === 'second') return null
  }
  return formatISOTime(
    Math.floor(clamped / 60),
    clamped % 60,
    options.hasSeconds,
  )
}

export const timePartValue = (
  value: string | null | undefined,
  part: TimePart,
  hourFormat: '12h' | '24h',
): Option.Option<string> => {
  const parsed = parseISOTime(value ?? '')
  if (parsed === null) return Option.none()
  const hour = Math.floor(parsed.minutes / 60)
  switch (part) {
    case 'hour':
      return Option.some(pad2(hourFormat === '12h' ? hour % 12 || 12 : hour))
    case 'minute':
      return Option.some(pad2(parsed.minutes % 60))
    case 'second':
      return Option.some(pad2(parsed.seconds))
    case 'period':
      return Option.some(hour >= 12 ? 'PM' : 'AM')
  }
}

export const timePartOptions = (
  part: TimePart,
  hourFormat: '12h' | '24h',
): ReadonlyArray<string> =>
  part === 'period'
    ? ['AM', 'PM']
    : Array.from(
        { length: part === 'hour' ? (hourFormat === '12h' ? 12 : 24) : 60 },
        (_, index) =>
          pad2(index + (part === 'hour' && hourFormat === '12h' ? 1 : 0)),
      )

const PickerContext = S.Struct({
  value: S.NullOr(S.String),
  hourFormat: S.Literals(['12h', '24h']),
  hasSeconds: S.Boolean,
  min: S.NullOr(S.String),
  max: S.NullOr(S.String),
})

const PartSelect = Listbox.create<string, string>()

export const pickerButtonId = (model: Model): string =>
  Listbox.buttonId(model.parts.hour.id)

export const Model = S.Struct({
  id: S.String,
  pendingInput: S.Option(S.String),
  isFocused: S.Boolean,
  parts: S.Struct({
    hour: Listbox.Model,
    minute: Listbox.Model,
    second: Listbox.Model,
    period: Listbox.Model,
  }),
})
export type Model = typeof Model.Type

export type InitConfig = Readonly<{ id: string }>
export const init = (config: InitConfig): Model => ({
  id: config.id,
  pendingInput: Option.none(),
  isFocused: false,
  parts: {
    hour: Listbox.init({ id: `${config.id}-hour` }),
    minute: Listbox.init({ id: `${config.id}-minute` }),
    second: Listbox.init({ id: `${config.id}-second` }),
    period: Listbox.init({ id: `${config.id}-period` }),
  },
})

export const TimeInputCommitResolution = S.Union([
  S.TaggedStruct('commit', { value: S.String }),
  S.TaggedStruct('clear', {}),
  S.TaggedStruct('revert', {}),
])
export type TimeInputCommitResolution = typeof TimeInputCommitResolution.Type

export const commitResolutionOf = (
  commit: TimeInputCommit,
): TimeInputCommitResolution =>
  commit.kind === 'commit'
    ? { _tag: 'commit', value: commit.value }
    : commit.kind === 'clear'
      ? { _tag: 'clear' }
      : { _tag: 'revert' }

export const Message = defineMessageUnion({
  FocusGained: {},
  /* The resolved value rides along so a valid keystroke commits immediately
     (astryx fires onChange as soon as the typed text parses). */
  DraftEdited: { text: S.String, resolved: S.Option(S.String) },
  CommitDecided: { resolution: TimeInputCommitResolution },
  Stepped: { value: S.String },
  ClearRequested: {},
  GotPartMessage: {
    part: TimePart,
    message: Listbox.Message,
    context: PickerContext,
  },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: { value: S.Option(S.String) },
})
export type OutMessage = typeof OutMessage.Type

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotPartMessage': {
      const next = PartSelect.update(model.parts[message.part], message.message)
      const context = message.context
      const selected =
        next.outMessage === undefined
          ? null
          : resolveTimePart(
              context.value,
              message.part,
              next.outMessage.value,
              {
                hourFormat: context.hourFormat,
                hasSeconds: context.hasSeconds,
                min: context.min ?? undefined,
                max: context.max ?? undefined,
              },
            )
      return {
        model: {
          ...model,
          parts: { ...model.parts, [message.part]: next.model },
          ...(selected === null ? {} : { pendingInput: Option.none() }),
        },
        commands: Command.mapMessages(next.commands ?? [], child =>
          Message.GotPartMessage({
            part: message.part,
            message: child,
            context,
          }),
        ),
        ...(selected === null
          ? {}
          : {
              outMessage: OutMessage.ChangedValue({
                value: Option.some(selected),
              }),
            }),
      }
    }
    case 'FocusGained':
      return { model: { ...model, isFocused: true } }
    case 'DraftEdited': {
      const nextModel = { ...model, pendingInput: Option.some(message.text) }
      const resolved = Option.getOrUndefined(message.resolved)
      return resolved === undefined
        ? { model: nextModel }
        : {
            model: nextModel,
            outMessage: OutMessage.ChangedValue({
              value: Option.some(resolved),
            }),
          }
    }
    case 'CommitDecided': {
      const settled = {
        ...model,
        pendingInput: Option.none(),
        isFocused: false,
      }
      switch (message.resolution._tag) {
        case 'commit':
          return {
            model: settled,
            outMessage: OutMessage.ChangedValue({
              value: Option.some(message.resolution.value),
            }),
          }
        case 'clear':
          return {
            model: settled,
            outMessage: OutMessage.ChangedValue({ value: Option.none() }),
          }
        case 'revert':
          return { model: settled }
      }
    }
    case 'Stepped':
      return {
        model: { ...model, pendingInput: Option.none() },
        outMessage: OutMessage.ChangedValue({
          value: Option.some(message.value),
        }),
      }
    case 'ClearRequested':
      return {
        model: { ...model, pendingInput: Option.none() },
        outMessage: OutMessage.ChangedValue({ value: Option.none() }),
      }
  }
}
