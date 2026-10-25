import { Global, Theme, Token } from '@pleat/core'

/** Semantic design tokens, mirroring the app's CSS variables. */
const tokensSpec = Token.make(
  {
    background: Token.color,
    foreground: Token.color,
    controlPlaceholder: Token.color,
    card: Token.color,
    cardForeground: Token.color,
    primary: Token.color,
    primaryForeground: Token.color,
    secondary: Token.color,
    secondaryForeground: Token.color,
    muted: Token.color,
    mutedForeground: Token.color,
    accent: Token.color,
    accentForeground: Token.color,
    destructive: Token.color,
    alertInfo: Token.color,
    alertSuccess: Token.color,
    alertWarning: Token.color,
    destructiveForeground: Token.color,
    destructiveHover: Token.color,
    destructiveSurface: Token.color,
    softDestructiveSurface: Token.color,
    softDestructiveHover: Token.color,
    mutedHover: Token.color,
    badgeDestructiveSurface: Token.color,
    badgeDestructiveHover: Token.color,
    badgeMutedHover: Token.color,
    statusPlateInk: Token.color,
    statusWarningInk: Token.color,
    badgePrimaryHover: Token.color,
    badgeSecondaryHover: Token.color,
    buttonPrimaryHover: Token.color,
    buttonSecondaryHover: Token.color,
    inputSurface: Token.color,
    outlineSurface: Token.color,
    outlineHover: Token.color,
    primaryHover: Token.color,
    secondaryHover: Token.color,
    border: Token.color,
    input: Token.color,
    ring: Token.color,
    radius: Token.length,
    controlRadius: Token.length,
    cardRadius: Token.length,
    focusRingShadow: Token.value,
    focusRingOffsetShadow: Token.value,
    destructiveRingShadow: Token.value,
    shadowSm: Token.value,
    shadowCard: Token.value,
    shadowNone: Token.value,
    transparent: Token.color,
    backdrop: Token.color,
    drawerBackdrop: Token.color,
  },
  { prefix: 'crease-' },
)

export const tokens = tokensSpec

export const tokensTheme = Theme.make(tokensSpec, {
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
})

Global.theme(tokensTheme)

const drawerTokensSpec = Token.make(
  { bleedBackground: Token.color },
  { prefix: 'crease-drawer-' },
)

/** Drawer-owned tokens, scoped to the popup so per-drawer overrides resolve. */
export const drawerTokens = drawerTokensSpec

Global.theme(
  Theme.make(drawerTokensSpec, {
    bleedBackground: 'var(--drawer-bleed-background, var(--popover))',
  }),
  { selector: '[data-slot="drawer-popup"]' },
)
