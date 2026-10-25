import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens'

/* Ported from Meta Astryx Section/Section.tsx — a padded page section with
   surface variants and edge dividers. The astryx outer/inner wrapper pair
   exists only to escape container padding variables; Crease has no container
   padding context, so the port renders a single <section>. Default padding
   follows the astryx theme default of step 4 (16px). */

const variantStyles = {
  section: Style.make({ backgroundColor: tokens.card }),
  transparent: Style.make({ backgroundColor: 'transparent' }),
  muted: Style.make({ backgroundColor: tokens.muted }),
}

const dividerStyles = {
  top: Style.make({
    borderColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  }),
  bottom: Style.make({
    borderColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  }),
  start: Style.make({
    borderColor: tokens.border,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: 1,
  }),
  end: Style.make({
    borderColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: 1,
  }),
}

const paddingInlineStartStyles = {
  0: Style.make({ paddingInlineStart: '0px' }),
  0.5: Style.make({ paddingInlineStart: '0.125rem' }),
  1: Style.make({ paddingInlineStart: '0.25rem' }),
  1.5: Style.make({ paddingInlineStart: '0.375rem' }),
  2: Style.make({ paddingInlineStart: '0.5rem' }),
  3: Style.make({ paddingInlineStart: '0.75rem' }),
  4: Style.make({ paddingInlineStart: '1rem' }),
  5: Style.make({ paddingInlineStart: '1.25rem' }),
  6: Style.make({ paddingInlineStart: '1.5rem' }),
  8: Style.make({ paddingInlineStart: '2rem' }),
  10: Style.make({ paddingInlineStart: '2.5rem' }),
}

const paddingInlineEndStyles = {
  0: Style.make({ paddingInlineEnd: '0px' }),
  0.5: Style.make({ paddingInlineEnd: '0.125rem' }),
  1: Style.make({ paddingInlineEnd: '0.25rem' }),
  1.5: Style.make({ paddingInlineEnd: '0.375rem' }),
  2: Style.make({ paddingInlineEnd: '0.5rem' }),
  3: Style.make({ paddingInlineEnd: '0.75rem' }),
  4: Style.make({ paddingInlineEnd: '1rem' }),
  5: Style.make({ paddingInlineEnd: '1.25rem' }),
  6: Style.make({ paddingInlineEnd: '1.5rem' }),
  8: Style.make({ paddingInlineEnd: '2rem' }),
  10: Style.make({ paddingInlineEnd: '2.5rem' }),
}

const paddingBlockStartStyles = {
  0: Style.make({ paddingBlockStart: '0px' }),
  0.5: Style.make({ paddingBlockStart: '0.125rem' }),
  1: Style.make({ paddingBlockStart: '0.25rem' }),
  1.5: Style.make({ paddingBlockStart: '0.375rem' }),
  2: Style.make({ paddingBlockStart: '0.5rem' }),
  3: Style.make({ paddingBlockStart: '0.75rem' }),
  4: Style.make({ paddingBlockStart: '1rem' }),
  5: Style.make({ paddingBlockStart: '1.25rem' }),
  6: Style.make({ paddingBlockStart: '1.5rem' }),
  8: Style.make({ paddingBlockStart: '2rem' }),
  10: Style.make({ paddingBlockStart: '2.5rem' }),
}

const paddingBlockEndStyles = {
  0: Style.make({ paddingBlockEnd: '0px' }),
  0.5: Style.make({ paddingBlockEnd: '0.125rem' }),
  1: Style.make({ paddingBlockEnd: '0.25rem' }),
  1.5: Style.make({ paddingBlockEnd: '0.375rem' }),
  2: Style.make({ paddingBlockEnd: '0.5rem' }),
  3: Style.make({ paddingBlockEnd: '0.75rem' }),
  4: Style.make({ paddingBlockEnd: '1rem' }),
  5: Style.make({ paddingBlockEnd: '1.25rem' }),
  6: Style.make({ paddingBlockEnd: '1.5rem' }),
  8: Style.make({ paddingBlockEnd: '2rem' }),
  10: Style.make({ paddingBlockEnd: '2.5rem' }),
}

export type SectionVariant = keyof typeof variantStyles
export type SectionDivider = keyof typeof dividerStyles
export type SectionSpacing = keyof typeof paddingInlineStartStyles
export type SectionSizeValue = number | string

export type SectionProps = Readonly<{
  variant?: SectionVariant
  dividers?: ReadonlyArray<SectionDivider>
  /** Inner padding on all sides (spacing steps of 4px). Defaults to 4. */
  padding?: SectionSpacing
  paddingInline?: SectionSpacing
  paddingInlineStart?: SectionSpacing
  paddingInlineEnd?: SectionSpacing
  paddingBlock?: SectionSpacing
  paddingBlockStart?: SectionSpacing
  paddingBlockEnd?: SectionSpacing
  width?: SectionSizeValue
  height?: SectionSizeValue
  maxWidth?: SectionSizeValue
  minHeight?: SectionSizeValue
  children?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const sizeValue = (value: SectionSizeValue): string =>
  typeof value === 'number' ? `${value}px` : value

export const section = <Msg>(
  props: SectionProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'section'
  const padding = props.padding ?? 4
  const paddingInlineStart =
    props.paddingInlineStart ?? props.paddingInline ?? padding
  const paddingInlineEnd =
    props.paddingInlineEnd ?? props.paddingInline ?? padding
  const paddingBlockStart =
    props.paddingBlockStart ?? props.paddingBlock ?? padding
  const paddingBlockEnd = props.paddingBlockEnd ?? props.paddingBlock ?? padding
  const sizing: Record<string, string> = {
    ...(props.width === undefined ? {} : { width: sizeValue(props.width) }),
    ...(props.height === undefined ? {} : { height: sizeValue(props.height) }),
    ...(props.maxWidth === undefined
      ? {}
      : { maxWidth: sizeValue(props.maxWidth) }),
    ...(props.minHeight === undefined
      ? {}
      : { minHeight: sizeValue(props.minHeight) }),
  }
  return h.section(
    [
      h.DataAttribute('slot', 'section'),
      h.DataAttribute('variant', variant),
      h.Class(
        className(
          variantStyles[variant],
          paddingInlineStartStyles[paddingInlineStart],
          paddingInlineEndStyles[paddingInlineEnd],
          paddingBlockStartStyles[paddingBlockStart],
          paddingBlockEndStyles[paddingBlockEnd],
          ...(props.dividers ?? []).map(side => dividerStyles[side]),
          props.layoutStyle,
        ),
      ),
      ...(Object.keys(sizing).length > 0 ? [h.Style(sizing)] : []),
    ],
    [...(props.children ?? [])],
  )
}
