import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'
import type {
  TextColor,
  TextDisplay,
  TextJustify,
  TextWeight,
  TextWordBreak,
  TextWrap,
} from './text'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx Heading (packages/core/src/Heading/Heading.tsx) —
   examples and visual spec adapted to Crease UI tokens. */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingType = 'display-1' | 'display-2' | 'display-3'

const levelStyles = stylex.create({
  '1': {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: '2rem',
  },
  '2': {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: '1.75rem',
  },
  '3': {
    fontSize: '1.0625rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  },
  '4': {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  },
  '5': {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  },
  '6': {
    fontSize: '0.625rem',
    fontWeight: 600,
    lineHeight: '1rem',
  },
})

const typeStyles = stylex.create({
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
})

export type HeadingProps = Readonly<{
  children: ReadonlyArray<Html | string>
  level: HeadingLevel
  type?: HeadingType
  weight?: TextWeight
  accessibilityLevel?: HeadingLevel
  color?: TextColor
  display?: TextDisplay
  maxLines?: number
  wordBreak?: TextWordBreak
  textWrap?: TextWrap
  justify?: TextJustify
  hasCapsize?: boolean
  hasStrikethrough?: boolean
  layoutStyle?: ComponentLayoutStyle
}>

export const heading = <Msg>(
  props: HeadingProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const color = props.color ?? 'primary'
  const maxLines = props.maxLines ?? 0
  const resolvedWordBreak =
    props.wordBreak ?? (maxLines === 1 ? 'break-all' : 'break-word')
  const resolvedDisplay =
    maxLines > 0 || props.hasCapsize === true
      ? 'block'
      : (props.display ?? 'block')
  const justify = props.justify ?? 'start'

  const attributes = [
    h.DataAttribute('slot', 'heading'),
    h.DataAttribute('level', String(props.level)),
    h.DataAttribute('color', color),
    h.Class(
      className(
        reset.text,
        colorStyles[color],
        props.type === undefined
          ? levelStyles[props.level]
          : typeStyles[props.type],
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
        props.layoutStyle,
      ),
    ),
    ...(maxLines > 1 ? [h.Style({ WebkitLineClamp: String(maxLines) })] : []),
    ...(props.hasCapsize === true
      ? [h.Style({ textBoxEdge: 'cap alphabetic', textBoxTrim: 'trim-both' })]
      : []),
    ...(props.accessibilityLevel !== undefined &&
    props.accessibilityLevel !== props.level
      ? [h.AriaLevel(props.accessibilityLevel)]
      : []),
  ]

  switch (props.level) {
    case 1:
      return h.h1(attributes, [...props.children])
    case 2:
      return h.h2(attributes, [...props.children])
    case 3:
      return h.h3(attributes, [...props.children])
    case 4:
      return h.h4(attributes, [...props.children])
    case 5:
      return h.h5(attributes, [...props.children])
    case 6:
      return h.h6(attributes, [...props.children])
  }
}
