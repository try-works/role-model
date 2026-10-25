import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Section/Section.tsx — a padded page section with
   surface variants and edge dividers. The astryx outer/inner wrapper pair
   exists only to escape container padding variables; Crease has no container
   padding context, so the port renders a single <section>. Default padding
   follows the astryx theme default of step 4 (16px). */

export type SectionVariant = 'section' | 'transparent' | 'muted'
export type SectionDivider = 'top' | 'bottom' | 'start' | 'end'
export type SectionSpacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10
export type SectionSizeValue = number | string

const variantClasses: Record<SectionVariant, string> = {
  section: 'bg-card',
  transparent: 'bg-transparent',
  muted: 'bg-muted',
}

const dividerClasses: Record<SectionDivider, string> = {
  top: 'border-t',
  bottom: 'border-b',
  start: 'border-s',
  end: 'border-e',
}

const paddingInlineStartClasses: Record<SectionSpacing, string> = {
  0: 'ps-0',
  0.5: 'ps-0.5',
  1: 'ps-1',
  1.5: 'ps-1.5',
  2: 'ps-2',
  3: 'ps-3',
  4: 'ps-4',
  5: 'ps-5',
  6: 'ps-6',
  8: 'ps-8',
  10: 'ps-10',
}

const paddingInlineEndClasses: Record<SectionSpacing, string> = {
  0: 'pe-0',
  0.5: 'pe-0.5',
  1: 'pe-1',
  1.5: 'pe-1.5',
  2: 'pe-2',
  3: 'pe-3',
  4: 'pe-4',
  5: 'pe-5',
  6: 'pe-6',
  8: 'pe-8',
  10: 'pe-10',
}

const paddingBlockStartClasses: Record<SectionSpacing, string> = {
  0: 'pt-0',
  0.5: 'pt-0.5',
  1: 'pt-1',
  1.5: 'pt-1.5',
  2: 'pt-2',
  3: 'pt-3',
  4: 'pt-4',
  5: 'pt-5',
  6: 'pt-6',
  8: 'pt-8',
  10: 'pt-10',
}

const paddingBlockEndClasses: Record<SectionSpacing, string> = {
  0: 'pb-0',
  0.5: 'pb-0.5',
  1: 'pb-1',
  1.5: 'pb-1.5',
  2: 'pb-2',
  3: 'pb-3',
  4: 'pb-4',
  5: 'pb-5',
  6: 'pb-6',
  8: 'pb-8',
  10: 'pb-10',
}

const sizeValue = (value: SectionSizeValue): string =>
  typeof value === 'number' ? `${value}px` : value

export type SectionProps = Readonly<{
  /**
   * Visual variant.
   * - `section`: surface (card) background (default)
   * - `transparent`: no background
   * - `muted`: muted background, draws attention to a region
   */
  variant?: SectionVariant
  /** Divider borders to apply on the given logical edges. */
  dividers?: ReadonlyArray<SectionDivider>
  /**
   * Inner padding on all sides (spacing steps of 4px).
   * @default 4 (16px)
   */
  padding?: SectionSpacing
  /** Inline padding; overrides `padding` on that axis. */
  paddingInline?: SectionSpacing
  /** Inline-start padding; overrides `paddingInline` on that edge. */
  paddingInlineStart?: SectionSpacing
  /** Inline-end padding; overrides `paddingInline` on that edge. */
  paddingInlineEnd?: SectionSpacing
  /** Block padding; overrides `padding` on that axis. */
  paddingBlock?: SectionSpacing
  /** Block-start padding; overrides `paddingBlock` on that edge. */
  paddingBlockStart?: SectionSpacing
  /** Block-end padding; overrides `paddingBlock` on that edge. */
  paddingBlockEnd?: SectionSpacing
  /** Section width; numbers are pixels. */
  width?: SectionSizeValue
  /** Section height; numbers are pixels. */
  height?: SectionSizeValue
  /** Section max-width; numbers are pixels. */
  maxWidth?: SectionSizeValue
  /** Section min-height; numbers are pixels. */
  minHeight?: SectionSizeValue
  children?: ReadonlyArray<Html | string>
  class?: string
}>

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
        cn(
          variantClasses[variant],
          paddingInlineStartClasses[paddingInlineStart],
          paddingInlineEndClasses[paddingInlineEnd],
          paddingBlockStartClasses[paddingBlockStart],
          paddingBlockEndClasses[paddingBlockEnd],
          ...(props.dividers ?? []).map(side => dividerClasses[side]),
          props.class,
        ),
      ),
      ...(Object.keys(sizing).length > 0 ? [h.Style(sizing)] : []),
    ],
    [...(props.children ?? [])],
  )
}
