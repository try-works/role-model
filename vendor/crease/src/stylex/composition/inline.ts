import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { className } from '../style'
import { tokens } from '../tokens.stylex'
import { primitiveAttributes, primitiveElement } from './element'
import { columnGapStyle } from './space'
import type {
  LayoutElement,
  PrimitiveChildren,
  PrimitiveData,
  SpaceToken,
} from './types'

export type InlineProps = Readonly<{
  align?: 'start' | 'center' | 'end' | 'stretch'
  as?: LayoutElement
  children: PrimitiveChildren
  data?: PrimitiveData
  gap?: SpaceToken
  justify?: 'start' | 'center' | 'end' | 'between'
  minWidth?: 'none' | 'maxContent'
  slot?: string
  variant?: 'default' | 'sectionTabs'
  width?: 'auto' | 'full'
  wrap?: boolean
}>

const styles = stylex.create({
  alignCenter: { alignItems: 'center' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  alignStretch: { alignItems: 'stretch' },
  base: { display: 'flex', flexDirection: 'row' },
  justifyBetween: { justifyContent: 'space-between' },
  justifyCenter: { justifyContent: 'center' },
  justifyEnd: { justifyContent: 'flex-end' },
  justifyStart: { justifyContent: 'flex-start' },
  minWidthMaxContent: { minWidth: 'max-content' },
  minWidthNone: { minWidth: 0 },
  noWrap: { flexWrap: 'nowrap' },
  sectionTabs: {
    gap: '0.25rem',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    paddingBottom: '0.5rem',
  },
  widthAuto: { width: 'auto' },
  widthFull: { width: '100%' },
  wrap: { flexWrap: 'wrap' },
})

export const inline = <Message>(
  props: InlineProps,
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
  const minWidth =
    props.minWidth === undefined
      ? []
      : [
          { maxContent: styles.minWidthMaxContent, none: styles.minWidthNone }[
            props.minWidth
          ],
        ]
  const width =
    props.width === undefined
      ? []
      : [{ auto: styles.widthAuto, full: styles.widthFull }[props.width]]
  const variant = props.variant === 'sectionTabs' ? [styles.sectionTabs] : []
  return primitiveElement(
    props.as ?? 'div',
    primitiveAttributes(
      className(
        styles.base,
        ...variant,
        ...align,
        ...justify,
        ...minWidth,
        ...width,
        props.wrap === undefined
          ? []
          : props.wrap
            ? styles.wrap
            : styles.noWrap,
        ...columnGapStyle(props.gap),
      ),
      props.slot,
      props.data,
      h,
    ),
    props.children,
    h,
  )
}
