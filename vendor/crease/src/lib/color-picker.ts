// Color Picker — skin-neutral state for the diceui-style compound color
// picker. The model is the single source of truth for the color (held as
// HSV + alpha because the 2D area maps directly onto saturation/value) plus
// the display format, the input draft, the open state of the trigger
// popover, and which channel (area | hue | alpha) currently owns a pointer
// drag. All three channels share one pointer subscription: while a drag is
// active it streams window pointermove positions normalized to fractions of
// the dragged channel's track rect, so the update stays DOM-free.

import { Effect, Match as M, Option, Schema as S, Stream } from 'effect'
import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Subscription from 'foldkit/subscription'
import { Popover } from '@foldkit/ui'

// ---------------------------------------------------------------------------
// Color math (diceui parity)
// ---------------------------------------------------------------------------

export type RgbColor = Readonly<{ r: number; g: number; b: number; a: number }>
export type HsvColor = Readonly<{ h: number; s: number; v: number; a: number }>
export type HslColor = Readonly<{ h: number; s: number; l: number; a: number }>

export const colorFormats = ['hex', 'rgb', 'hsl', 'hsb'] as const
export type ColorFormat = (typeof colorFormats)[number]

/** The EyeDropper API (Chrome/Edge 95+); absent on Firefox/Safari. */
declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const clampByte = (value: number): number => clamp(Math.round(value), 0, 255)
const clampFraction = (value: number): number => clamp(value, 0, 1)

/** hex → rgb. Accepts `#rgb` / `#rrggbb` (optionally `#rrggbbaa`). */
export const hexToRgb = (hex: string): Option.Option<RgbColor> => {
  const match = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/iu)
  if (match === null) return Option.none()
  const raw = match[1]!
  const expanded =
    raw.length === 3
      ? raw
          .split('')
          .map(char => char + char)
          .join('')
      : raw
  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  const a = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1
  return Option.some({ r, g, b, a })
}

export const rgbToHex = (
  color: RgbColor,
  options?: Readonly<{ withAlpha?: boolean }>,
): string => {
  const toChannel = (channel: number) =>
    clampByte(channel).toString(16).padStart(2, '0')
  const base = `#${toChannel(color.r)}${toChannel(color.g)}${toChannel(color.b)}`
  return options?.withAlpha === true
    ? base +
        clampByte(color.a * 255)
          .toString(16)
          .padStart(2, '0')
    : base
}

export const rgbToHsv = (color: RgbColor): HsvColor => {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }
  if (h < 0) h += 360

  return {
    h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
    a: color.a,
  }
}

export const hsvToRgb = (color: HsvColor): RgbColor => {
  const h = ((color.h % 360) + 360) % 360
  const s = clamp(color.s, 0, 100) / 100
  const v = clamp(color.v, 0, 100) / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]

  return {
    r: clampByte((r + m) * 255),
    g: clampByte((g + m) * 255),
    b: clampByte((b + m) * 255),
    a: clampFraction(color.a),
  }
}

export const rgbToHsl = (color: RgbColor): HslColor => {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }
  if (h < 0) h += 360

  return {
    h,
    s: delta === 0 ? 0 : (delta / (1 - Math.abs(2 * l - 1))) * 100,
    l: l * 100,
    a: color.a,
  }
}

export const hslToRgb = (color: HslColor): RgbColor => {
  const h = ((color.h % 360) + 360) % 360
  const s = clamp(color.s, 0, 100) / 100
  const l = clamp(color.l, 0, 100) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]

  return {
    r: clampByte((r + m) * 255),
    g: clampByte((g + m) * 255),
    b: clampByte((b + m) * 255),
    a: clampFraction(color.a),
  }
}

const parseChannelTriplet = (
  body: string,
): Option.Option<readonly [number, number, number, number]> => {
  const match =
    body.match(
      /^([-\d.]+)(%?)\s+([-\d.]+)(%?)\s+([-\d.]+)(%?)(?:\s*\/\s*([-\d.]+%?))?$/u,
    ) ??
    body.match(
      /^([-\d.]+)(%?)\s*,\s*([-\d.]+)(%?)\s*,\s*([-\d.]+)(%?)(?:\s*,\s*([-\d.]+%?))?$/u,
    )
  if (match === null) return Option.none()
  const channel = (raw: string, percent: string, scale: number) =>
    percent === '%' ? (parseFloat(raw) / 100) * scale : parseFloat(raw)
  const alphaRaw = match[7]
  const a =
    alphaRaw === undefined
      ? 1
      : alphaRaw.endsWith('%')
        ? parseFloat(alphaRaw) / 100
        : parseFloat(alphaRaw)
  return Option.some([
    channel(match[1]!, match[2]!, 255),
    channel(match[3]!, match[4]!, 255),
    channel(match[5]!, match[6]!, 255),
    clampFraction(a),
  ])
}

