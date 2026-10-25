import * as stylex from '@stylexjs/stylex'

/* Ancestor scope for the avatar's own data-size conditions (the fallback's
   sm-size text). Component-local — a marker shared across components would
   leak ancestor state into nested avatars. */

export const avatarScope: ReturnType<typeof stylex.defineMarker> =
  stylex.defineMarker()
