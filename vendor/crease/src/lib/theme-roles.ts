/* Canonical renderer-neutral semantic roles. Adapters (StyleX defineVars, Pleat
   Theme.make, scoped preset bindings) are generated from or checked against this. */

export const THEME_SCHEMA_VERSION = 1 as const

export const themeRoleGroups = {
  tokens: {
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    controlPlaceholder: 'color-mix(in oklab, currentColor 50%, transparent)',
    card: 'var(--card)',
    cardForeground: 'var(--card-foreground)',
    primary: 'var(--primary)',
    primaryForeground: 'var(--primary-foreground)',
    secondary: 'var(--secondary)',
    secondaryForeground: 'var(--secondary-foreground)',
    muted: 'var(--muted)',
    mutedForeground: 'var(--muted-foreground)',
    accent: 'var(--accent)',
    accentForeground: 'var(--accent-foreground)',
    destructive: 'var(--destructive)',
    alertInfo: 'var(--primary)',
    alertSuccess: 'var(--success)',
    alertWarning: 'var(--warning)',
    destructiveForeground: 'oklch(0.985 0 0)',
    destructiveHover:
      'color-mix(in oklab, var(--destructive) 90%, transparent)',
    destructiveSurface: 'var(--stylex-destructive-surface)',
    softDestructiveSurface: 'var(--stylex-soft-destructive-surface)',
    softDestructiveHover: 'var(--stylex-soft-destructive-hover)',
    mutedHover: 'var(--stylex-muted-hover)',
    badgeDestructiveSurface: 'var(--stylex-soft-destructive-surface)',
    badgeDestructiveHover:
      'color-mix(in oklab, var(--destructive) 20%, transparent)',
    badgeMutedHover: 'var(--stylex-muted-hover)',
    statusPlateInk: 'oklch(0.985 0 0)',
    statusWarningInk: 'oklch(0.205 0 0)',
    badgePrimaryHover: 'color-mix(in oklab, var(--primary) 80%, transparent)',
    badgeSecondaryHover:
      'color-mix(in oklab, var(--secondary) 80%, transparent)',
    buttonPrimaryHover: 'color-mix(in oklab, var(--primary) 80%, transparent)',
    buttonSecondaryHover:
      'color-mix(in oklab, var(--secondary), var(--foreground) 5%)',
    inputSurface: 'var(--stylex-input-surface)',
    outlineSurface: 'var(--stylex-outline-surface)',
    outlineHover: 'var(--stylex-outline-hover)',
    primaryHover: 'color-mix(in oklab, var(--primary) 90%, transparent)',
    secondaryHover: 'color-mix(in oklab, var(--secondary) 80%, transparent)',
    border: 'var(--color-border)',
    input: 'var(--input)',
    ring: 'var(--ring)',
    radius: 'var(--radius)',
    controlRadius: 'calc(var(--radius) - 2px)',
    cardRadius: 'calc(var(--radius) + 4px)',
    focusRingShadow:
      '0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)',
    focusRingOffsetShadow: '0 0 0 2px var(--background), 0 0 0 4px var(--ring)',
    destructiveRingShadow:
      '0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)',
    shadowSm: '0 1px 2px rgb(0 0 0 / 0.05)',
    shadowCard: '0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06)',
    shadowNone: 'none',
    transparent: 'transparent',
    backdrop: 'rgb(0 0 0 / 0.5)',
    drawerBackdrop: 'rgb(0 0 0 / 0.1)',
  },
  foundationTokens: {
    muted: 'var(--muted)',
    popover: 'var(--popover)',
    popoverForeground: 'var(--popover-foreground)',
    destructiveSoft: 'color-mix(in oklab, var(--destructive) 10%, transparent)',
    destructiveMuted:
      'color-mix(in oklab, var(--destructive) 80%, transparent)',
    primarySoft: 'color-mix(in oklab, var(--primary) 10%, transparent)',
    foregroundMuted: 'color-mix(in oklab, var(--foreground) 60%, transparent)',
    foregroundSoft: 'color-mix(in oklab, var(--foreground) 10%, transparent)',
    ringSoft: 'color-mix(in oklab, var(--ring) 50%, transparent)',
    destructiveRingSoft:
      'color-mix(in oklab, var(--destructive) 20%, transparent)',
    inputDark: 'color-mix(in oklab, var(--input) 30%, transparent)',
    mutedSoft: 'color-mix(in oklab, var(--muted) 50%, transparent)',
    shadowXs: '0 1px 2px rgb(0 0 0 / 0.05)',
    shadowNone: 'none',
    checkboxRadius: '4px',
    radiusSm: 'calc(var(--radius) - 4px)',
    radiusMd: 'calc(var(--radius) - 2px)',
    radiusLg: 'var(--radius)',
    radiusXl: 'calc(var(--radius) + 4px)',
    radiusBase: '4px',
    radiusNested: 'calc(var(--radius) - 5px)',
    radius2xl: '1rem',
    radiusMdCap8: 'min(calc(var(--radius) - 2px), 8px)',
    radiusMdCap10: 'min(calc(var(--radius) - 2px), 10px)',
    radiusFull: '9999px',
    transparent: 'transparent',
    leadingNormal: '1.5',
    white: 'rgb(255 255 255)',
    shadowSm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    shadowMd:
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    shadowLg:
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    shadowXl:
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    ringShadow1: '0 0 0 1px color-mix(in oklab, var(--ring) 50%, transparent)',
    cardRing3: '0 0 0 3px var(--card)',
    ringShadow4: '0 0 0 4px color-mix(in oklab, var(--ring) 50%, transparent)',
    overlay40: 'rgb(0 0 0 / 0.4)',
    overlay50: 'rgb(0 0 0 / 0.5)',
    mutedForeground50:
      'color-mix(in oklab, var(--muted-foreground) 50%, transparent)',
    mutedForeground60:
      'color-mix(in oklab, var(--muted-foreground) 60%, transparent)',
    foregroundFaint: 'color-mix(in oklab, var(--foreground) 5%, transparent)',
    primaryFaint: 'color-mix(in oklab, var(--primary) 5%, transparent)',
    primarySoft20: 'color-mix(in oklab, var(--primary) 20%, transparent)',
    destructiveFaint: 'color-mix(in oklab, var(--destructive) 5%, transparent)',
    destructiveEdge40:
      'color-mix(in oklab, var(--destructive) 40%, transparent)',
    avatarBadgeSuccess: 'oklch(0.627 0.194 149.214)',
    nativeOptionSurface: 'Canvas',
    nativeOptionInk: 'CanvasText',
  },
  complexTokens: {
    sidebar: 'var(--sidebar)',
    sidebarForeground: 'var(--sidebar-foreground)',
    sidebarPrimary: 'var(--sidebar-primary)',
    sidebarPrimaryForeground: 'var(--sidebar-primary-foreground)',
    sidebarAccent: 'var(--sidebar-accent)',
    sidebarAccentForeground: 'var(--sidebar-accent-foreground)',
    sidebarBorder: 'var(--sidebar-border)',
    sidebarRing: 'var(--sidebar-ring)',
    chart1: 'var(--chart-1)',
    chart2: 'var(--chart-2)',
    chart3: 'var(--chart-3)',
    chart4: 'var(--chart-4)',
    chart5: 'var(--chart-5)',
    mutedSurface: 'color-mix(in oklab, var(--muted) 50%, transparent)',
    opaqueMutedSurface:
      'color-mix(in oklab, var(--muted) 50%, var(--background))',
    accentSurface: 'color-mix(in oklab, var(--accent) 50%, transparent)',
    opaqueAccentSurface:
      'color-mix(in oklab, var(--accent) 50%, var(--background))',
    focusOutline: '1px solid var(--ring)',
    resizeShadow: '0 0 0 1px var(--ring)',
    smallRadius: '2px',
    overlaySurface: 'color-mix(in oklab, var(--foreground) 50%, transparent)',
    transparent: 'transparent',
    sidebarEdgeRing: '0 0 0 1px var(--sidebar-border)',
    sidebarAccentRing: '0 0 0 1px var(--sidebar-accent)',
    sidebarForegroundDim:
      'color-mix(in oklab, var(--sidebar-foreground) 70%, transparent)',
    chart1Soft10: 'color-mix(in oklab, var(--chart-1) 10%, transparent)',
    chart2Soft10: 'color-mix(in oklab, var(--chart-2) 10%, transparent)',
    chart3Soft10: 'color-mix(in oklab, var(--chart-3) 10%, transparent)',
    chart2Soft15: 'color-mix(in oklab, var(--chart-2) 15%, transparent)',
    chart3Soft15: 'color-mix(in oklab, var(--chart-3) 15%, transparent)',
    chart4Soft15: 'color-mix(in oklab, var(--chart-4) 15%, transparent)',
    chart2Soft25: 'color-mix(in oklab, var(--chart-2) 25%, transparent)',
    destructiveSoft15:
      'color-mix(in oklab, var(--destructive) 15%, transparent)',
    chart2Soft20: 'color-mix(in oklab, var(--chart-2) 20%, transparent)',
    chart4Soft20: 'color-mix(in oklab, var(--chart-4) 20%, transparent)',
    destructiveSoft20:
      'color-mix(in oklab, var(--destructive) 20%, transparent)',
    chart4Soft5: 'color-mix(in srgb, var(--chart-4) 5%, transparent)',
    successSoft20: 'color-mix(in oklab, var(--success) 20%, transparent)',
    warningSoft20: 'color-mix(in oklab, var(--warning) 20%, transparent)',
    warningSoft5: 'color-mix(in srgb, var(--warning) 5%, transparent)',
    destructiveSoft6: 'color-mix(in srgb, var(--destructive) 6%, transparent)',
  },
} as const

