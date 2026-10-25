import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Stack/Stack.tsx + StackItem.tsx — direction-aware
   flex layout. The astryx spacing scale (1 step = 4px) maps 1:1 onto
   Tailwind's spacing scale, so gap/padding props emit literal utilities. */

export type StackDirection = 'horizontal' | 'vertical'
export type StackMainAlignment =
  | 'start'
  | 'center'
  | 'end'
  | 'between'
  | 'around'
  | 'evenly'
export type StackCrossAlignment = 'start' | 'center' | 'end' | 'stretch'
export type StackAlignment = StackMainAlignment | StackCrossAlignment
export type StackWrap = 'nowrap' | 'wrap' | 'wrap-reverse'
export type StackSpacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10
export type StackItemSize = 'static' | 'fill'
export type StackItemCrossAlignSelf = 'start' | 'center' | 'end' | 'stretch'
export type StackSizeValue = number | string
export type StackElement =
  | 'article'
  | 'aside'
  | 'div'
  | 'fieldset'
  | 'footer'
  | 'form'
  | 'header'
  | 'li'
  | 'main'
  | 'nav'
  | 'ol'
  | 'section'
  | 'span'
  | 'ul'

const directionClasses: Record<StackDirection, string> = {
  horizontal: 'flex-row',
  vertical: 'flex-col',
}

const mainAlignClasses: Record<StackMainAlignment, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

const crossAlignClasses: Record<StackCrossAlignment, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

const crossAlignSelfClasses: Record<StackItemCrossAlignSelf, string> = {
  start: 'self-start',
  center: 'self-center',
  end: 'self-end',
  stretch: 'self-stretch',
}

const wrapClasses: Record<StackWrap, string> = {
  nowrap: 'flex-nowrap',
  wrap: 'flex-wrap',
  'wrap-reverse': 'flex-wrap-reverse',
}

const gapClasses: Record<StackSpacing, string> = {
  0: 'gap-0',
  0.5: 'gap-0.5',
  1: 'gap-1',
  1.5: 'gap-1.5',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
}

