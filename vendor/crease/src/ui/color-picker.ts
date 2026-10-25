// Color Picker — Tailwind skin over lib/color-picker, modeled on the diceui
// (Base UI) color picker: a swatch trigger opening a popover with a 2D
// saturation/value area, hue + alpha sliders, an eyedropper (Chrome/Edge
// only — the part renders nothing when window.EyeDropper is missing), a
// format select, and a text input. `inline` renders the panel without the
// trigger/popover. All slot parts take `toParentMessage` so hosts can embed
// them individually.

import { Option } from 'effect'

import type { Html, HtmlBuilder, KeyboardModifiers } from 'foldkit/html'

import * as Picker from '@/lib/color-picker'
import type { ColorFormat, DragChannel } from '@/lib/color-picker'
import { icon } from '@/lib/icon'
import { cn } from '@/lib/utils'
import * as Popover from '@/ui/popover'

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

/* The alpha channel needs a checkerboard behind the color ramp so the
   transparent end reads as transparent. */
const CHECKERBOARD =
  'repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%) 0 0 / 8px 8px, repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px'

const AREA_CLASS =
  'relative h-44 w-full cursor-crosshair touch-none overflow-hidden rounded-md border select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const AREA_THUMB_CLASS =
  'pointer-events-none absolute size-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow-sm'

const TRACK_CLASS =
  'relative h-4 w-full cursor-pointer touch-none overflow-hidden rounded-full border select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const SLIDER_THUMB_CLASS =
  'pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 bg-white shadow'

const HUE_GRADIENT =
  'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))'

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

/** Keyboard deltas in each channel's own units: area s/v in %, hue in
 * degrees, alpha in 0–1. Shift scales the step ×10, matching diceui. */
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
  class?: string
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
      h.Class(cn(AREA_CLASS, props.class)),
      h.AriaLabel('Color saturation and value'),
      h.AriaValuetext(
        `saturation ${String(Math.round(s))}%, value ${String(Math.round(v))}%`,
      ),
      h.Style({
        backgroundColor: Picker.pureHue(props.model),
        backgroundImage:
          'linear-gradient(to top, rgb(0,0,0), transparent), linear-gradient(to right, rgb(255,255,255), transparent)',
      }),
      ...channelAttrs(props, 'area', h),
    ],
    [
      h.span(
        [
          h.DataAttribute('slot', 'color-picker-area-thumb'),
          h.Class(AREA_THUMB_CLASS),
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
      h.Class(cn(TRACK_CLASS, props.class)),
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
          h.Class(SLIDER_THUMB_CLASS),
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
    background: CHECKERBOARD,
    backgroundImage: `linear-gradient(to right, transparent, rgb(${String(r)}, ${String(g)}, ${String(b)})), ${CHECKERBOARD}`,
  })
}

export type ColorPickerSwatchProps = Readonly<{
  color: string
  class?: string
}>

/** Transparent-aware swatch: checkerboard under the color fill. */
export const colorPickerSwatch = <Msg>(
  props: ColorPickerSwatchProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'color-picker-swatch'),
      h.Class(
        cn(
          'pointer-events-none inline-block size-4 shrink-0 rounded-[4px] border border-black/10',
          props.class,
        ),
      ),
      h.Style({
        background: `${props.color}, ${CHECKERBOARD}`,
      }),
    ],
    [],
  )

export type ColorPickerEyeDropperProps<Msg> = ChannelProps<Msg>

/** Native EyeDropper button; renders nothing where the API is missing
 *  (Firefox/Safari), like diceui. */
export const colorPickerEyeDropper = <Msg>(
  props: ColorPickerEyeDropperProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const supported = window.EyeDropper !== undefined
  return supported
    ? h.button(
        [
          h.DataAttribute('slot', 'color-picker-eye-dropper'),
          h.Type('button'),
          h.Disabled(props.model.disabled),
          h.AriaLabel('Pick a color from the screen'),
          h.Title('Pick a color from the screen'),
          h.Class(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
          ),
          h.OnClick(props.toParentMessage(Message.PressedEyeDropper())),
        ],
        [icon<Msg>('pipette', { class: 'size-4' }, h)],
      )
    : null
}

export const colorPickerFormatSelect = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.select(
    [
      h.DataAttribute('slot', 'color-picker-format-select'),
      h.AriaLabel('Color format'),
      h.Disabled(props.model.disabled),
      h.Class(
        'h-8 w-20 shrink-0 rounded-md border bg-transparent px-2 text-xs text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
      ),
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
    h.DataAttribute('slot', 'color-picker-input'),
    h.Type('text'),
    h.Value(props.model.draft),
    h.Disabled(props.model.disabled),
    h.Spellcheck(false),
    h.Autocomplete('off'),
    h.AriaLabel('Color value'),
    h.Class(
      'h-8 w-full min-w-0 rounded-md border bg-transparent px-2 font-mono text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
    ),
    h.OnInput(value =>
      props.toParentMessage(Message.ChangedInput({ text: value })),
    ),
    h.OnBlur(props.toParentMessage(Message.CommittedInput())),
  ])

/** The popover body: area, eyedropper + hue/alpha column, format + input. */
export const colorPickerContent = <Msg>(
  props: ChannelProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'color-picker-content'),
      h.Class('flex w-64 flex-col gap-3'),
    ],
    [
      colorPickerArea(props, h),
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          colorPickerEyeDropper(props, h),
          h.div(
            [h.Class('flex min-w-0 flex-1 flex-col gap-2')],
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
        [h.Class('flex items-center gap-2')],
        [colorPickerFormatSelect(props, h), colorPickerInput(props, h)],
      ),
    ],
  )

export type ColorPickerProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Content rendered inside the trigger button; defaults to the swatch. */
  trigger?: Html
  triggerClass?: string
  /** Render the panel inline without a popover. */
  inline?: boolean
  side?: Popover.PopoverSide
  align?: Popover.PopoverAlign
  class?: string
  contentClass?: string
}>

/** Full compound picker: trigger button + popover panel, or `inline`. */
export const colorPicker = <Msg>(
  props: ColorPickerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const panel = colorPickerContent(
    { model: props.model, toParentMessage: props.toParentMessage },
    h,
  )
  if (props.inline === true) {
    return h.div(
      [
        h.DataAttribute('slot', 'color-picker'),
        h.Class(
          cn(
            'w-fit rounded-md border bg-popover p-3 text-popover-foreground shadow-md',
            props.class,
          ),
        ),
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
      triggerClass: cn(
        'inline-flex h-8 w-9 items-center justify-center rounded-md border bg-background p-0 shadow-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
        props.triggerClass,
      ),
      content: panel,
      side: props.side ?? 'bottom',
      align: props.align ?? 'start',
      ...(props.class === undefined ? {} : { class: props.class }),
    },
    h,
  )
}
