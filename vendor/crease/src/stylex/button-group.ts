import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { joinStyles } from './button-group-join.stylex'
import { tokens } from './tokens.stylex'
export type ButtonGroupVariants = Readonly<{
  orientation?: 'horizontal' | 'vertical' | null
}>
const styles = stylex.create({
  base: {
    gap: { default: null, ':has(> [data-slot=button-group])': '0.5rem' },
    alignItems: 'stretch',
    display: 'flex',
    width: {
      default: 'fit-content',
      ':where([data-slot="field"][data-orientation="responsive"] > *)': '100%',
      ':where([data-slot="field"][data-orientation="vertical"] > *)': '100%',
      '@container field-group (min-width: 28rem)': {
        default: null,
        ':where([data-slot="field"][data-orientation="responsive"] > *)':
          'auto',
      },
    },
  },
  horizontal: { flexDirection: 'row' },
  vertical: { flexDirection: 'column' },
  separatorH: {
    backgroundColor: tokens.input,
    flexShrink: 0,
    position: 'relative',
    height: '1px',
    width: '100%',
  },
  separatorV: {
    alignSelf: 'stretch',
    backgroundColor: tokens.input,
    flexShrink: 0,
    position: 'relative',
    width: '1px',
  },
  text: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    boxShadow: foundationTokens.shadowXs,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
})
export const buttonGroupVariants = (o: ButtonGroupVariants = {}): string =>
  className(styles.base, styles[o.orientation ?? 'horizontal'])
export type ButtonGroupProps = Readonly<{
  children: ReadonlyArray<Html | string>
  orientation?: ButtonGroupVariants['orientation']
  layoutStyle?: ComponentLayoutStyle
  ariaLabel?: string
}>
export const buttonGroup = <Msg>(
  p: ButtonGroupProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = p.orientation ?? 'horizontal'
  return h.div(
    [
      h.Role('group'),
      ...(p.ariaLabel === undefined ? [] : [h.AriaLabel(p.ariaLabel)]),
      h.DataAttribute('slot', 'button-group'),
      h.DataAttribute('orientation', orientation),
      h.Class(className(styles.base, styles[orientation], p.layoutStyle)),
    ],
    [...p.children],
  )
}
export type ButtonGroupSeparatorProps = Readonly<{
  orientation?: 'horizontal' | 'vertical'
  layoutStyle?: ComponentLayoutStyle
}>
export const buttonGroupSeparator = <Msg>(
  p: ButtonGroupSeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = p.orientation ?? 'vertical'
  return h.div(
    [
      h.Role('none'),
      h.DataAttribute('slot', 'button-group-separator'),
      h.DataAttribute('orientation', orientation),
      h.Class(
        className(
          orientation === 'horizontal' ? styles.separatorH : styles.separatorV,
          p.layoutStyle,
        ),
      ),
    ],
    [],
  )
}
export type ButtonGroupTextProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>
export const buttonGroupText = <Msg>(
  p: ButtonGroupTextProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'button-group-text'),
      h.Class(className(styles.text, joinStyles.join, p.layoutStyle)),
    ],
    [...p.children],
  )
