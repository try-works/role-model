import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { joinStyles } from './button-group-join'
import { tokens } from './tokens'
export type ButtonGroupVariants = Readonly<{
  orientation?: 'horizontal' | 'vertical' | null
}>
const styles = {
  base: Style.make({
    alignItems: 'stretch',
    display: 'flex',
    width: 'fit-content',
  }).pipe(
    Style.when(When.pseudo(':has(> [data-slot=button-group])'), {
      gap: '0.5rem',
    }),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="responsive"] > *)',
      ),
      { width: '100%' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="field"][data-orientation="vertical"] > *)',
      ),
      { width: '100%' },
    ),
    Style.when(
      When.all(
        When.container('(min-width: 28rem)', 'field-group'),
        When.pseudo(
          ':where([data-slot="field"][data-orientation="responsive"] > *)',
        ),
      ),
      { width: 'auto' },
    ),
  ),
  horizontal: Style.make({ flexDirection: 'row' }),
  vertical: Style.make({ flexDirection: 'column' }),
  separatorH: Style.make({
    backgroundColor: tokens.input,
    flexShrink: 0,
    position: 'relative',
    height: '1px',
    width: '100%',
  }),
  separatorV: Style.make({
    alignSelf: 'stretch',
    backgroundColor: tokens.input,
    flexShrink: 0,
    position: 'relative',
    width: '1px',
  }),
  text: Style.make({
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
  }),
}
export const buttonGroupVariants = (o: ButtonGroupVariants = {}): string =>
  className(styles.base, styles[o.orientation ?? 'horizontal'])
export type ButtonGroupProps = Readonly<{
  children: ReadonlyArray<Html | string>
  orientation?: ButtonGroupVariants['orientation']
  layoutStyle?: ComponentLayoutStyle | undefined
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
  layoutStyle?: ComponentLayoutStyle | undefined
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
  layoutStyle?: ComponentLayoutStyle | undefined
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
