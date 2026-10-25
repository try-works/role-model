import * as stylex from '@stylexjs/stylex'

export const tokens = stylex.defineVars({
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
  destructiveHover: 'color-mix(in oklab, var(--destructive) 90%, transparent)',
  destructiveSurface: 'var(--stylex-destructive-surface)',
  softDestructiveSurface: 'var(--stylex-soft-destructive-surface)',
  softDestructiveHover: 'var(--stylex-soft-destructive-hover)',
  mutedHover: 'var(--stylex-muted-hover)',
  badgeDestructiveSurface: 'var(--stylex-soft-destructive-surface)',
  badgeDestructiveHover:
    'color-mix(in oklab, var(--destructive) 20%, transparent)',
  badgeMutedHover: 'var(--stylex-muted-hover)',
  /* Fixed inks for chromatic status plates (Astryx --color-on-* port): these
     deliberately do not follow the theme's foreground flip. */
  statusPlateInk: 'oklch(0.985 0 0)',
  statusWarningInk: 'oklch(0.205 0 0)',
  badgePrimaryHover: 'color-mix(in oklab, var(--primary) 80%, transparent)',
  badgeSecondaryHover: 'color-mix(in oklab, var(--secondary) 80%, transparent)',
  buttonPrimaryHover: 'color-mix(in oklab, var(--primary) 80%, transparent)',
  buttonSecondaryHover:
    'color-mix(in oklab, var(--secondary), var(--foreground) 5%)',
  inputSurface: 'var(--stylex-input-surface)',
  outlineSurface: 'var(--stylex-outline-surface)',
  outlineHover: 'var(--stylex-outline-hover)',
  primaryHover: 'color-mix(in oklab, var(--primary) 90%, transparent)',
  secondaryHover: 'color-mix(in oklab, var(--secondary) 80%, transparent)',
  /* Tailwind's @theme-inline build bakes --color-* to the base-theme
     literals: the bare border color (from `* { border-color: var(--color-border) }`)
     resolves at :root, so it does not follow the board preset. `border-input`,
     `ring-ring`, and `border-border` emit raw vars and stay preset-scoped. */
  border: 'var(--color-border)',
  input: 'var(--input)',
  ring: 'var(--ring)',
  radius: 'var(--radius)',
  controlRadius: 'calc(var(--radius) - 2px)',
  cardRadius: 'calc(var(--radius) + 4px)',
  focusRingShadow:
    '0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)',
  /* TW 'focus:ring-2 focus:ring-offset-2 focus:ring-ring' — 2px
     background-offset then a 2px full-alpha ring. */
  focusRingOffsetShadow: '0 0 0 2px var(--background), 0 0 0 4px var(--ring)',
  destructiveRingShadow:
    '0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)',
  shadowSm: '0 1px 2px rgb(0 0 0 / 0.05)',
  shadowCard: '0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06)',
  shadowNone: 'none',
  transparent: 'transparent',
  backdrop: 'rgb(0 0 0 / 0.5)',
  /* shadcn base drawer overlay — 'bg-black/10'. */
  drawerBackdrop: 'rgb(0 0 0 / 0.1)',
})
