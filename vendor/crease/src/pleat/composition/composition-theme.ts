import { Global, Token, Theme } from '@pleat/core'
/** Semantic surfaces that an application shell may scope without widening primitives. */
const spec = Token.make({ canvas: Token.color }, { prefix: 'crease-comp-' })
export const compositionThemeTheme = Theme.make(spec, {
  canvas: 'var(--muted)',
})
Global.theme(compositionThemeTheme)
export const compositionTheme = spec
