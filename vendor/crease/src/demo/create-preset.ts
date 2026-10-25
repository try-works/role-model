import { Option, Schema as S } from 'effect'

/* The /create theme, as foldkit-plus's knobs: every setting is a field on
   Config; presets are whole knob-sets, and the generated CSS derives every
   custom property from them. Sliders carry the numeric knobs, segmented rows
   and pickers carry the enums. */

export const STYLES = [
  'nova',
  'vega',
  'maia',
  'lyra',
  'mira',
  'luma',
  'sera',
  'rhea',
] as const
export const BASES = [
  'accent',
  'neutral',
  'stone',
  'zinc',
  'gray',
  'mauve',
  'olive',
  'mist',
  'taupe',
] as const
export const THEMES = [
  'neutral',
  'stone',
  'zinc',
  'gray',
  'amber',
  'blue',
  'cyan',
  'emerald',
  'fuchsia',
  'green',
  'indigo',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'rose',
  'sky',
  'teal',
  'violet',
  'yellow',
  'mauve',
  'olive',
  'mist',
  'taupe',
] as const
export const ICON_LIBRARIES = [
  'lucide',
  'hugeicons',
  'tabler',
  'phosphor',
  'remixicon',
] as const
export const FONTS = [
  'inter',
  'noto-sans',
  'nunito-sans',
  'figtree',
  'roboto',
  'raleway',
  'dm-sans',
  'public-sans',
  'outfit',
  'jetbrains-mono',
  'geist',
  'geist-mono',
  'lora',
  'merriweather',
  'playfair-display',
  'noto-serif',
  'roboto-slab',
  'oxanium',
  'manrope',
  'space-grotesk',
  'montserrat',
  'ibm-plex-sans',
  'source-sans-3',
  'instrument-sans',
  'eb-garamond',
  'instrument-serif',
] as const
export const FONT_HEADINGS = ['inherit', ...FONTS] as const
export const MENU_ACCENTS = ['subtle', 'bold'] as const
export const MENU_COLORS = [
  'default',
  'inverted',
  'default-translucent',
  'inverted-translucent',
] as const
export const OUTLINES = ['soft', 'strong', 'ink'] as const
export const HOVERS = ['surface', 'neutral', 'accent'] as const
export const CONTROL_SHAPES = ['rounded', 'pill'] as const
export const SHADOW_STYLES = ['soft', 'hard'] as const
export const RELIEFS = ['flat', 'soft', 'hard', 'bevel'] as const
export const EASINGS = ['ease', 'spring'] as const
export const SCHEMES = ['system', 'light', 'dark'] as const

/** Enum fields that keep a popover picker (or segmented row) in the panel. */
export const Field = S.Literals([
  'style',
  'base',
  'chartColor',
  'iconLibrary',
  'font',
  'fontHeading',
  'menuAccent',
  'menuColor',
])
export type Field = typeof Field.Type

/** Enum fields set from a segmented row — no popover sits behind them. */
export const OptionField = S.Literals([
  'hover',
  'outlines',
  'controlShape',
  'shadowStyle',
  'relief',
  'easing',
])
export type OptionField = typeof OptionField.Type

export const Config = S.Struct({
  style: S.String,
  base: S.String,
  hue: S.Number,
  chroma: S.Number,
  lightness: S.Number,
  surfaceSaturation: S.Number,
  surfaceContrast: S.Number,
  surfaceLightness: S.Number,
  surfaceLightnessDark: S.Number,
  outlines: S.String,
  hover: S.String,
  radius: S.Number,
  border: S.Number,
  controlShape: S.String,
  shadow: S.Number,
  shadowStyle: S.String,
  relief: S.String,
  font: S.String,
  fontHeading: S.String,
  textScale: S.Number,
  headingScale: S.Number,
  leading: S.Number,
  headingWeight: S.Number,
  tracking: S.Number,
  motion: S.Number,
  easing: S.String,
  menuAccent: S.String,
  menuColor: S.String,
  iconLibrary: S.String,
  chartColor: S.String,
  /* Per-token overrides layered on top of the knob-derived palette — the
     tweakcn-style escape hatch. Keys are token names for the light scheme,
     `dark:name` for the dark scheme; values are CSS color strings. */
  overrides: S.Record(S.String, S.String),
})
export type Config = typeof Config.Type

/** Color tokens the token editor may override. */
export const OVERRIDABLE_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'muted',
  'muted-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
] as const
export type OverridableToken = (typeof OVERRIDABLE_TOKENS)[number]

const OVERRIDABLE_SET = new Set<string>(OVERRIDABLE_TOKENS)

/** Splits stored overrides into the tokens that apply to one scheme. */
const overridesFor = (
  overrides: Readonly<Record<string, string>>,
  scheme: 'light' | 'dark',
): Readonly<Record<string, string>> => {
  const prefix = scheme === 'dark' ? 'dark:' : ''
  return Object.fromEntries(
    Object.entries(overrides).flatMap(([key, value]) =>
      key.startsWith(prefix) && OVERRIDABLE_SET.has(key.slice(prefix.length))
        ? [[key.slice(prefix.length), value]]
        : [],
    ),
  )
}

export const sameConfig = S.toEquivalence(Config)

/** The numeric knobs, each a slider. */
export const Knob = S.Literals([
  'hue',
  'chroma',
  'lightness',
  'surfaceSaturation',
  'surfaceContrast',
  'surfaceLightness',
  'surfaceLightnessDark',
  'radius',
  'border',
  'shadow',
  'textScale',
  'headingScale',
  'leading',
  'headingWeight',
  'tracking',
  'motion',
])
export type Knob = typeof Knob.Type

export interface Range {
  readonly knob: Knob
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly unit: string
}

const range = (
  knob: Knob,
  label: string,
  [min, max, step]: readonly [number, number, number],
  unit: string,
): Range => ({ knob, label, min, max, step, unit })

export const ranges: ReadonlyArray<Range> = [
  range('hue', 'Hue', [0, 360, 1], '°'),
  range('chroma', 'Chroma', [0, 0.3, 0.005], ''),
  range('lightness', 'Lightness', [15, 90, 1], '%'),
  range('surfaceSaturation', 'Surface tint', [0, 0.04, 0.001], ''),
  range('surfaceLightness', 'Page lightness', [75, 100, 0.5], '%'),
  range('surfaceLightnessDark', 'Page lightness, dark', [6, 36, 0.5], '%'),
  range('surfaceContrast', 'Surface contrast', [0, 100, 1], '%'),
  range('radius', 'Radius', [0, 2.5, 0.05], '×'),
  range('border', 'Border', [1, 3, 1], 'px'),
  range('shadow', 'Shadow', [0, 100, 1], '%'),
  range('textScale', 'Text size', [0.8, 1.3, 0.025], '×'),
  range('headingScale', 'Heading scale', [0.4, 1.8, 0.05], '×'),
  range('leading', 'Line height', [0.85, 1.3, 0.05], '×'),
  range('headingWeight', 'Heading weight', [300, 900, 100], ''),
  range('tracking', 'Heading tracking', [-0.05, 0.05, 0.005], 'em'),
  range('motion', 'Motion', [0, 2, 0.1], '×'),
]

export const rangeOf = (knob: Knob): Range =>
  ranges.find(each => each.knob === knob)!

