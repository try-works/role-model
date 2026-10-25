import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx Section/Section.tsx — a padded page section with
   surface variants and edge dividers. The astryx outer/inner wrapper pair
   exists only to escape container padding variables; Crease has no container
   padding context, so the port renders a single <section>. Default padding
   follows the astryx theme default of step 4 (16px). */

const variantStyles = stylex.create({
  section: { backgroundColor: tokens.card },
  transparent: { backgroundColor: 'transparent' },
  muted: { backgroundColor: tokens.muted },
})

const dividerStyles = stylex.create({
  top: {
    borderColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  },
  bottom: {
    borderColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  start: {
    borderColor: tokens.border,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: 1,
  },
  end: {
    borderColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: 1,
  },
})

const paddingInlineStartStyles = stylex.create({
  0: { paddingInlineStart: '0px' },
  0.5: { paddingInlineStart: '0.125rem' },
  1: { paddingInlineStart: '0.25rem' },
  1.5: { paddingInlineStart: '0.375rem' },
  2: { paddingInlineStart: '0.5rem' },
  3: { paddingInlineStart: '0.75rem' },
  4: { paddingInlineStart: '1rem' },
  5: { paddingInlineStart: '1.25rem' },
  6: { paddingInlineStart: '1.5rem' },
  8: { paddingInlineStart: '2rem' },
  10: { paddingInlineStart: '2.5rem' },
})

const paddingInlineEndStyles = stylex.create({
  0: { paddingInlineEnd: '0px' },
  0.5: { paddingInlineEnd: '0.125rem' },
  1: { paddingInlineEnd: '0.25rem' },
  1.5: { paddingInlineEnd: '0.375rem' },
  2: { paddingInlineEnd: '0.5rem' },
  3: { paddingInlineEnd: '0.75rem' },
  4: { paddingInlineEnd: '1rem' },
  5: { paddingInlineEnd: '1.25rem' },
  6: { paddingInlineEnd: '1.5rem' },
  8: { paddingInlineEnd: '2rem' },
  10: { paddingInlineEnd: '2.5rem' },
})

const paddingBlockStartStyles = stylex.create({
  0: { paddingBlockStart: '0px' },
  0.5: { paddingBlockStart: '0.125rem' },
  1: { paddingBlockStart: '0.25rem' },
  1.5: { paddingBlockStart: '0.375rem' },
  2: { paddingBlockStart: '0.5rem' },
  3: { paddingBlockStart: '0.75rem' },
  4: { paddingBlockStart: '1rem' },
  5: { paddingBlockStart: '1.25rem' },
  6: { paddingBlockStart: '1.5rem' },
  8: { paddingBlockStart: '2rem' },
  10: { paddingBlockStart: '2.5rem' },
})

const paddingBlockEndStyles = stylex.create({
  0: { paddingBlockEnd: '0px' },
  0.5: { paddingBlockEnd: '0.125rem' },
  1: { paddingBlockEnd: '0.25rem' },
  1.5: { paddingBlockEnd: '0.375rem' },
  2: { paddingBlockEnd: '0.5rem' },
  3: { paddingBlockEnd: '0.75rem' },
  4: { paddingBlockEnd: '1rem' },
  5: { paddingBlockEnd: '1.25rem' },
  6: { paddingBlockEnd: '1.5rem' },
  8: { paddingBlockEnd: '2rem' },
  10: { paddingBlockEnd: '2.5rem' },
})

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
  layoutStyle?: ComponentLayoutStyle
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
