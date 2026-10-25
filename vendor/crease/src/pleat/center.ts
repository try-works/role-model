import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'

/* Ported from Meta Astryx Center/Center.tsx — flex centering on the flex
   main/cross axes. Padding steps use literal rem values on the same 4px
   scale (0.5 → 0.125rem, 1 → 0.25rem, … 10 → 2.5rem). */

const displayStyles = {
  flex: Style.make({ display: 'flex' }),
  'inline-flex': Style.make({ display: 'inline-flex' }),
}

const justifyStyles = {
  center: Style.make({ justifyContent: 'center' }),
}

const alignStyles = {
  center: Style.make({ alignItems: 'center' }),
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

export type CenterAxis = 'both' | 'horizontal' | 'vertical'
export type CenterSpacing = keyof typeof paddingInlineStartStyles
export type CenterSizeValue = number | string

export type CenterProps = Readonly<{
  axis?: CenterAxis
  isInline?: boolean
  padding?: CenterSpacing
  paddingInline?: CenterSpacing
  paddingInlineStart?: CenterSpacing
  paddingInlineEnd?: CenterSpacing
  paddingBlock?: CenterSpacing
  paddingBlockStart?: CenterSpacing
  paddingBlockEnd?: CenterSpacing
  width?: CenterSizeValue
  height?: CenterSizeValue
  maxWidth?: CenterSizeValue
  minHeight?: CenterSizeValue
  children?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const sizeValue = (value: CenterSizeValue): string =>
  typeof value === 'number' ? `${value}px` : value

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
        className(
          props.isInline === true
            ? displayStyles['inline-flex']
            : displayStyles.flex,
          axis === 'both' || axis === 'vertical'
            ? alignStyles.center
            : undefined,
          axis === 'both' || axis === 'horizontal'
            ? justifyStyles.center
            : undefined,
          paddingInlineStart === undefined
            ? undefined
            : paddingInlineStartStyles[paddingInlineStart],
          paddingInlineEnd === undefined
            ? undefined
            : paddingInlineEndStyles[paddingInlineEnd],
          paddingBlockStart === undefined
            ? undefined
            : paddingBlockStartStyles[paddingBlockStart],
          paddingBlockEnd === undefined
            ? undefined
            : paddingBlockEndStyles[paddingBlockEnd],
          props.layoutStyle,
        ),
      ),
      ...(Object.keys(sizing).length > 0 ? [h.Style(sizing)] : []),
    ],
    [...(props.children ?? [])],
  )
}
