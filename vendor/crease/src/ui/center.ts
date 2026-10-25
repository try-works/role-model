import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Center/Center.tsx — flex centering on the flex
   main/cross axes. The astryx spacing scale (1 step = 4px) maps 1:1 onto
   Tailwind's spacing scale. */

export type CenterAxis = 'both' | 'horizontal' | 'vertical'
export type CenterSpacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10
export type CenterSizeValue = number | string

const paddingInlineStartClasses: Record<CenterSpacing, string> = {
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

const paddingInlineEndClasses: Record<CenterSpacing, string> = {
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

const paddingBlockStartClasses: Record<CenterSpacing, string> = {
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

const paddingBlockEndClasses: Record<CenterSpacing, string> = {
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

const sizeValue = (value: CenterSizeValue): string =>
  typeof value === 'number' ? `${value}px` : value

export type CenterProps = Readonly<{
  /**
   * Center mode.
   * - `both`: center on the flex main and cross axes (default)
   * - `horizontal`: center on the flex main/inline axis
   * - `vertical`: center on the flex cross/block axis
   */
  axis?: CenterAxis
  /** Renders inline-flex (useful for text/icons). */
  isInline?: boolean
  /** Inner padding on all sides. */
  padding?: CenterSpacing
  /** Inline (horizontal) padding; overrides `padding` on that axis. */
  paddingInline?: CenterSpacing
  /** Inline-start padding; overrides `paddingInline` on that edge. */
  paddingInlineStart?: CenterSpacing
  /** Inline-end padding; overrides `paddingInline` on that edge. */
  paddingInlineEnd?: CenterSpacing
  /** Block (vertical) padding; overrides `padding` on that axis. */
  paddingBlock?: CenterSpacing
  /** Block-start padding; overrides `paddingBlock` on that edge. */
  paddingBlockStart?: CenterSpacing
  /** Block-end padding; overrides `paddingBlock` on that edge. */
  paddingBlockEnd?: CenterSpacing
  /** Container width; numbers are pixels. */
  width?: CenterSizeValue
  /** Container height; numbers are pixels. */
  height?: CenterSizeValue
  /** Container max-width; numbers are pixels. */
  maxWidth?: CenterSizeValue
  /** Container min-height; numbers are pixels. */
  minHeight?: CenterSizeValue
  children?: ReadonlyArray<Html | string>
  class?: string
}>

export const center = <Msg>(props: CenterProps, h: HtmlBuilder<Msg>): Html => {
  const axis = props.axis ?? 'both'
  const paddingInlineStart =
    props.paddingInlineStart ?? props.paddingInline ?? props.padding
  const paddingInlineEnd =
    props.paddingInlineEnd ?? props.paddingInline ?? props.padding
  const paddingBlockStart =
    props.paddingBlockStart ?? props.paddingBlock ?? props.padding
  const paddingBlockEnd =
    props.paddingBlockEnd ?? props.paddingBlock ?? props.padding
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
  return h.div(
    [
      h.DataAttribute('slot', 'center'),
      h.DataAttribute('axis', axis),
      h.Class(
        cn(
          props.isInline === true ? 'inline-flex' : 'flex',
          axis === 'both' || axis === 'vertical' ? 'items-center' : undefined,
          axis === 'both' || axis === 'horizontal'
            ? 'justify-center'
            : undefined,
          paddingInlineStart === undefined
            ? undefined
            : paddingInlineStartClasses[paddingInlineStart],
          paddingInlineEnd === undefined
            ? undefined
            : paddingInlineEndClasses[paddingInlineEnd],
          paddingBlockStart === undefined
            ? undefined
            : paddingBlockStartClasses[paddingBlockStart],
          paddingBlockEnd === undefined
            ? undefined
            : paddingBlockEndClasses[paddingBlockEnd],
          props.class,
        ),
      ),
      ...(Object.keys(sizing).length > 0 ? [h.Style(sizing)] : []),
    ],
    [...(props.children ?? [])],
  )
}
