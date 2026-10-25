import { Command, type Update } from 'foldkit'
import { Duration, Effect, Option, Schedule, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import {
  astryxTextClasses,
  type AstryxTextColor as TextColor,
  type AstryxTextSize as TextSize,
  type AstryxTextType as TextType,
  type AstryxTextWeight as TextWeight,
} from '@/lib/astryx-text'
import * as HoverCard from '@/lib/hover-card'
import * as Icon from '@/lib/icon'
import * as HoverCardView from '@/ui/hover-card'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Timestamp.tsx — absolute/relative time display with
   a copyable hover card. astryx's React timer and lazy HoverCard become model
   state (nowMs) plus a gated tick subscription, and the card rows port onto
   crease's HoverCard. The i18n locale resolves to the host default ('en')
   since Crease UI has no locale provider. */

import {
  formatInstant,
  formatRelativeTime,
  formatTooltipLines,
  type TimestampFormat,
  type TimestampTooltipEntry,
  type TimestampTooltipLine,
} from '@/lib/timestamp-format'

export type {
  InstantFormat,
  TimestampFormat,
  TimestampTooltipEntry,
  TimestampTooltipFormat,
} from '@/lib/timestamp-format'
export {
  formatInstant,
  formatRelativeTime,
  formatTooltipLines,
} from '@/lib/timestamp-format'

// =============================================================================
// Model
// =============================================================================

const DEFAULT_AUTO_THRESHOLD = 604800

export const Model = S.Struct({
  id: S.String,
  valueMs: S.Number,
  format: S.Literals([
    'relative',
    'relative_short',
    'auto',
    'date',
    'date_long',
    'date_weekday',
    'date_time',
    'time',
    'system_date',
    'system_date_time',
    'system_time',
    'unix_seconds',
  ]),
  autoThreshold: S.Number,
  isLive: S.Boolean,
  nowMs: S.Number,
  hoverCard: HoverCard.Model,
  copiedValue: S.NullOr(S.String),
})
export type Model = typeof Model.Type

/** astryx accepts Unix timestamps in seconds (< 1e12) or ISO 8601 strings. */
export const parseValueMs = (value: string | number): number => {
  if (typeof value === 'number') {
    return value < 1e12 ? value * 1000 : value
  }
  return new Date(value).getTime()
}

export const init = (config: {
  id: string
  value: string | number
  format?: TimestampFormat
  autoThreshold?: number
  isLive?: boolean
  nowMs?: number
}): Model => ({
  id: config.id,
  valueMs: parseValueMs(config.value),
  format: config.format ?? 'auto',
  autoThreshold: config.autoThreshold ?? DEFAULT_AUTO_THRESHOLD,
  isLive: config.isLive ?? false,
  nowMs: config.nowMs ?? Date.now(),
  hoverCard: HoverCard.init({ id: `${config.id}-hover-card` }),
  copiedValue: null,
})

export const Message = defineMessageUnion({
  GotTimestampHoverCardMessage: { message: HoverCard.Message },
  TickedTimestamp: { nowMs: S.Number },
  ConfiguredTimestamp: {
    valueMs: S.optional(S.Number),
    format: S.optional(
      S.Literals([
        'relative',
        'relative_short',
        'auto',
        'date',
        'date_long',
        'date_weekday',
        'date_time',
        'time',
        'system_date',
        'system_date_time',
        'system_time',
        'unix_seconds',
      ]),
    ),
    autoThreshold: S.optional(S.Number),
    isLive: S.optional(S.Boolean),
  },
  ClickedCopyTimestampValue: { value: S.String },
  CompletedCopiedTimestampValue: { value: S.String },
  FailedCopyingTimestampValue: {},
  CompletedWaitBeforeClearingTimestampCopy: { value: S.String },
})
export type Message = typeof Message.Type

const CopyTimestampValue = Command.define('CopyTimestampValue', {
  args: { value: S.String },
  messages: [
    Message.CompletedCopiedTimestampValue,
    Message.FailedCopyingTimestampValue,
  ],
  execute: ({ value }) =>
    Effect.promise(() => navigator.clipboard.writeText(value)).pipe(
      Effect.as(Message.CompletedCopiedTimestampValue({ value })),
      Effect.catch(() => Effect.succeed(Message.FailedCopyingTimestampValue())),
    ),
})

const WaitBeforeClearingTimestampCopy = Command.define(
  'WaitBeforeClearingTimestampCopy',
  {
    args: { value: S.String },
    messages: [Message.CompletedWaitBeforeClearingTimestampCopy],
    execute: ({ value }) =>
      Effect.sleep('1500 millis').pipe(
        Effect.as(Message.CompletedWaitBeforeClearingTimestampCopy({ value })),
      ),
  },
)

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotTimestampHoverCardMessage': {
      const next = HoverCard.update(model.hoverCard, message.message)
      return {
        model: { ...model, hoverCard: next.model },
        commands: Command.mapMessages(next.commands ?? [], next =>
          Message.GotTimestampHoverCardMessage({ message: next }),
        ),
      }
    }
    case 'TickedTimestamp':
      return { model: { ...model, nowMs: message.nowMs } }
    case 'ConfiguredTimestamp':
      return {
        model: {
          ...model,
          ...(message.valueMs === undefined
            ? {}
            : { valueMs: message.valueMs }),
          ...(message.format === undefined ? {} : { format: message.format }),
          ...(message.autoThreshold === undefined
            ? {}
            : { autoThreshold: message.autoThreshold }),
          ...(message.isLive === undefined ? {} : { isLive: message.isLive }),
        },
      }
    case 'ClickedCopyTimestampValue':
      return { model, commands: [CopyTimestampValue({ value: message.value })] }
    case 'CompletedCopiedTimestampValue':
      return {
        model: { ...model, copiedValue: message.value },
        commands: [WaitBeforeClearingTimestampCopy({ value: message.value })],
      }
    case 'FailedCopyingTimestampValue':
      return { model }
    case 'CompletedWaitBeforeClearingTimestampCopy':
      return {
        model: {
          ...model,
          copiedValue:
            model.copiedValue === message.value ? null : model.copiedValue,
        },
      }
  }
}

