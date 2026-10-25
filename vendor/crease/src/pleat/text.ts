import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens'

/* Ported from Meta Astryx Text (packages/core/src/Text/Text.tsx) — examples and
   visual spec adapted to Crease UI tokens. */

export type TextType =
  | 'body'
  | 'large'
  | 'label'
  | 'supporting'
  | 'code'
  | 'display-1'
  | 'display-2'
  | 'display-3'
  | 'inherit'

export type TextSize =
  | '4xs'
  | '3xs'
  | '2xs'
  | 'xsm'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'placeholder'
  | 'accent'
  | 'inherit'

export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export type TextDisplay = 'inline' | 'block'

export type TextJustify = 'start' | 'center' | 'end'

export type TextWordBreak = 'break-word' | 'break-all'

export type TextWrap = 'wrap' | 'nowrap' | 'balance' | 'pretty'

export type TextElement = 'span' | 'p' | 'div' | 'label' | 'h1' | 'h2' | 'h3'

const typeStyles = {
  body: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  large: Style.make({
    fontSize: '1.0625rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  }),
  label: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  supporting: Style.make({ fontSize: '0.75rem', lineHeight: '1.25rem' }),
  code: Style.make({
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  'display-1': Style.make({
    fontSize: '2.625rem',
    fontWeight: 400,
    lineHeight: '3.25rem',
  }),
  'display-2': Style.make({
    fontSize: '2.1875rem',
    fontWeight: 400,
    lineHeight: '2.75rem',
  }),
  'display-3': Style.make({
    fontSize: '1.8125rem',
    fontWeight: 400,
    lineHeight: '2.25rem',
  }),
  inherit: Style.make({
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
  }),
}

const colorStyles = {
  primary: Style.make({ color: tokens.foreground }),
  secondary: Style.make({ color: tokens.mutedForeground }),
  disabled: Style.make({ color: tokens.mutedForeground, opacity: 0.5 }),
  placeholder: Style.make({ color: tokens.mutedForeground }),
  accent: Style.make({ color: tokens.primary }),
  inherit: Style.make({ color: 'currentColor' }),
}

const sizeStyles = {
  '4xs': Style.make({ fontSize: '0.375rem' }),
  '3xs': Style.make({ fontSize: '0.4375rem' }),
  '2xs': Style.make({ fontSize: '0.5rem' }),
  xsm: Style.make({ fontSize: '0.625rem' }),
  sm: Style.make({ fontSize: '0.75rem', lineHeight: '1rem' }),
  base: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  lg: Style.make({ fontSize: '1.0625rem' }),
  xl: Style.make({ fontSize: '1.25rem', lineHeight: '1.75rem' }),
  '2xl': Style.make({ fontSize: '1.5rem', lineHeight: '2rem' }),
  '3xl': Style.make({ fontSize: '1.8125rem' }),
  '4xl': Style.make({ fontSize: '2.1875rem' }),
}

const weightStyles = {
  normal: Style.make({ fontWeight: 400 }),
  medium: Style.make({ fontWeight: 500 }),
  semibold: Style.make({ fontWeight: 600 }),
  bold: Style.make({ fontWeight: 700 }),
}

const displayStyles = {
  inline: Style.make({ display: 'inline' }),
  block: Style.make({ display: 'block' }),
}

const truncationStyles = {
  singleLine: Style.make({
    overflow: 'hidden',
    display: 'block',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  multiLine: Style.make({
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    display: '-webkit-box',
  }),
}

const wordBreakStyles = {
  'break-word': Style.make({ overflowWrap: 'break-word', wordBreak: 'normal' }),
  'break-all': Style.make({ wordBreak: 'break-all' }),
}

const textWrapStyles = {
  wrap: Style.make({ textWrap: 'wrap' }),
  nowrap: Style.make({ textWrap: 'nowrap' }),
  balance: Style.make({ textWrap: 'balance' }),
  pretty: Style.make({ textWrap: 'pretty' }),
}

const justifyStyles = {
  center: Style.make({ textAlign: 'center' }),
  end: Style.make({ textAlign: 'end' }),
}

const decorationStyles = {
  strikethrough: Style.make({ textDecoration: 'line-through' }),
  tabularNumbers: Style.make({ fontVariantNumeric: 'tabular-nums' }),
}

const defaultColorByType: Record<TextType, TextColor> = {
  body: 'primary',
  large: 'primary',
  label: 'primary',
  supporting: 'secondary',
  code: 'primary',
  'display-1': 'primary',
  'display-2': 'primary',
  'display-3': 'primary',
  inherit: 'inherit',
}

export type TextProps = Readonly<{
  children: ReadonlyArray<Html | string>
  type?: TextType
  size?: TextSize
  color?: TextColor
  weight?: TextWeight
  display?: TextDisplay
  maxLines?: number
  wordBreak?: TextWordBreak
  textWrap?: TextWrap
  justify?: TextJustify
  hasCapsize?: boolean
  hasStrikethrough?: boolean
  hasTabularNumbers?: boolean
  as?: TextElement
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export const text = <Msg>(props: TextProps, h: HtmlBuilder<Msg>): Html => {
  const type = props.type ?? 'body'
  const color = props.color ?? defaultColorByType[type]
  const maxLines = props.maxLines ?? 0
  const resolvedWordBreak =
    props.wordBreak ?? (maxLines === 1 ? 'break-all' : 'break-word')
  const resolvedDisplay =
    maxLines > 0 || props.hasCapsize === true
      ? 'block'
      : (props.display ?? 'inline')
  const justify = props.justify ?? 'start'

  const attributes = [
    h.DataAttribute('slot', 'text'),
    h.DataAttribute('type', type),
    h.DataAttribute('color', color),
    h.Class(
      className(
        reset.text,
        colorStyles[color],
        typeStyles[type],
        ...(props.size === undefined ? [] : [sizeStyles[props.size]]),
        ...(props.weight === undefined ? [] : [weightStyles[props.weight]]),
        maxLines === 1
          ? truncationStyles.singleLine
          : maxLines > 1
            ? truncationStyles.multiLine
            : displayStyles[resolvedDisplay],
        ...(maxLines > 0 ? [wordBreakStyles[resolvedWordBreak]] : []),
        ...(props.textWrap === undefined
          ? []
          : [textWrapStyles[props.textWrap]]),
        ...(justify === 'start' ? [] : [justifyStyles[justify]]),
        ...(props.hasStrikethrough === true
          ? [decorationStyles.strikethrough]
          : []),
        ...(props.hasTabularNumbers === true
          ? [decorationStyles.tabularNumbers]
          : []),
        props.layoutStyle,
      ),
    ),
    ...(maxLines > 1 ? [h.Style({ WebkitLineClamp: String(maxLines) })] : []),
    ...(props.hasCapsize === true
      ? [h.Style({ textBoxEdge: 'cap alphabetic', textBoxTrim: 'trim-both' })]
      : []),
  ]

  const element = props.as ?? 'span'
  switch (element) {
    case 'p':
      return h.p(attributes, [...props.children])
    case 'div':
      return h.div(attributes, [...props.children])
    case 'label':
      return h.label(attributes, [...props.children])
    case 'h1':
      return h.h1(attributes, [...props.children])
    case 'h2':
      return h.h2(attributes, [...props.children])
    case 'h3':
      return h.h3(attributes, [...props.children])
    case 'span':
      return h.span(attributes, [...props.children])
  }
}