/** Parses `#hex`, `rgb()/rgba()`, `hsl()/hsla()`, `hsb()/hsba()` into rgb. */
export const parseColorString = (value: string): Option.Option<RgbColor> => {
  const trimmed = value.trim()
  const asHex = hexToRgb(trimmed)
  if (Option.isSome(asHex)) return asHex

  const call = trimmed.match(/^([a-z]+)\((.*)\)$/u)
  if (call === null) return Option.none()
  const [, fn, body] = call as [string, string, string]

  if (fn === 'rgb' || fn === 'rgba') {
    return Option.map(parseChannelTriplet(body), ([r, g, b, a]) => ({
      r: clampByte(r),
      g: clampByte(g),
      b: clampByte(b),
      a,
    }))
  }
  if (fn === 'hsl' || fn === 'hsla' || fn === 'hsb' || fn === 'hsba') {
    const parsed = body.match(
      /^([-\d.]+)(deg|rad|turn)?\s*[,\s]\s*([-\d.]+)%\s*[,\s]\s*([-\d.]+)%(?:\s*(?:,|\/)\s*([-\d.]+%?))?$/u,
    )
    if (parsed === null) return Option.none()
    const hue = parseFloat(parsed[1]!)
    const second = parseFloat(parsed[3]!)
    const third = parseFloat(parsed[4]!)
    const alphaRaw = parsed[5]
    const a =
      alphaRaw === undefined
        ? 1
        : alphaRaw.endsWith('%')
          ? parseFloat(alphaRaw) / 100
          : parseFloat(alphaRaw)
    return Option.some(
      fn === 'hsl' || fn === 'hsla'
        ? hslToRgb({ h: hue, s: second, l: third, a })
        : hsvToRgb({ h: hue, s: second, v: third, a }),
    )
  }
  return Option.none()
}

const round = (value: number, places = 2): number => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

