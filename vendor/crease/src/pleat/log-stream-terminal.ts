import { Theme } from '@pleat/core'

import { tokens, tokensTheme } from './tokens'

/* The terminal variant is intentionally always-dark (terminal chrome is a
   brand surface, mirroring real shells) so it overrides the semantic tokens
   rather than following the color scheme. Values are astryx's TERM palette. */
export const logStreamTerminalTheme = Theme.patch(tokensTheme, tokens, {
  background: '#0a0a0a',
  border: '#26262a',
  card: '#0a0a0a',
  cardForeground: '#b9b9c0',
  foreground: '#b9b9c0',
  muted: '#141417',
  mutedForeground: '#8b8b94',
})
