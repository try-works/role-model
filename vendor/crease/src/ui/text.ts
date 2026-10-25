import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

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

export const textVariants = cva('', {
  variants: {
    type: {
      body: 'text-sm leading-5',
      large: 'text-[1.0625rem] leading-6 font-semibold',
      label: 'text-sm leading-5 font-medium',
      supporting: 'text-xs leading-5',
      code: 'font-mono text-sm leading-5',
      'display-1': 'text-[2.625rem] leading-[3.25rem] font-normal',
      'display-2': 'text-[2.1875rem] leading-[2.75rem] font-normal',
      'display-3': 'text-[1.8125rem] leading-[2.25rem] font-normal',
      inherit: '[font:inherit] text-inherit leading-inherit',
    },
    color: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
      disabled: 'text-muted-foreground opacity-50',
      placeholder: 'text-muted-foreground',
      accent: 'text-primary',
      inherit: 'text-inherit',
    },
    size: {
      '4xs': 'text-[0.375rem]',
      '3xs': 'text-[0.4375rem]',
      '2xs': 'text-[0.5rem]',
      xsm: 'text-[0.625rem]',
      sm: 'text-xs',
      base: 'text-sm',
      lg: 'text-[1.0625rem]',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-[1.8125rem]',
      '4xl': 'text-[2.1875rem]',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    display: {
      inline: 'inline',
      block: 'block',
    },
    wordBreak: {
      'break-word': 'break-words',
      'break-all': 'break-all',
    },
    textWrap: {
      wrap: 'text-wrap',
      nowrap: 'text-nowrap',
      balance: 'text-balance',
      pretty: 'text-pretty',
    },
    justify: {
      start: 'text-start',
      center: 'text-center',
      end: 'text-end',
    },
    hasStrikethrough: {
      true: 'line-through',
    },
    hasTabularNumbers: {
      true: 'tabular-nums',
    },
  },
})

export type TextVariants = VariantProps<typeof textVariants>

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
  class?: string
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
      cn(
        textVariants({
          type,
          color,
          ...(props.size === undefined ? {} : { size: props.size }),
          ...(props.weight === undefined ? {} : { weight: props.weight }),
          display: resolvedDisplay,
          ...(maxLines > 0 ? { wordBreak: resolvedWordBreak } : {}),
          ...(props.textWrap === undefined ? {} : { textWrap: props.textWrap }),
          ...(justify === 'start' ? {} : { justify }),
          ...(props.hasStrikethrough === true
            ? { hasStrikethrough: true }
            : {}),
          ...(props.hasTabularNumbers === true
            ? { hasTabularNumbers: true }
            : {}),
        }),
        maxLines === 1 && 'truncate',
        props.class,
      ),
    ),
    ...(maxLines > 1
      ? [
          h.Style({
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            WebkitLineClamp: String(maxLines),
          }),
        ]
      : []),
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
