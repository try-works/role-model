export type NormalizedRange = Readonly<{
  min: number
  max: number
  step: number
}>

export const normalizeRange = (
  firstBound: number,
  secondBound: number,
  requestedStep = 1,
): NormalizedRange => ({
  min: Math.min(firstBound, secondBound),
  max: Math.max(firstBound, secondBound),
  step: Number.isFinite(requestedStep) && requestedStep > 0 ? requestedStep : 1,
})

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(Number.isFinite(value) ? value : min, max))

const decimalPlaces = (value: number): number => {
  const exponent = value.toString().match(/e-(\d+)$/u)?.[1]
  if (exponent !== undefined) return Number(exponent)
  return value.toString().split('.')[1]?.length ?? 0
}

export const snapRangeValue = (
  value: number,
  range: NormalizedRange,
): number => {
  const snapped =
    range.min + Math.round((value - range.min) / range.step) * range.step
  const precision = Math.max(
    decimalPlaces(range.min),
    decimalPlaces(range.step),
  )
  return Number(clamp(snapped, range.min, range.max).toFixed(precision))
}

export const normalizeRangeValues = (
  values: readonly [number, number],
  range: NormalizedRange,
): readonly [number, number] => {
  const first = snapRangeValue(values[0], range)
  const second = snapRangeValue(values[1], range)
  return [first, second]
}

export const updateRangeValue = (
  values: readonly [number, number],
  index: 0 | 1,
  nextValue: number,
  range: NormalizedRange,
): readonly [number, number] => {
  const next = snapRangeValue(nextValue, range)
  return index === 0 ? [next, values[1]] : [values[0], next]
}

export const normalizeMultiValues = (
  values: readonly number[],
  range: NormalizedRange,
): readonly number[] => values.map(value => snapRangeValue(value, range))

export const updateMultiValue = (
  values: readonly number[],
  index: number,
  nextValue: number,
  range: NormalizedRange,
): readonly number[] => {
  const next = snapRangeValue(nextValue, range)
  return values.map((value, i) => (i === index ? next : value))
}

// ---------------------------------------------------------------------------
// Multi-thumb Slider on the foldkit Slider primitive. Each thumb owns a
// single-thumb primitive Model and renders only the primitive's thumb part;
// an invisible zero-area track element per thumb feeds its drag measurement.
// A track press is routed to the nearest thumb by the view, which passes the
// resolved index plus that thumb's current display value so the press can be
// re-dispatched as the thumb's own PressedPointer — the same message its
// track part would emit. `mirrored` maps values across the range at this
// boundary so the horizontal-only primitive renders flipped for RTL.
// ---------------------------------------------------------------------------

import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Subscription from 'foldkit/subscription'
import { Slider as SliderPrimitive } from '@foldkit/ui'

export const MultiMessage = defineMessageUnion({
  GotThumbMessage: { index: S.Number, message: SliderPrimitive.Message },
  PressedTrack: {
    index: S.Number,
    value: S.Number,
    originValue: S.Number,
  },
})
export type MultiMessage = typeof MultiMessage.Type

export const MultiOutMessage = defineMessageUnion({
  ChangedThumbValue: { index: S.Number, value: S.Number },
})
export type MultiOutMessage = typeof MultiOutMessage.Type

export const MultiModel = S.Struct({
  id: S.String,
  min: S.Number,
  max: S.Number,
  step: S.Number,
  mirrored: S.Boolean,
  thumbs: S.Array(SliderPrimitive.Model),
})
export type MultiModel = typeof MultiModel.Type

type MultiUpdate = Update.ReturnWithOutMessage<
  MultiModel,
  MultiMessage,
  MultiOutMessage
>

export const initMulti = (
  config: Readonly<{
    id: string
    thumbs: number
    min: number
    max: number
    step?: number
    mirrored?: boolean
  }>,
): MultiModel => {
  const range = normalizeRange(config.min, config.max, config.step)
  return {
    id: config.id,
    min: range.min,
    max: range.max,
    step: range.step,
    mirrored: config.mirrored ?? false,
    thumbs: Array.from({ length: Math.max(1, config.thumbs) }, (_, index) =>
      SliderPrimitive.init({
        id: `${config.id}-thumb-${String(index)}`,
        min: range.min,
        max: range.max,
        step: range.step,
      }),
    ),
  }
}

export const reflectMultiRange = (
  model: MultiModel,
  range: Readonly<{ min: number; max: number }>,
): MultiModel => ({
  ...model,
  thumbs: model.thumbs.map(thumb => SliderPrimitive.reflectRange(thumb, range)),
})

/** The value the primitive layer works in: identity normally, mirrored across
 * the range when `mirrored` so thumbs, drags, and key presses stay
 * left-to-right underneath. */
export const toThumbValue = (model: MultiModel, value: number): number =>
  model.mirrored ? model.min + model.max - value : value

const liftThumb = (
  model: MultiModel,
  index: number,
  inner: SliderPrimitive.Message,
): MultiUpdate => {
  const thumb = model.thumbs[index]
  if (thumb === undefined) return { model }
  const next = SliderPrimitive.update(thumb, inner)
  return {
    model: {
      ...model,
      thumbs: model.thumbs.map((t, i) => (i === index ? next.model : t)),
    },
    ...(next.commands === undefined
      ? {}
      : {
          commands: Command.mapMessages(next.commands, message =>
            MultiMessage.GotThumbMessage({ index, message }),
          ),
        }),
    ...(next.outMessage === undefined
      ? {}
      : {
          outMessage: MultiOutMessage.ChangedThumbValue({
            index,
            value: model.mirrored
              ? model.min + model.max - next.outMessage.value
              : next.outMessage.value,
          }),
        }),
  }
}

export const updateMulti = (
  model: MultiModel,
  message: MultiMessage,
): MultiUpdate => {
  switch (message._tag) {
    case 'GotThumbMessage':
      return liftThumb(model, message.index, message.message)
    case 'PressedTrack':
      return liftThumb(
        model,
        message.index,
        SliderPrimitive.Message.PressedPointer({
          value: message.value,
          originValue: message.originValue,
        }),
      )
  }
}

const FALLBACK_THUMB = SliderPrimitive.init({
  id: 'foldkit-multi-slider-fallback-thumb',
  min: 0,
  max: 1,
  step: 1,
})

/** Aggregates each thumb's drag subscriptions under a parent model. The thumb
 * count is fixed by the model the parent creates, so it is part of the call. */
export const multiThumbSubscriptions = <ParentModel, Msg>(
  config: Readonly<{
    id: string
    thumbCount: number
    toChildModel: (model: ParentModel) => MultiModel
    toParentMessage: (message: MultiMessage) => Msg
  }>,
): Subscription.Subscriptions<ParentModel, Msg> =>
  Subscription.aggregate<ParentModel, Msg>()(
    ...Array.from({ length: Math.max(0, config.thumbCount) }, (_, index) =>
      Subscription.lift({
        [`${config.id}Thumb${String(index)}Pointer`]:
          SliderPrimitive.subscriptions.dragPointer,
        [`${config.id}Thumb${String(index)}Escape`]:
          SliderPrimitive.subscriptions.dragEscape,
      })<ParentModel, Msg>({
        toChildModel: parentModel =>
          config.toChildModel(parentModel).thumbs[index] ??
          config.toChildModel(parentModel).thumbs[0] ??
          FALLBACK_THUMB,
        toParentMessage: message =>
          config.toParentMessage(
            MultiMessage.GotThumbMessage({ index, message }),
          ),
      }),
    ),
  )
