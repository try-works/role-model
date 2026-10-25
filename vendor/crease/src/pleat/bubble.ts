import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { bubbleScope } from './bubble.markers'
import { foundationTokens } from './foundations-tokens'
import { messageScope } from './message.markers'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'
export type BubbleVariant =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'tinted'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | null
type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>
const styles = {
  group: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  }),
  bubble: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    maxWidth: '80%',
    minWidth: 0,
    width: 'fit-content',
  }).pipe(
    Style.when(When.within(messageScope, When.data('align', 'end')), {
      alignSelf: 'flex-end',
    }),
  ),
  end: Style.make({ alignSelf: 'flex-end' }),
  ghostWidth: Style.make({ maxWidth: '100%' }),
  content: Style.make({
    borderColor: foundationTokens.transparent,
    borderRadius: foundationTokens.radiusXl,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    fontSize: '0.875rem',
    lineHeight: 1.625,
    overflowWrap: 'break-word',
    maxWidth: '100%',
    minWidth: 0,
    width: 'fit-content',
  }).pipe(
    Style.when(When.within(bubbleScope, When.data('align', 'end')), {
      alignSelf: 'flex-end',
    }),
  ),
  default: Style.make({
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  }),
  secondary: Style.make({
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
  }),
  muted: Style.make({ backgroundColor: foundationTokens.muted }),
  tinted: Style.make({
    backgroundColor: foundationTokens.primarySoft,
    color: tokens.foreground,
  }),
  outline: Style.make({
    borderColor: tokens.border,
    backgroundColor: tokens.background,
  }),
  ghost: Style.make({
    borderRadius: '0px',
    paddingBlock: 0,
    paddingInline: 0,
    backgroundColor: foundationTokens.transparent,
  }),
  destructive: Style.make({
    backgroundColor: foundationTokens.destructiveSoft,
    color: tokens.destructive,
  }),
  reactions: Style.make({
    borderRadius: '50%',
    gap: '0.25rem',
    paddingBlock: '0.125rem',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    boxShadow: foundationTokens.cardRing3,
    display: 'flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    justifyContent: 'center',
    lineHeight: '1.25rem',
    position: 'absolute',
    zIndex: 10,
    width: 'fit-content',
  }),
  top: Style.make({ transform: 'translateY(-75%)', top: 0 }),
  bottom: Style.make({ transform: 'translateY(75%)', bottom: 0 }),
  start: Style.make({ left: '0.75rem' }),
  reactionEnd: Style.make({ right: '0.75rem' }),
  asButton: Style.make({
    cursor: interactionTokens.cursorAction,
    fontFamily: 'inherit',
    textAlign: 'start',
  }),
}
export const bubbleVariants = (
  o: Readonly<{ variant?: BubbleVariant }> = {},
): string =>
  className(styles.bubble, o.variant === 'ghost' && styles.ghostWidth)
export const bubbleGroup = <Msg>(p: ChildrenProps, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'bubble-group'),
      h.Class(className(styles.group, p.layoutStyle)),
    ],
    [...p.children],
  )
export const bubble = <Msg>(
  p: ChildrenProps &
    Readonly<{ variant?: BubbleVariant; align?: 'start' | 'end' }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = p.variant ?? 'default'
  const align = p.align ?? 'start'
  return h.div(
    [
      h.DataAttribute('slot', 'bubble'),
      h.DataAttribute('variant', variant),
      h.DataAttribute('align', align),
      h.Class(
        className(
          styles.bubble,
          align === 'end' && styles.end,
          bubbleScope,
          variant === 'ghost' && styles.ghostWidth,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
}
export const bubbleContent = <Msg>(
  p: ChildrenProps &
    Readonly<{ variant?: Exclude<BubbleVariant, null>; onClick?: Msg }>,
  h: HtmlBuilder<Msg>,
): Html =>
  p.onClick === undefined
    ? h.div(
        [
          h.DataAttribute('slot', 'bubble-content'),
          h.Class(
            className(
              styles.content,
              styles[p.variant ?? 'default'],
              p.layoutStyle,
            ),
          ),
        ],
        [...p.children],
      )
    : h.button(
        [
          h.DataAttribute('slot', 'bubble-content'),
          h.Class(
            className(
              reset.button,
              styles.content,
              styles[p.variant ?? 'default'],
              styles.asButton,
              p.layoutStyle,
            ),
          ),
          h.Type('button'),
          h.OnClick(p.onClick),
        ],
        [...p.children],
      )
export const bubbleReactions = <Msg>(
  p: ChildrenProps &
    Readonly<{
      side?: 'top' | 'bottom'
      align?: 'start' | 'end'
      ariaLabel?: string
    }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'bubble-reactions'),
      h.DataAttribute('side', p.side ?? 'bottom'),
      h.DataAttribute('align', p.align ?? 'end'),
      ...(p.ariaLabel === undefined
        ? []
        : [h.Role('img'), h.AriaLabel(p.ariaLabel)]),
      h.Class(
        className(
          styles.reactions,
          styles[p.side ?? 'bottom'],
          p.align === 'start' ? styles.start : styles.reactionEnd,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
