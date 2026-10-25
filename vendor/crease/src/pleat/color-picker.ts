// Color Picker — Pleat skin over lib/color-picker (diceui anatomy: swatch
// trigger → popover with area / hue / alpha / format / input, or inline).
// Static styles live in the Style.make table; per-color gradients and thumb
// positions stay dynamic via h.Style.

import { Style, When } from '@pleat/core'
import { Option } from 'effect'
import type { Html, HtmlBuilder, KeyboardModifiers } from 'foldkit/html'

import * as Picker from '@/lib/color-picker'
import type { ColorFormat, DragChannel } from '@/lib/color-picker'
import { icon } from '@/lib/icon'
import type {
  ButtonSize,
  ButtonVariant,
  ComponentLayoutStyle,
} from './contracts'
import { reset } from './reset'
import { className } from './style'
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { tokens } from './tokens'
import * as Popover from '@/pleat/popover'

export const Model = Picker.Model
export type Model = typeof Model.Type
export const Message = Picker.Message
export type Message = typeof Message.Type
export const OutMessage = Picker.OutMessage
export type OutMessage = typeof OutMessage.Type

export const init = Picker.init
export const update = Picker.update
export const reflectValue = Picker.reflectValue
export const subscriptions = Picker.subscriptions
export const channelElementId = Picker.channelElementId
export const hex = Picker.hex
export const formattedValue = Picker.formattedValue
export const parseColorString = Picker.parseColorString
export const rgbToHex = Picker.rgbToHex
export const colorFormats = Picker.colorFormats
export type { ColorFormat, DragChannel } from '@/lib/color-picker'

const CHANNEL_ATTR = 'data-color-picker-channel'

const CHECKERBOARD =
  'repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%) 0 0 / 8px 8px, repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px'

const HUE_GRADIENT =
  'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))'

const styles = {
  root: Style.make({
    backgroundColor: foundationTokens.popover,
    borderRadius: foundationTokens.radiusMd,
    borderColor: tokens.border,
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    padding: '0.75rem',
    width: 'fit-content',
  }),
  content: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '16rem',
  }),
  row: Style.make({ alignItems: 'center', display: 'flex', gap: '0.5rem' }),
  sliders: Style.make({
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: '0.5rem',
    minWidth: 0,
  }),
  area: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    height: '11rem',
    overflow: 'hidden',
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
    width: '100%',
  }).pipe(
    Style.when(When.pseudo(':is([aria-disabled="true"])'), {
      cursor: interactionTokens.cursorDisabled,
      opacity: 0.5,
    }),
  ),
  areaThumb: Style.make({
    borderColor: foundationTokens.white,
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: 2,
    height: '1rem',
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translate(-50%, 50%)',
    width: '1rem',
  }),
  track: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: interactionTokens.cursorAction,
    height: '1rem',
    overflow: 'hidden',
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
    width: '100%',
  }).pipe(
    Style.when(When.pseudo(':is([aria-disabled="true"])'), {
      cursor: interactionTokens.cursorDisabled,
      opacity: 0.5,
    }),
  ),
  sliderThumb: Style.make({
    backgroundColor: foundationTokens.white,
    borderColor: tokens.border,
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: foundationTokens.shadowSm,
    height: '0.875rem',
    pointerEvents: 'none',
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '0.875rem',
  }),
  swatch: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'inline-block',
    flexShrink: 0,
    height: '1rem',
    pointerEvents: 'none',
    width: '1rem',
  }),
  eyeDropper: Style.make({
    alignItems: 'center',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    height: '2rem',
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    width: '2rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.pseudo(':is([disabled])'), {
      opacity: 0.5,
      pointerEvents: 'none',
    }),
  ),
  select: Style.make({
    backgroundColor: tokens.transparent,
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    color: tokens.foreground,
    flexShrink: 0,
    fontSize: '0.75rem',
    height: '2rem',
    paddingLeft: '0.5rem',
    paddingRight: '0.5rem',
    width: '5rem',
  }),
  input: Style.make({
    backgroundColor: tokens.transparent,
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    color: tokens.foreground,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    height: '2rem',
    minWidth: 0,
    paddingLeft: '0.5rem',
    paddingRight: '0.5rem',
    width: '100%',
  }),
}

const fractionFromPointer = (
  clientX: number,
  clientY: number,
  target: EventTarget | null,
): Option.Option<Readonly<{ x: number; y: number }>> =>
  target instanceof Element
    ? Option.some(
        (() => {
          const rect = target.getBoundingClientRect()
          return {
            x:
              rect.width === 0
                ? 0
                : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
            y:
              rect.height === 0
                ? 0
                : Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
          }
        })(),
      )
    : Option.none()

const ARROW_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
])

