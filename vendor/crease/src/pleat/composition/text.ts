import { Style, When, Theme } from '@pleat/core'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { reset } from '../reset'
import { className } from '../style'
import { tokens } from '../tokens'
import { compositionTokens } from './composition-tokens.const'
import { semanticSystemTheme } from './semantic-theme'
import type { PrimitiveData } from './types'

export type TextElement =
  | 'div'
  | 'span'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'strong'
  | 'code'
export type TextVariant =
  | 'inherit'
  | 'body'
  | 'caption'
  | 'label'
  | 'headingSm'
  | 'headingMd'
  | 'display'
  | 'hero'
  | 'chartTitle'
  | 'chartLead'
export type TextTone = 'primary' | 'secondary' | 'accent' | 'danger'

export type TextProps = Readonly<{
  as?: TextElement
  children: ReadonlyArray<Html | string>
  align?: 'left' | 'center' | 'right'
  data?: PrimitiveData
  measure?: 'none' | 'hero'
  numeric?: 'proportional' | 'tabular'
  tone?: TextTone
  variant?: TextVariant
}>

const styles = {
  alignCenter: Style.make({ textAlign: 'center' }),
  alignLeft: Style.make({ textAlign: 'left' }),
  alignRight: Style.make({ textAlign: 'right' }),
  body: Style.make({
    fontSize: semanticSystemTheme.typeBodySize,
    lineHeight: semanticSystemTheme.typeBodyLeading,
    textWrap: 'pretty',
  }),
  caption: Style.make({
    fontSize: semanticSystemTheme.typeSupportingSize,
    lineHeight: semanticSystemTheme.typeSupportingLeading,
    textWrap: 'pretty',
  }),
  chartLead: Style.make({
    fontSize: '1rem',
    lineHeight: '1.5rem',
    textWrap: 'balance',
    maxWidth: '56rem',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      fontSize: '1.125rem',
      lineHeight: '1.75rem',
    }),
  ),
  chartTitle: Style.make({
    fontSize: '1.875rem',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
    textWrap: 'balance',
    maxWidth: '48rem',
  }).pipe(
    Style.when(When.minWidth('1280px'), {
      fontSize: '3rem',
      letterSpacing: '-0.05em',
    }),
    Style.when(When.minWidth('1024px'), { lineHeight: 1.1 }),
  ),
  display: Style.make({
    fontSize: compositionTokens.fontDisplay,
    fontWeight: 700,
    lineHeight: compositionTokens.lineHeading,
  }),
  headingMd: Style.make({
    fontSize: compositionTokens.fontHeadingMd,
    fontWeight: 600,
    lineHeight: compositionTokens.lineHeading,
    textWrap: 'balance',
  }),
  headingSm: Style.make({
    fontSize: compositionTokens.fontHeadingSm,
    fontWeight: 600,
    lineHeight: compositionTokens.lineHeading,
    textWrap: 'balance',
  }),
  hero: Style.make({
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '-0.035em',
    lineHeight: 1.05,
    textWrap: 'balance',
  }).pipe(Style.when(When.minWidth('768px'), { fontSize: '3rem' })),
  inherit: Style.make({ fontSize: 'inherit', lineHeight: 'inherit' }),
  label: Style.make({
    fontSize: semanticSystemTheme.typeLabelSize,
    fontWeight: 500,
    lineHeight: semanticSystemTheme.typeLabelLeading,
  }),
  measureHero: Style.make({ textWrap: 'pretty', maxWidth: '42rem' }),
  measureNone: Style.make({ maxWidth: 'none' }),
  numericProportional: Style.make({ fontVariantNumeric: 'proportional-nums' }),
  numericTabular: Style.make({ fontVariantNumeric: 'tabular-nums' }),
  toneAccent: Style.make({ color: tokens.primary }),
  toneDanger: Style.make({ color: tokens.destructive }),
  tonePrimary: Style.make({ color: tokens.foreground }),
  toneSecondary: Style.make({ color: tokens.mutedForeground }),
  strongWeight: Style.make({ fontWeight: 'bolder' }),
}

const element = <Message>(
  as: TextElement,
  attributes: ReadonlyArray<Attribute<Message>>,
  children: TextProps['children'],
  h: HtmlBuilder<Message>,
): Html => {
  switch (as) {
    case 'code':
      return h.code(attributes, children)
    case 'div':
      return h.div(attributes, children)
    case 'h1':
      return h.h1(attributes, children)
    case 'h2':
      return h.h2(attributes, children)
    case 'h3':
      return h.h3(attributes, children)
    case 'h4':
      return h.h4(attributes, children)
    case 'p':
      return h.p(attributes, children)
    case 'strong':
      return h.strong(attributes, children)
    case 'span':
      return h.span(attributes, children)
  }
}

export const text = <Message>(
  props: TextProps,
  h: HtmlBuilder<Message>,
): Html => {
  const variant = {
    body: styles.body,
    caption: styles.caption,
    chartLead: styles.chartLead,
    chartTitle: styles.chartTitle,
    display: styles.display,
    headingMd: styles.headingMd,
    headingSm: styles.headingSm,
    hero: styles.hero,
    inherit: styles.inherit,
    label: styles.label,
  }[props.variant ?? 'body']
  const tone = {
    accent: styles.toneAccent,
    danger: styles.toneDanger,
    primary: styles.tonePrimary,
    secondary: styles.toneSecondary,
  }[props.tone ?? 'primary']
  const align =
    props.align === undefined
      ? []
      : [
          {
            center: styles.alignCenter,
            left: styles.alignLeft,
            right: styles.alignRight,
          }[props.align],
        ]
  const measure =
    props.measure === undefined
      ? []
      : [{ hero: styles.measureHero, none: styles.measureNone }[props.measure]]
  const numeric =
    props.numeric === undefined
      ? []
      : [
          {
            proportional: styles.numericProportional,
            tabular: styles.numericTabular,
          }[props.numeric],
        ]
  return element(
    props.as ?? 'span',
    [
      /* Tailwind's preflight zeroes UA margins/padding on every element; the
         StyleX build has no global reset, so text elements (h1-h4, p) need
         reset.text or their default margin-block leaks into every stack. */
      h.Class(
        className(
          reset.text,
          props.as === 'strong' ? styles.strongWeight : null,
          variant,
          tone,
          ...align,
          ...measure,
          ...numeric,
        ),
      ),
      ...Object.entries(props.data ?? {}).map(([name, value]) =>
        h.DataAttribute(name, value),
      ),
    ],
    props.children,
    h,
  )
}
