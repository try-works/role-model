import { Option } from 'effect'
import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
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
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { tokens } from './tokens.stylex'

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

const styles = stylex.create({
  control: { position: 'relative', touchAction: 'none', userSelect: 'none' },
  disabled: { opacity: 0.5 },
  filled: {
    backgroundColor: tokens.primary,
    position: 'absolute',
    height: '100%',
  },
  horizontal: { height: '1.25rem', width: '100%' },
  /* Multi-thumb sliders render a zero-area track overlay per thumb so the
     foldkit Slider primitive can measure drags against the shared track's
     geometry; it can never receive a pointer itself. */
  measureTrackWrap: {
    inset: 0,
    pointerEvents: 'none',
    position: 'absolute',
  },
  measureTrack: { height: '100%', width: '100%' },
  contentsWrap: { display: 'contents' },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  },
  labeled: { gap: '0.5rem', display: 'grid' },
  range: {
    borderRadius: foundationTokens.radiusFull,
    backgroundColor: tokens.primary,
    pointerEvents: 'none',
    position: 'absolute',
  },
  root: {
    alignItems: 'center',
    display: 'flex',
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
    width: '100%',
  },
  thumb: {
    borderColor: tokens.primary,
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: foundationTokens.white,
    boxShadow: {
      default: foundationTokens.shadowSm,
      ':focus-visible': foundationTokens.ringShadow4,
      ':hover': foundationTokens.ringShadow4,
    },
    display: 'block',
    flexShrink: 0,
    opacity: { default: null, ':is([aria-disabled])': 0.5 },
    outlineStyle: 'none',
    pointerEvents: { default: null, ':is([aria-disabled])': 'none' },
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    zIndex: { default: 0, ':is([data-dragging])': 2, ':focus': 1 },
    height: '1rem',
    width: '1rem',
  },
  track: {
    borderRadius: foundationTokens.radiusFull,
    overflow: 'hidden',
    backgroundColor: tokens.muted,
    flexGrow: 1,
    position: 'relative',
    height: '0.375rem',
    width: '100%',
  },
  trackOverlay: {
    borderRadius: foundationTokens.radiusFull,
    backgroundColor: tokens.muted,
    position: 'absolute',
  },
  trackHorizontal: {
    transform: 'translateY(-50%)',
    height: '0.375rem',
    left: 0,
    right: 0,
    top: '50%',
  },
  trackVertical: {
    transform: 'translateX(-50%)',
    bottom: 0,
    left: '50%',
    top: 0,
    width: '0.375rem',
  },
  vertical: { height: '11rem', width: '1.25rem' },
})

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
  layoutStyle?: ComponentLayoutStyle
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
  layoutStyle?: ComponentLayoutStyle
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
): Html =>
  h.submodel({
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
        const control = h.div(
          [
            ...root,
            h.DataAttribute('slot', 'slider'),
            h.Class(
              className(
                styles.root,
                props.isDisabled === true && styles.disabled,
                props.layoutStyle,
              ),
            ),
          ],
          [
            h.div(
              [
                ...track,
                h.DataAttribute('slot', 'slider-track'),
                h.Class(className(styles.track)),
              ],
              [
                h.div(
                  [
                    ...filledTrack,
                    h.DataAttribute('slot', 'slider-range'),
                    h.Class(className(styles.filled)),
                  ],
                  [],
                ),
              ],
            ),
            h.span(
              [
                ...thumb,
                h.DataAttribute('slot', 'slider-thumb'),
                h.Class(className(styles.thumb)),
              ],
              [],
            ),
            ...(props.name === undefined
              ? []
              : [h.input([h.Class(className(reset.input)), ...hiddenInput])]),
          ],
        )
        return props.label === undefined
          ? control
          : h.div(
              [h.Class(className(styles.labeled))],
              [
                h.label(
                  [...label, h.Class(className(styles.label))],
                  [props.label],
                ),
                control,
              ],
            )
      },
    },
    toParentMessage: props.toParentMessage,
  })

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
        toView: ({ track, thumb, hiddenInput }) =>
          h.div(
            [h.Class(className(styles.contentsWrap))],
            [
              /* The primitive measures drag distance against the track
                 element it rendered, so the hidden copy must cover the same
                 box as the visual track while letting presses fall through
                 to the shared track below. */
              h.div(
                [h.Class(className(styles.measureTrackWrap))],
                [
                  h.div(
                    [
                      ...track,
                      h.AriaHidden(true),
                      h.Class(className(styles.measureTrack)),
                    ],
                    [],
                  ),
                ],
              ),
              h.span(
                [
                  ...thumb,
                  h.DataAttribute('slot', 'slider-thumb'),
                  h.Class(className(styles.thumb)),
                  /* The primitive reports the display-space value; under
                       mirroring (RTL) report the true value instead. */
                  ...(model.mirrored
                    ? [h.AriaValuenow(values[index] ?? range.min)]
                    : []),
                ],
                [],
              ),
              ...(props.name === undefined
                ? []
                : [h.input([h.Class(className(reset.input)), ...hiddenInput])]),
            ],
          ),
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
        className(
          styles.control,
          horizontal ? styles.horizontal : styles.vertical,
          props.isDisabled === true && styles.disabled,
          props.layoutStyle,
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
            className(
              styles.trackOverlay,
              horizontal ? styles.trackHorizontal : styles.trackVertical,
            ),
          ),
        ],
        segments.map(([start, end]) =>
          h.div(
            [
              h.DataAttribute('slot', 'slider-range'),
              h.Class(className(styles.range)),
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