const paddingInlineStartClasses: Record<StackSpacing, string> = {
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

const paddingInlineEndClasses: Record<StackSpacing, string> = {
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

const paddingBlockStartClasses: Record<StackSpacing, string> = {
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

const paddingBlockEndClasses: Record<StackSpacing, string> = {
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

const sizeValue = (value: StackSizeValue): string =>
  typeof value === 'number' ? `${value}px` : value

const sizingStyle = (
  props: Readonly<{
    width?: StackSizeValue
    height?: StackSizeValue
    maxWidth?: StackSizeValue
    minHeight?: StackSizeValue
  }>,
): Record<string, string> => ({
  ...(props.width === undefined ? {} : { width: sizeValue(props.width) }),
  ...(props.height === undefined ? {} : { height: sizeValue(props.height) }),
  ...(props.maxWidth === undefined
    ? {}
    : { maxWidth: sizeValue(props.maxWidth) }),
  ...(props.minHeight === undefined
    ? {}
    : { minHeight: sizeValue(props.minHeight) }),
})

const elementFor = <Msg>(
  element: StackElement,
  h: HtmlBuilder<Msg>,
  attributes: ReadonlyArray<Attribute<Msg> | ChildAttribute>,
  children: ReadonlyArray<Html | string>,
): Html => h[element](attributes, children)

export type StackProps = Readonly<{
  /**
   * Direction of the stack layout.
   * - `horizontal`: items flow left-to-right (hStack)
   * - `vertical`: items flow top-to-bottom (vStack, the default)
   */
  direction?: StackDirection
  /**
   * Horizontal alignment of items.
   * - `horizontal`: main axis (justify-content)
   * - `vertical`: cross axis (align-items)
   */
  hAlign?: StackAlignment
  /**
   * Vertical alignment of items.
   * - `horizontal`: cross axis (align-items)
   * - `vertical`: main axis (justify-content)
   */
  vAlign?: StackAlignment
  /** Main-axis alignment alias; resolves against `direction`. */
  justify?: StackMainAlignment
  /** Cross-axis alignment alias; resolves against `direction`. */
  align?: StackCrossAlignment
  /** Spacing between items on the astryx spacing scale. */
  gap?: StackSpacing
  /** Inner padding on all sides. */
  padding?: StackSpacing
  /** Inline (horizontal) padding; overrides `padding` on that axis. */
  paddingInline?: StackSpacing
  /** Inline-start padding; overrides `paddingInline` on that edge. */
  paddingInlineStart?: StackSpacing
  /** Inline-end padding; overrides `paddingInline` on that edge. */
  paddingInlineEnd?: StackSpacing
  /** Block (vertical) padding; overrides `padding` on that axis. */
  paddingBlock?: StackSpacing
  /** Block-start padding; overrides `paddingBlock` on that edge. */
  paddingBlockStart?: StackSpacing
  /** Block-end padding; overrides `paddingBlock` on that edge. */
  paddingBlockEnd?: StackSpacing
  /** Enables scrollable overflow (overflow: auto). */
  isScrollable?: boolean
  /** Flex wrap behavior. */
  wrap?: StackWrap
  /** Container width; numbers are pixels. */
  width?: StackSizeValue
  /** Container height; numbers are pixels. */
  height?: StackSizeValue
  /** Container max-width; numbers are pixels. */
  maxWidth?: StackSizeValue
  /** Container min-height; numbers are pixels. */
  minHeight?: StackSizeValue
  /** The element to render. */
  as?: StackElement
  children?: ReadonlyArray<Html | string>
  class?: string
}>

export const stack = <Msg>(props: StackProps, h: HtmlBuilder<Msg>): Html => {
  const direction = props.direction ?? 'vertical'
  const resolvedHAlign =
    props.hAlign ?? (direction === 'horizontal' ? props.justify : props.align)
  const resolvedVAlign =
    props.vAlign ?? (direction === 'horizontal' ? props.align : props.justify)
  const mainAlign = (
    direction === 'horizontal' ? resolvedHAlign : resolvedVAlign
  ) as StackMainAlignment | undefined
  const crossAlign = (
    direction === 'horizontal' ? resolvedVAlign : resolvedHAlign
  ) as StackCrossAlignment | undefined

  const paddingInlineStart =
    props.paddingInlineStart ?? props.paddingInline ?? props.padding
  const paddingInlineEnd =
    props.paddingInlineEnd ?? props.paddingInline ?? props.padding
  const paddingBlockStart =
    props.paddingBlockStart ?? props.paddingBlock ?? props.padding
  const paddingBlockEnd =
    props.paddingBlockEnd ?? props.paddingBlock ?? props.padding
  const sizing = sizingStyle(props)

  return elementFor(
    props.as ?? 'div',
    h,
    [
      h.DataAttribute('slot', 'stack'),
      h.DataAttribute('direction', direction),
      h.Class(
        cn(
          'flex',
          directionClasses[direction],
          props.gap === undefined ? undefined : gapClasses[props.gap],
          mainAlign === undefined ? undefined : mainAlignClasses[mainAlign],
          crossAlign === undefined ? undefined : crossAlignClasses[crossAlign],
          props.wrap === undefined ? undefined : wrapClasses[props.wrap],
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
          props.isScrollable === true ? 'overflow-auto' : undefined,
          props.class,
        ),
      ),
      ...(Object.keys(sizing).length > 0 ? [h.Style(sizing)] : []),
    ],
    [...(props.children ?? [])],
  )
}

export const hStack = <Msg>(
  props: Omit<StackProps, 'direction'>,
  h: HtmlBuilder<Msg>,
): Html => stack({ ...props, direction: 'horizontal' }, h)

export const vStack = <Msg>(
  props: Omit<StackProps, 'direction'>,
  h: HtmlBuilder<Msg>,
): Html => stack({ ...props, direction: 'vertical' }, h)

export type StackItemProps = Readonly<{
  /** Overrides the parent stack's cross-axis alignment for this item. */
  crossAlignSelf?: StackItemCrossAlignSelf
  /**
   * Size behavior within the stack.
   * - `static`: intrinsic size, never grows or shrinks (default)
   * - `fill`: grows to fill remaining space
   */
  size?: StackItemSize
  /** Enables scrollable overflow (overflow: auto). */
  isScrollable?: boolean
  /** The element to render. */
  as?: StackElement
  children?: ReadonlyArray<Html | string>
  class?: string
}>

export const stackItem = <Msg>(
  props: StackItemProps,
  h: HtmlBuilder<Msg>,
): Html =>
  elementFor(
    props.as ?? 'div',
    h,
    [
      h.DataAttribute('slot', 'stack-item'),
      h.DataAttribute('size', props.size ?? 'static'),
      h.Class(
        cn(
          'min-h-0 min-w-0',
          props.size === 'fill' ? 'grow' : 'shrink-0 grow-0',
          props.crossAlignSelf === undefined
            ? undefined
            : crossAlignSelfClasses[props.crossAlignSelf],
          props.isScrollable === true ? 'overflow-auto' : undefined,
          props.class,
        ),
      ),
    ],
    [...(props.children ?? [])],
  )