export type ThemeRoleGroup = keyof typeof themeRoleGroups
export type ThemeRole<G extends ThemeRoleGroup> =
  keyof (typeof themeRoleGroups)[G] & string

/** Rebinds every role of `group` at a nested scope so derived `var()`
 *  expressions (hover mixes, soft surfaces, radii) resolve against that
 *  scope's palette instead of inheriting values computed at `:root`. */
export const scopedRoleDeclarations = <G extends ThemeRoleGroup>(
  group: G,
  variableFor: (role: ThemeRole<G>) => string,
): string =>
  Object.entries(themeRoleGroups[group])
    .map(([role, value]) => `${variableFor(role as ThemeRole<G>)}:${value}`)
    .join(';')

/** Palette inputs every theme definition must resolve (shadcn names). */
export const BASE_THEME_VARIABLES = [
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
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'radius',
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
  'sidebar-border',
  'sidebar-ring',
] as const
export type BaseThemeVariable = (typeof BASE_THEME_VARIABLES)[number]

/** Status roles: independent of the chart palette, optional in patches. */
export const STATUS_THEME_VARIABLES = ['success', 'warning'] as const

const LENGTH_VARIABLES: ReadonlySet<string> = new Set(['radius'])

export type ThemeDefinition = Readonly<{
  schemaVersion: number
  values: Readonly<Record<string, string>>
}>

