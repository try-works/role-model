import { Option } from 'effect'

import type { Html, HtmlBuilder } from 'foldkit/html'

import { Slider as SliderPrimitive } from '@foldkit/ui'

import {
  initMulti,
  MultiMessage,
  MultiModel,
  MultiOutMessage,
  multiThumbSubscriptions,
  normalizeMultiValues,
  reflectMultiRange,
  toThumbValue,
  updateMulti,
  updateMultiValue,
} from '@/lib/slider'
import { cn } from '@/lib/utils'

export const Model = SliderPrimitive.Model
export type Model = typeof Model.Type
export const Message = SliderPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = SliderPrimitive.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = SliderPrimitive.init
export const update = SliderPrimitive.update
export const reflectRange = SliderPrimitive.reflectRange
export const snapAndClamp = SliderPrimitive.snapAndClamp
export const subscriptions = SliderPrimitive.subscriptions
export const subscriptionsForRoot = SliderPrimitive.subscriptionsForRoot
export const fractionOfValue = SliderPrimitive.fractionOfValue

export {
  initMulti,
  MultiMessage,
  MultiModel,
  MultiOutMessage,
  multiThumbSubscriptions,
  normalizeMultiValues,
  reflectMultiRange,
  toThumbValue,
  updateMulti,
  updateMultiValue,
}

const ROOT_CLASS =
  'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col'

/* The foldkit Slider primitive is horizontal-only and sets data-orientation on
   the ROOT part, not on track/range as Radix does — so shadcn's
   data-[orientation=horizontal]: variants never match there. Horizontal styles
   are applied directly instead. */
const TRACK_CLASS =
  'relative grow overflow-hidden rounded-full bg-muted h-1.5 w-full'

const FILLED_TRACK_CLASS = 'absolute bg-primary h-full'

const THUMB_CLASS =
  'block size-4 shrink-0 focus:z-10 data-[dragging]:z-20 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden aria-disabled:pointer-events-none aria-disabled:opacity-50'

const LABEL_CLASS = 'text-sm leading-none font-medium select-none'

/* Multi-thumb sliders share one visual track; each thumb still needs its own
   foldkit Slider model so drag state and key focus stay independent. The
   primitive measures drags against the element carrying its
   data-slider-track-id, so every thumb renders a zero-area track overlay (it
   can never receive a pointer) that reports the shared track's geometry. */

export type SliderProps<Msg> = Readonly<{
  model: Model
  value: number
  toParentMessage: (message: Message) => Msg
  label?: string
  ariaLabel?: string
  formatValue?: (value: number) => string
  isDisabled?: boolean
  isReadOnly?: boolean
  name?: string
  class?: string
}>

export type MultiSliderProps<Msg> = Readonly<{
  model: MultiModel
  values: readonly number[]
  toParentMessage: (message: MultiMessage) => Msg
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  ariaLabels?: readonly string[]
  formatValue?: (value: number, index: number) => string
  isDisabled?: boolean
  isReadOnly?: boolean
  name?: string
  class?: string
}>

export type RangeSliderProps<Msg> = Readonly<
  Omit<MultiSliderProps<Msg>, 'values'> & {
    values: readonly [number, number]
  }
>

/** A two-thumb slider: `multiSlider` with a tuple value, matching the range
 * field shape. Init its model with `initMulti({ thumbs: 2, ... })`. */