/** A value a slider can show: clamped to its range and rounded to its step, without float noise. */
export const fit = (range: Range, value: number): number => {
  const clamped = Math.min(range.max, Math.max(range.min, value))
  const stepped =
    range.min + Math.round((clamped - range.min) / range.step) * range.step
  return Number(stepped.toFixed(4))
}

/** Each named base's neutral hue and its natural surface chroma (like foldkit-plus's bases). */
export const bases: Readonly<
  Record<
    Exclude<(typeof BASES)[number], 'accent'>,
    { readonly h: number; readonly c: number }
  >
> = {
  neutral: { h: 0, c: 0 },
  stone: { h: 56, c: 0.004 },
  zinc: { h: 286, c: 0.004 },
  gray: { h: 265, c: 0.006 },
  mauve: { h: 325, c: 0.007 },
  olive: { h: 106, c: 0.009 },
  mist: { h: 232, c: 0.006 },
  taupe: { h: 74, c: 0.006 },
}

/** The neutral surface hue of a config — the accent hue for 'accent' bases. */
export const baseHue = (config: Config): number =>
  config.base === 'accent'
    ? config.hue
    : (bases[config.base as keyof typeof bases]?.h ?? 0)

export const DEFAULT_CONFIG: Config = {
  style: 'nova',
  base: 'neutral',
  hue: 0,
  chroma: 0,
  lightness: 21,
  surfaceSaturation: 0,
  surfaceContrast: 22,
  surfaceLightness: 100,
  surfaceLightnessDark: 20.5,
  outlines: 'soft',
  hover: 'surface',
  radius: 1,
  border: 1,
  controlShape: 'rounded',
  shadow: 100,
  shadowStyle: 'soft',
  relief: 'flat',
  font: 'inter',
  fontHeading: 'inherit',
  textScale: 1,
  headingScale: 1,
  leading: 1,
  headingWeight: 600,
  tracking: -0.01,
  motion: 1,
  easing: 'ease',
  menuAccent: 'subtle',
  menuColor: 'default',
  iconLibrary: 'lucide',
  chartColor: 'neutral',
  overrides: {},
}

/* Presets are whole knob-sets, foldkit-plus style: choosing one installs every
   field, plus the scheme it is known in when it has one. */
export interface Preset {
  readonly name: string
  readonly description: string
  readonly config: Config
  readonly scheme?: 'light' | 'dark'
}

export const presets: ReadonlyArray<Preset> = [
  {
    name: 'Nova',
    description: 'The default: neutral greys, no accent, Inter',
    config: DEFAULT_CONFIG,
  },
  {
    name: 'Shadcn',
    description:
      'Zinc neutrals, a near-black primary and tight headings, after shadcn/ui',
    scheme: 'light',
    config: {
      ...DEFAULT_CONFIG,
      base: 'zinc',
      surfaceSaturation: 0.004,
      surfaceContrast: 22,
      surfaceLightnessDark: 14,
      radius: 1,
      shadow: 60,
      relief: 'soft',
      hover: 'neutral',
      tracking: -0.025,
      font: 'geist',
    },
  },
  {
    name: 'Material',
    description:
      'Tonal surfaces, pill buttons, regular-weight headings, after Material 3',
    scheme: 'light',
    config: {
      ...DEFAULT_CONFIG,
      hue: 293,
      chroma: 0.13,
      lightness: 44,
      base: 'accent',
      surfaceSaturation: 0.02,
      surfaceContrast: 18,
      surfaceLightnessDark: 18,
      radius: 1.6,
      controlShape: 'pill',
      shadow: 70,
      relief: 'soft',
      font: 'roboto',
      headingWeight: 400,
      tracking: 0,
      headingScale: 1.15,
      hover: 'accent',
      easing: 'spring',
      chartColor: 'violet',
    },
  },
  {
    name: 'Windows 95',
    description:
      'Silver grey, navy, beveled controls, dark frames and square corners',
    scheme: 'light',
    config: {
      ...DEFAULT_CONFIG,
      hue: 264,
      chroma: 0.19,
      lightness: 30,
      base: 'neutral',
      surfaceSaturation: 0,
      surfaceContrast: 44,
      surfaceLightness: 80,
      outlines: 'ink',
      radius: 0,
      shadow: 100,
      shadowStyle: 'hard',
      relief: 'bevel',
      motion: 0,
      font: 'ibm-plex-sans',
      textScale: 0.9,
      headingScale: 0.7,
      headingWeight: 700,
      tracking: 0,
      hover: 'neutral',
      style: 'lyra',
      chartColor: 'blue',
    },
  },
  {
    name: 'Brutalist',
    description:
      'Black lines, hard shadows, heavy tight headings and a loud yellow',
    scheme: 'light',
    config: {
      ...DEFAULT_CONFIG,
      hue: 100,
      chroma: 0.19,
      lightness: 88,
      base: 'neutral',
      surfaceSaturation: 0,
      surfaceContrast: 34,
      surfaceLightness: 98,
      outlines: 'ink',
      radius: 0.3,
      border: 2,
      shadow: 100,
      shadowStyle: 'hard',
      relief: 'hard',
      headingScale: 1.3,
      headingWeight: 800,
      tracking: -0.03,
      hover: 'neutral',
      font: 'space-grotesk',
      fontHeading: 'space-grotesk',
      chartColor: 'yellow',
    },
  },
  {
    name: 'Solarized',
    description:
      'Base3 cream, blue, and type set in serif, after Ethan Schoonover’s palette',
    scheme: 'light',
    config: {
      ...DEFAULT_CONFIG,
      hue: 245,
      chroma: 0.14,
      lightness: 60,
      base: 'stone',
      surfaceSaturation: 0.03,
      surfaceLightness: 96.5,
      surfaceLightnessDark: 27,
      radius: 0.6,
      shadow: 30,
      font: 'lora',
      headingWeight: 700,
      tracking: 0,
      headingScale: 0.85,
      chartColor: 'blue',
    },
  },
  {
    name: 'Nord',
    description: 'Frost blue on the polar night, after Nord',
    scheme: 'dark',
    config: {
      ...DEFAULT_CONFIG,
      hue: 213,
      chroma: 0.07,
      lightness: 62,
      base: 'mist',
      surfaceSaturation: 0.018,
      surfaceContrast: 22,
      surfaceLightness: 95.5,
      surfaceLightnessDark: 32,
      radius: 1,
      shadow: 50,
      font: 'inter',
      headingWeight: 500,
      hover: 'neutral',
      chartColor: 'sky',
    },
  },
  {
    name: 'Ocean',
    description: 'A deep blue on blue-tinted surfaces',
    config: {
      ...DEFAULT_CONFIG,
      hue: 232,
      chroma: 0.14,
      lightness: 50,
      base: 'accent',
      surfaceSaturation: 0.014,
      chartColor: 'blue',
    },
  },
  {
    name: 'Forest',
    description: 'Leaf green, a little squarer',
    config: {
      ...DEFAULT_CONFIG,
      hue: 152,
      chroma: 0.12,
      lightness: 48,
      radius: 0.8,
      chartColor: 'green',
    },
  },
  {
    name: 'Ember',
    description: 'Warm orange, tighter',
    config: {
      ...DEFAULT_CONFIG,
      hue: 38,
      chroma: 0.17,
      lightness: 60,
      radius: 0.6,
      chartColor: 'orange',
    },
  },
  {
    name: 'Orchid',
    description: 'Pink, round and serif',
    config: {
      ...DEFAULT_CONFIG,
      hue: 328,
      chroma: 0.16,
      lightness: 56,
      radius: 2.2,
      surfaceSaturation: 0.02,
      font: 'lora',
      headingWeight: 500,
      tracking: 0,
      chartColor: 'pink',
    },
  },
  {
    name: 'Terminal',
    description:
      'Phosphor green in mono on black: sharp, still, and barely any heading scale',
    scheme: 'dark',
    config: {
      ...DEFAULT_CONFIG,
      hue: 145,
      chroma: 0.2,
      lightness: 55,
      base: 'accent',
      surfaceSaturation: 0.012,
      surfaceLightnessDark: 12,
      outlines: 'strong',
      radius: 0,
      shadow: 0,
      motion: 0,
      font: 'jetbrains-mono',
      fontHeading: 'jetbrains-mono',
      headingScale: 0.5,
      headingWeight: 700,
      tracking: 0,
      hover: 'accent',
      style: 'lyra',
      chartColor: 'green',
    },
  },
]