const REFERENCE = /var\(--([a-z0-9-]+)/g

/** CSS named colors plus `transparent` and `currentColor`. */
const COLOR_KEYWORDS: ReadonlySet<string> = new Set(
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor'.split(
    ' ',
  ),
)
const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i
const LENGTH_UNITS: ReadonlySet<string> = new Set(
  'px rem em ch ex vw vh vmin vmax svh dvh lh'.split(' '),
)
const ANGLE_UNITS: ReadonlySet<string> = new Set(['deg', 'rad', 'grad', 'turn'])
const RECTANGULAR_SPACES: ReadonlySet<string> = new Set(
  'srgb srgb-linear display-p3 a98-rgb prophoto-rgb rec2020 lab oklab xyz xyz-d50 xyz-d65'.split(
    ' ',
  ),
)
const POLAR_SPACES: ReadonlySet<string> = new Set([
  'hsl',
  'hwb',
  'lch',
  'oklch',
])
const PREDEFINED_SPACES: ReadonlySet<string> = new Set(
  'srgb srgb-linear display-p3 a98-rgb prophoto-rgb rec2020 xyz xyz-d50 xyz-d65'.split(
    ' ',
  ),
)
const HUE_METHODS: ReadonlySet<string> = new Set([
  'shorter',
  'longer',
  'increasing',
  'decreasing',
])

