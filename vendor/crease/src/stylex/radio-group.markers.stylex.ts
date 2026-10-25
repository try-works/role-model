import * as stylex from '@stylexjs/stylex'

/* Structural marker for ancestor-conditional styles that the Tailwind
   renderer expresses with group-data-[checked]. The radio group applies it
   on the option button so when.ancestor(...) conditions on descendants fire
   under the same DOM relationships. */
export const radioItemScope = stylex.defineMarker()