const nudgeForKey = (
  channel: DragChannel,
  key: string,
  modifiers: KeyboardModifiers,
): Option.Option<Readonly<{ x: number; y: number }>> => {
  if (!ARROW_KEYS.has(key)) return Option.none()
  const big = modifiers.shiftKey || key === 'PageUp' || key === 'PageDown'
  const step =
    channel === 'alpha'
      ? big
        ? 0.1
        : 0.01
      : channel === 'hue'
        ? big
          ? 10
          : 1
        : big
          ? 10
          : 1
  const horizontal = (delta: number) => Option.some({ x: delta, y: 0 })
  const vertical = (delta: number) => Option.some({ x: 0, y: delta })
  switch (key) {
    case 'ArrowLeft':
      return horizontal(-step)
    case 'ArrowRight':
      return horizontal(step)
    case 'ArrowUp':
      return channel === 'area' ? vertical(step) : horizontal(step)
    case 'ArrowDown':
      return channel === 'area' ? vertical(-step) : horizontal(-step)
    case 'PageUp':
      return channel === 'area' ? vertical(step) : horizontal(step)
    case 'PageDown':
      return channel === 'area' ? vertical(-step) : horizontal(-step)
  }
  return Option.none()
}

type ChannelProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  layoutStyle?: ComponentLayoutStyle
}>

const channelAttrs = <Msg>(
  props: ChannelProps<Msg>,
  channel: DragChannel,
  h: HtmlBuilder<Msg>,
) => [
  h.Attribute(CHANNEL_ATTR, Picker.channelElementId(props.model.id, channel)),
  h.DataAttribute('slot', `color-picker-${channel}`),
  h.Tabindex(props.model.disabled ? -1 : 0),
  h.Role('slider'),
  h.AriaDisabled(props.model.disabled),
  h.OnPointerDown(
    (_pointerType, button, _sx, _sy, _ts, clientX, clientY, _pid, target) =>
      button !== 0
        ? Option.none()
        : Option.map(
            fractionFromPointer(clientX, clientY, target),
            ({ x, y }) =>
              props.toParentMessage(Message.PressedChannel({ channel, x, y })),
          ),
  ),
  h.OnKeyDownPreventDefault((key, modifiers) =>
    Option.map(nudgeForKey(channel, key, modifiers), ({ x, y }) =>
      props.toParentMessage(Message.NudgedChannel({ channel, x, y })),
    ),
  ),
]

const THUMB_RING =
  '0 0 0 2px hsl(var(--background)), 0 1px 3px rgb(0 0 0 / 0.4)'

export const colorPickerArea = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { s, v } = props.model.color
  return h.div(
    [
      h.Class(className(styles.area, props.layoutStyle)),
      h.AriaLabel('Color saturation and value'),
      h.AriaValuetext(
        `saturation ${String(Math.round(s))}%, value ${String(Math.round(v))}%`,
      ),
      h.Style({
        backgroundColor: Picker.pureHue(props.model),
        backgroundImage:
          'linear-gradient(to top, rgb(0,0,0), transparent), linear-gradient(to right, rgb(255,255,255), transparent)',
        cursor: props.model.disabled ? 'not-allowed' : 'crosshair',
      }),
      ...channelAttrs(props, 'area', h),
    ],
    [
      h.span(
        [
          h.DataAttribute('slot', 'color-picker-area-thumb'),
          h.Class(className(styles.areaThumb)),
          h.Style({
            left: `${String(s)}%`,
            bottom: `${String(v)}%`,
            backgroundColor: Picker.hex(props.model),
            boxShadow: THUMB_RING,
          }),
        ],
        [],
      ),
    ],
  )
}

const sliderTrack = <Msg>(
  props: ChannelProps<Msg>,
  channel: 'hue' | 'alpha',
  fraction: number,
  h: HtmlBuilder<Msg>,
  style: Record<string, string>,
): Html =>
  h.div(
    [
      h.Class(className(styles.track, props.layoutStyle)),
      h.AriaLabel(channel === 'hue' ? 'Hue' : 'Alpha'),
      h.AriaValuemin(0),
      h.AriaValuemax(channel === 'hue' ? 360 : 100),
      h.AriaValuenow(
        channel === 'hue'
          ? Math.round(props.model.color.h)
          : Math.round(props.model.color.a * 100),
      ),
      h.Style(style),
      ...channelAttrs(props, channel, h),
    ],
    [
      h.span(
        [
          h.DataAttribute('slot', `color-picker-${channel}-thumb`),
          h.Class(className(styles.sliderThumb)),
          h.Style({ left: `${String(fraction * 100)}%` }),
        ],
        [],
      ),
    ],
  )

export const colorPickerHueSlider = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  sliderTrack(props, 'hue', props.model.color.h / 360, h, {
    backgroundImage: HUE_GRADIENT,
  })

export const colorPickerAlphaSlider = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { r, g, b } = Picker.rgb(props.model)
  return sliderTrack(props, 'alpha', props.model.color.a, h, {
    backgroundImage: `linear-gradient(to right, transparent, rgb(${String(r)}, ${String(g)}, ${String(b)})), ${CHECKERBOARD}`,
  })
}

export type ColorPickerSwatchProps = Readonly<{
  color: string
  layoutStyle?: ComponentLayoutStyle
}>