/* ---- preset codes --------------------------------------------------------
   'a' and 'b' codes are the old discrete-field packs; 'c' codes carry every
   knob. v3 packs quantized indices into a BigInt — 133 bits no longer fit a
   double. */

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

const toBase62 = (value: bigint): string =>
  value === 0n
    ? '0'
    : Array.from(
        {
          length: Math.max(
            1,
            Math.floor(Math.log(Number(value)) / Math.log(62)) + 1,
          ),
        },
        (_, index) => BASE62[Number((value / 62n ** BigInt(index)) % 62n)],
      )
        .reverse()
        .join('')

const fromBase62 = (value: string): Option.Option<bigint> =>
  value.split('').reduce<Option.Option<bigint>>(
    (result, character) =>
      Option.flatMap(result, current => {
        const index = BASE62.indexOf(character)
        return index < 0
          ? Option.none()
          : Option.some(current * 62n + BigInt(index))
      }),
    Option.some(0n),
  )

type EnumFieldSpec = {
  readonly key: string
  readonly values: ReadonlyArray<string>
  readonly bits: number
}
type NumFieldSpec = {
  readonly key: Knob
  readonly min: number
  readonly max: number
  readonly step: number
  readonly bits: number
}

const V1_FIELDS: ReadonlyArray<EnumFieldSpec> = [
  { key: 'menuColor', values: MENU_COLORS, bits: 3 },
  { key: 'menuAccent', values: MENU_ACCENTS, bits: 3 },
  {
    key: 'radius',
    values: ['default', 'none', 'small', 'medium', 'large'],
    bits: 4,
  },
  { key: 'font', values: FONTS, bits: 6 },
  { key: 'iconLibrary', values: ICON_LIBRARIES, bits: 6 },
  { key: 'theme', values: THEMES, bits: 6 },
  { key: 'baseColor', values: [...BASES].filter(b => b !== 'accent'), bits: 6 },
  { key: 'style', values: STYLES, bits: 6 },
]
const V2_FIELDS: ReadonlyArray<EnumFieldSpec> = [
  ...V1_FIELDS,
  { key: 'chartColor', values: THEMES, bits: 6 },
  { key: 'fontHeading', values: FONT_HEADINGS, bits: 5 },
]

const V3_ENUM_FIELDS: ReadonlyArray<EnumFieldSpec> = [
  { key: 'style', values: STYLES, bits: 4 },
  { key: 'base', values: BASES, bits: 4 },
  { key: 'outlines', values: OUTLINES, bits: 2 },
  { key: 'hover', values: HOVERS, bits: 2 },
  { key: 'controlShape', values: CONTROL_SHAPES, bits: 1 },
  { key: 'shadowStyle', values: SHADOW_STYLES, bits: 1 },
  { key: 'relief', values: RELIEFS, bits: 2 },
  { key: 'easing', values: EASINGS, bits: 1 },
  { key: 'font', values: FONTS, bits: 5 },
  { key: 'fontHeading', values: FONT_HEADINGS, bits: 5 },
  { key: 'menuAccent', values: MENU_ACCENTS, bits: 2 },
  { key: 'menuColor', values: MENU_COLORS, bits: 3 },
  { key: 'iconLibrary', values: ICON_LIBRARIES, bits: 3 },
  { key: 'chartColor', values: THEMES, bits: 5 },
]
const V3_NUM_FIELDS: ReadonlyArray<NumFieldSpec> = [
  { key: 'hue', min: 0, max: 360, step: 1, bits: 9 },
  { key: 'chroma', min: 0, max: 0.3, step: 0.005, bits: 6 },
  { key: 'lightness', min: 15, max: 90, step: 1, bits: 7 },
  { key: 'surfaceSaturation', min: 0, max: 0.04, step: 0.001, bits: 6 },
  { key: 'surfaceContrast', min: 0, max: 100, step: 1, bits: 7 },
  { key: 'surfaceLightness', min: 75, max: 100, step: 0.5, bits: 6 },
  { key: 'surfaceLightnessDark', min: 6, max: 36, step: 0.5, bits: 6 },
  { key: 'radius', min: 0, max: 2.5, step: 0.05, bits: 6 },
  { key: 'border', min: 1, max: 3, step: 1, bits: 2 },
  { key: 'shadow', min: 0, max: 100, step: 1, bits: 7 },
  { key: 'textScale', min: 0.8, max: 1.3, step: 0.025, bits: 5 },
  { key: 'headingScale', min: 0.4, max: 1.8, step: 0.05, bits: 5 },
  { key: 'leading', min: 0.85, max: 1.3, step: 0.05, bits: 4 },
  { key: 'headingWeight', min: 300, max: 900, step: 100, bits: 3 },
  { key: 'tracking', min: -0.05, max: 0.05, step: 0.005, bits: 5 },
  { key: 'motion', min: 0, max: 2, step: 0.1, bits: 5 },
]

const quantize = (field: NumFieldSpec, value: number): number =>
  Math.max(
    0,
    Math.round(
      (Math.min(field.max, Math.max(field.min, value)) - field.min) /
        field.step,
    ),
  )

export const encodePreset = (config: Config): string => {
  const enumPacked = V3_ENUM_FIELDS.reduce(
    (state, field) => ({
      packed:
        state.packed +
        BigInt(
          Math.max(
            0,
            field.values.indexOf(config[field.key as keyof Config] as string),
          ),
        ) *
          2n ** state.offset,
      offset: state.offset + BigInt(field.bits),
    }),
    { packed: 0n, offset: 0n },
  )
  const { packed } = V3_NUM_FIELDS.reduce(
    (state, field) => ({
      packed:
        state.packed +
        BigInt(quantize(field, config[field.key] as number)) *
          2n ** state.offset,
      offset: state.offset + BigInt(field.bits),
    }),
    enumPacked,
  )
  const base = `c${toBase62(packed)}`
  return Object.keys(config.overrides).length === 0
    ? base
    : `${base}.${encodeOverrides(config.overrides)}`
}

/* Overrides travel after a '.' as base64url JSON — arbitrary CSS values can't
   bit-pack, and the suffix keeps every earlier code valid. */
const encodeOverrides = (overrides: Readonly<Record<string, string>>): string =>
  btoa(JSON.stringify(overrides))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')