type ValueKind = 'color' | 'length'
type Token =
  | Readonly<{ type: 'number'; value: number; unit: string; text: string }>
  | Readonly<{ type: 'ident'; text: string }>
  | Readonly<{ type: 'hash'; text: string }>
  | Readonly<{ type: 'delim'; text: string; spaced: boolean }>
  | Readonly<{
      type: 'function'
      name: string
      body: ReadonlyArray<Token>
      text: string
    }>
/** `var(--role)` references found while checking, with the kind expected. */
type Reference = Readonly<{ name: string; kind: ValueKind }>

class ValueProblem extends Error {}
const fail = (message: string): never => {
  throw new ValueProblem(message)
}

const NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i
const IDENT = /^-{0,2}[a-z_][a-z0-9_-]*/i

/** Tokens of a CSS component value; functions keep their body tokens. */
const tokenize = (input: string): ReadonlyArray<Token> => {
  let index = 0
  const read = (nested: boolean): Array<Token> => {
    const tokens: Array<Token> = []
    while (index < input.length) {
      const character = input.charAt(index)
      const rest = input.slice(index)
      if (/\s/.test(character)) {
        index += 1
        continue
      }
      if (character === ')') {
        if (!nested) fail(`malformed ${input} (unbalanced parentheses)`)
        index += 1
        return tokens
      }
      const previous = tokens.at(-1)
      const signed =
        (character === '+' || character === '-') &&
        NUMBER.test(input.slice(index + 1)) &&
        (previous === undefined || previous.type === 'delim')
      const number = NUMBER.exec(signed ? input.slice(index + 1) : rest)
      if (number !== null && (signed || /[\d.]/.test(character))) {
        const start = index
        index += (signed ? 1 : 0) + number[0].length
        const unit = /^(?:%|[a-z]+)/i.exec(input.slice(index))?.[0] ?? ''
        index += unit.length
        tokens.push({
          type: 'number',
          value: Number(input.slice(start, index - unit.length)),
          unit: unit.toLowerCase(),
          text: input.slice(start, index),
        })
        continue
      }
      const ident = IDENT.exec(rest)
      if (ident !== null || character === '(') {
        const name = ident?.[0] ?? ''
        index += name.length
        if (input.charAt(index) === '(') {
          const start = index - name.length
          index += 1
          const body = read(true)
          tokens.push({
            type: 'function',
            name: name.toLowerCase(),
            body,
            text: input.slice(start, index),
          })
        } else tokens.push({ type: 'ident', text: name })
        continue
      }
      if (character === '#') {
        const hash = /^#[\da-z]*/i.exec(rest)?.[0] ?? '#'
        index += hash.length
        tokens.push({ type: 'hash', text: hash })
        continue
      }
      if (',/*+-'.includes(character)) {
        const spaced =
          /\s/.test(input.charAt(index - 1)) &&
          /\s/.test(input.charAt(index + 1))
        index += 1
        tokens.push({ type: 'delim', text: character, spaced })
        continue
      }
      fail(`unexpected ${JSON.stringify(character)} in ${input}`)
    }
    if (nested) fail(`malformed ${input} (unbalanced parentheses)`)
    return tokens
  }
  return read(false)
}