// =============================================================================
// Tick subscription
// =============================================================================

const MINUTE_S = 60
const HOUR_S = 3600
const DAY_S = 86400

const getLiveInterval = (diffSeconds: number): number => {
  const absDiff = Math.abs(diffSeconds)
  if (absDiff < MINUTE_S) {
    return 1000
  }
  if (absDiff < HOUR_S) {
    return 30_000
  }
  if (absDiff < DAY_S) {
    return 60_000
  }
  return 300_000
}

const isRelativeFormat = (
  format: TimestampFormat,
): format is 'relative' | 'relative_short' =>
  format === 'relative' || format === 'relative_short'

const effectiveFormatOf = (model: Model): TimestampFormat =>
  model.format === 'auto'
    ? Math.abs(Math.round((model.nowMs - model.valueMs) / 1000)) <=
      model.autoThreshold
      ? 'relative'
      : 'date_time'
    : model.format

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { intervalMs: S.Option(S.Number), tickId: S.String },
    {
      modelToDependencies: model => ({
        intervalMs:
          model.isLive &&
          !Number.isNaN(model.valueMs) &&
          isRelativeFormat(effectiveFormatOf(model))
            ? Option.some(
                getLiveInterval(
                  Math.round((model.nowMs - model.valueMs) / 1000),
                ),
              )
            : Option.none(),
        tickId: model.id,
      }),
      dependenciesToStream: ({ intervalMs }) =>
        Option.isSome(intervalMs)
          ? Stream.fromEffectSchedule(
              Effect.sync(() => Message.TickedTimestamp({ nowMs: Date.now() })),
              Schedule.spaced(Duration.millis(intervalMs.value)),
            )
          : Stream.empty,
    },
  ),
}))

// =============================================================================
// View
// =============================================================================

const isAbsoluteFormat = (
  format: TimestampFormat,
): format is Exclude<TimestampFormat, 'relative' | 'relative_short' | 'auto'> =>
  format !== 'relative' && format !== 'relative_short' && format !== 'auto'

const COPY_FEEDBACK_CLASS =
  'inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

export type TimestampProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Semantic text type. @default 'supporting' */
  type?: TextType
  size?: TextSize
  /** Text color. @default 'secondary' */
  color?: TextColor
  weight?: TextWeight
  /** Show the copyable hover card on hover/focus. @default true */
  hasTooltip?: boolean
  /** Lines on the hover card; an empty array means "use the default row". */
  tooltipEntries?: ReadonlyArray<TimestampTooltipEntry>
  /** Append the timezone abbreviation to date_time/time text. @default false */
  isTimezoneShown?: boolean
  class?: string
}>

