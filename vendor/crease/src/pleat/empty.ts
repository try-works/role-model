import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens'

type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>
const styles = {
  root: Style.make({
    padding: '1.5rem',
    borderRadius: foundationTokens.radiusLg,
    flex: '1',
    gap: '1.5rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    textWrap: 'balance',
    minWidth: 0,
  }).pipe(Style.when(When.minWidth('768px'), { padding: '3rem' })),
  header: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
    maxWidth: '24rem',
  }),
  media: Style.make({
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    marginBottom: '0.5rem',
  }),
  mediaIcon: Style.make({
    borderRadius: foundationTokens.radiusLg,
    backgroundColor: foundationTokens.muted,
    color: tokens.foreground,
    height: '2.5rem',
    width: '2.5rem',
  }),
  title: Style.make({
    fontSize: '1.125rem',
    fontWeight: 500,
    letterSpacing: '-0.025em',
    lineHeight: '1.75rem',
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: 1.625,
  }),
  content: Style.make({
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    maxWidth: '24rem',
    minWidth: 0,
    width: '100%',
  }),
}
const slotDiv =
  (slot: string, style: Style.Style) =>
  <Msg>(props: SlotProps, h: HtmlBuilder<Msg>): Html =>
    h.div(
      [
        h.DataAttribute('slot', slot),
        h.Class(className(style, props.layoutStyle)),
      ],
      [...props.children],
    )
export const empty = slotDiv('empty', styles.root)
export const emptyHeader = slotDiv('empty-header', styles.header)
export type EmptyMediaVariants = Readonly<{
  variant?: 'default' | 'icon' | null
}>
export const emptyMediaVariants = (options: EmptyMediaVariants = {}): string =>
  className(styles.media, options.variant === 'icon' && styles.mediaIcon)
export type EmptyMediaProps = SlotProps &
  Readonly<{ variant?: EmptyMediaVariants['variant'] }>
export const emptyMedia = <Msg>(
  props: EmptyMediaProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'empty-icon'),
      h.DataAttribute('variant', props.variant ?? 'default'),
      h.Class(
        className(
          styles.media,
          props.variant === 'icon' && styles.mediaIcon,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
export const emptyTitle = <Msg>(props: SlotProps, h: HtmlBuilder<Msg>): Html =>
  h.h2(
    [
      h.DataAttribute('slot', 'empty-title'),
      h.Class(className(reset.text, styles.title, props.layoutStyle)),
    ],
    [...props.children],
  )
export const emptyDescription = slotDiv('empty-description', styles.description)
export const emptyContent = slotDiv('empty-content', styles.content)