const decodeOverrides = (tail: string): Record<string, string> => {
  try {
    const json: unknown = JSON.parse(
      atob(tail.replaceAll('-', '+').replaceAll('_', '/')),
    )
    if (typeof json !== 'object' || json === null || Array.isArray(json))
      return {}
    return Object.fromEntries(
      Object.entries(json).flatMap(([key, value]) => {
        const token = key.startsWith('dark:') ? key.slice(5) : key
        return OVERRIDABLE_SET.has(token) && typeof value === 'string'
          ? [[key, value]]
          : []
      }),
    )
  } catch {
    return {}
  }
}

const LEGACY_RADIUS: Readonly<Record<string, number>> = {
  none: 0,
  small: 0.72,
  medium: 1,
  large: 1.4,
  default: 1,
}

const LEGACY_BASES = [...BASES].filter(b => b !== 'accent')

/** 'oklch(0.546 0.245 262.881)' → accent knobs. */
const accentFromOklch = (
  value: string,
): { hue: number; chroma: number; lightness: number } => {
  const match = value.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  return match
    ? {
        lightness: Number(match[1]) * 100,
        chroma: Number(match[2]),
        hue: Number(match[3]),
      }
    : { lightness: 52, chroma: 0.17, hue: 264 }
}

const decodeLegacy = (code: string): Option.Option<Config> => {
  if (!/^[ab][0-9A-Za-z]{1,9}$/.test(code)) return Option.none()
  const fields = code[0] === 'a' ? V1_FIELDS : V2_FIELDS
  return Option.map(fromBase62(code.slice(1)), packed => {
    const decoded = fields.reduce<{
      values: Record<string, string>
      offset: bigint
    }>(
      (state, field) => {
        const index = Number(
          (packed / 2n ** state.offset) % 2n ** BigInt(field.bits),
        )
        return {
          values: {
            ...state.values,
            [field.key]: field.values[index] ?? field.values[0] ?? '',
          },
          offset: state.offset + BigInt(field.bits),
        }
      },
      { values: {}, offset: 0n },
    ).values
    const theme = ACCENTS[decoded.theme ?? 'neutral'] ?? ACCENTS.neutral!
    const accent = accentFromOklch(theme[0])
    return {
      ...DEFAULT_CONFIG,
      style: decoded.style ?? 'nova',
      base: (LEGACY_BASES as readonly string[]).includes(
        decoded.baseColor ?? '',
      )
        ? (decoded.baseColor ?? 'neutral')
        : 'neutral',
      ...accent,
      surfaceSaturation: baseSaturation(decoded.baseColor),
      radius: LEGACY_RADIUS[decoded.radius ?? 'default'] ?? 1,
      font: decoded.font ?? 'inter',
      fontHeading:
        code[0] === 'a' ? 'inherit' : (decoded.fontHeading ?? 'inherit'),
      menuAccent: decoded.menuAccent ?? 'subtle',
      menuColor: decoded.menuColor ?? 'default',
      iconLibrary: decoded.iconLibrary ?? 'lucide',
      chartColor:
        code[0] === 'a'
          ? (decoded.theme ?? 'neutral')
          : (decoded.chartColor ?? decoded.theme ?? 'neutral'),
    } as Config
  })
}

const decodeV3 = (code: string): Option.Option<Config> => {
  const [head, tail] = code.split('.')
  if (!/^c[0-9A-Za-z]{1,24}$/.test(head ?? '')) return Option.none()
  return Option.map(fromBase62(head!.slice(1)), packed => {
    const afterEnums = V3_ENUM_FIELDS.reduce<{
      values: Record<string, string | number>
      offset: bigint
    }>(
      (state, field) => {
        const index = Number(
          (packed / 2n ** state.offset) % 2n ** BigInt(field.bits),
        )
        return {
          values: {
            ...state.values,
            [field.key]: field.values[index] ?? field.values[0] ?? '',
          },
          offset: state.offset + BigInt(field.bits),
        }
      },
      { values: {}, offset: 0n },
    )
    const { values } = V3_NUM_FIELDS.reduce<{
      values: Record<string, string | number>
      offset: bigint
    }>((state, field) => {
      const index = Number(
        (packed / 2n ** state.offset) % 2n ** BigInt(field.bits),
      )
      const value = field.min + index * field.step
      return {
        values: {
          ...state.values,
          [field.key]: Number(Math.min(field.max, value).toFixed(4)),
        },
        offset: state.offset + BigInt(field.bits),
      }
    }, afterEnums)
    return S.decodeUnknownSync(Config)({
      ...values,
      overrides: tail === undefined ? {} : decodeOverrides(tail),
    })
  })
}

export const decodePreset = (code: string): Option.Option<Config> =>
  code.startsWith('c') ? decodeV3(code) : decodeLegacy(code)

export const parsePresetInput = (value: string): Option.Option<Config> => {
  const input = value.trim()
  const flagValue = input.match(/^--preset\s+(.+)$/i)?.[1]?.trim()
  let candidate = flagValue ?? input
  try {
    const url = new URL(candidate)
    candidate = url.searchParams.get('preset') ?? candidate
  } catch {
    /* Plain preset code. */
  }
  return decodePreset(candidate)
}

/** Knobs drawn at random, for a theme to start from — like foldkit-plus's
 *  shuffle, keeping each slider in the part of its range that stays readable. */
export const shufflePreset = (random: () => number = Math.random): Config => {
  const pick = <A>(values: ReadonlyArray<A>): A =>
    values[Math.min(values.length - 1, Math.floor(random() * values.length))]!
  const between = (knob: Knob, low: number, high: number) =>
    fit(rangeOf(knob), low + random() * (high - low))
  const across = (knob: Knob) =>
    between(knob, rangeOf(knob).min, rangeOf(knob).max)
  const base = pick(BASES)
  const chroma = between('chroma', 0.06, 0.24)
  return {
    ...DEFAULT_CONFIG,
    style: pick(STYLES),
    base,
    hue: across('hue'),
    chroma,
    lightness: between('lightness', 40, 65),
    surfaceSaturation:
      base === 'accent' ? across('surfaceSaturation') : bases[base].c,
    surfaceContrast: between('surfaceContrast', 10, 40),
    surfaceLightness: between('surfaceLightness', 94, 100),
    surfaceLightnessDark: between('surfaceLightnessDark', 14, 28),
    outlines: pick(['soft', 'soft', 'strong'] as const),
    radius: across('radius'),
    border: pick([1, 1, 1, 2] as const),
    controlShape: pick(CONTROL_SHAPES),
    shadow: across('shadow'),
    shadowStyle: pick(['soft', 'soft', 'soft', 'hard'] as const),
    relief: pick(['flat', 'flat', 'soft', 'soft', 'hard', 'bevel'] as const),
    font: pick(FONTS),
    fontHeading: pick(FONT_HEADINGS),
    textScale: between('textScale', 0.9, 1.15),
    headingScale: between('headingScale', 0.7, 1.4),
    leading: between('leading', 0.95, 1.15),
    headingWeight: pick([400, 500, 600, 700, 800] as const),
    tracking: between('tracking', -0.03, 0.01),
    motion: 1,
    easing: pick(EASINGS),
    menuAccent: pick(MENU_ACCENTS),
    menuColor: pick(MENU_COLORS),
    iconLibrary: pick(ICON_LIBRARIES),
    chartColor: pick(THEMES),
  }
}

/* ---- CSS generation ------------------------------------------------------
   Two-stop accent/neutral tables for the chart hues, then everything derived
   from the knobs. */

