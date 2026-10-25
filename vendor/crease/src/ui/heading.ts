import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'
import type {
  TextColor,
  TextDisplay,
  TextJustify,
  TextWeight,
  TextWordBreak,
  TextWrap,
} from '@/ui/text'
import { textVariants } from '@/ui/text'

/* Ported from Meta Astryx Heading (packages/core/src/Heading/Heading.tsx) —
   examples and visual spec adapted to Crease UI tokens. */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingType = 'display-1' | 'display-2' | 'display-3'

export const headingVariants = cva('', {
  variants: {
    level: {
      1: 'text-2xl leading-8 font-semibold',
      2: 'text-xl leading-7 font-semibold',
      3: 'text-[1.0625rem] leading-6 font-semibold',
      4: 'text-sm leading-5 font-semibold',
      5: 'text-xs leading-5 font-semibold',
      6: 'text-[0.625rem] leading-4 font-semibold',
    },
  },
})

export type HeadingVariants = VariantProps<typeof headingVariants>

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
  class?: string
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
      cn(
        textVariants({
          ...(props.type === undefined ? {} : { type: props.type }),
          color,
          ...(props.weight === undefined ? {} : { weight: props.weight }),
          display: resolvedDisplay,
          ...(maxLines > 0 ? { wordBreak: resolvedWordBreak } : {}),
          ...(props.textWrap === undefined ? {} : { textWrap: props.textWrap }),
          ...(justify === 'start' ? {} : { justify }),
          ...(props.hasStrikethrough === true
            ? { hasStrikethrough: true }
            : {}),
        }),
        props.type === undefined
          ? headingVariants({ level: props.level })
          : textVariants({ type: props.type }),
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