const textOf = (tokens: ReadonlyArray<Token>): string =>
  tokens.map(token => token.text).join(' ')

const splitBy = (
  tokens: ReadonlyArray<Token>,
  delimiter: string,
): ReadonlyArray<ReadonlyArray<Token>> => {
  const parts: Array<Array<Token>> = [[]]
  for (const token of tokens)
    if (token.type === 'delim' && token.text === delimiter) parts.push([])
    else parts.at(-1)?.push(token)
  return parts
}

type MathType = 'number' | 'length' | 'percent' | 'angle'
const MATH_FUNCTIONS: ReadonlySet<string> = new Set([
  '',
  'calc',
  'min',
  'max',
  'clamp',
])

/** Dimension of a calc()/min()/max()/clamp() expression; throws when the
 *  operands cannot combine. `percentAs` folds percentages into lengths. */
const mathType = (
  tokens: ReadonlyArray<Token>,
  context: Readonly<{
    percentAs: MathType
    references: Array<Reference> | null
  }>,
): MathType => {
  if (tokens.length === 0) fail('an empty math expression')
  const operand = (token: Token): MathType => {
    if (token.type === 'number') {
      if (token.unit === '') return 'number'
      if (token.unit === '%') return context.percentAs
      if (LENGTH_UNITS.has(token.unit)) return 'length'
      if (ANGLE_UNITS.has(token.unit)) return 'angle'
      return fail(`unknown unit in ${token.text}`)
    }
    if (token.type === 'function' && MATH_FUNCTIONS.has(token.name)) {
      if (token.name === '' || token.name === 'calc')
        return mathType(token.body, context)
      const args = splitBy(token.body, ',')
      if (token.name === 'clamp' && args.length !== 3)
        fail(`clamp() needs three arguments in ${token.text}`)
      const types = args.map(arg => mathType(arg, context))
      const first = types[0] ?? fail(`empty ${token.text}`)
      if (types.some(type => type !== first))
        fail(`${token.text} mixes incompatible arguments`)
      return first
    }
    if (token.type === 'function' && token.name === 'var') {
      if (context.references === null)
        fail(`var() inside ${textOf(tokens)} cannot be resolved here`)
      variable(token, 'length', context.references ?? [])
      return 'length'
    }
    return fail(
      `${token.text} is not a ${context.percentAs === 'length' ? 'length' : 'number'}`,
    )
  }
  const product = (start: number): [MathType, number] => {
    let type = operand(tokens[start] ?? fail(`incomplete ${textOf(tokens)}`))
    let index = start + 1
    for (;;) {
      const next = tokens[index]
      if (next?.type !== 'delim' || (next.text !== '*' && next.text !== '/'))
        return [type, index]
      const right = operand(
        tokens[index + 1] ?? fail(`incomplete ${textOf(tokens)}`),
      )
      if (next.text === '/') {
        if (right !== 'number')
          fail(`cannot divide by a ${right} in ${textOf(tokens)}`)
      } else if (type === 'number') type = right
      else if (right !== 'number')
        fail(`cannot multiply a ${type} by a ${right} in ${textOf(tokens)}`)
      index += 2
    }
  }
  let [type, index] = product(0)
  while (index < tokens.length) {
    const next = tokens[index]
    if (next?.type !== 'delim' || (next.text !== '+' && next.text !== '-'))
      fail(`unexpected ${next?.text ?? ''} in ${textOf(tokens)}`)
    if (next?.type === 'delim' && !next.spaced)
      fail(`${next.text} needs whitespace on both sides in ${textOf(tokens)}`)
    const [right, after] = product(index + 1)
    if (right !== type)
      fail(`cannot add a ${type} and a ${right} in ${textOf(tokens)}`)
    index = after
  }
  return type
}

