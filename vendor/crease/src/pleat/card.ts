import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'
import { foundationTokens } from './foundations-tokens'
import { tokens } from './tokens'

const styles = {
  card: Style.make({
    borderColor: tokens.border,
    borderRadius: tokens.cardRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 'var(--card-spacing, 1.5rem)',
    overflow: 'hidden',
    paddingBlock: 'var(--card-spacing,1.5rem)',
    backgroundColor: tokens.card,
    boxShadow: foundationTokens.shadowSm,
    color: tokens.cardForeground,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  cardFlush: Style.make({ overflow: 'hidden', paddingTop: 0 }),
  header: Style.make({
    gap: '0.25rem',
    paddingInline: 'var(--card-spacing,1.5rem)',
    alignItems: 'flex-start',
    containerName: 'card-header',
    containerType: 'inline-size',
    display: 'grid',
    gridAutoRows: 'min-content',
    borderTopLeftRadius: tokens.cardRadius,
    borderTopRightRadius: tokens.cardRadius,
  }).pipe(
    Style.when(When.has(When.data('slot', 'card-action')), {
      gridTemplateColumns: '1fr auto',
    }),
    Style.when(When.has(When.data('slot', 'card-description')), {
      gridTemplateRows: 'auto auto',
    }),
  ),
  title: Style.make({
    fontSize: 'var(--card-title-fs, 1rem)',
    fontWeight: 500,
    lineHeight: foundationTokens.leadingNormal,
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  action: Style.make({
    alignSelf: 'start',
    gridColumnStart: '2',
    gridRowEnd: 'span 2',
    gridRowStart: '1',
    justifySelf: 'end',
  }),
  content: Style.make({
    gap: '0.75rem',
    paddingInline: 'var(--card-spacing,1.5rem)',
    display: 'flex',
    flexDirection: 'column',
  }),
  footer: Style.make({
    paddingInline: 'var(--card-spacing,1.5rem)',
    alignItems: 'center',
    display: 'flex',
    borderBottomLeftRadius: tokens.cardRadius,
    borderBottomRightRadius: tokens.cardRadius,
  }),
}

type Slot = Readonly<{
  children: ReadonlyArray<Html | string>
  /** Parent-layout positioning only. Add visual choices as named variants. */
  layoutStyle?: ComponentLayoutStyle | undefined
}>

export type CardProps = Slot &
  Readonly<{
    element?: 'div' | 'section' | 'article'
    density?: 'default' | 'flush'
    size?: 'default' | 'sm'
    /** Overrides the --card-spacing CSS variable (spacing demo). */
    spacing?: string
  }>

const slot =
  (name: string, slotStyle: Style.Style) =>
  <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
    h.div(
      [
        h.DataAttribute('slot', name),
        h.Class(className(slotStyle, props.layoutStyle)),
      ],
      [...props.children],
    )

export const card = <Msg>(props: CardProps, h: HtmlBuilder<Msg>): Html => {
  const attributes = [
    h.DataAttribute('slot', 'card'),
    h.DataAttribute('size', props.size ?? 'default'),
    h.Style({
      '--card-spacing':
        props.spacing ??
        (props.size === 'sm' ? '1rem' : 'var(--card-spacing-default, 1.5rem)'),
      '--card-title-fs': props.size === 'sm' ? '0.875rem' : '1rem',
    }),
    h.Class(
      className(
        styles.card,
        props.density === 'flush' && styles.cardFlush,
        props.layoutStyle,
      ),
    ),
  ]
  const children = [...props.children]

  switch (props.element ?? 'div') {
    case 'section':
      return h.section(attributes, children)
    case 'article':
      return h.article(attributes, children)
    default:
      return h.div(attributes, children)
  }
}

export const cardHeader = slot('card-header', styles.header)
export type CardTitleProps = Slot & Readonly<{ element?: 'h2' | 'h3' | 'h4' }>
export const cardTitle = <Msg>(
  props: CardTitleProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const attributes = [
    h.DataAttribute('slot', 'card-title'),
    h.Class(className(reset.text, styles.title, props.layoutStyle)),
  ]
  switch (props.element ?? 'h3') {
    case 'h2':
      return h.h2(attributes, [...props.children])
    case 'h4':
      return h.h4(attributes, [...props.children])
    default:
      return h.h3(attributes, [...props.children])
  }
}
export const cardDescription = slot('card-description', styles.description)
export const cardAction = slot('card-action', styles.action)
export const cardContent = slot('card-content', styles.content)
export const cardFooter = slot('card-footer', styles.footer)
