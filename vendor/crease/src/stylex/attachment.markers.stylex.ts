import * as stylex from '@stylexjs/stylex'

/* Ancestor scope for the attachment group's data-* conditions. The Tailwind
   renderer drives media/actions/content/description state off
   group-data-[orientation|size|state] classes on the attachment root; StyleX
   expresses the same relationships with when.ancestor on this marker, which
   the attachment root applies unconditionally. */
export const attachmentScope: ReturnType<typeof stylex.defineMarker> =
  stylex.defineMarker()