/** Records a `var(--role[, fallback])` reference and checks the fallback. */
const variable = (
  token: Extract<Token, { type: 'function' }>,
  kind: ValueKind,
  references: Array<Reference>,
): void => {
  const [name, ...fallback] = splitBy(token.body, ',')
  const target = name?.[0]
  if (
    name?.length !== 1 ||
    target?.type !== 'ident' ||
    !target.text.startsWith('--')
  )
    fail(`malformed ${token.text}`)
  references.push({ name: (target?.text ?? '').slice(2), kind })
  if (fallback.length > 0) {
    const value = fallback.flat()
    if (kind === 'color') color(value, references)
    else length(value, references)
  }
}

type Channel = ReadonlyArray<MathType | 'none'>
const HUE: Channel = ['number', 'angle', 'none']
const AMOUNT: Channel = ['number', 'percent', 'none']
const CHANNELS: Readonly<Record<string, ReadonlyArray<Channel>>> = {
  rgb: [AMOUNT, AMOUNT, AMOUNT],
  rgba: [AMOUNT, AMOUNT, AMOUNT],
  hsl: [HUE, AMOUNT, AMOUNT],
  hsla: [HUE, AMOUNT, AMOUNT],
  hwb: [HUE, AMOUNT, AMOUNT],
  lab: [AMOUNT, AMOUNT, AMOUNT],
  oklab: [AMOUNT, AMOUNT, AMOUNT],
  lch: [AMOUNT, AMOUNT, HUE],
  oklch: [AMOUNT, AMOUNT, HUE],
}

const channel = (
  token: Token | undefined,
  allowed: Channel,
  source: string,
): void => {
  if (token === undefined) return fail(`missing channel in ${source}`)
  if (token.type === 'ident' && token.text.toLowerCase() === 'none') {
    if (allowed.includes('none')) return
    return fail(`none is not allowed in ${source}`)
  }
  const type = mathType([token], { percentAs: 'percent', references: null })
  if (!allowed.includes(type))
    fail(`${token.text} is not a valid channel in ${source}`)
}

/** Channels of a color function: modern `a b c [/ alpha]` or legacy commas. */
const channels = (
  token: Extract<Token, { type: 'function' }>,
  spec: ReadonlyArray<Channel>,
): void => {
  const first = token.body[0]
  if (first?.type === 'ident' && first.text.toLowerCase() === 'from')
    fail(`relative color syntax in ${token.text} is not supported`)
  const legacy = splitBy(token.body, ',')
  if (legacy.length > 1) {
    if (!['rgb', 'rgba', 'hsl', 'hsla'].includes(token.name))
      fail(`${token.name}() does not accept commas in ${token.text}`)
    if (legacy.length !== 3 && legacy.length !== 4)
      fail(`${token.name}() needs 3 or 4 channels in ${token.text}`)
    legacy.forEach((part, index) => {
      if (part.length !== 1) fail(`malformed channel in ${token.text}`)
      channel(part[0], spec[index] ?? AMOUNT, token.text)
    })
    const kinds = legacy
      .slice(0, 3)
      .map(([part]) =>
        part?.type === 'number'
          ? part.unit === '%'
            ? 'percent'
            : part.unit
          : part?.type,
      )
    if (kinds.includes('ident'))
      fail(`none is not allowed in legacy ${token.name}() in ${token.text}`)
    if (
      token.name.startsWith('rgb') &&
      kinds.includes('percent') &&
      kinds.includes('')
    )
      fail(
        `legacy ${token.name}() cannot mix numbers and percentages in ${token.text}`,
      )
    if (
      token.name.startsWith('hsl') &&
      (kinds[1] !== 'percent' || kinds[2] !== 'percent')
    )
      fail(
        `legacy ${token.name}() needs percentage saturation and lightness in ${token.text}`,
      )
    return
  }
  const [values = [], alpha, ...extra] = splitBy(token.body, '/')
  if (extra.length > 0) fail(`malformed ${token.text}`)
  if (values.length !== spec.length)
    fail(`${token.name}() needs ${spec.length} channels in ${token.text}`)
  values.forEach((value, index) =>
    channel(value, spec[index] ?? AMOUNT, token.text),
  )
  if (alpha !== undefined) {
    if (alpha.length !== 1) fail(`malformed alpha in ${token.text}`)
    channel(alpha[0], AMOUNT, token.text)
  }
}