export const colorPickerSwatch = <Msg>(
  props: ColorPickerSwatchProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'color-picker-swatch'),
      h.Class(className(styles.swatch, props.layoutStyle)),
      h.Style({ background: `${props.color}, ${CHECKERBOARD}` }),
    ],
    [],
  )

export type ColorPickerEyeDropperProps<Msg> = ChannelProps<Msg>

/** Native EyeDropper button; renders nothing where the API is missing. */
export const colorPickerEyeDropper = <Msg>(
  props: ColorPickerEyeDropperProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  window.EyeDropper !== undefined
    ? h.button(
        [
          h.Class(
            className(reset.button, styles.eyeDropper, props.layoutStyle),
          ),
          h.DataAttribute('slot', 'color-picker-eye-dropper'),
          h.Type('button'),
          h.Disabled(props.model.disabled),
          h.AriaLabel('Pick a color from the screen'),
          h.Title('Pick a color from the screen'),
          h.OnClick(props.toParentMessage(Message.PressedEyeDropper())),
        ],
        [icon<Msg>('pipette', { class: 'size-4' }, h)],
      )
    : null

export const colorPickerFormatSelect = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.select(
    [
      h.Class(className(styles.select, props.layoutStyle)),
      h.DataAttribute('slot', 'color-picker-format-select'),
      h.AriaLabel('Color format'),
      h.Disabled(props.model.disabled),
      h.OnChange(value =>
        props.toParentMessage(
          Message.ChangedFormat({ format: value as ColorFormat }),
        ),
      ),
    ],
    Picker.colorFormats.map(format =>
      h.option(
        [
          h.Value(format),
          ...(format === props.model.format ? [h.Selected(true)] : []),
        ],
        [format.toUpperCase()],
      ),
    ),
  )

export const colorPickerInput = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.input([
    h.Class(className(reset.input, styles.input, props.layoutStyle)),
    h.DataAttribute('slot', 'color-picker-input'),
    h.Type('text'),
    h.Value(props.model.draft),
    h.Disabled(props.model.disabled),
    h.Spellcheck(false),
    h.Autocomplete('off'),
    h.AriaLabel('Color value'),
    h.OnInput(value =>
      props.toParentMessage(Message.ChangedInput({ text: value })),
    ),
    h.OnBlur(props.toParentMessage(Message.CommittedInput())),
  ])

export const colorPickerContent = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'color-picker-content'),
      h.Class(className(styles.content)),
    ],
    [
      colorPickerArea(props, h),
      h.div(
        [h.Class(className(styles.row))],
        [
          colorPickerEyeDropper(props, h),
          h.div(
            [h.Class(className(styles.sliders))],
            [
              colorPickerHueSlider(props, h),
              ...(props.model.withoutAlpha
                ? []
                : [colorPickerAlphaSlider(props, h)]),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class(className(styles.row))],
        [colorPickerFormatSelect(props, h), colorPickerInput(props, h)],
      ),
    ],
  )

export type ColorPickerProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  trigger?: Html
  /** Render the trigger with the Button component (keeps popover behavior). */
  triggerButtonVariant?: ButtonVariant
  triggerButtonSize?: ButtonSize
  triggerLayoutStyle?: ComponentLayoutStyle
  inline?: boolean
  side?: Popover.PopoverSide
  align?: Popover.PopoverAlign
  portal?: 'themed'
  /** 'bare' drops the panel surface so the content supplies its own. */
  surface?: 'default' | 'bare'
  layoutStyle?: ComponentLayoutStyle
  contentLayoutStyle?: ComponentLayoutStyle
}>

export const colorPicker = <Msg>(
  props: ColorPickerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const panel = colorPickerContent(
    {
      model: props.model,
      toParentMessage: props.toParentMessage,
      ...(props.contentLayoutStyle === undefined
        ? {}
        : { layoutStyle: props.contentLayoutStyle }),
    },
    h,
  )
  if (props.inline === true) {
    return h.div(
      [
        h.DataAttribute('slot', 'color-picker'),
        h.Class(className(styles.root, props.layoutStyle)),
      ],
      [panel],
    )
  }
  return Popover.popover<Msg>(
    {
      model: props.model.popover,
      toParentMessage: message =>
        props.toParentMessage(Message.GotPopoverMessage({ message })),
      trigger:
        props.trigger ??
        colorPickerSwatch({ color: Picker.hex(props.model) }, h),
      content: panel,
      side: props.side ?? 'bottom',
      align: props.align ?? 'start',
      ...(props.triggerButtonVariant === undefined
        ? {}
        : { triggerButtonVariant: props.triggerButtonVariant }),
      ...(props.triggerButtonSize === undefined
        ? {}
        : { triggerButtonSize: props.triggerButtonSize }),
      ...(props.triggerLayoutStyle === undefined
        ? {}
        : { triggerLayoutStyle: props.triggerLayoutStyle }),
      ...(props.portal === undefined ? {} : { portal: props.portal }),
      ...(props.surface === undefined ? {} : { surface: props.surface }),
      ...(props.layoutStyle === undefined
        ? {}
        : { layoutStyle: props.layoutStyle }),
    },
    h,
  )
}
