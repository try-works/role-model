/* Deterministic palette evaluation for theme validation: resolves the CSS
   color syntax Crease themes use (oklch/oklab, color-mix, var() aliases,
   keywords), composites translucent paints and computes WCAG 2 contrast.
   Unsupported syntax resolves to `undefined` and is reported as unresolved
   rather than treated as passing. */

export type Rgba = Readonly<{ r: number; g: number; b: number; a: number }>
type Oklab = Readonly<{ l: number; a: number; b: number; alpha: number }>

export type ThemeValues = Readonly<Record<string, string>>

const splitTopLevel = (input: string): ReadonlyArray<string> => {
  const parts: Array<string> = []
  let depth = 0
  let current = ''
  for (const char of input) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else current += char
  }
  parts.push(current.trim())
  return parts
}

const number = (token: string, percentScale = 1): number =>
  token.endsWith('%')
    ? (Number.parseFloat(token) / 100) * percentScale
    : Number.parseFloat(token)

const functionArgs = (value: string, name: string): string | undefined => {
  const prefix = `${name}(`
  return value.startsWith(prefix) && value.endsWith(')')
    ? value.slice(prefix.length, -1).trim()
    : undefined
}

const channels = (body: string): [ReadonlyArray<string>, number] => {
  const [color = '', alpha] = body.split('/').map(part => part.trim())
  return [color.split(/\s+/), alpha === undefined ? 1 : number(alpha)]
}

const toOklab = (
  value: string,
  vars: ThemeValues,
  seen: ReadonlySet<string> = new Set(),
): Oklab | undefined => {
  const text = value.trim().replace(/\s+/g, ' ')
  const reference = functionArgs(text, 'var')
  if (reference !== undefined) {
    const [name = '', fallback] = splitTopLevel(reference)
    const key = name.replace(/^--/, '')
    if (seen.has(key)) return undefined
    const bound = vars[key]
    if (bound !== undefined)
      return toOklab(bound, vars, new Set([...seen, key]))
    return fallback === undefined ? undefined : toOklab(fallback, vars, seen)
  }
  if (text === 'white') return { l: 1, a: 0, b: 0, alpha: 1 }
  if (text === 'black') return { l: 0, a: 0, b: 0, alpha: 1 }
  if (text === 'transparent') return { l: 0, a: 0, b: 0, alpha: 0 }
  const oklch = functionArgs(text, 'oklch')
  if (oklch !== undefined) {
    const [[l = '', c = '', h = ''], alpha] = channels(oklch)
    const hue = (Number.parseFloat(h) * Math.PI) / 180
    const chroma = number(c, 0.4)
    return {
      l: number(l),
      a: chroma * Math.cos(hue),
      b: chroma * Math.sin(hue),
      alpha,
    }
  }
  const oklab = functionArgs(text, 'oklab')
  if (oklab !== undefined) {
    const [[l = '', a = '', b = ''], alpha] = channels(oklab)
    return { l: number(l), a: number(a, 0.4), b: number(b, 0.4), alpha }
  }
  const mix = functionArgs(text, 'color-mix')
  if (mix !== undefined) {
    const [space = '', first = '', second = ''] = splitTopLevel(mix)
    if (!/^in (oklab|oklch|srgb)$/.test(space)) return undefined
    const stop = (part: string): [string, number | undefined] => {
      const match = /^(.*?)\s+(-?[\d.]+%)$/.exec(part)
      return match ? [match[1]!, number(match[2]!)] : [part, undefined]
    }
    const [colorA, weightA] = stop(first)
    const [colorB, weightB] = stop(second)
    const left = toOklab(colorA, vars, seen)
    const right = toOklab(colorB, vars, seen)
    if (!left || !right) return undefined
    const p = weightA ?? (weightB === undefined ? 0.5 : 1 - weightB)
    const q = weightB ?? 1 - p
    const total = p + q
    const pa = p / total
    const qa = q / total
    const alpha = left.alpha * pa + right.alpha * qa
    const premultiplied = (channel: 'l' | 'a' | 'b'): number =>
      alpha === 0
        ? 0
        : (left[channel] * left.alpha * pa +
            right[channel] * right.alpha * qa) /
          alpha
    return {
      l: premultiplied('l'),
      a: premultiplied('a'),
      b: premultiplied('b'),
      alpha: alpha * Math.min(1, total),
    }
  }
  return undefined
}