const color = (
  tokens: ReadonlyArray<Token>,
  references: Array<Reference>,
): void => {
  const [token, ...extra] = tokens
  if (token === undefined) return fail('an empty value')
  if (extra.length > 0) return fail(textOf(tokens))
  if (token.type === 'ident')
    return COLOR_KEYWORDS.has(token.text.toLowerCase())
      ? undefined
      : fail(token.text)
  if (token.type === 'hash')
    return HEX_COLOR.test(token.text) ? undefined : fail(token.text)
  if (token.type !== 'function') return fail(token.text)
  if (token.body.length === 0)
    return fail(`empty ${token.name}() in ${token.text}`)
  if (token.name === 'var') return variable(token, 'color', references)
  const spec = CHANNELS[token.name]
  if (spec !== undefined) return channels(token, spec)
  if (token.name === 'color') {
    const [space, ...rest] = token.body
    if (
      space?.type !== 'ident' ||
      !PREDEFINED_SPACES.has(space.text.toLowerCase())
    )
      fail(`unknown color space in ${token.text}`)
    return channels({ ...token, body: rest }, [AMOUNT, AMOUNT, AMOUNT])
  }
  if (token.name === 'light-dark') {
    const args = splitBy(token.body, ',')
    if (args.length !== 2)
      fail(`light-dark() needs two colors in ${token.text}`)
    return args.forEach(arg => color(arg, references))
  }
  if (token.name === 'color-mix') {
    const [method = [], ...mixed] = splitBy(token.body, ',')
    const [keyword, space, hueMethod, hue, ...extraMethod] = method
    const spaceName = space?.type === 'ident' ? space.text.toLowerCase() : ''
    if (keyword?.type !== 'ident' || keyword.text.toLowerCase() !== 'in')
      fail(`color-mix() must start with "in <color space>" in ${token.text}`)
    if (!RECTANGULAR_SPACES.has(spaceName) && !POLAR_SPACES.has(spaceName))
      fail(`unknown interpolation color space in ${token.text}`)
    if (hueMethod !== undefined) {
      const valid =
        POLAR_SPACES.has(spaceName) &&
        hueMethod.type === 'ident' &&
        HUE_METHODS.has(hueMethod.text.toLowerCase()) &&
        hue?.type === 'ident' &&
        hue.text.toLowerCase() === 'hue' &&
        extraMethod.length === 0
      if (!valid) fail(`invalid hue interpolation method in ${token.text}`)
    }
    if (mixed.length !== 2)
      fail(`color-mix() needs two colors in ${token.text}`)
    const weights: Array<number> = []
    for (const part of mixed) {
      const percentages = part.filter(
        item => item.type === 'number' && item.unit === '%',
      )
      if (percentages.length > 1)
        fail(`more than one percentage in ${token.text}`)
      for (const percentage of percentages)
        if (
          percentage.type === 'number' &&
          (percentage.value < 0 || percentage.value > 100)
        )
          fail(`percentage out of range in ${token.text}`)
      for (const percentage of percentages)
        if (percentage.type === 'number') weights.push(percentage.value)
      color(
        part.filter(item => !percentages.includes(item)),
        references,
      )
    }
    if (weights.length === 2 && weights[0] === 0 && weights[1] === 0)
      fail(`color-mix() weights cannot both be 0% in ${token.text}`)
    return
  }
  return fail(`unsupported function ${token.name}() in ${token.text}`)
}