export const colorToString = (color: RgbColor, format: ColorFormat): string => {
  switch (format) {
    case 'hex':
      return color.a < 1
        ? rgbToHex(color, { withAlpha: true })
        : rgbToHex(color)
    case 'rgb': {
      const channels = `${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)}`
      return color.a < 1
        ? `rgba(${channels}, ${round(color.a)})`
        : `rgb(${channels})`
    }
    case 'hsl': {
      const hsl = rgbToHsl(color)
      const body = `${round(hsl.h, 0)}, ${round(hsl.s, 0)}%, ${round(hsl.l, 0)}%`
      return hsl.a < 1 ? `hsla(${body}, ${round(hsl.a)})` : `hsl(${body})`
    }
    case 'hsb': {
      const hsv = rgbToHsv(color)
      const body = `${round(hsv.h, 0)}, ${round(hsv.s, 0)}%, ${round(hsv.v, 0)}%`
      return hsv.a < 1 ? `hsba(${body}, ${round(hsv.a)})` : `hsb(${body})`
    }
  }
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const HsvSchema = S.Struct({
  h: S.Number,
  s: S.Number,
  v: S.Number,
  a: S.Number,
})

export const DragChannel = S.Literals(['area', 'hue', 'alpha'])
export type DragChannel = typeof DragChannel.Type

export const Model = S.Struct({
  id: S.String,
  color: HsvSchema,
  format: S.Literals(['hex', 'rgb', 'hsl', 'hsb']),
  withoutAlpha: S.Boolean,
  disabled: S.Boolean,
  draft: S.String,
  drag: S.Union([DragChannel, S.Literal('idle')]),
  popover: Popover.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotPopoverMessage: { message: Popover.Message },
  PressedChannel: { channel: DragChannel, x: S.Number, y: S.Number },
  MovedDragPointer: { x: S.Number, y: S.Number },
  ReleasedDragPointer: {},
  NudgedChannel: { channel: DragChannel, x: S.Number, y: S.Number },
  ChangedFormat: { format: S.Literals(['hex', 'rgb', 'hsl', 'hsb']) },
  ChangedInput: { text: S.String },
  CommittedInput: {},
  PressedEyeDropper: {},
  CompletedEyeDropperPick: { hex: S.Union([S.String, S.Null]) },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ChangedValue: { value: S.String, format: S.String },
})
export type OutMessage = typeof OutMessage.Type

const PickEyeDropperColor = Command.define('PickColorPickerEyeDropperColor', {
  messages: [Message.CompletedEyeDropperPick],
  execute: Effect.promise(async (): Promise<string | null> => {
    const ctor = window.EyeDropper
    if (ctor === undefined) return null
    try {
      const result = await new ctor().open()
      return result.sRGBHex
    } catch {
      return null
    }
  }).pipe(Effect.map(hex => Message.CompletedEyeDropperPick({ hex }))),
})

const DEFAULT_COLOR: HsvColor = { h: 0, s: 0, v: 0, a: 1 }

export const init = (
  config: Readonly<{
    id: string
    value?: string
    format?: ColorFormat
    withoutAlpha?: boolean
    disabled?: boolean
  }>,
): Model => {
  const parsed =
    config.value === undefined
      ? Option.none<RgbColor>()
      : parseColorString(config.value)
  const color = Option.match(parsed, {
    onNone: () => DEFAULT_COLOR,
    onSome: rgbToHsv,
  })
  const format = config.format ?? 'hex'
  return {
    id: config.id,
    color,
    format,
    withoutAlpha: config.withoutAlpha ?? false,
    disabled: config.disabled ?? false,
    draft: colorToString(hsvToRgb(color), format),
    drag: 'idle',
    popover: Popover.init({ id: `${config.id}-popover`, isAnimated: true }),
  }
}

/** Parent-driven controlled-value sync: reparse + keep the draft fresh. */
export const reflectValue = (model: Model, value: string): Model =>
  Option.match(parseColorString(value), {
    onNone: () => model,
    onSome: rgb => {
      const color = rgbToHsv(rgb)
      return { ...model, color, draft: colorToString(rgb, model.format) }
    },
  })

export const rgb = (model: Model): RgbColor => hsvToRgb(model.color)
export const hex = (model: Model): string => rgbToHex(hsvToRgb(model.color))

/** The committed value rendered in `colorToString`'s active format. */
export const formattedValue = (model: Model): string =>
  colorToString(hsvToRgb(model.color), model.format)

/** Pure hue for the area's background gradient (`hsl(h, 100%, 50%)`). */
export const pureHue = (model: Model): string =>
  `hsl(${String(Math.round(model.color.h))}, 100%, 50%)`

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const changedValue = (model: Model, color: HsvColor): UpdateReturn => ({
  model: {
    ...model,
    color,
    draft: colorToString(hsvToRgb(color), model.format),
  },
  outMessage: OutMessage.ChangedValue({
    value: colorToString(hsvToRgb(color), model.format),
    format: model.format,
  }),
})

const applyFraction = (
  model: Model,
  channel: DragChannel,
  x: number,
  y: number,
): HsvColor => {
  const c = model.color
  switch (channel) {
    case 'area':
      return {
        ...c,
        s: clamp(x, 0, 1) * 100,
        v: (1 - clamp(y, 0, 1)) * 100,
      }
    case 'hue':
      return { ...c, h: clamp(x, 0, 1) * 360 }
    case 'alpha':
      return { ...c, a: clamp(x, 0, 1) }
  }
}

const nudge = (
  color: HsvColor,
  channel: DragChannel,
  x: number,
  y: number,
): HsvColor => {
  switch (channel) {
    case 'area':
      return {
        ...color,
        s: clamp(color.s + x, 0, 100),
        v: clamp(color.v + y, 0, 100),
      }
    case 'hue':
      return { ...color, h: (((color.h + x) % 360) + 360) % 360 }
    case 'alpha':
      return { ...color, a: clampFraction(color.a + x) }
  }
}

const liftPopover = (model: Model, message: Popover.Message): UpdateReturn => {
  const next = Popover.update(model.popover, message)
  return {
    model: { ...model, popover: next.model },
    ...(next.commands === undefined
      ? {}
      : {
          commands: Command.mapMessages(next.commands, inner =>
            Message.GotPopoverMessage({ message: inner }),
          ),
        }),
  }
}

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotPopoverMessage: ({ message }) =>
        model.disabled ? { model } : liftPopover(model, message),
      PressedChannel: ({ channel, x, y }) =>
        model.disabled
          ? { model }
          : changedValue(
              { ...model, drag: channel },
              applyFraction(model, channel, x, y),
            ),
      MovedDragPointer: ({ x, y }) =>
        model.drag === 'idle' || model.disabled
          ? { model }
          : changedValue(model, applyFraction(model, model.drag, x, y)),
      ReleasedDragPointer: () => ({ model: { ...model, drag: 'idle' } }),
      NudgedChannel: ({ channel, x, y }) =>
        model.disabled
          ? { model }
          : changedValue(model, nudge(model.color, channel, x, y)),
      ChangedFormat: ({ format }) => ({
        model: {
          ...model,
          format,
          draft: colorToString(hsvToRgb(model.color), format),
        },
      }),
      ChangedInput: ({ text }) => {
        const parsed = parseColorString(text)
        return Option.match(parsed, {
          onNone: () => ({ model: { ...model, draft: text } }),
          /* Keep the typed text as the draft — rewriting it to the
             formatted value mid-typing would corrupt longer input. */
          onSome: rgbColor => {
            const next = changedValue(model, rgbToHsv(rgbColor))
            return { ...next, model: { ...next.model, draft: text } }
          },
        })
      },
      CommittedInput: () => ({
        model: {
          ...model,
          draft: colorToString(hsvToRgb(model.color), model.format),
        },
      }),
      PressedEyeDropper: () =>
        model.disabled
          ? { model }
          : { model, commands: [PickEyeDropperColor()] },
      CompletedEyeDropperPick: ({ hex }) =>
        hex === null
          ? { model }
          : Option.match(parseColorString(hex), {
              onNone: () => ({ model }),
              onSome: rgbColor => changedValue(model, rgbToHsv(rgbColor)),
            }),
    }),
  )

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

