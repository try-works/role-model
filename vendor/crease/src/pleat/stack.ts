import { Style } from '@pleat/core'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'

/* Ported from Meta Astryx Stack/stack.stylex.ts + stackItem.stylex.ts —
   same style tables; astryx spacing vars become literal rem values on the
   identical 4px scale (0.5 → 0.125rem, 1 → 0.25rem, … 10 → 2.5rem). */
const directionStyles = {
  horizontal: Style.make({ flexDirection: 'row' }),
  vertical: Style.make({ flexDirection: 'column' }),
}

const mainAlignStyles = {
  start: Style.make({ justifyContent: 'flex-start' }),
  center: Style.make({ justifyContent: 'center' }),
  end: Style.make({ justifyContent: 'flex-end' }),
  between: Style.make({ justifyContent: 'space-between' }),
  around: Style.make({ justifyContent: 'space-around' }),
  evenly: Style.make({ justifyContent: 'space-evenly' }),
}

const crossAlignStyles = {
  start: Style.make({ alignItems: 'flex-start' }),
  center: Style.make({ alignItems: 'center' }),
  end: Style.make({ alignItems: 'flex-end' }),
  stretch: Style.make({ alignItems: 'stretch' }),
}

const crossAlignSelfStyles = {
  start: Style.make({ alignSelf: 'flex-start' }),
  center: Style.make({ alignSelf: 'center' }),
  end: Style.make({ alignSelf: 'flex-end' }),
  stretch: Style.make({ alignSelf: 'stretch' }),
}

const wrapStyles = {
  nowrap: Style.make({ flexWrap: 'nowrap' }),
  wrap: Style.make({ flexWrap: 'wrap' }),
  'wrap-reverse': Style.make({ flexWrap: 'wrap-reverse' }),
}

const gapStyles = {
  0: Style.make({ columnGap: '0px', rowGap: '0px' }),
  0.5: Style.make({ columnGap: '0.125rem', rowGap: '0.125rem' }),
  1: Style.make({ columnGap: '0.25rem', rowGap: '0.25rem' }),
  1.5: Style.make({ columnGap: '0.375rem', rowGap: '0.375rem' }),
  2: Style.make({ columnGap: '0.5rem', rowGap: '0.5rem' }),
  3: Style.make({ columnGap: '0.75rem', rowGap: '0.75rem' }),
  4: Style.make({ columnGap: '1rem', rowGap: '1rem' }),
  5: Style.make({ columnGap: '1.25rem', rowGap: '1.25rem' }),
  6: Style.make({ columnGap: '1.5rem', rowGap: '1.5rem' }),
  8: Style.make({ columnGap: '2rem', rowGap: '2rem' }),
  10: Style.make({ columnGap: '2.5rem', rowGap: '2.5rem' }),
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

const baseStyles = {
  stack: Style.make({ display: 'flex' }),
  scrollable: Style.make({ overflow: 'auto' }),
}

const stackItemStyles = {
  base: Style.make({ minHeight: 0, minWidth: 0 }),
  fill: Style.make({ flexGrow: 1 }),
  static: Style.make({ flexGrow: 0, flexShrink: 0 }),
}

export type StackDirection = keyof typeof directionStyles
export type StackMainAlignment = keyof typeof mainAlignStyles
export type StackCrossAlignment = keyof typeof crossAlignStyles
export type StackAlignment = StackMainAlignment | StackCrossAlignment

const isMainAlignment = (
  value: StackAlignment | undefined,
): value is StackMainAlignment =>
  value !== undefined && Object.hasOwn(mainAlignStyles, value)
const isCrossAlignment = (
  value: StackAlignment | undefined,
): value is StackCrossAlignment =>
  value !== undefined && Object.hasOwn(crossAlignStyles, value)

const elementReset = (element: StackElement = 'div') =>
  element === 'ul' || element === 'ol'
    ? reset.list
    : element === 'fieldset'
      ? reset.fieldset
      : undefined
export type StackWrap = keyof typeof wrapStyles
export type StackSpacing = keyof typeof gapStyles
export type StackItemSize = 'static' | 'fill'
export type StackItemCrossAlignSelf = keyof typeof crossAlignSelfStyles
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
  ariaLabel?: string
  children?: ReadonlyArray<Html | string>
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export const stack = <Msg>(props: StackProps, h: HtmlBuilder<Msg>): Html => {
  const direction = props.direction ?? 'vertical'
  const resolvedHAlign =
    props.hAlign ?? (direction === 'horizontal' ? props.justify : props.align)
  const resolvedVAlign =
    props.vAlign ?? (direction === 'horizontal' ? props.align : props.justify)
  const mainAlign = direction === 'horizontal' ? resolvedHAlign : resolvedVAlign
  const crossAlign =
    direction === 'horizontal' ? resolvedVAlign : resolvedHAlign

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
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.Class(
        className(
          elementReset(props.as),
          baseStyles.stack,
          directionStyles[direction],
          ...(props.gap === undefined ? [] : [gapStyles[props.gap]]),
          isMainAlignment(mainAlign) && mainAlignStyles[mainAlign],
          isCrossAlignment(crossAlign) && crossAlignStyles[crossAlign],
          ...(props.wrap === undefined ? [] : [wrapStyles[props.wrap]]),
          ...(paddingInlineStart === undefined
            ? []
            : [paddingInlineStartStyles[paddingInlineStart]]),
          ...(paddingInlineEnd === undefined
            ? []
            : [paddingInlineEndStyles[paddingInlineEnd]]),
          ...(paddingBlockStart === undefined
            ? []
            : [paddingBlockStartStyles[paddingBlockStart]]),
          ...(paddingBlockEnd === undefined
            ? []
            : [paddingBlockEndStyles[paddingBlockEnd]]),
          ...(props.isScrollable === true ? [baseStyles.scrollable] : []),
          props.layoutStyle,
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
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle | undefined
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
        className(
          elementReset(props.as),
          stackItemStyles.base,
          props.size === 'fill' ? stackItemStyles.fill : stackItemStyles.static,
          ...(props.crossAlignSelf === undefined
            ? []
            : [crossAlignSelfStyles[props.crossAlignSelf]]),
          ...(props.isScrollable === true ? [baseStyles.scrollable] : []),
          props.layoutStyle,
        ),
      ),
    ],
    [...(props.children ?? [])],
  )