const ACCENTS: Readonly<Record<string, readonly [string, string]>> = {
  neutral: ['oklch(0.205 0 0)', 'oklch(0.922 0 0)'],
  stone: ['oklch(0.216 0.006 56.043)', 'oklch(0.923 0.003 48.717)'],
  zinc: ['oklch(0.21 0.006 285.885)', 'oklch(0.92 0.004 286.32)'],
  gray: ['oklch(0.21 0.034 264.665)', 'oklch(0.928 0.006 264.531)'],
  amber: ['oklch(0.666 0.179 58.318)', 'oklch(0.769 0.188 70.08)'],
  blue: ['oklch(0.546 0.245 262.881)', 'oklch(0.623 0.214 259.815)'],
  cyan: ['oklch(0.609 0.126 221.723)', 'oklch(0.715 0.143 215.221)'],
  emerald: ['oklch(0.596 0.145 163.225)', 'oklch(0.696 0.17 162.48)'],
  fuchsia: ['oklch(0.591 0.293 322.896)', 'oklch(0.667 0.295 322.15)'],
  green: ['oklch(0.527 0.154 150.069)', 'oklch(0.723 0.219 149.579)'],
  indigo: ['oklch(0.511 0.262 276.966)', 'oklch(0.585 0.233 277.117)'],
  lime: ['oklch(0.648 0.2 131.684)', 'oklch(0.768 0.233 130.85)'],
  orange: ['oklch(0.646 0.222 41.116)', 'oklch(0.705 0.213 47.604)'],
  pink: ['oklch(0.592 0.249 0.584)', 'oklch(0.656 0.241 354.308)'],
  purple: ['oklch(0.558 0.288 302.321)', 'oklch(0.627 0.265 303.9)'],
  red: ['oklch(0.577 0.245 27.325)', 'oklch(0.637 0.237 25.331)'],
  rose: ['oklch(0.586 0.253 17.585)', 'oklch(0.645 0.246 16.439)'],
  sky: ['oklch(0.588 0.158 241.966)', 'oklch(0.685 0.169 237.323)'],
  teal: ['oklch(0.6 0.118 184.704)', 'oklch(0.704 0.14 182.503)'],
  violet: ['oklch(0.541 0.281 293.009)', 'oklch(0.606 0.25 292.717)'],
  yellow: ['oklch(0.681 0.162 75.834)', 'oklch(0.795 0.184 86.047)'],
  mauve: ['oklch(0.215 0.006 342.321)', 'oklch(0.922 0.005 342.5)'],
  olive: ['oklch(0.221 0.012 113.78)', 'oklch(0.924 0.012 113.5)'],
  mist: ['oklch(0.218 0.012 232)', 'oklch(0.923 0.011 232)'],
  taupe: ['oklch(0.218 0.01 74)', 'oklch(0.923 0.008 74)'],
}

/** The accent knobs that reproduce a named theme color — used by the landing
 *  studio's color picker and by legacy-code decoding. */
export const accentForTheme = (
  name: string,
): { hue: number; chroma: number; lightness: number } =>
  accentFromOklch((ACCENTS[name] ?? ACCENTS.neutral!)[0])

const oklch = (l: number, c: number, h: number): string =>
  `oklch(${Number((l / 100).toFixed(4))} ${Number(c.toFixed(4))} ${Number(h.toFixed(3))})`

const baseSaturation = (base: string | undefined): number =>
  base !== undefined && base !== 'accent' && base in bases
    ? bases[base as Exclude<(typeof BASES)[number], 'accent'>].c
    : DEFAULT_CONFIG.surfaceSaturation

const fontFamily = (font: string): string =>
  `"${font
    .split('-')
    .map(part => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')}", ui-sans-serif, system-ui, sans-serif`

/* Preset geometry is declared per semantic role group rather than per
   component, so every control (not only Button/Input) follows the style.
   Controls nested in an Input Group defer to the group's own frame. */
const CONTROL_SLOTS = [
  'button',
  'input',
  'textarea',
  'select-trigger',
  'native-select',
  'input-group',
  'toggle',
] as const
const SINGLE_LINE_SLOTS = CONTROL_SLOTS.filter(slot => slot !== 'textarea')
const SURFACE_SLOTS = ['card'] as const
const SELECTION_SLOTS = ['checkbox', 'radio-group-item', 'switch'] as const
const ROW_SLOTS = ['item', 'sidebar-menu-button'] as const
const CELL_SLOTS = ['table-cell'] as const
const TAB_SLOTS = ['tabs-list', 'tabs-trigger', 'pagination-link'] as const
const DISCLOSURE_SLOTS = ['accordion-trigger', 'navigation-menu-link'] as const
const DAY_SLOTS = ['calendar-day'] as const

const where = (slots: ReadonlyArray<string>): string =>
  `:where(${slots
    .map(slot => `[data-slot="${slot}"]:not([data-slot="input-group"] *)`)
    .join(',')})`

const whereSized = (slots: ReadonlyArray<string>, size: string): string =>
  `:where(${slots
    .map(
      slot =>
        `[data-slot="${slot}"][data-size="${size}"]:not([data-slot="input-group"] *)`,
    )
    .join(',')})`

/** Mira's compact named-size scale (shadcn Mira: h-5/6/7/8). Text controls
 *  shrink by their own `data-size`; icon buttons and toggles stay square. */
export const MIRA_SIZES = {
  xs: '1.25rem',
  sm: '1.5rem',
  default: '1.75rem',
  lg: '2rem',
} as const
const SIZED_SLOTS = ['button', 'select-trigger', 'native-select'] as const
const MIRA_GEOMETRY = [
  `${where(['input', 'input-group'])}{height:${MIRA_SIZES.default};min-height:0}`,
  ...Object.entries(MIRA_SIZES).map(
    ([size, value]) =>
      `${whereSized(SIZED_SLOTS, size)}{height:${value};min-height:0}${whereSized(['button'], size === 'default' ? 'icon' : `icon-${size}`)}{width:${value};min-width:0;height:${value};min-height:0}${whereSized(['toggle'], size)}{min-width:${value};height:${value};min-height:0}`,
  ),
].join('')

const STYLE_RULES: Readonly<Record<string, string>> = {
  nova: '',
  vega: `${where([...CONTROL_SLOTS, ...SELECTION_SLOTS, ...SURFACE_SLOTS])}{box-shadow:none}`,
  maia: `${where([...SINGLE_LINE_SLOTS, ...TAB_SLOTS, ...DAY_SLOTS])}{border-radius:9999px}${where(['textarea', ...ROW_SLOTS, ...DISCLOSURE_SLOTS])}{border-radius:calc(var(--radius) + 0.25rem)}${where(SURFACE_SLOTS)}{border-radius:calc(var(--radius) + 0.5rem)}`,
  lyra: `${where([...CONTROL_SLOTS, 'checkbox', ...ROW_SLOTS, ...TAB_SLOTS, ...DISCLOSURE_SLOTS, ...DAY_SLOTS, ...SURFACE_SLOTS])}{border-radius:0}`,
  mira: `${MIRA_GEOMETRY}${where(CONTROL_SLOTS)}{font-size:.8125rem}${where(CELL_SLOTS)}{padding-block:.25rem}`,
  luma: `${where([...CONTROL_SLOTS, ...SELECTION_SLOTS, ...SURFACE_SLOTS])}{box-shadow:0 1px 3px oklch(0 0 0/.08)}`,
  sera: `${where([...CONTROL_SLOTS, ...SELECTION_SLOTS, ...SURFACE_SLOTS])}{border-width:2px}`,
  rhea: `${where([...SINGLE_LINE_SLOTS, ...ROW_SLOTS])}{min-height:2.5rem}:where([data-slot="card"]:not([data-size="sm"])){--card-spacing:1.75rem;--card-spacing-default:1.75rem}${where(CELL_SLOTS)}{padding-block:.75rem}`,
}

