import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens.stylex'

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

const typeStyles = stylex.create({
  body: {
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  large: {
    fontSize: '1.0625rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  supporting: {
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  },
  code: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  'display-1': {
    fontSize: '2.625rem',
    fontWeight: 400,
    lineHeight: '3.25rem',
  },
  'display-2': {
    fontSize: '2.1875rem',
    fontWeight: 400,
    lineHeight: '2.75rem',
  },
  'display-3': {
    fontSize: '1.8125rem',
    fontWeight: 400,
    lineHeight: '2.25rem',
  },
  inherit: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
  },
})

const colorStyles = stylex.create({
  primary: {
    color: tokens.foreground,
  },
  secondary: {
    color: tokens.mutedForeground,
  },
  /* PORT-NOTE: needs token 'textDisabled' = light #A4B0BC / dark #6F747C —
     astryx's dedicated disabled text color; mutedForeground + opacity is the
     nearest existing token. */
  disabled: {
    color: tokens.mutedForeground,
    opacity: 0.5,
  },
  placeholder: {
    color: tokens.mutedForeground,
  },
  accent: {
    color: tokens.primary,
  },
  inherit: {
    color: 'currentColor',
  },
})

const sizeStyles = stylex.create({
  '4xs': {
    fontSize: '0.375rem',
  },
  '3xs': {
    fontSize: '0.4375rem',
  },
  '2xs': {
    fontSize: '0.5rem',
  },
  xsm: {
    fontSize: '0.625rem',
  },
  sm: {
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  base: {
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  lg: {
    fontSize: '1.0625rem',
  },
  xl: {
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
  },
  '2xl': {
    fontSize: '1.5rem',
    lineHeight: '2rem',
  },
  '3xl': {
    fontSize: '1.8125rem',
  },
  '4xl': {
    fontSize: '2.1875rem',
  },
})

const weightStyles = stylex.create({
  normal: {
    fontWeight: 400,
  },
  medium: {
    fontWeight: 500,
  },
  semibold: {
    fontWeight: 600,
  },
  bold: {
    fontWeight: 700,
  },
})

const displayStyles = stylex.create({
  inline: {
    display: 'inline',
  },
  block: {
    display: 'block',
  },
})

const truncationStyles = stylex.create({
  singleLine: {
    overflow: 'hidden',
    display: 'block',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  multiLine: {
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    display: '-webkit-box',
  },
})

const wordBreakStyles = stylex.create({
  'break-word': {
    overflowWrap: 'break-word',
    wordBreak: 'normal',
  },
  'break-all': {
    wordBreak: 'break-all',
  },
})

const textWrapStyles = stylex.create({
  wrap: {
    textWrap: 'wrap',
  },
  nowrap: {
    textWrap: 'nowrap',
  },
  balance: {
    textWrap: 'balance',
  },
  pretty: {
    textWrap: 'pretty',
  },
})

const justifyStyles = stylex.create({
  center: {
    textAlign: 'center',
  },
  end: {
    textAlign: 'end',
  },
})

const decorationStyles = stylex.create({
  strikethrough: {
    textDecoration: 'line-through',
  },
  tabularNumbers: {
    fontVariantNumeric: 'tabular-nums',
  },
})

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
  layoutStyle?: ComponentLayoutStyle
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
