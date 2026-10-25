import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { className } from '../style'
import { primitiveAttributes, primitiveElement } from './element'
import { gapStyles, paddingStyles } from './space'
import type {
  LayoutElement,
  PrimitiveChildren,
  PrimitiveData,
  ResponsiveSpaceToken,
} from './types'

export type StackProps = Readonly<{
  align?: 'start' | 'center' | 'end' | 'stretch'
  as?: LayoutElement
  children: PrimitiveChildren
  data?: PrimitiveData
  gap?: ResponsiveSpaceToken
  gridColumn?: 'auto' | 'span2'
  justify?: 'start' | 'center' | 'end' | 'between'
  padding?: ResponsiveSpaceToken
  preset?: 'default' | 'chartGallery'
  rendering?: 'eager' | 'deferred'
  slot?: string
  width?: 'auto' | 'full'
}>

const styles = stylex.create({
  alignCenter: { alignItems: 'center' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  alignStretch: { alignItems: 'stretch' },
  base: { display: 'flex', flexDirection: 'column' },
  chartGallery: {
    gap: '2rem',
    marginInline: 'auto',
    paddingBlock: '2rem',
    paddingInline: {
      default: '1rem',
      '@media (min-width: 768px)': '2rem',
    },
    boxSizing: 'border-box',
    maxWidth: '87.5rem',
    width: '100%',
  },
  gridColumnAuto: { gridColumn: 'auto' },
  gridColumnSpan2: { gridColumnEnd: 'span 2', gridColumnStart: 'span 2' },
  justifyBetween: { justifyContent: 'space-between' },
  justifyCenter: { justifyContent: 'center' },
  justifyEnd: { justifyContent: 'flex-end' },
  justifyStart: { justifyContent: 'flex-start' },
  renderingDeferred: {
    containIntrinsicSize: '380px 1200px',
    contentVisibility: 'auto',
  },
  renderingEager: { contentVisibility: 'visible' },
  widthAuto: { width: 'auto' },
  widthFull: { width: '100%' },
})

export const stack = <Message>(
  props: StackProps,
  h: HtmlBuilder<Message>,
): Html => {
  const align =
    props.align === undefined
      ? []
      : [
          {
            center: styles.alignCenter,
            end: styles.alignEnd,
            start: styles.alignStart,
            stretch: styles.alignStretch,
          }[props.align],
        ]
  const gridColumn =
    props.gridColumn === undefined
      ? []
      : [
          {
            auto: styles.gridColumnAuto,
            span2: styles.gridColumnSpan2,
          }[props.gridColumn],
        ]
  const justify =
    props.justify === undefined
      ? []
      : [
          {
            between: styles.justifyBetween,
            center: styles.justifyCenter,
            end: styles.justifyEnd,
            start: styles.justifyStart,
          }[props.justify],
        ]
  const rendering =
    props.rendering === undefined
      ? []
      : [
          {
            deferred: styles.renderingDeferred,
            eager: styles.renderingEager,
          }[props.rendering],
        ]
  const width =
    props.width === undefined
      ? []
      : [{ auto: styles.widthAuto, full: styles.widthFull }[props.width]]
  const preset = props.preset === 'chartGallery' ? [styles.chartGallery] : []
  return primitiveElement(
    props.as ?? 'div',
    primitiveAttributes(
      className(
        styles.base,
        ...preset,
        ...align,
        ...justify,
        ...gapStyles(props.gap),
        ...paddingStyles(props.padding),
        ...gridColumn,
        ...rendering,
        ...width,
      ),
      props.slot,
      props.data,
      h,
    ),
    props.children,
    h,
  )
}
