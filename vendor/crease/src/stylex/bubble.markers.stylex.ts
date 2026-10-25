import * as stylex from '@stylexjs/stylex'

/* Structural marker for the bubble root so bubble-content can key
   Tailwind's group-data-[align=end]/bubble variant off the ancestor
   element. */
export const bubbleScope = stylex.defineMarker()