const gamma = (linear: number): number => {
  const clamped = Math.min(1, Math.max(0, linear))
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * clamped ** (1 / 2.4) - 0.055
}

const linearize = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

/** Resolves a CSS color against theme values, or `undefined` if unsupported. */
export const resolveColor = (
  value: string,
  vars: ThemeValues,
): Rgba | undefined => {
  const lab = toOklab(value, vars)
  if (!lab) return undefined
  const l = (lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b) ** 3
  const m = (lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b) ** 3
  const s = (lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b) ** 3
  return {
    r: gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: lab.alpha,
  }
}

/** Source-over compositing of `top` on an opaque `backdrop`. */
export const composite = (top: Rgba, backdrop: Rgba): Rgba => ({
  r: top.r * top.a + backdrop.r * (1 - top.a),
  g: top.g * top.a + backdrop.g * (1 - top.a),
  b: top.b * top.a + backdrop.b * (1 - top.a),
  a: 1,
})

const luminance = ({ r, g, b }: Rgba): number =>
  0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)

export const contrastRatio = (first: Rgba, second: Rgba): number => {
  const [high, low] = [luminance(first), luminance(second)].sort(
    (x, y) => y - x,
  )
  return (high! + 0.05) / (low! + 0.05)
}

/** Declarations of every rule whose selector list contains `selector`, merged in order. */
export const declarationsFor = (css: string, selector: string): ThemeValues => {
  const values: Record<string, string> = {}
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = /([^{}]+)\{([^{}]*)\}/g
  for (const [, selectors = '', body = ''] of source.matchAll(rule)) {
    if (!selectors.split(',').some(item => item.trim() === selector)) continue
    for (const declaration of body.split(';')) {
      const match = /^\s*--([\w-]+)\s*:([\s\S]*)$/.exec(declaration)
      if (match) values[match[1]!] = match[2]!.trim().replace(/\s+/g, ' ')
    }
  }
  return values
}

export type ContrastPair = Readonly<{
  foreground: string
  background: string
  /** Backdrop a translucent `background` composites over. */
  backdrop?: string
  minimum: number
}>

/** Text pairs every theme must satisfy (WCAG 2 AA, normal text). */
export const TEXT_CONTRAST_PAIRS: ReadonlyArray<ContrastPair> = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['accent-foreground', 'accent'],
  ['sidebar-foreground', 'sidebar'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
  ['sidebar-accent-foreground', 'sidebar-accent'],
].map(([foreground, background]) => ({
  foreground: foreground!,
  background: background!,
  backdrop: 'background',
  minimum: 4.5,
}))

export type ContrastResult = ContrastPair &
  Readonly<{
    ratio: number | undefined
    status: 'pass' | 'fail' | 'unresolved'
  }>

export const checkContrast = (
  vars: ThemeValues,
  pairs: ReadonlyArray<ContrastPair> = TEXT_CONTRAST_PAIRS,
): ReadonlyArray<ContrastResult> =>
  pairs.map(pair => {
    const backdrop = resolveColor(`var(--${pair.backdrop ?? 'background'})`, {
      ...vars,
    })
    const background = resolveColor(`var(--${pair.background})`, vars)
    const foreground = resolveColor(`var(--${pair.foreground})`, vars)
    if (!backdrop || !background || !foreground || backdrop.a < 1)
      return { ...pair, ratio: undefined, status: 'unresolved' }
    const surface = composite(background, backdrop)
    const ratio = contrastRatio(composite(foreground, surface), surface)
    return { ...pair, ratio, status: ratio >= pair.minimum ? 'pass' : 'fail' }
  })
