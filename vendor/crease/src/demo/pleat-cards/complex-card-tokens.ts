import { Global, Token, Theme } from '@pleat/core'
const spec = Token.make(
  { muted: Token.color, positive: Token.color, transparent: Token.color },
  { prefix: 'crease-ccard-' },
)
export const cardTokensTheme = Theme.make(spec, {
  muted: 'var(--muted)',
  positive: 'oklch(0.696 0.17 162.48)',
  transparent: 'transparent',
})
Global.theme(cardTokensTheme)
export const cardTokens = spec
