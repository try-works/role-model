import { When } from '@pleat/core'
/* Ancestor scope for the avatar's own data-size conditions (the fallback's
   sm-size text). Component-local — a marker shared across components would
   leak ancestor state into nested avatars. */

export const avatarScope: ReturnType<typeof When.marker> =
  When.marker('avatar-scope')