/* Relief draws the control edge: flat leaves it, soft lifts, hard offsets a
   solid copy, bevel insets a light top and a dark bottom. */
const reliefRules = (config: Config, ink: string): string => {
  switch (config.relief) {
    case 'soft':
      return `${where([...CONTROL_SLOTS, ...SELECTION_SLOTS])}{box-shadow:0 1px 2px rgb(0 0 0/.08),0 1px 3px rgb(0 0 0/.06)}`
    case 'hard':
      return `${where([...CONTROL_SLOTS, ...SELECTION_SLOTS])}{box-shadow:2px 2px 0 0 ${ink}}`
    case 'bevel':
      return `${where([...CONTROL_SLOTS, ...SELECTION_SLOTS])}{box-shadow:inset 0 1px 0 rgb(255 255 255/.3),inset 0 -1px 0 rgb(0 0 0/.22),0 1px 1px rgb(0 0 0/.18)}`
    default:
      return ''
  }
}

const SPRING_EASE = 'cubic-bezier(0.34,1.56,0.64,1)'

const TEXT_SIZES = [
  ['xs', 0.75, 1],
  ['sm', 0.875, 1.25],
  ['base', 1, 1.5],
  ['lg', 1.125, 1.75],
  ['xl', 1.25, 1.75],
  ['2xl', 1.5, 2],
  ['3xl', 1.875, 2.25],
] as const

const HEADING_SIZES = { h1: 2, h2: 1.5, h3: 1.17, h4: 1 } as const