export const timestamp = <Msg>(
  props: TimestampProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const date = new Date(model.valueMs)
  const isValidDate = !Number.isNaN(date.getTime())
  if (!isValidDate) {
    return h.empty
  }

  const isoString = date.toISOString()
  const now = new Date(model.nowMs)
  const effectiveFormat = effectiveFormatOf(model)
  const isTimezoneShown = props.isTimezoneShown ?? false
  const hasTooltip = props.hasTooltip ?? true

  const displayText =
    effectiveFormat === 'relative'
      ? formatRelativeTime(date, now, 'long')
      : effectiveFormat === 'relative_short'
        ? formatRelativeTime(date, now, 'narrow')
        : isAbsoluteFormat(effectiveFormat)
          ? formatInstant(date, effectiveFormat, { isTimezoneShown })
          : ''

  const fullAbsoluteText = formatInstant(date, 'full')
  const ariaLabelText = formatInstant(date, 'full', {
    timeZoneNameStyle: 'long',
  })

  const entries =
    props.tooltipEntries !== undefined && props.tooltipEntries.length > 0
      ? props.tooltipEntries
      : undefined
  const showTooltip =
    hasTooltip && (isRelativeFormat(effectiveFormat) || entries !== undefined)

  const timeElement = h.time(
    [
      h.DataAttribute('slot', 'timestamp'),
      h.DataAttribute('format', effectiveFormat),
      h.Datetime(isoString),
      ...(isRelativeFormat(effectiveFormat) && ariaLabelText !== ''
        ? [h.AriaLabel(ariaLabelText)]
        : []),
      h.Class(
        cn(
          'inline not-italic',
          astryxTextClasses({
            ...(props.type === undefined
              ? { type: 'supporting' as const }
              : { type: props.type }),
            ...(props.size === undefined ? {} : { size: props.size }),
            color: props.color ?? 'secondary',
            ...(props.weight === undefined ? {} : { weight: props.weight }),
          }),
          props.class,
        ),
      ),
    ],
    [displayText],
  )

  if (!showTooltip) {
    return timeElement
  }

  const lines: ReadonlyArray<TimestampTooltipLine> =
    entries === undefined
      ? [{ value: fullAbsoluteText, isCopyable: true }]
      : formatTooltipLines(date, entries)

  const hasLabelColumn = lines.some(
    line => line.label !== undefined && line.label !== '',
  )
  const hasActionColumn = lines.some(line => line.isCopyable)

  const cardContent = h.dl(
    [
      h.Class(
        cn(
          'm-0 grid items-center gap-x-4 gap-y-2 p-0',
          hasLabelColumn && hasActionColumn
            ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
            : hasLabelColumn
              ? 'grid-cols-[auto_minmax(0,1fr)]'
              : hasActionColumn
                ? 'grid-cols-[minmax(0,1fr)_auto]'
                : 'grid-cols-[minmax(0,1fr)]',
        ),
      ),
    ],
    lines.map(line =>
      h.div(
        [h.Class('contents')],
        [
          ...(hasLabelColumn
            ? [
                h.dt(
                  [
                    h.Class(
                      'm-0 whitespace-nowrap p-0 text-xs leading-5 font-normal text-muted-foreground',
                    ),
                  ],
                  [line.label ?? ''],
                ),
              ]
            : []),
          h.dd(
            [
              h.Class(
                'm-0 min-w-0 whitespace-normal p-0 text-sm leading-5 font-normal text-foreground wrap-anywhere',
              ),
            ],
            [line.value],
          ),
          ...(hasActionColumn
            ? [
                h.div(
                  [h.Class('flex items-center justify-end')],
                  [
                    ...(line.isCopyable
                      ? [
                          h.button(
                            [
                              h.Type('button'),
                              h.Class(COPY_FEEDBACK_CLASS),
                              h.AriaLabel(
                                model.copiedValue === line.value
                                  ? 'Copied'
                                  : `Copy ${line.value}`,
                              ),
                              h.OnClick(
                                props.toParentMessage(
                                  Message.ClickedCopyTimestampValue({
                                    value: line.value,
                                  }),
                                ),
                              ),
                            ],
                            [
                              model.copiedValue === line.value
                                ? Icon.check({ class: 'size-3' }, h)
                                : Icon.icon('copy', { class: 'size-3' }, h),
                            ],
                          ),
                          h.span(
                            [h.AriaLive('polite'), h.Class('sr-only')],
                            [model.copiedValue === line.value ? 'Copied' : ''],
                          ),
                        ]
                      : []),
                  ],
                ),
              ]
            : []),
        ],
      ),
    ),
  )

  return HoverCardView.hoverCard(
    {
      model: model.hoverCard,
      toParentMessage: message =>
        props.toParentMessage(
          Message.GotTimestampHoverCardMessage({ message }),
        ),
      trigger: timeElement,
      /* astryx marks the anchor with a dashed underline ("hasHoverIndication")
         — crease's border-emphasized has no token, so muted-foreground
         carries the hint. */
      triggerClass:
        'inline cursor-default bg-transparent p-0 font-[inherit] text-left underline decoration-dashed decoration-muted-foreground underline-offset-2',
      content: cardContent,
      class: 'w-max',
      side: 'top',
      align: 'center',
      ariaLabel: 'Timestamp details',
    },
    h,
  )
}
