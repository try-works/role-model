import { Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

/* Ported from Meta Astryx NumberInput (packages/core/src/NumberInput) —
   locale-aware number parsing, stepper math, and the commit-resolution state
   machine. The component keeps the committed value controlled by the parent;
   the submodel owns only the in-flight draft text. */

export type NumberInputSize = 'sm' | 'md' | 'lg'

/** Locales that group digits with a space or narrow NBSP (e.g. fr-FR). */
const SPACE_GROUPED_LOCALES = /[\s  ]/u

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export type ParsedNumberParts = Readonly<{
  decimal: string
  group: string
}>

/** Reads the decimal + grouping separators for the ambient locale. */
export const localeSeparators = (locale?: string): ParsedNumberParts => {
  const formatter = new Intl.NumberFormat(locale)
  let decimal = '.'
  let group = ','
  for (const part of formatter.formatToParts(12345.6)) {
    if (part.type === 'decimal') decimal = part.value
    if (part.type === 'group') group = part.value
  }
  return { decimal, group }
}

/**
 * Parses user input into a number, mirroring astryx's parser: NFKC folds
 * full-width digits, strips currency and grouping separators, accepts
 * accounting parentheses as negatives, and understands trailing sign and
 * exponent notation. Returns null when the text is not a number.
 */
export const parseLocaleNumber = (
  input: string,
  locale?: string,
): number | null => {
  const normalized = input.normalize('NFKC').trim()
  if (normalized === '') return null

  let sign = 1
  let text = normalized
  if (/^\(.*\)$/u.test(text)) {
    sign = -1
    text = text.slice(1, -1)
  }

  text = text.replace(/[^\p{Nd}\p{Sc},.\-+eE\s]/gu, '')

  const trailingSign = /([+-])$/u.exec(text)
  if (trailingSign !== null && !/[+-]/u.test(text.slice(0, -1))) {
    if (trailingSign[1] === '-') sign = -1
    text = text.slice(0, -1)
  }
  const leadingSign = /^([+-])/u.exec(text)
  if (leadingSign !== null) {
    if (leadingSign[1] === '-') sign = -1
    text = text.slice(1)
  }

  const exponentMatch = /([eE][+-]?[0-9]+)$/u.exec(text)
  let exponent: string | null = null
  if (exponentMatch !== null && exponentMatch[1] !== undefined) {
    exponent = exponentMatch[1]
    text = text.slice(0, -exponent.length)
  }

  const { decimal, group } = localeSeparators(locale)
  const decimalCount = text.split(decimal).length - 1
  const groupRegex = new RegExp(
    `${escapeRegExp(group)}(\\p{Nd}{3})(?!\\p{Nd})`,
    'u',
  )
  const looksGrouped =
    group !== decimal &&
    (groupRegex.test(text) ||
      (SPACE_GROUPED_LOCALES.test(text) && /^\p{Nd}+$/u.test(text)))

  if (looksGrouped) {
    text = text.replace(new RegExp(escapeRegExp(group), 'gu'), '')
  }

  if (decimalCount > 1) {
    const lastDecimal = text.lastIndexOf(decimal)
    text = `${text.slice(0, lastDecimal).replace(new RegExp(escapeRegExp(decimal), 'gu'), '')}.${text.slice(lastDecimal + 1)}`
  } else if (decimalCount === 1) {
    const [intPart = '', fracPart = ''] = text.split(decimal)
    const intDigits = intPart.replace(/\D/gu, '')
    const fracDigits = fracPart.replace(/\D/gu, '')
    const intGrouped = intDigits.length > 3 || /^0\p{Nd}/u.test(intDigits)
    if (intGrouped && fracDigits.length === 3) {
      text = `${intDigits}${fracDigits}`
    } else {
      text = `${intDigits}.${fracDigits}`
    }
  }

  text = text.replace(new RegExp(escapeRegExp(decimal), 'gu'), '.')

  const candidate = `${sign < 0 ? '-' : ''}${text}${exponent ?? ''}`
  if (!/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u.test(candidate)) return null
  const value = Number.parseFloat(candidate)
  return Number.isFinite(value) ? value : null
}

/** Editable form of a committed value: locale-decimal, exponent-free. */
export const formatEditableNumber = (value: number, locale?: string): string =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 20,
    useGrouping: false,
  }).format(value)

export type NumberInputCommit =
  | Readonly<{ kind: 'commit'; value: number; didClamp: boolean }>
  | Readonly<{ kind: 'clear' }>
  | Readonly<{ kind: 'revert' }>