const buildCss = (
  config: Config,
  scope: string,
  darkScope: string,
  rulePrefix: string,
): string => {
  const chroma = config.chroma
  const hue = config.hue
  const accent = oklch(config.lightness, chroma, hue)
  const accentDark =
    chroma < 0.02
      ? oklch(92, chroma, hue)
      : oklch(Math.min(92, Math.max(config.lightness + 30, 80)), chroma, hue)
  const baseH = baseHue(config)
  const sC = config.surfaceSaturation
  const ink = oklch(20.5, Math.max(0.006, sC + 0.004), baseH)
  const nearWhite = oklch(98.5, 0, 0)
  const page = oklch(config.surfaceLightness, sC, baseH)
  const muted = oklch(
    Math.max(0, config.surfaceLightness - config.surfaceContrast * 0.35),
    sC,
    baseH,
  )
  const pageDark = oklch(config.surfaceLightnessDark, sC, baseH)
  const surfaceDark = `color-mix(in oklch,${pageDark} 84%,white)`
  const primaryFg = config.lightness > 78 ? ink : nearWhite

  const hoverSurface =
    config.hover === 'accent'
      ? `color-mix(in oklch,${accent} 12%,${page})`
      : config.hover === 'neutral'
        ? `color-mix(in oklch,${ink} 8%,${page})`
        : muted
  const hoverSurfaceDark =
    config.hover === 'accent'
      ? `color-mix(in oklch,${accentDark} 25%,${pageDark})`
      : config.hover === 'neutral'
        ? `color-mix(in oklch,white 10%,${pageDark})`
        : surfaceDark

  const [borderL, inputL, borderD, inputD] =
    config.outlines === 'ink'
      ? [
          `color-mix(in oklch,${ink} 88%,transparent)`,
          `color-mix(in oklch,${ink} 88%,transparent)`,
          'oklch(1 0 0 / 60%)',
          'oklch(1 0 0 / 75%)',
        ]
      : config.outlines === 'strong'
        ? [
            `color-mix(in oklch,${ink} 45%,transparent)`,
            `color-mix(in oklch,${ink} 45%,transparent)`,
            'oklch(1 0 0 / 28%)',
            'oklch(1 0 0 / 40%)',
          ]
        : [
            `color-mix(in oklch,${muted} 82%,${ink})`,
            `color-mix(in oklch,${muted} 82%,${ink})`,
            'oklch(1 0 0 / 10%)',
            'oklch(1 0 0 / 15%)',
          ]

  const chart = ACCENTS[config.chartColor] ?? ACCENTS.neutral!
  const invertedMenu = config.menuColor.startsWith('inverted')
  const boldMenu = config.menuAccent === 'bold'
  const translucentMenu = config.menuColor.endsWith('translucent')
  const sidebar = invertedMenu ? ink : muted
  const radiusRem =
    config.radius === 0
      ? '0'
      : `${Number((config.radius * 0.625).toFixed(4))}rem`
  const heading =
    config.fontHeading === 'inherit'
      ? fontFamily(config.font)
      : fontFamily(config.fontHeading)

  /* The shadow scale, soft diffuse steps or hard solid offsets, both scaled
     by the shadow knob's alpha. */
  const shadowAlpha = config.shadow / 100
  const shadowInk = `color-mix(in oklch,${ink} ${Math.round(45 * shadowAlpha + 55)}%,transparent)`
  const shadows =
    config.shadow === 0
      ? `--shadow-xs:none;--shadow-sm:none;--shadow:none;--shadow-md:none;--shadow-lg:none;--shadow-xl:none;--shadow-2xl:none;`
      : config.shadowStyle === 'hard'
        ? `--shadow-xs:1px 1px 0 0 ${shadowInk};--shadow-sm:2px 2px 0 0 ${shadowInk};--shadow:3px 3px 0 0 ${shadowInk};--shadow-md:4px 4px 0 0 ${shadowInk};--shadow-lg:6px 6px 0 0 ${shadowInk};--shadow-xl:8px 8px 0 0 ${shadowInk};--shadow-2xl:10px 10px 0 0 ${shadowInk};`
        : (alpha =>
            `--shadow-xs:0 1px 2px 0 rgb(0 0 0/${5 * alpha}%);--shadow-sm:0 1px 3px 0 rgb(0 0 0/${10 * alpha}%),0 1px 2px -1px rgb(0 0 0/${10 * alpha}%);--shadow:0 1px 3px 0 rgb(0 0 0/${10 * alpha}%),0 1px 2px -1px rgb(0 0 0/${10 * alpha}%);--shadow-md:0 4px 6px -1px rgb(0 0 0/${10 * alpha}%),0 2px 4px -2px rgb(0 0 0/${10 * alpha}%);--shadow-lg:0 10px 15px -3px rgb(0 0 0/${10 * alpha}%),0 4px 6px -4px rgb(0 0 0/${10 * alpha}%);--shadow-xl:0 20px 25px -5px rgb(0 0 0/${10 * alpha}%),0 8px 10px -6px rgb(0 0 0/${10 * alpha}%);--shadow-2xl:0 25px 50px -12px rgb(0 0 0/${25 * alpha}%);`)(
            shadowAlpha,
          )

  const textVars =
    config.textScale === 1 && config.leading === 1
      ? ''
      : TEXT_SIZES.map(
          ([name, rem, lh]) =>
            `--text-${name}:calc(${rem}rem*${config.textScale});--text-${name}--line-height:calc(${lh}rem*${config.leading});`,
        ).join('')

  /* Token maps: every emitted custom property, derived from the knobs and
     then merged with per-scheme overrides. Order is kept for readability of
     the emitted CSS. */
  const lightTokens: Record<string, string> = {
    background: page,
    foreground: ink,
    card: page,
    'card-foreground': ink,
    popover: page,
    'popover-foreground': ink,
    primary: accent,
    'primary-foreground': primaryFg,
    secondary: muted,
    'secondary-foreground': ink,
    muted,
    'muted-foreground': `color-mix(in oklch,${ink} 62%,white)`,
    accent: hoverSurface,
    'accent-foreground': ink,
    destructive: 'oklch(0.577 0.245 27.325)',
    'destructive-foreground': 'oklch(0.985 0 0)',
    border: borderL,
    input: inputL,
    ring: accent,
    'chart-1': chart[0],
    'chart-2': chart[1],
    'chart-3': `color-mix(in oklch,${chart[0]} 72%,${muted})`,
    'chart-4': `color-mix(in oklch,${chart[1]} 68%,${accent})`,
    'chart-5': `color-mix(in oklch,${chart[0]} 52%,white)`,
    sidebar: translucentMenu
      ? `color-mix(in oklch,${sidebar} 82%,transparent)`
      : sidebar,
    'sidebar-foreground': invertedMenu ? nearWhite : ink,
    'sidebar-primary': accent,
    'sidebar-primary-foreground': primaryFg,
    'sidebar-accent': boldMenu
      ? accent
      : invertedMenu
        ? `color-mix(in oklch,${ink} 88%,white)`
        : muted,
    'sidebar-accent-foreground': boldMenu || invertedMenu ? primaryFg : ink,
    radius: radiusRem,
    'font-sans': fontFamily(config.font),
  }
  const darkTokens: Record<string, string> = {
    background: pageDark,
    foreground: nearWhite,
    card: `color-mix(in oklch,${pageDark} 92%,white)`,
    'card-foreground': nearWhite,
    popover: `color-mix(in oklch,${pageDark} 92%,white)`,
    'popover-foreground': nearWhite,
    primary: accentDark,
    'primary-foreground': ink,
    secondary: surfaceDark,
    'secondary-foreground': nearWhite,
    muted: surfaceDark,
    'muted-foreground': `color-mix(in oklch,${pageDark} 45%,white)`,
    accent: hoverSurfaceDark,
    'accent-foreground': nearWhite,
    destructive: 'oklch(0.704 0.191 22.216)',
    'destructive-foreground': 'oklch(0.985 0 0)',
    border: borderD,
    input: inputD,
    ring: accentDark,
    'chart-1': chart[1],
    'chart-2': chart[0],
    'chart-3': `color-mix(in oklch,${chart[1]} 72%,${pageDark})`,
    'chart-4': `color-mix(in oklch,${chart[0]} 68%,white)`,
    'chart-5': `color-mix(in oklch,${chart[1]} 52%,white)`,
    'sidebar-primary': accentDark,
    'sidebar-primary-foreground': ink,
  }
  Object.assign(lightTokens, overridesFor(config.overrides, 'light'))
  Object.assign(darkTokens, overridesFor(config.overrides, 'dark'))
  const decls = (tokens: Record<string, string>): string =>
    Object.entries(tokens)
      .map(([name, value]) => `--${name}:${value}`)
      .join(';')

  const headingPrefix = rulePrefix === '' ? '' : `${rulePrefix} `
  const theme = `${scope}{${decls(lightTokens)};${textVars}font-family:var(--font-sans);${translucentMenu ? 'backdrop-filter:blur(16px);' : ''}}${headingPrefix}h1,${headingPrefix}h2,${headingPrefix}h3,${headingPrefix}h4{font-family:${heading};font-weight:${config.headingWeight};letter-spacing:${config.tracking}em}${config.headingScale === 1 ? '' : `${headingPrefix}h1{font-size:calc(${HEADING_SIZES.h1}em*${config.headingScale})}${headingPrefix}h2{font-size:calc(${HEADING_SIZES.h2}em*${config.headingScale})}${headingPrefix}h3{font-size:calc(${HEADING_SIZES.h3}em*${config.headingScale})}${headingPrefix}h4{font-size:calc(${HEADING_SIZES.h4}em*${config.headingScale})}`}${darkScope}{${decls(darkTokens)}}`

  const style = (STYLE_RULES[config.style] ?? '').replaceAll(
    ':where(',
    `${rulePrefix} :where(`,
  )
  const strokeWidths: Readonly<Record<string, string>> = {
    lucide: '2',
    hugeicons: '1.5',
    tabler: '2',
    phosphor: '1.75',
    remixicon: '2.25',
  }
  const icons = `${scope} svg{stroke-width:${strokeWidths[config.iconLibrary] ?? '2'}}`

  const borderRule =
    config.border === 1
      ? ''
      : `${rulePrefix} ${where([...CONTROL_SLOTS, ...SELECTION_SLOTS, ...SURFACE_SLOTS])}{border-width:${config.border}px}`
  const shapeRule =
    config.controlShape === 'pill'
      ? `${rulePrefix} ${where([...SINGLE_LINE_SLOTS, ...TAB_SLOTS, ...DAY_SLOTS])}{border-radius:9999px}${rulePrefix} ${where(['textarea', ...ROW_SLOTS, ...DISCLOSURE_SLOTS])}{border-radius:calc(var(--radius) + 0.25rem)}${rulePrefix} ${where(SURFACE_SLOTS)}{border-radius:calc(var(--radius) + 0.5rem)}`
      : ''
  const motionRule =
    config.motion === 1 && config.easing === 'ease'
      ? ''
      : `${rulePrefix} *{${config.motion === 1 ? '' : `transition-duration:calc(150ms*${config.motion});animation-duration:calc(1.2s*${config.motion});`}${config.easing === 'ease' ? '' : `transition-timing-function:${SPRING_EASE};animation-timing-function:${SPRING_EASE};`}}`

  return `${theme}${shadows ? `${scope}{${shadows}}` : ''}${style}${icons}${reliefRules(config, config.outlines === 'soft' ? borderL : `color-mix(in oklch,${ink} 88%,transparent)`).replaceAll(':where(', `${rulePrefix} :where(`)}${borderRule}${shapeRule}${motionRule}`
}

/* The board scope: `.create-board-theme` on the preview element. Dark vars
   apply when a `.dark` ancestor exists and no `.light` scope interrupts, or
   when the element itself carries `dark`. */
export const presetCss = (config: Config): string =>
  buildCss(
    config,
    '.create-board-theme',
    '.dark .create-board-theme:not(.light),.create-board-theme.dark',
    '.create-board-theme',
  )

const fontImport = (font: string): string => {
  const family = font
    .split('-')
    .map(part => part[0]?.toUpperCase() + part.slice(1))
    .join('+')
  return `@import url('https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap');`
}

export const presetInstallCss = (config: Config): string => {
  const headingFont =
    config.fontHeading === 'inherit' ? config.font : config.fontHeading
  const imports = Array.from(new Set([config.font, headingFont]))
    .map(fontImport)
    .join('\n')
  const css = buildCss(config, ':root', '.dark', '')
  return `${imports}\n${css}\n`
}

export type PresetManifest = Readonly<{
  version: 1
  preset: string
  config: Config
  registryDependencies: ReadonlyArray<string>
  files: ReadonlyArray<Readonly<{ target: string; content: string }>>
}>

export const presetManifest = (config: Config): PresetManifest => ({
  version: 1,
  preset: encodePreset(config),
  config,
  registryDependencies: [
    'Potti1234/creaseui/crease-core',
    `Potti1234/creaseui/icons-${config.iconLibrary}`,
  ],
  files: [
    {
      target: '@/styles/crease-preset.css',
      content: presetInstallCss(config),
    },
    {
      target: '@/crease-preset.json',
      content: `${JSON.stringify({ version: 1, preset: encodePreset(config), ...config }, null, 2)}\n`,
    },
  ],
})

export const presetRegistryItem = (
  config: Config,
): Readonly<Record<string, unknown>> => {
  const manifest = presetManifest(config)
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: `crease-preset-${manifest.preset.toLowerCase()}`,
    type: 'registry:style',
    title: `Crease UI ${config.style} preset`,
    description: `Generated Crease UI preset ${manifest.preset}.`,
    registryDependencies: manifest.registryDependencies,
    files: manifest.files.map(file => ({
      path: file.target.split('/').at(-1),
      type: 'registry:style',
      target: file.target,
      content: file.content,
    })),
  }
}

