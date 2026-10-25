import { Global, Token, Theme } from '@pleat/core'
const spec = Token.make(
  {
    qrBackground: Token.color,
    qrForeground: Token.color,
    qrMuted: Token.color,
    roundRadius: Token.length,
    usageAccent: Token.color,
  },
  { prefix: 'crease-icard-' },
)
export const interactionCardTokensTheme = Theme.make(spec, {
  qrBackground: 'oklch(1 0 0)',
  qrForeground: 'var(--foreground)',
  qrMuted: 'var(--muted)',
  roundRadius: '50%',
  usageAccent: 'var(--chart-1)',
})
Global.theme(interactionCardTokensTheme)
export const interactionCardTokens = spec