const length = (
  tokens: ReadonlyArray<Token>,
  references: Array<Reference>,
): void => {
  const [token, ...extra] = tokens
  if (token === undefined) return fail('an empty value')
  if (extra.length > 0) return fail(textOf(tokens))
  if (token.type === 'number') {
    if (token.unit === '' && token.value === 0) return
    if (token.unit === '%' || LENGTH_UNITS.has(token.unit)) return
    return fail(token.text)
  }
  if (token.type === 'function' && token.name === 'var')
    return variable(token, 'length', references)
  if (
    token.type === 'function' &&
    MATH_FUNCTIONS.has(token.name) &&
    token.name !== ''
  ) {
    if (mathType([token], { percentAs: 'length', references }) !== 'length')
      fail(`${token.text} does not resolve to a length`)
    return
  }
  if (token.type === 'function')
    return fail(`unsupported function ${token.name}() in ${token.text}`)
  return fail(token.text)
}

/** Why `value` is not a valid `kind` value, or null when it is. `var()`
 *  references are collected for kind and existence checks. */
const valueProblem = (
  value: string,
  kind: ValueKind,
  references: Array<Reference>,
): string | null => {
  if (value.trim() === '') return 'an empty value'
  try {
    const tokens = tokenize(value)
    if (kind === 'color') color(tokens, references)
    else length(tokens, references)
    return null
  } catch (error) {
    if (error instanceof ValueProblem) return error.message
    throw error
  }
}

const kindOf = (name: string): ValueKind =>
  LENGTH_VARIABLES.has(name) ? 'length' : 'color'

/** Errors for a theme definition: schema version, unknown or missing
 *  roles, value kinds and alias cycles. Empty when valid. */
export const validateThemeDefinition = (
  definition: ThemeDefinition,
  { partial = false }: { partial?: boolean } = {},
): ReadonlyArray<string> => {
  const errors: Array<string> = []
  if (definition.schemaVersion !== THEME_SCHEMA_VERSION)
    errors.push(`unsupported schemaVersion ${definition.schemaVersion}`)
  const known = new Set<string>([
    ...BASE_THEME_VARIABLES,
    ...STATUS_THEME_VARIABLES,
  ])
  for (const [name, value] of Object.entries(definition.values)) {
    if (!known.has(name)) errors.push(`unknown role --${name}`)
    if (typeof value !== 'string') {
      errors.push(`--${name} must be a string value`)
      continue
    }
    const kind = kindOf(name)
    const references: Array<Reference> = []
    const problem = valueProblem(value, kind, references)
    if (problem !== null)
      errors.push(`--${name} expects a ${kind}, got ${problem}`)
    for (const reference of references)
      if (!(reference.name in definition.values) && !known.has(reference.name))
        errors.push(`--${name} references unresolved alias --${reference.name}`)
      else if (kindOf(reference.name) !== reference.kind)
        errors.push(
          `--${name} uses --${reference.name} (a ${kindOf(reference.name)}) where a ${reference.kind} is expected`,
        )
  }
  if (!partial)
    for (const name of BASE_THEME_VARIABLES)
      if (!(name in definition.values)) errors.push(`missing role --${name}`)
  const visiting = new Set<string>()
  const done = new Set<string>()
  const visit = (name: string, path: ReadonlyArray<string>): void => {
    if (done.has(name)) return
    if (visiting.has(name)) {
      errors.push(
        `alias cycle ${[...path, name].map(n => `--${n}`).join(' -> ')}`,
      )
      return
    }
    visiting.add(name)
    const raw = definition.values[name]
    for (const [, target] of (typeof raw === 'string' ? raw : '').matchAll(
      REFERENCE,
    ))
      if (target !== undefined && target in definition.values)
        visit(target, [...path, name])
    visiting.delete(name)
    done.add(name)
  }
  for (const name of Object.keys(definition.values)) visit(name, [])
  return errors
}
