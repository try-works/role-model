import { Global, Token, Theme } from '@pleat/core'
/** Semantic values used only by the authored card specimens in this batch. */
const spec = Token.make(
  {
    pendingIndicator: Token.color,
    artworkSurface: Token.color,
    artworkForeground: Token.color,
    round: Token.length,
    cameraPattern: Token.value,
  },
  { prefix: 'crease-card-' },
)
export const cardDemoTokensTheme = Theme.make(spec, {
  pendingIndicator: 'oklch(0.795 0.184 86.047)',
  artworkSurface: 'var(--muted)',
  artworkForeground: 'var(--muted-foreground)',
  round: '9999px',
  cameraPattern:
    'repeating-linear-gradient(45deg, transparent, transparent 10px, var(--border) 10px, var(--border) 11px)',
})
Global.theme(cardDemoTokensTheme)
export const cardDemoTokens = spec