export const rangeSlider = <Msg>(
  props: RangeSliderProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  multiSlider(
    {
      ...props,
      ariaLabels: props.ariaLabels ?? ['First value', 'Second value'],
    },
    h,
  )

export const slider = <Msg>(
  props: SliderProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: SliderPrimitive.view,
    viewInputs: {
      value: props.value,
      isDisabled: props.isDisabled ?? false,
      isReadOnly: props.isReadOnly ?? false,
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      ...(props.formatValue === undefined
        ? {}
        : { formatValue: props.formatValue }),
      ...(props.name === undefined ? {} : { name: props.name }),
      toView: ({ root, track, filledTrack, thumb, label, hiddenInput }) => {
        const hs = h
        const control = hs.div(
          [
            ...root,
            hs.DataAttribute('slot', 'slider'),
            hs.Class(cn(ROOT_CLASS, props.class)),
          ],
          [
            hs.div(
              [
                ...track,
                hs.DataAttribute('slot', 'slider-track'),
                hs.Class(TRACK_CLASS),
              ],
              [
                hs.div(
                  [
                    ...filledTrack,
                    hs.DataAttribute('slot', 'slider-range'),
                    hs.Class(FILLED_TRACK_CLASS),
                  ],
                  [],
                ),
              ],
            ),
            hs.span(
              [
                ...thumb,
                hs.DataAttribute('slot', 'slider-thumb'),
                hs.Class(THUMB_CLASS),
              ],
              [],
            ),
            ...(props.name === undefined ? [] : [hs.input([...hiddenInput])]),
          ],
        )

        return props.label === undefined
          ? control
          : hs.div(
              [hs.Class('grid gap-2')],
              [
                hs.label([...label, hs.Class(LABEL_CLASS)], [props.label]),
                control,
              ],
            )
      },
    },
    toParentMessage: props.toParentMessage,
  })
}

/*
Model: { volume: Slider.init({ id: 'volume', min: 0, max: 100, step: 1 }), volumeValue: S.Number }
Update: Slider.update(model.volume, message)
Subscriptions: Slider.subscriptions
View: Slider.slider({ model: model.volume, value: model.volumeValue, toParentMessage: GotSliderMessage, ariaLabel: 'Volume' })
*/

/** An N-thumb slider on the foldkit Slider primitive: one primitive model per
 * thumb, a shared track whose presses move the nearest thumb, and fills
 * between the lowest and highest values. Thumbs keep their identity and can
 * cross. `values` stays parent-owned; thumb changes arrive as `MultiOutMessage.ChangedThumbValue` out messages. */
