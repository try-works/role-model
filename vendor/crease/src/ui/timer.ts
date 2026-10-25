import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Subscription, type Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import {
  astryxTextClasses,
  type AstryxTextColor as TextColor,
  type AstryxTextSize as TextSize,
  type AstryxTextType as TextType,
  type AstryxTextWeight as TextWeight,
} from '@/lib/astryx-text'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Timer.tsx — a live elapsed/clock duration rendered
   as <time> with tabular numerals. astryx writes text through a DOM ref and
   schedules native timeouts; here nowMs is model state and the tick
   subscription schedules the next update at astryx's exact
   milliseconds-until-next-change (seconds until an hour, then minutes). */

const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_HOUR_SECONDS = 60 * 60
const MAX_TIMEOUT_MS = 2_147_483_647

export type TimerFormat = 'elapsed' | 'clock'

type TimerPresentation = Readonly<{
  dateTime: string
  text: string
}>

const pad = (value: number): string => String(value).padStart(2, '0')

const getElapsedMilliseconds = (now: number, startTime: number): number =>
  Math.max(0, now - startTime)

const getPresentation = (
  elapsedMilliseconds: number,
  format: TimerFormat,
): TimerPresentation => {
  const elapsedSeconds = Math.floor(elapsedMilliseconds / ONE_SECOND_MS)

  if (format === 'clock') {
    const hours = Math.floor(elapsedSeconds / ONE_HOUR_SECONDS)
    const minutes = Math.floor((elapsedSeconds % ONE_HOUR_SECONDS) / 60)
    const seconds = elapsedSeconds % 60
    return {
      dateTime: `PT${String(elapsedSeconds)}S`,
      text:
        hours > 0
          ? `${String(hours)}:${pad(minutes)}:${pad(seconds)}`
          : `${String(minutes)}:${pad(seconds)}`,
    }
  }

  if (elapsedSeconds < 60) {
    return {
      dateTime: `PT${String(elapsedSeconds)}S`,
      text: `${String(elapsedSeconds)}s`,
    }
  }

  const totalMinutes = Math.floor(elapsedSeconds / 60)
  if (totalMinutes < 60) {
    return {
      dateTime: `PT${String(elapsedSeconds)}S`,
      text: `${String(totalMinutes)}m ${pad(elapsedSeconds % 60)}s`,
    }
  }

  const representedSeconds = totalMinutes * 60
  return {
    dateTime: `PT${String(representedSeconds)}S`,
    text: `${String(Math.floor(totalMinutes / 60))}h ${pad(totalMinutes % 60)}m`,
  }
}

const getMillisecondsUntilNextChange = (
  now: number,
  startTime: number,
  elapsedMilliseconds: number,
  format: TimerFormat,
): number => {
  if (now < startTime) {
    return Math.min(startTime - now + ONE_SECOND_MS, MAX_TIMEOUT_MS)
  }
  const precision =
    format === 'elapsed' &&
    elapsedMilliseconds >= ONE_HOUR_SECONDS * ONE_SECOND_MS
      ? ONE_MINUTE_MS
      : ONE_SECOND_MS
  return precision - (elapsedMilliseconds % precision)
}

export const Model = S.Struct({
  id: S.String,
  startTimeMs: S.Number,
  format: S.Literals(['elapsed', 'clock']),
  nowMs: S.Number,
})
export type Model = typeof Model.Type

export const init = (config: {
  id: string
  startTimeMs?: number
  format?: TimerFormat
  /** Clock override for deterministic previews/tests. Defaults to Date.now(). */
  nowMs?: number
}): Model => ({
  id: config.id,
  startTimeMs: config.startTimeMs ?? Date.now(),
  format: config.format ?? 'elapsed',
  nowMs: config.nowMs ?? Date.now(),
})

export const Message = defineMessageUnion({
  TickedTimer: { nowMs: S.Number },
  ConfiguredTimer: {
    startTimeMs: S.optional(S.Number),
    format: S.optional(S.Literals(['elapsed', 'clock'])),
  },
  RestartedTimer: { nowMs: S.Number },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'TickedTimer':
      return { model: { ...model, nowMs: message.nowMs } }
    case 'ConfiguredTimer':
      return {
        model: {
          ...model,
          ...(message.startTimeMs === undefined
            ? {}
            : { startTimeMs: message.startTimeMs }),
          ...(message.format === undefined ? {} : { format: message.format }),
        },
      }
    case 'RestartedTimer':
      return {
        model: { ...model, startTimeMs: message.nowMs, nowMs: message.nowMs },
      }
  }
}

/* The tick stream emits a single TickedTimer at the exact moment the
   presentation changes; each update recomputes the delay, so cadence adapts
   (1s before start, 1s under an hour elapsed, 60s in the hour-plus mode). */
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { waitMs: S.Number, tickId: S.String },
    {
      modelToDependencies: model => ({
        waitMs: getMillisecondsUntilNextChange(
          model.nowMs,
          model.startTimeMs,
          getElapsedMilliseconds(model.nowMs, model.startTimeMs),
          model.format,
        ),
        tickId: model.id,
      }),
      dependenciesToStream: ({ waitMs }) =>
        Stream.fromEffect(
          Effect.delay(
            Effect.sync(() => Message.TickedTimer({ nowMs: Date.now() })),
            Duration.millis(Math.max(1, Math.round(waitMs))),
          ),
        ),
    },
  ),
}))

export type TimerProps<Msg> = Readonly<{
  model: Model
  /** Semantic text type. @default 'supporting' */
  type?: TextType
  /** Font size override; keeps the type's line height. */
  size?: TextSize
  /** Text color. @default 'secondary' */
  color?: TextColor
  /** Font weight override. */
  weight?: TextWeight
  class?: string
}>

export const timer = <Msg>(
  props: TimerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const presentation = getPresentation(
    getElapsedMilliseconds(props.model.nowMs, props.model.startTimeMs),
    props.model.format,
  )
  return h.time(
    [
      h.DataAttribute('slot', 'timer'),
      h.DataAttribute('format', props.model.format),
      h.Datetime(presentation.dateTime),
      h.Class(
        cn(
          'inline not-italic tabular-nums',
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
    [presentation.text],
  )
}