/** Decides what blur/Enter does with the current draft text. */
export const resolveNumberInputCommit = (
  pendingInput: string | undefined,
  options: Readonly<{
    value: number | undefined
    min?: number | undefined
    max?: number | undefined
    isIntegerOnly?: boolean | undefined
    hasClear?: boolean | undefined
  }>,
): NumberInputCommit => {
  const { value, min, max, isIntegerOnly = false, hasClear = false } = options
  if (pendingInput === undefined) {
    return { kind: 'revert' }
  }
  if (pendingInput.trim() === '') {
    if (hasClear || value === undefined) return { kind: 'clear' }
    return { kind: 'revert' }
  }
  const parsed = parseLocaleNumber(pendingInput)
  if (parsed === null || (isIntegerOnly && !Number.isInteger(parsed))) {
    return { kind: 'revert' }
  }
  const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed))
  return { kind: 'commit', value: clamped, didClamp: clamped !== parsed }
}

const countDecimals = (n: number): number => {
  const text = n.toExponential()
  const mantissa = Number.parseFloat(text.split('e')[0] ?? '0')
  const digits = mantissa.toString().replace('.', '').replace(/^-/, '').length
  const exponent = Number.parseInt(text.split('e')[1] ?? '0', 10)
  return Math.max(0, digits - 1 - exponent)
}

/**
 * Steps `current` along the `stepBase` (min or 0) + n*step grid by one
 * position in `direction`, clamping to [min, max]. Matches Astryx/native
 * number-input stepping: an empty value steps to min (up) or max (down).
 */
export const getSteppedValue = (
  direction: 1 | -1,
  options: Readonly<{
    value: number | undefined
    step?: number | undefined
    min?: number | undefined
    max?: number | undefined
    isIntegerOnly?: boolean | undefined
  }>,
): number => {
  const isIntegerOnly = options.isIntegerOnly === true
  const rawStep = options.step
  const step =
    rawStep === undefined ||
    !Number.isFinite(rawStep) ||
    rawStep <= 0 ||
    (isIntegerOnly && !Number.isInteger(rawStep))
      ? 1
      : rawStep
  const { min, max } = options
  const stepBase =
    min !== undefined && (!isIntegerOnly || Number.isInteger(min)) ? min : 0

  const current = options.value
  let next: number
  if (current === undefined) {
    next = direction === 1 ? (min ?? 0) : (max ?? 0)
    if (isIntegerOnly) {
      next = direction === 1 ? Math.ceil(next) : Math.floor(next)
    }
  } else {
    const stepPosition = (current - stepBase) / step
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(stepPosition)) * 4
    const nextStepPosition =
      direction === 1
        ? Math.floor(stepPosition + tolerance) + 1
        : Math.ceil(stepPosition - tolerance) - 1
    next = stepBase + nextStepPosition * step
  }

  const precision = Math.min(
    12,
    Math.max(countDecimals(step), countDecimals(stepBase)),
  )
  next = Number(next.toFixed(precision))
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return Number.isFinite(next) ? next : (current ?? 0)
}

export const canStep = (
  direction: 1 | -1,
  options: Readonly<{
    value: number | undefined
    min?: number | undefined
    max?: number | undefined
  }>,
): boolean => {
  if (direction > 0)
    return (
      options.value === undefined ||
      options.max === undefined ||
      options.value < options.max
    )
  return (
    options.value === undefined ||
    options.min === undefined ||
    options.value > options.min
  )
}

/* --- Submodel ----------------------------------------------------------- */

export const Model = S.Struct({
  id: S.String,
  pendingInput: S.Option(S.String),
  isFocused: S.Boolean,
})
export type Model = typeof Model.Type

export type InitConfig = Readonly<{ id: string }>
export const init = (config: InitConfig): Model => ({
  id: config.id,
  pendingInput: Option.none(),
  isFocused: false,
})

export const NumberInputCommitResolution = S.Union([
  S.TaggedStruct('commit', { value: S.Number, didClamp: S.Boolean }),
  S.TaggedStruct('clear', {}),
  S.TaggedStruct('revert', {}),
])
export type NumberInputCommitResolution =
  typeof NumberInputCommitResolution.Type

export const commitResolutionOf = (
  commit: NumberInputCommit,
): NumberInputCommitResolution =>
  commit.kind === 'commit'
    ? { _tag: 'commit', value: commit.value, didClamp: commit.didClamp }
    : commit.kind === 'clear'
      ? { _tag: 'clear' }
      : { _tag: 'revert' }

export const Message = defineMessageUnion({
  FocusGained: {},
  DraftEdited: { text: S.String },
  /* View-time resolution of the draft at commit time (blur/Enter). */
  CommitDecided: { resolution: NumberInputCommitResolution },
  /* View-time stepped value (arrow keys + stepper buttons). */
  Stepped: { value: S.Number },
  ClearRequested: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: { value: S.Option(S.Number) },
})
export type OutMessage = typeof OutMessage.Type

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'FocusGained':
      return { model: { ...model, isFocused: true } }
    case 'DraftEdited':
      return { model: { ...model, pendingInput: Option.some(message.text) } }
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
