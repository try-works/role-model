import { Global, Token, Theme } from '@pleat/core'
/* Level inks that exist only on the terminal surface (astryx TERM palette). */
const spec = Token.make(
  {
    detailSurface: Token.color,
    edge: Token.color,
    error: Token.color,
    hover: Token.color,
    hoverStrong: Token.color,
    surface: Token.color,
    text: Token.color,
    textBright: Token.color,
    textDim: Token.color,
    warn: Token.color,
  },
  { prefix: 'crease-ink-' },
)
export const logStreamTerminalInkTheme = Theme.make(spec, {
  detailSurface: '#0e0e10',
  edge: '#26262a',
  error: '#ff6166',
  hover: '#141417',
  hoverStrong: '#1d1d21',
  surface: '#0a0a0a',
  text: '#b9b9c0',
  textBright: '#e8e8ea',
  textDim: '#8b8b94',
  warn: '#f2c00b',
})
Global.theme(logStreamTerminalInkTheme)
export const logStreamTerminalInk = spec