const CHANNEL_ATTR = 'data-color-picker-channel'

/** DOM id the skin marks each channel track with: `<id>-<channel>`. */
export const channelElementId = (id: string, channel: DragChannel): string =>
  `${id}-${channel}`

const findChannelElement = (id: string, channel: DragChannel) =>
  document.querySelector(`[${CHANNEL_ATTR}="${channelElementId(id, channel)}"]`)

const pointerFractions = (
  element: Element,
  event: PointerEvent,
): { x: number; y: number } => {
  const rect = element.getBoundingClientRect()
  return {
    x:
      rect.width === 0
        ? 0
        : clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y:
      rect.height === 0
        ? 0
        : clamp((event.clientY - rect.top) / rect.height, 0, 1),
  }
}

const dragPointer = (key: string) =>
  Subscription.make<{ id: string; drag: DragChannel | 'idle' }, Message>()(
    entry => ({
      [key]: entry(
        {
          id: S.String,
          drag: S.Union([DragChannel, S.Literal('idle')]),
        },
        {
          modelToDependencies: model => ({ id: model.id, drag: model.drag }),
          dependenciesToStream: ({ id, drag }) =>
            drag === 'idle'
              ? Stream.empty
              : Stream.merge(
                  Subscription.fromEventFilterMap({
                    target: window,
                    type: 'pointermove',
                    filterMapEvent: event => {
                      const element = findChannelElement(id, drag)
                      return element === null
                        ? Option.none()
                        : Option.some(
                            Message.MovedDragPointer(
                              pointerFractions(element, event),
                            ),
                          )
                    },
                  }),
                  Subscription.fromEvent({
                    target: window,
                    type: 'pointerup',
                    mapEvent: () => Message.ReleasedDragPointer(),
                  }),
                ),
        },
      ),
    }),
  )

/** Aggregates the picker's drag subscriptions under a parent model. `id`
    namespaces the record key so a parent can host several pickers. */
export const subscriptions = <ParentModel, Msg>(
  config: Readonly<{
    id: string
    toChildModel: (model: ParentModel) => Model
    toParentMessage: (message: Message) => Msg
  }>,
): Subscription.Subscriptions<ParentModel, Msg> =>
  Subscription.aggregate<ParentModel, Msg>()(
    Subscription.lift(dragPointer(`${config.id}Drag`))<ParentModel, Msg>({
      toChildModel: config.toChildModel,
      toParentMessage: config.toParentMessage,
    }),
  )
