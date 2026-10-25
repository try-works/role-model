/* Shared astryx Card surface geometry for the interactive card components.
   Keeps SelectableCard on identical box math in the Tailwind
   renderer: radius-container (rounded-xl), border-inside-padding compensation
   (a bordered variant subtracts the 1px border from every padding side so the
   total inset stays constant), and the two-layer
   `box-shadow: var(--_card-ring), var(--_card-elevation)` compose so a
   selection ring and resting elevation coexist. */

export type CardVariant =
  | 'default'
  | 'transparent'
  | 'muted'
  | 'blue'
  | 'cyan'
  | 'gray'
  | 'green'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'red'
  | 'teal'
  | 'yellow'

export type CardElevation = 'none' | 'low' | 'med' | 'high'

export type CardPadding = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10

export const CARD_VARIANTS: ReadonlyArray<CardVariant> = [
  'default',
  'transparent',
  'muted',
  'blue',
  'cyan',
  'gray',
  'green',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
]

const VARIANT_BG: Readonly<Record<CardVariant, string>> = {
  default: 'bg-card',
  transparent: 'bg-transparent',
  muted: 'bg-muted',
  blue: 'bg-chart-3/20',
  cyan: 'bg-chart-2/20',
  gray: 'bg-muted-foreground/15',
  green: 'bg-chart-2/20',
  orange: 'bg-chart-5/20',
  pink: 'bg-chart-1/20',
  purple: 'bg-chart-3/20',
  red: 'bg-destructive/20',
  teal: 'bg-chart-2/20',
  yellow: 'bg-chart-4/20',
}

/* astryx card padding: spacing step N -> N*4px, default 4 (16px). A bordered
   variant draws the 1px border *within* the padding — the padding shrinks by
   the border width so outer geometry stays identical across variants. */
const PADDING: Readonly<
  Record<CardPadding, readonly [base: string, bordered: string]>
> = {
  0: ['p-0', 'p-[calc(0rem-1px)]'],
  0.5: ['p-0.5', 'p-[calc(0.125rem-1px)]'],
  1: ['p-1', 'p-[calc(0.25rem-1px)]'],
  1.5: ['p-1.5', 'p-[calc(0.375rem-1px)]'],
  2: ['p-2', 'p-[calc(0.5rem-1px)]'],
  3: ['p-3', 'p-[calc(0.75rem-1px)]'],
  4: ['p-4', 'p-[calc(1rem-1px)]'],
  5: ['p-5', 'p-[calc(1.25rem-1px)]'],
  6: ['p-6', 'p-[calc(1.5rem-1px)]'],
  8: ['p-8', 'p-[calc(2rem-1px)]'],
  10: ['p-10', 'p-[calc(2.5rem-1px)]'],
}

const ELEVATION_SHADOW: Readonly<Record<CardElevation, string>> = {
  none: '',
  /* astryx --shadow-low/-med/-high values, carried verbatim */
  low: '[--_card-elevation:0_1px_1px_rgb(0_0_0/0.1),0_2px_8px_rgb(0_0_0/0.2)]',
  med: '[--_card-elevation:0_1px_2px_rgb(0_0_0/0.1),0_2px_12px_rgb(0_0_0/0.2)]',
  high: '[--_card-elevation:0_2px_2px_rgb(0_0_0/0.1),0_8px_24px_rgb(0_0_0/0.2)]',
}

export const cardSurfaceClass = (config: {
  variant: CardVariant
  elevation: CardElevation
  padding: CardPadding
  withBorder: boolean
}): ReadonlyArray<string> => [
  'relative overflow-clip rounded-xl text-card-foreground',
  'shadow-[var(--_card-ring,0_0_transparent),var(--_card-elevation,0_0_transparent)]',
  config.withBorder ? 'border border-border' : 'border-0',
  PADDING[config.padding][config.withBorder ? 1 : 0],
  VARIANT_BG[config.variant],
  ELEVATION_SHADOW[config.elevation],
]

export const SR_ONLY_CLASS =
  'absolute m-[-1px] h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]'
