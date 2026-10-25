import * as stylex from '@stylexjs/stylex'

/* Structural markers for ancestor-conditional styles that the Tailwind
   renderer expresses with [&>*] / group-data / has-[] combinators. The
   components apply these unconditionally (or per orientation/state) so
   when.ancestor(...) conditions on descendants fire under the same DOM
   relationships as the Tailwind variants. */
export const fieldGroupScope = stylex.defineMarker()
export const fieldVerticalScope = stylex.defineMarker()
export const fieldHorizontalScope = stylex.defineMarker()
export const fieldResponsiveScope = stylex.defineMarker()
export const fieldDisabledScope = stylex.defineMarker()
export const fieldLabelScope = stylex.defineMarker()
