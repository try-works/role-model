import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'

type Slot = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
  icon?: 'inline-start' | 'inline-end'
}>
const styles = stylex.create({
  key: {
    borderRadius: foundationTokens.radiusSm,
    gap: '0.25rem',
    paddingInline: '0.25rem',
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontFamily:
      "var(--font-sans, 'Inter', 'Inter Fallback', ui-sans-serif, system-ui, sans-serif)",
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    pointerEvents: 'none',
    userSelect: 'none',
    height: '1.25rem',
    minWidth: '1.25rem',
    width: 'fit-content',
  },
  group: { gap: '0.25rem', alignItems: 'center', display: 'inline-flex' },
})
export const kbd = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.kbd(
    [
      h.DataAttribute('slot', 'kbd'),
      ...(props.icon === undefined
        ? []
        : [h.DataAttribute('icon', props.icon)]),
      h.Class(className(reset.code, styles.key, props.layoutStyle)),
    ],
    [...props.children],
  )
export const kbdGroup = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html =>
  h.kbd(
    [
      h.DataAttribute('slot', 'kbd-group'),
      h.Class(className(reset.code, styles.group, props.layoutStyle)),
    ],
    [...props.children],
  )