export const presetRegistryJson = (config: Config): string =>
  `${JSON.stringify(presetRegistryItem(config), null, 2)}\n`

/** The effective CSS custom-property values for one scheme — derived tokens
 *  merged with that scheme's overrides (dark inherits light, then its own). */
export const presetTokens = (
  config: Config,
  scheme: 'light' | 'dark',
): Readonly<Record<string, string>> => {
  const css = buildCss(config, 'SCOPE', 'DARKSCOPE', '')
  const light = declsOf(css, 'SCOPE')
  return scheme === 'light' ? light : { ...light, ...declsOf(css, 'DARKSCOPE') }
}

const declsOf = (css: string, scope: string): Record<string, string> => {
  const start = css.indexOf(`${scope}{`) + scope.length + 1
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries(
    body
      .split(';')
      .filter(declaration => declaration.startsWith('--'))
      .map(declaration => {
        const at = declaration.indexOf(':')
        return [declaration.slice(2, at), declaration.slice(at + 1)]
      }),
  )
}

/* -- Color conversion + contrast for the token editor -------------------- */

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const linearToSrgb = (value: number): number =>
  value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055

const srgbToLinear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4

const oklchToLinearRgb = (
  l: number,
  c: number,
  h: number,
): readonly [number, number, number] => {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
}

const parseOklch = (
  value: string,
): Option.Option<readonly [number, number, number]> => {
  const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/u)
  return match === null
    ? Option.none()
    : Option.some([
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      ] as const)
}

const linearRgbToOklch = (
  r: number,
  g: number,
  b: number,
): readonly [number, number, number] => {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.sqrt(a * a + b2 * b2)
  const h = c < 0.0005 ? 0 : ((Math.atan2(b2, a) * 180) / Math.PI + 360) % 360
  return [l, c, h]
}

/** 'oklch(0.5 0.1 20)' → '#xxxxxx'; none for values a hex can't express. */
export const tokenToHex = (value: string): Option.Option<string> =>
  Option.map(parseOklch(value), ([l, c, h]) => {
    const [r, g, b] = oklchToLinearRgb(l, c, h)
    const channel = (v: number): string =>
      Math.round(clamp01(linearToSrgb(v)) * 255)
        .toString(16)
        .padStart(2, '0')
    return `#${channel(r)}${channel(g)}${channel(b)}`
  })

/** '#rrggbb' → 'oklch(l c h)'. */
export const hexToToken = (hex: string): Option.Option<string> => {
  const match = hex.match(/^#?([0-9a-f]{6})$/iu)
  if (match === null) return Option.none()
  const channel = (at: number): number =>
    srgbToLinear(parseInt(match[1]!.slice(at, at + 2), 16) / 255)
  const [l, c, h] = linearRgbToOklch(channel(0), channel(2), channel(4))
  return Option.some(
    `oklch(${Number(l.toFixed(4))} ${Number(c.toFixed(4))} ${Number(h.toFixed(2))})`,
  )
}

/** WCAG contrast between two oklch literals; none when either can't parse. */
export const contrastRatio = (
  foreground: string,
  background: string,
): Option.Option<number> =>
  Option.flatMap(parseOklch(foreground), fg =>
    Option.map(parseOklch(background), bg => {
      const luminance = ([l, c, h]: readonly [number, number, number]) => {
        const [r, g, b] = oklchToLinearRgb(l, c, h)
        return (
          0.2126 * Math.max(0, r) +
          0.7152 * Math.max(0, g) +
          0.0722 * Math.max(0, b)
        )
      }
      const [fgLum, bgLum] = [luminance(fg), luminance(bg)]
      const hi = Math.max(fgLum, bgLum)
      const lo = Math.min(fgLum, bgLum)
      return (hi + 0.05) / (lo + 0.05)
    }),
  )

/* Structural validity gate for hand-typed token values: full-length hex or a
   function-shaped color expression. Mid-typing fragments ('#f0', 'oklch(0.5')
   fail, so they never reach a --token declaration as invalid CSS. */
export const validTokenValue = (value: string): boolean =>
  /* No alpha-bearing hex: a dropped keystroke could turn '#ff0000' into the
     valid-but-transparent '#0000' and wash out the preview. */
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu.test(value) ||
  /^[a-z][a-z-]*\((?:[^()]|\([^()]*\))*\)$/iu.test(value)

/** 'oklch(l c h)' literal → [l, c, h]; none for anything else. */
export const tokenOklch = parseOklch

/* The derived colors the create page's color pickers display and write back:
   accent, light/dark page surface, and the chart seed color. */
export const accentToken = (config: Config): string =>
  oklch(config.lightness, config.chroma, config.hue)

export const surfaceToken = (
  config: Config,
  scheme: 'light' | 'dark',
): string =>
  oklch(
    scheme === 'light' ? config.surfaceLightness : config.surfaceLightnessDark,
    config.surfaceSaturation,
    baseHue(config),
  )

export const chartToken = (config: Config): string =>
  (ACCENTS[config.chartColor] ?? ACCENTS.neutral!)[0]

const hueDistance = (a: number, b: number): number => {
  const delta = Math.abs(a - b) % 360
  return Math.min(delta, 360 - delta)
}

/** Nearest neutral base for a picked surface hue. Near-achromatic picks map to
    'neutral' (their hue is noise); 'accent' is never chosen — a picked hue
    means that hue, not "follow the accent". */
export const snapBase = (hue: number, chroma: number): string => {
  if (chroma < 0.008) return 'neutral'
  let best = 'stone'
  let distance = 360
  for (const [name, entry] of Object.entries(bases)) {
    if (name === 'neutral') continue
    const each = hueDistance(hue, entry.h)
    if (each < distance) {
      distance = each
      best = name
    }
  }
  return best
}

/** Nearest chart color family for a picked hue; near-achromatic picks →
    'neutral' (hue is meaningless there). */
export const snapChartColor = (hue: number, chroma: number): string => {
  if (chroma < 0.03) return 'neutral'
  let best = 'neutral'
  let distance = 360
  for (const name of Object.keys(ACCENTS)) {
    const hueOf = Option.getOrElse(
      Option.map(parseOklch(ACCENTS[name]![0]), ([, , h]) => h),
      () => 0,
    )
    const each = hueDistance(hue, hueOf)
    if (each < distance) {
      distance = each
      best = name
    }
  }
  return best
}
