import { Global, Token, Theme } from '@pleat/core'
const spec = Token.make(
  {
    boardBackground: Token.color,
    boardMuted: Token.color,
    boardMutedForeground: Token.color,
    border: Token.color,
    error: Token.color,
    focus: Token.color,
    hover: Token.color,
    markerChart: Token.color,
    markerPrimary: Token.color,
    markerZinc: Token.color,
    panel: Token.color,
    panelShadow: Token.value,
    panelField: Token.color,
    panelInput: Token.color,
    panelPopover: Token.color,
    panelRadius: Token.length,
    panelInnerRadius: Token.length,
    selected: Token.color,
    success: Token.color,
    text: Token.color,
    textInverse: Token.color,
    textMuted: Token.color,
    textSubtle: Token.color,
    transparent: Token.color,
  },
  { prefix: 'crease-board-' },
)
/* The customizer chrome follows the site theme, so these resolve the app's
   --* tokens rather than fixed literals. Inside the board scope the scoped
   theme re-aliases the board-* roles back to the preset palette. */
export const boardTokensTheme = Theme.make(spec, {
  boardBackground: 'var(--background)',
  boardMuted: 'var(--muted)',
  boardMutedForeground: 'var(--muted-foreground)',
  border: 'var(--border)',
  error: 'var(--destructive)',
  focus: 'var(--ring)',
  hover: 'var(--accent)',
  markerChart: 'var(--chart-1)',
  markerPrimary: 'var(--primary)',
  markerZinc: 'oklch(0.705 0.015 286.067)',
  panel: 'var(--card)',
  panelShadow:
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), 0 0 0 1px var(--border)',
  panelField: 'var(--muted)',
  panelInput: 'var(--background)',
  panelPopover: 'var(--popover)',
  panelRadius: '1rem',
  panelInnerRadius: '0.75rem',
  selected: 'var(--accent)',
  success: 'var(--success)',
  text: 'var(--card-foreground)',
  textInverse: 'var(--background)',
  textMuted: 'var(--muted-foreground)',
  textSubtle: 'var(--muted-foreground)',
  transparent: 'transparent',
})
Global.theme(boardTokensTheme)
export const boardTokens = spec
