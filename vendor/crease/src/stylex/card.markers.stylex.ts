import * as stylex from '@stylexjs/stylex'

/* Component-scoped markers for the card press/hover overlay. Each card type
   gets its own scope — a marker shared across components would leak
   hover/active state from an outer card into a nested one (astryx rule). */

export const selectableCardScope: ReturnType<typeof stylex.defineMarker> =
  stylex.defineMarker()
