import * as stylex from '@stylexjs/stylex'

/* Structural marker for ancestor-conditional styles that the Tailwind
   renderer expresses with group-data-[checked] / group-data-[indeterminate].
   The checkbox applies it on the control button so when.ancestor(...)
   conditions on descendants fire under the same DOM relationships. */
export const checkboxControlScope = stylex.defineMarker()
