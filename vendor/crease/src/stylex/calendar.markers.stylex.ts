import * as stylex from '@stylexjs/stylex'

/* Cell markers for ancestor-conditional button styles that the Tailwind
   renderer expresses with group-data-[*] selectors: each day/picker cell
   carries its data-* attributes (data-selected, data-disabled,
   data-focused, data-outside-month), and the button inside observes them. */
export const dayScope = stylex.defineMarker()
export const cellScope = stylex.defineMarker()
