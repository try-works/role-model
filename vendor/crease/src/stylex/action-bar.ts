/* StyleX twin of src/ui/action-bar.ts — diceui ActionBar (see docs at
   diceui.com/docs/components/base/action-bar). Same DOM, same classes ported
   to stylex.create; Mount streams shared from src/lib/action-bar. */

import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '@/lib/action-bar'
import { escapeActionBarMount } from '@/lib/action-bar'
import type { Message as ToolbarMessage } from '@/lib/toolbar'
import { focusToolbarItemsMount } from '@/lib/toolbar'
import type { ActionBarAlign, ActionBarSide } from '@/lib/action-bar'
export type { ActionBarAlign, ActionBarSide }
import { reset } from '@/stylex/reset'
import { buttonVisualStyles } from '@/stylex/button'
import type { StaticStyles } from '@stylexjs/stylex'
import type { ComponentLayoutStyle } from './contracts'
import { complexTokens } from './complex-tokens.stylex'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

const enterBottom = stylex.keyframes({
  '0%': { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
  '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
})
const enterTop = stylex.keyframes({
  '0%': { opacity: 0, transform: 'scale(0.95) translateY(-4px)' },
  '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
})

const styles = stylex.create({
  root: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    animationDuration: interactionTokens.motionToastContent,
    animationFillMode: 'both',
    animationTimingFunction: interactionTokens.easingToastContent,
    backgroundColor: tokens.card,
    boxShadow: foundationTokens.shadowXl,
    display: 'flex',
    outlineStyle: 'none',
    position: 'fixed',
    zIndex: 50,
  },
  rootBottom: { animationName: enterBottom },
  rootTop: { animationName: enterTop },
  rootHorizontal: {
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    flexDirection: 'row',
  },
  selection: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.25rem',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
  },
  group: {
    gap: '0.5rem',
    display: 'flex',
    outlineStyle: 'none',
  },
  groupHorizontal: { alignItems: 'center' },
  itemDestructive: {
    backgroundColor: {
      default: 'transparent',
      ':hover': foundationTokens.destructiveSoft,
    },
    color: {
      default: tokens.destructive,
      ':hover': tokens.destructive,
    },
  },
  close: {
    /* TW rounded-xs (2px). */
    borderRadius: complexTokens.smallRadius,
    color: 'inherit',
    opacity: {
      default: 0.7,
      ':hover': 1,
    },
  },
  separator: {
    backgroundColor: tokens.border,
    flexShrink: 0,
  },
  separatorHorizontal: { height: '1.5rem', width: '1px' },
})

export type ActionBarProps<Msg> = Readonly<{
  open: boolean
  side?: ActionBarSide
  align?: ActionBarAlign
  alignOffset?: number
  sideOffset?: number
  toParentMessage?: (message: Message | ToolbarMessage) => Msg
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>

export const actionBar = <Msg>(
  props: ActionBarProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const side = props.side ?? 'bottom'
  const align = props.align ?? 'center'
  const sideOffset = props.sideOffset ?? 16
  const alignOffset = props.alignOffset ?? 0

  if (!props.open) return h.empty

  return h.div(
    [
      h.Role('toolbar'),
      h.AriaOrientation('horizontal'),
      h.DataAttribute('slot', 'action-bar'),
      h.DataAttribute('side', side),
      h.DataAttribute('align', align),
      h.DataAttribute('orientation', 'horizontal'),
      ...(props.toParentMessage === undefined
        ? []
        : [
            h.OnMount(escapeActionBarMount(props.toParentMessage)),
            h.OnMount(
              focusToolbarItemsMount(props.toParentMessage, 'horizontal'),
            ),
          ]),
      h.Class(
        className(
          styles.root,
          side === 'bottom' ? styles.rootBottom : styles.rootTop,
          styles.rootHorizontal,
          props.layoutStyle,
        ),
      ),
      h.Style({
        [side]: `${String(sideOffset)}px`,
        ...(align === 'center' ? { left: '50%', translate: '-50% 0' } : {}),
        ...(align === 'start' ? { left: `${String(alignOffset)}px` } : {}),
        ...(align === 'end' ? { right: `${String(alignOffset)}px` } : {}),
      }),
    ],
    [...props.children],
  )
}

export const actionBarSelection = <Msg>(
  props: Readonly<{
    children: ReadonlyArray<Html | string>
    layoutStyle?: ComponentLayoutStyle
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'action-bar-selection'),
      h.Class(className(styles.selection, props.layoutStyle)),
    ],
    [...props.children],
  )

export const actionBarGroup = <Msg>(
  props: Readonly<{
    children: ReadonlyArray<Html | string>
    layoutStyle?: ComponentLayoutStyle
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Role('group'),
      h.DataAttribute('slot', 'action-bar-group'),
      h.DataAttribute('orientation', 'horizontal'),
      h.Class(
        className(styles.group, styles.groupHorizontal, props.layoutStyle),
      ),
    ],
    [...props.children],
  )

export const actionBarItem = <Msg>(
  props: Readonly<{
    onSelect?: Msg
    variant?: 'default' | 'destructive'
    isDisabled?: boolean
    children: ReadonlyArray<Html | string>
    ariaLabel?: string
    layoutStyle?: ComponentLayoutStyle
    extraStyle?: StaticStyles
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.DataAttribute('slot', 'action-bar-item'),
      ...(props.isDisabled === true ? [h.Attribute('disabled', '')] : []),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...(props.onSelect === undefined ? [] : [h.OnClick(props.onSelect)]),
      h.Class(
        className(
          ...buttonVisualStyles({ variant: 'secondary' }),
          props.variant === 'destructive' && styles.itemDestructive,
          props.extraStyle,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )

export const actionBarClose = <Msg>(
  props: Readonly<{
    onClose?: Msg
    children?: ReadonlyArray<Html | string>
    ariaLabel?: string
    layoutStyle?: ComponentLayoutStyle
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.DataAttribute('slot', 'action-bar-close'),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...(props.onClose === undefined ? [] : [h.OnClick(props.onClose)]),
      h.Class(className(reset.button, styles.close, props.layoutStyle)),
    ],
    props.children === undefined ? [] : [...props.children],
  )

export const actionBarSeparator = <Msg>(
  props: Readonly<{
    layoutStyle?: ComponentLayoutStyle
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Role('separator'),
      h.AriaOrientation('horizontal'),
      h.AriaHidden(true),
      h.DataAttribute('slot', 'action-bar-separator'),
      h.Class(
        className(
          styles.separator,
          styles.separatorHorizontal,
          props.layoutStyle,
        ),
      ),
    ],
    [],
  )
