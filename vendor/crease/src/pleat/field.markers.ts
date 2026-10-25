import { When } from '@pleat/core'
/* Structural markers for ancestor-conditional styles that the Tailwind
   renderer expresses with [&>*] / group-data / has-[] combinators. The
   components apply these unconditionally (or per orientation/state) so
   when.ancestor(...) conditions on descendants fire under the same DOM
   relationships as the Tailwind variants. */
export const fieldGroupScope = When.marker('field-group-scope')
export const fieldVerticalScope = When.marker('field-vertical-scope')
export const fieldHorizontalScope = When.marker('field-horizontal-scope')
export const fieldResponsiveScope = When.marker('field-responsive-scope')
export const fieldDisabledScope = When.marker('field-disabled-scope')
export const fieldLabelScope = When.marker('field-label-scope')
