import * as stylex from '@stylexjs/stylex'

/* Structural marker for the message root so descendant parts can key
   Tailwind's group-data-[align=end]/message and group-has-data-[*]/message
   variants off the ancestor element. */
export const messageScope = stylex.defineMarker()
