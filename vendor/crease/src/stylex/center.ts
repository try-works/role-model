import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'

/* Ported from Meta Astryx Center/Center.tsx — flex centering on the flex
   main/cross axes. Padding steps use literal rem values on the same 4px
   scale (0.5 → 0.125rem, 1 → 0.25rem, … 10 → 2.5rem). */

const displayStyles = stylex.create({
  flex: { display: 'flex' },
  'inline-flex': { display: 'inline-flex' },
})

const justifyStyles = stylex.create({
  center: { justifyContent: 'center' },
})

const alignStyles = stylex.create({
  center: { alignItems: 'center' },
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
  layoutStyle?: ComponentLayoutStyle
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
