import { When } from '@pleat/core'
/* Marker on each interactive <li> so the row's focus ring can mirror
   Tailwind's group-focus-visible:ring on the row box (the li is the
   focusable element). */
export const treeItemScope: ReturnType<typeof When.marker> =
  When.marker('tree-item-scope')