export const multiSlider = <Msg>(
  props: MultiSliderProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const orientation = props.orientation ?? 'horizontal'
  const horizontal = orientation === 'horizontal'
  const range = { min: model.min, max: model.max, step: model.step }
  const values = normalizeMultiValues(props.values, range)
  const span = Math.max(range.max - range.min, 1)
  const isInteractive = props.isDisabled !== true && props.isReadOnly !== true
  const displayValues = values.map(value => toThumbValue(model, value))
  const displayFractions = displayValues.map(
    value => ((value - range.min) / span) * 100,
  )
  const minFraction =
    ((toThumbValue(model, range.min) - range.min) / span) * 100
  const segments: ReadonlyArray<readonly [number, number]> =
    displayFractions.length === 0
      ? []
      : displayFractions.length === 1
        ? [
            [
              Math.min(displayFractions[0] ?? minFraction, minFraction),
              Math.max(displayFractions[0] ?? minFraction, minFraction),
            ],
          ]
        : [[Math.min(...displayFractions), Math.max(...displayFractions)]]
  const pressedTrack = (
    _pointerType: string,
    button: number,
    _screenX: number,
    _screenY: number,
    _timeStamp: number,
    clientX: number,
    clientY: number,
    _pointerId: number,
    target: EventTarget | null,
  ): Option.Option<MultiMessage> => {
    if (button !== 0 || !isInteractive || !(target instanceof Element)) {
      return Option.none()
    }
    const rect = target.getBoundingClientRect()
    const fraction = horizontal
      ? rect.width === 0
        ? 0
        : (clientX - rect.left) / rect.width
      : rect.height === 0
        ? 0
        : (rect.bottom - clientY) / rect.height
    const value = range.min + Math.min(Math.max(fraction, 0), 1) * span
    let index = 0
    displayValues.forEach((display, i) => {
      if (
        Math.abs(display - value) <
        Math.abs((displayValues[index] ?? display) - value)
      ) {
        index = i
      }
    })
    return Option.some(
      MultiMessage.PressedTrack({
        index,
        value,
        originValue: displayValues[index] ?? value,
      }),
    )
  }
  const thumbViews = model.thumbs.slice(0, values.length).map((thumb, index) =>
    h.submodel({
      slotId: thumb.id,
      model: thumb,
      view: SliderPrimitive.view,
      viewInputs: {
        value: displayValues[index] ?? range.min,
        orientation: horizontal ? 'Horizontal' : 'Vertical',
        isDisabled: props.isDisabled ?? false,
        isReadOnly: props.isReadOnly ?? false,
        ariaLabel: props.ariaLabels?.[index] ?? `Value ${String(index + 1)}`,
        ...(props.formatValue === undefined
          ? {}
          : {
              formatValue: (value: number) =>
                props.formatValue?.(
                  model.mirrored ? model.min + model.max - value : value,
                  index,
                ) ?? '',
            }),
        ...(props.name === undefined
          ? {}
          : { name: `${props.name}[${String(index)}]` }),
        toView: ({ track, thumb, hiddenInput }) => {
          const hs = h
          return hs.div(
            [hs.Class('contents')],
            [
              /* The primitive measures drag distance against the track
                 element it rendered, so the hidden copy must cover the same
                 box as the visual track while letting presses fall through
                 to the shared track below. */
              hs.div(
                [hs.Class('pointer-events-none absolute inset-0')],
                [
                  hs.div(
                    [...track, hs.AriaHidden(true), hs.Class('h-full w-full')],
                    [],
                  ),
                ],
              ),
              hs.span(
                [
                  ...thumb,
                  hs.DataAttribute('slot', 'slider-thumb'),
                  hs.Class(THUMB_CLASS),
                  /* The primitive reports the display-space value; under
                       mirroring (RTL) report the true value instead. */
                  ...(model.mirrored
                    ? [hs.AriaValuenow(values[index] ?? range.min)]
                    : []),
                ],
                [],
              ),
              ...(props.name === undefined ? [] : [hs.input([...hiddenInput])]),
            ],
          )
        },
      },
      toParentMessage: message =>
        props.toParentMessage(MultiMessage.GotThumbMessage({ index, message })),
    }),
  )
  return h.div(
    [
      h.DataAttribute('slot', 'slider'),
      h.DataAttribute('orientation', orientation),
      ...(props.direction === 'rtl' ? [h.Dir('rtl')] : []),
      ...(props.isDisabled === true ? [h.DataAttribute('disabled', '')] : []),
      ...(props.isReadOnly === true ? [h.DataAttribute('readonly', '')] : []),
      h.Class(
        cn(
          'relative touch-none select-none data-[disabled]:opacity-50',
          horizontal ? 'h-5 w-full' : 'h-44 w-5',
          props.class,
        ),
      ),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'slider-track'),
          ...(isInteractive
            ? [
                h.OnPointerDown((...args) =>
                  Option.map(pressedTrack(...args), props.toParentMessage),
                ),
              ]
            : []),
          h.Class(
            cn(
              'absolute rounded-full bg-muted',
              horizontal
                ? 'inset-x-0 top-1/2 h-1.5 -translate-y-1/2'
                : 'inset-y-0 left-1/2 w-1.5 -translate-x-1/2',
            ),
          ),
        ],
        segments.map(([start, end]) =>
          h.div(
            [
              h.DataAttribute('slot', 'slider-range'),
              h.Class('pointer-events-none absolute rounded-full bg-primary'),
              h.Style(
                horizontal
                  ? {
                      left: `${String(start)}%`,
                      right: `${String(100 - end)}%`,
                      insetBlock: '0',
                    }
                  : {
                      bottom: `${String(start)}%`,
                      top: `${String(100 - end)}%`,
                      insetInline: '0',
                    },
              ),
            ],
            [],
          ),
        ),
      ),
      ...thumbViews,
    ],
  )
}
